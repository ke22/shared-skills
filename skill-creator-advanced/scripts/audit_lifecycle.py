#!/usr/bin/env python3
"""Audit release freshness, provenance fields, and lifecycle artifacts."""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path
from typing import Any

import yaml


REQUIRED_BENCHMARK_METADATA = (
    "skill_version",
    "git_commit",
    "host",
    "model",
    "temperature",
    "run_timestamp",
    "grader_version",
)
VERSION_RE = re.compile(r"^(?P<year>\d{4})\.(?P<month>[1-9]|1[0-2])\.(?P<day>[1-9]|[12]\d|3[01])$")
AUDIT_DATE_RE = re.compile(r"Audit date:\s*(?P<date>\d{4}-\d{2}-\d{2})", re.IGNORECASE)


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def _load_frontmatter(skill_md: Path) -> dict[str, Any]:
    text = skill_md.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError("missing YAML frontmatter")
    parts = text.split("---\n", 2)
    if len(parts) != 3:
        raise ValueError("invalid YAML frontmatter delimiter")
    frontmatter = yaml.safe_load(parts[1])
    if not isinstance(frontmatter, dict):
        raise ValueError("frontmatter must be a mapping")
    return frontmatter


def _parse_date_version(version: str) -> date | None:
    match = VERSION_RE.fullmatch(version.strip())
    if match is None:
        return None
    try:
        return date(int(match.group("year")), int(match.group("month")), int(match.group("day")))
    except ValueError:
        return None


def _parse_audit_date(report_text: str) -> date | None:
    match = AUDIT_DATE_RE.search(report_text)
    if match is None:
        return None
    try:
        return date.fromisoformat(match.group("date"))
    except ValueError:
        return None


def _load_json(path: Path) -> dict[str, Any] | None:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return loaded if isinstance(loaded, dict) else None


def audit_lifecycle(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    skill_md = skill_dir / "SKILL.md"
    readiness_report = skill_dir / "references" / "readiness_report.md"
    evals_json = skill_dir / "assets" / "evals" / "evals.json"
    regression_gates = skill_dir / "assets" / "evals" / "regression_gates.json"
    findings: list[dict[str, Any]] = []

    try:
        frontmatter = _load_frontmatter(skill_md)
    except (OSError, ValueError, yaml.YAMLError) as exc:
        return {
            "audit": "lifecycle",
            "status": "BLOCKED",
            "skill_path": str(skill_dir),
            "findings": [_finding("frontmatter_unreadable", f"Cannot parse SKILL.md frontmatter: {exc}", path=str(skill_md))],
        }

    version = str(frontmatter.get("version", "")).strip()
    version_date = _parse_date_version(version)
    if version_date is None:
        findings.append(_finding("version_not_date_based", f"version must be date-based YYYY.M.D, got {version!r}", path=str(skill_md)))

    if not readiness_report.exists():
        findings.append(_finding("readiness_report_missing", "references/readiness_report.md is required release evidence", path=str(readiness_report)))
    else:
        report_text = readiness_report.read_text(encoding="utf-8")
        audit_date = _parse_audit_date(report_text)
        if version and version not in report_text:
            findings.append(_finding("readiness_report_version_stale", f"readiness report does not mention current version {version}", path=str(readiness_report)))
        if audit_date is None:
            findings.append(_finding("readiness_report_date_missing", "readiness report must contain 'Audit date: YYYY-MM-DD'", path=str(readiness_report)))
        elif version_date is not None and audit_date < version_date:
            findings.append(
                _finding(
                    "readiness_report_stale",
                    f"Audit date {audit_date.isoformat()} is older than skill version date {version_date.isoformat()}",
                    path=str(readiness_report),
                )
            )

    if not evals_json.exists():
        findings.append(_finding("evals_missing", "assets/evals/evals.json is required", path=str(evals_json)))
    else:
        evals = _load_json(evals_json)
        if evals is None:
            findings.append(_finding("evals_invalid_json", "assets/evals/evals.json must be a JSON object", path=str(evals_json)))
        else:
            required = evals.get("benchmark_metadata_required", [])
            missing = [field for field in REQUIRED_BENCHMARK_METADATA if field not in required]
            if missing:
                findings.append(
                    _finding(
                        "benchmark_metadata_requirements_missing",
                        f"benchmark_metadata_required missing: {', '.join(missing)}",
                        path=str(evals_json),
                    )
                )

    if not regression_gates.exists():
        findings.append(_finding("regression_gates_missing", "assets/evals/regression_gates.json is required", path=str(regression_gates)))
    elif _load_json(regression_gates) is None:
        findings.append(_finding("regression_gates_invalid_json", "assets/evals/regression_gates.json must be a JSON object", path=str(regression_gates)))

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {
        "audit": "lifecycle",
        "status": status,
        "skill_path": str(skill_dir),
        "version": version,
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit skill lifecycle artifacts")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_lifecycle(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Lifecycle audit: {report['status']}")

    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
