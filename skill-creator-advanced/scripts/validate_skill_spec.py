#!/usr/bin/env python3
"""Validate skill_spec.yaml against the local required-field contract."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml


REQUIRED_FIELDS = (
    "name",
    "description",
    "archetype",
    "primary_job",
    "in_scope",
    "out_of_scope",
    "handoff",
    "negative_triggers",
    "use_cases",
    "workflow",
    "output_contract",
    "tool_policy",
    "eval_plan",
    "release_gates",
)


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def validate_skill_spec(spec_path: Path | str) -> dict[str, Any]:
    spec_path = Path(spec_path).resolve()
    findings: list[dict[str, Any]] = []
    try:
        spec = yaml.safe_load(spec_path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        return {"audit": "skill_spec", "status": "BLOCKED", "path": str(spec_path), "findings": [_finding("spec_unreadable", str(exc), path=str(spec_path))]}
    if not isinstance(spec, dict):
        return {"audit": "skill_spec", "status": "FAIL", "path": str(spec_path), "findings": [_finding("spec_not_mapping", "skill spec must be a mapping", path=str(spec_path))]}

    for field in REQUIRED_FIELDS:
        if field not in spec or spec[field] in (None, "", []):
            findings.append(_finding("required_field_missing", f"Missing or empty field: {field}", path=str(spec_path)))

    for list_field in ("in_scope", "out_of_scope", "negative_triggers", "use_cases", "workflow"):
        if list_field in spec and not isinstance(spec[list_field], list):
            findings.append(_finding("field_type_invalid", f"{list_field} must be a list", path=str(spec_path)))

    for index, use_case in enumerate(spec.get("use_cases", []) if isinstance(spec.get("use_cases"), list) else []):
        if not isinstance(use_case, dict):
            findings.append(_finding("use_case_invalid", f"use_cases[{index}] must be a mapping", path=str(spec_path)))
            continue
        for field in ("id", "name", "trigger_examples", "required_inputs", "output_contract", "done_looks_like"):
            if field not in use_case or use_case[field] in (None, "", []):
                findings.append(_finding("use_case_field_missing", f"use_cases[{index}] missing {field}", path=str(spec_path)))

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "skill_spec", "status": status, "path": str(spec_path), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate skill_spec.yaml")
    parser.add_argument("spec_path", help="Path to skill_spec.yaml")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()
    report = validate_skill_spec(args.spec_path)
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Skill spec validation: {report['status']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
