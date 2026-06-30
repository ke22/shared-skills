#!/usr/bin/env python3
"""Validate example fixtures and optional example outputs."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def run_example_tests(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    examples_dir = skill_dir / "examples"
    findings: list[dict[str, Any]] = []
    checked = 0

    if not examples_dir.exists():
        return {"audit": "example_tests", "status": "FAIL", "skill_path": str(skill_dir), "findings": [_finding("examples_missing", "examples/ directory is required", path=str(examples_dir))]}

    for fixture in sorted(path for path in examples_dir.iterdir() if path.is_dir()):
        input_path = fixture / "input.md"
        expected_path = fixture / "expected_properties.json"
        if not input_path.exists():
            findings.append(_finding("example_input_missing", "Example is missing input.md", path=str(input_path)))
            continue
        if not expected_path.exists():
            findings.append(_finding("example_expected_missing", "Example is missing expected_properties.json", path=str(expected_path)))
            continue
        checked += 1
        try:
            expected = json.loads(expected_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            findings.append(_finding("example_expected_invalid", f"Invalid expected_properties.json: {exc}", path=str(expected_path)))
            continue
        output_path = fixture / "output.md"
        if not output_path.exists():
            findings.append(_finding("example_output_missing", "No output.md to validate; fixture is present but not executed", "warning", path=str(fixture)))
            continue
        output = output_path.read_text(encoding="utf-8")
        for section in expected.get("must_include_sections", []):
            if str(section).lower() not in output.lower():
                findings.append(_finding("example_required_section_missing", f"Output missing section/property: {section}", path=str(output_path)))
        for forbidden in expected.get("must_not_include", []):
            if str(forbidden).lower() in output.lower():
                findings.append(_finding("example_forbidden_text_present", f"Output contains forbidden text: {forbidden}", path=str(output_path)))
        minimum_use_cases = expected.get("minimum_use_cases", 0)
        if isinstance(minimum_use_cases, int) and minimum_use_cases > 0:
            count = len(re.findall(r"\b(use case|使用場景|用例)\b", output, flags=re.IGNORECASE))
            if count < minimum_use_cases:
                findings.append(_finding("example_minimum_use_cases_missing", f"Expected at least {minimum_use_cases} use case mentions", path=str(output_path)))

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "example_tests", "status": status, "skill_path": str(skill_dir), "checked": checked, "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run example-as-test checks")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()
    report = run_example_tests(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Example tests: {report['status']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
