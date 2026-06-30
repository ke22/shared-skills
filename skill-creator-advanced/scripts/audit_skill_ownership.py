#!/usr/bin/env python3
"""Audit ownership and review freshness across a skill repository."""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

import yaml


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def audit_skill_ownership(repo_root: Path | str, *, today: date | None = None) -> dict[str, Any]:
    repo_root = Path(repo_root).resolve()
    root = repo_root / "skills" if (repo_root / "skills").exists() else repo_root
    current = today or date.today()
    findings: list[dict[str, Any]] = []
    checked = 0
    for skill_md in sorted(root.glob("*/SKILL.md")):
        checked += 1
        manifest_path = skill_md.parent / "skill_lifecycle.yaml"
        if not manifest_path.exists():
            findings.append(_finding("ownership_manifest_missing", "Missing skill_lifecycle.yaml", path=str(manifest_path)))
            continue
        manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        manifest = manifest if isinstance(manifest, dict) else {}
        owner = str(manifest.get("owner", "")).strip()
        if not owner:
            findings.append(_finding("owner_missing", "Skill has no owner", path=str(manifest_path)))
        status = str(manifest.get("status", ""))
        lifecycle = manifest.get("lifecycle") if isinstance(manifest.get("lifecycle"), dict) else {}
        next_due = lifecycle.get("next_review_due")
        try:
            due_date = date.fromisoformat(str(next_due))
        except ValueError:
            findings.append(_finding("review_due_invalid", "next_review_due is missing or invalid", path=str(manifest_path)))
            continue
        if due_date < current and status in {"released", "monitored"}:
            findings.append(_finding("review_overdue", f"Review due date has passed: {due_date.isoformat()}", path=str(manifest_path)))
    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "skill_ownership", "status": status, "repo_root": str(repo_root), "checked": checked, "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit skill ownership")
    parser.add_argument("repo_root")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = audit_skill_ownership(args.repo_root)
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Ownership audit: {report['status']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
