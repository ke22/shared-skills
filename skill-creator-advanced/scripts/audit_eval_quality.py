#!/usr/bin/env python3
"""Audit eval case quality beyond mere coverage tags."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


MIN_PROMPT_CHARS = 24
MIN_EXPECTED_CHARS = 24
MIN_EXPECTATION_CHARS = 8


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def _has_placeholder(value: Any) -> bool:
    return "[TODO" in str(value) or "TODO:" in str(value)


def audit_eval_quality(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    evals_path = skill_dir / "assets" / "evals" / "evals.json"
    findings: list[dict[str, Any]] = []

    try:
        data = json.loads(evals_path.read_text(encoding="utf-8"))
    except OSError as exc:
        return {
            "audit": "eval_quality",
            "status": "BLOCKED",
            "skill_path": str(skill_dir),
            "findings": [_finding("evals_unreadable", f"Cannot read evals.json: {exc}", path=str(evals_path))],
        }
    except json.JSONDecodeError as exc:
        return {
            "audit": "eval_quality",
            "status": "BLOCKED",
            "skill_path": str(skill_dir),
            "findings": [_finding("evals_invalid_json", f"Invalid JSON: {exc}", path=str(evals_path))],
        }

    evals = data.get("evals", [])
    if not isinstance(evals, list) or not evals:
        findings.append(_finding("evals_missing_cases", "evals.json must contain a non-empty evals array", path=str(evals_path)))
        evals = []

    seen_prompts: dict[str, int] = {}
    for index, item in enumerate(evals):
        if not isinstance(item, dict):
            findings.append(_finding("eval_case_not_object", f"evals[{index}] must be an object", path=str(evals_path)))
            continue

        prompt = str(item.get("prompt", "")).strip()
        expected = str(item.get("expected_output", "")).strip()
        expectations = item.get("expectations", [])

        if len(prompt) < MIN_PROMPT_CHARS:
            findings.append(_finding("eval_prompt_too_short", f"evals[{index}].prompt is too short to be realistic", path=str(evals_path)))
        if len(expected) < MIN_EXPECTED_CHARS:
            findings.append(_finding("eval_expected_output_too_short", f"evals[{index}].expected_output is too short", path=str(evals_path)))
        if _has_placeholder(item):
            findings.append(_finding("eval_placeholder_left", f"evals[{index}] still contains TODO placeholder text", path=str(evals_path)))
        if not isinstance(expectations, list) or not expectations:
            findings.append(_finding("eval_expectations_missing", f"evals[{index}].expectations must be a non-empty array", path=str(evals_path)))
        else:
            for exp_index, expectation in enumerate(expectations):
                if len(str(expectation).strip()) < MIN_EXPECTATION_CHARS:
                    findings.append(
                        _finding(
                            "eval_expectation_too_weak",
                            f"evals[{index}].expectations[{exp_index}] is too short to verify",
                            path=str(evals_path),
                        )
                    )

        normalized_prompt = " ".join(prompt.lower().split())
        if normalized_prompt in seen_prompts:
            findings.append(
                _finding(
                    "eval_prompt_duplicate",
                    f"evals[{index}].prompt duplicates evals[{seen_prompts[normalized_prompt]}].prompt",
                    path=str(evals_path),
                )
            )
        else:
            seen_prompts[normalized_prompt] = index

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "eval_quality", "status": status, "skill_path": str(skill_dir), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit eval case quality")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_eval_quality(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Eval quality audit: {report['status']}")

    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
