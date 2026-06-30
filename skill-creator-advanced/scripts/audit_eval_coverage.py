#!/usr/bin/env python3
"""Audit trigger and functional eval coverage for a skill."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


REQUIRED_TAGS = {
    "should-trigger",
    "should-not-trigger",
    "near-miss",
    "overlap-neighbor",
    "happy-path",
    "edge-case",
    "failure-mode",
}
REQUIRED_LANGUAGES = {"zh", "en", "mixed"}


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def _load_eval_file(skill_dir: Path) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    evals_path = skill_dir / "assets" / "evals" / "evals.json"
    findings: list[dict[str, Any]] = []
    try:
        data = json.loads(evals_path.read_text(encoding="utf-8"))
    except OSError as exc:
        return None, [_finding("evals_unreadable", f"Cannot read evals.json: {exc}", path=str(evals_path))]
    except json.JSONDecodeError as exc:
        return None, [_finding("evals_invalid_json", f"Invalid JSON: {exc}", path=str(evals_path))]
    if not isinstance(data, dict):
        findings.append(_finding("evals_not_object", "evals.json root must be a JSON object", path=str(evals_path)))
        return None, findings
    return data, findings


def audit_eval_coverage(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    evals_path = skill_dir / "assets" / "evals" / "evals.json"
    data, findings = _load_eval_file(skill_dir)
    if data is None:
        return {"audit": "eval_coverage", "status": "BLOCKED", "skill_path": str(skill_dir), "findings": findings}

    evals = data.get("evals")
    if not isinstance(evals, list) or not evals:
        findings.append(_finding("evals_missing_cases", "evals.json must contain a non-empty evals array", path=str(evals_path)))
        evals = []

    seen_tags: set[str] = set()
    seen_languages: set[str] = set()
    for index, item in enumerate(evals):
        if not isinstance(item, dict):
            findings.append(_finding("eval_case_not_object", f"evals[{index}] must be an object", path=str(evals_path)))
            continue
        tags = item.get("coverage_tags", [])
        if isinstance(tags, list):
            seen_tags.update(str(tag) for tag in tags)
        else:
            findings.append(_finding("eval_case_tags_invalid", f"evals[{index}].coverage_tags must be an array", path=str(evals_path)))

        language = item.get("language")
        if isinstance(language, str) and language.strip():
            seen_languages.add(language.strip())
        else:
            findings.append(_finding("eval_case_language_missing", f"evals[{index}].language is required", path=str(evals_path)))

        for field in ("prompt", "expected_output", "expectations"):
            if field not in item:
                findings.append(_finding("eval_case_field_missing", f"evals[{index}] missing {field}", path=str(evals_path)))

    missing_tags = sorted(REQUIRED_TAGS - seen_tags)
    if missing_tags:
        findings.append(_finding("eval_coverage_tags_missing", f"Missing coverage tags: {', '.join(missing_tags)}", path=str(evals_path)))

    missing_languages = sorted(REQUIRED_LANGUAGES - seen_languages)
    if missing_languages:
        findings.append(_finding("eval_coverage_languages_missing", f"Missing eval languages: {', '.join(missing_languages)}", path=str(evals_path)))

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {
        "audit": "eval_coverage",
        "status": status,
        "skill_path": str(skill_dir),
        "seen_tags": sorted(seen_tags),
        "seen_languages": sorted(seen_languages),
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit skill eval coverage")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_eval_coverage(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Eval coverage audit: {report['status']}")

    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
