#!/usr/bin/env python3
"""Audit skill_lifecycle.yaml and state-transition evidence."""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

import yaml


ALLOWED_STATES = (
    "draft",
    "candidate",
    "validated",
    "released",
    "monitored",
    "needs-maintenance",
    "merge-candidate",
    "split-candidate",
    "deprecated",
    "retired",
)
RELEASED_OR_LATER = {"released", "monitored", "needs-maintenance", "merge-candidate", "split-candidate", "deprecated", "retired"}


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def _as_date(value: Any) -> date | None:
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None
    return None


def _load_manifest(path: Path) -> tuple[dict[str, Any] | None, str | None]:
    try:
        loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        return None, str(exc)
    return (loaded, None) if isinstance(loaded, dict) else (None, "manifest must be a mapping")


def audit_lifecycle_state(skill_dir: Path | str, *, today: date | None = None) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    manifest_path = skill_dir / "skill_lifecycle.yaml"
    findings: list[dict[str, Any]] = []
    current = today or date.today()

    if not manifest_path.exists():
        return {
            "audit": "lifecycle_state",
            "status": "FAIL",
            "skill_path": str(skill_dir),
            "findings": [_finding("lifecycle_manifest_missing", "skill_lifecycle.yaml is required", path=str(manifest_path))],
        }

    manifest, error = _load_manifest(manifest_path)
    if manifest is None:
        return {
            "audit": "lifecycle_state",
            "status": "BLOCKED",
            "skill_path": str(skill_dir),
            "findings": [_finding("lifecycle_manifest_invalid", f"Cannot parse lifecycle manifest: {error}", path=str(manifest_path))],
        }

    for key in ("name", "status", "owner", "archetype", "primary_structure_pattern", "lifecycle", "support", "risk", "dependencies"):
        if key not in manifest:
            findings.append(_finding("lifecycle_required_field_missing", f"Missing lifecycle field: {key}", path=str(manifest_path)))

    status_value = str(manifest.get("status", "")).strip()
    if status_value not in ALLOWED_STATES:
        findings.append(_finding("lifecycle_status_invalid", f"Invalid lifecycle status: {status_value!r}", path=str(manifest_path)))

    owner = str(manifest.get("owner", "")).strip()
    if not owner or owner.lower() in {"todo", "tbd", "none", "unowned"}:
        findings.append(_finding("lifecycle_owner_missing", "Lifecycle manifest must name an owner", path=str(manifest_path)))

    lifecycle = manifest.get("lifecycle") if isinstance(manifest.get("lifecycle"), dict) else {}
    review_interval = lifecycle.get("review_interval_days")
    if not isinstance(review_interval, int) or review_interval <= 0:
        findings.append(_finding("review_interval_invalid", "review_interval_days must be a positive integer", path=str(manifest_path)))

    next_due = _as_date(lifecycle.get("next_review_due"))
    if next_due is None:
        findings.append(_finding("next_review_due_invalid", "next_review_due must be an ISO date", path=str(manifest_path)))
    elif next_due < current and status_value in {"released", "monitored"}:
        findings.append(
            _finding(
                "review_due_stale",
                f"next_review_due {next_due.isoformat()} is older than {current.isoformat()}",
                path=str(manifest_path),
            )
        )

    if status_value in RELEASED_OR_LATER:
        for required in (skill_dir / "references" / "readiness_report.md", skill_dir / "assets" / "evals" / "evals.json", skill_dir / "assets" / "evals" / "regression_gates.json"):
            if not required.exists():
                findings.append(_finding("released_state_evidence_missing", f"Released-or-later state requires {required.relative_to(skill_dir).as_posix()}", path=str(required)))

    dependencies = manifest.get("dependencies") if isinstance(manifest.get("dependencies"), dict) else {}
    for group in ("scripts", "references"):
        items = dependencies.get(group, [])
        if not isinstance(items, list):
            findings.append(_finding("dependency_group_invalid", f"dependencies.{group} must be a list", path=str(manifest_path)))
            continue
        for item in items:
            if not isinstance(item, str) or not (skill_dir / item).exists():
                findings.append(_finding("dependency_missing", f"Declared dependency does not exist: {item}", path=str(manifest_path)))

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {
        "audit": "lifecycle_state",
        "status": status,
        "skill_path": str(skill_dir),
        "state": status_value,
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit skill lifecycle state manifest")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_lifecycle_state(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Lifecycle state audit: {report['status']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
