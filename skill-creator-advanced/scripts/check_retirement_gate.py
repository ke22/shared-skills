#!/usr/bin/env python3
"""Check whether a deprecated skill can be safely removed."""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

import yaml


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def check_retirement_gate(skill_dir: Path | str, *, minimum_days: int = 90) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    findings: list[dict[str, Any]] = []
    manifest_path = skill_dir / "skill_lifecycle.yaml"
    if not manifest_path.exists():
        return {"audit": "retirement_gate", "status": "FAIL", "skill_path": str(skill_dir), "findings": [_finding("manifest_missing", "skill_lifecycle.yaml is required", path=str(manifest_path))]}
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    manifest = manifest if isinstance(manifest, dict) else {}
    if manifest.get("status") not in {"deprecated", "retired"}:
        findings.append(_finding("not_deprecated", "Skill must be deprecated before removal", path=str(manifest_path)))
    deprecated_at = manifest.get("deprecated_at") or (manifest.get("sunset", {}) if isinstance(manifest.get("sunset"), dict) else {}).get("deprecated_at")
    try:
        dep_date = date.fromisoformat(str(deprecated_at))
        if (date.today() - dep_date).days < minimum_days:
            findings.append(_finding("deprecation_period_too_short", f"Deprecated for less than {minimum_days} days", path=str(manifest_path)))
    except ValueError:
        findings.append(_finding("deprecated_at_missing", "deprecated_at ISO date is required", path=str(manifest_path)))
    replacement = manifest.get("deprecated_by") or ((manifest.get("replacement") or {}).get("skill") if isinstance(manifest.get("replacement"), dict) else None)
    if not replacement:
        findings.append(_finding("replacement_missing", "Replacement skill is required before retirement", path=str(manifest_path)))
    migration_notes = ((manifest.get("replacement") or {}).get("migration_notes") if isinstance(manifest.get("replacement"), dict) else None)
    if migration_notes and not (skill_dir / str(migration_notes)).exists():
        findings.append(_finding("migration_notes_missing", f"Migration notes missing: {migration_notes}", path=str(manifest_path)))
    elif not migration_notes:
        findings.append(_finding("migration_notes_not_declared", "replacement.migration_notes is required", path=str(manifest_path)))
    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "retirement_gate", "status": status, "skill_path": str(skill_dir), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Check safe removal gate")
    parser.add_argument("skill_path")
    parser.add_argument("--minimum-days", type=int, default=90)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = check_retirement_gate(args.skill_path, minimum_days=args.minimum_days)
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Retirement gate: {report['status']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
