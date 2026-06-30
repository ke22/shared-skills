#!/usr/bin/env python3
"""Audit the golden trigger prompt set.

The trigger set is intentionally separate from generic eval coverage. It checks
the routing-improvement dataset shape: direct, indirect, and negative prompts
must all be present and stable enough to rerun across skill revisions.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


REQUIRED_TRIGGER_CLASSES = {"direct", "indirect", "negative"}
MIN_CASES_PER_CLASS = {
    "direct": 2,
    "indirect": 2,
    "negative": 1,
}


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def _load_eval_file(skill_dir: Path) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    evals_path = skill_dir / "assets" / "evals" / "evals.json"
    try:
        data = json.loads(evals_path.read_text(encoding="utf-8"))
    except OSError as exc:
        return None, [_finding("evals_unreadable", f"Cannot read evals.json: {exc}", path=str(evals_path))]
    except json.JSONDecodeError as exc:
        return None, [_finding("evals_invalid_json", f"Invalid JSON: {exc}", path=str(evals_path))]
    if not isinstance(data, dict):
        return None, [_finding("evals_not_object", "evals.json root must be a JSON object", path=str(evals_path))]
    return data, []


def audit_golden_trigger_set(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    evals_path = skill_dir / "assets" / "evals" / "evals.json"
    data, findings = _load_eval_file(skill_dir)
    if data is None:
        return {"audit": "golden_trigger_set", "status": "BLOCKED", "skill_path": str(skill_dir), "findings": findings}

    evals = data.get("evals")
    if not isinstance(evals, list) or not evals:
        findings.append(_finding("evals_missing_cases", "evals.json must contain a non-empty evals array", path=str(evals_path)))
        evals = []

    class_counts = {trigger_class: 0 for trigger_class in REQUIRED_TRIGGER_CLASSES}
    seen_ids: set[str] = set()
    seen_prompts: dict[str, int] = {}

    for index, item in enumerate(evals):
        if not isinstance(item, dict):
            findings.append(_finding("eval_case_not_object", f"evals[{index}] must be an object", path=str(evals_path)))
            continue

        eval_id = str(item.get("id", "")).strip()
        if not eval_id:
            findings.append(_finding("golden_eval_id_missing", f"evals[{index}].id is required for a stable golden set", path=str(evals_path)))
        elif eval_id in seen_ids:
            findings.append(_finding("golden_eval_id_duplicate", f"duplicate eval id: {eval_id}", path=str(evals_path)))
        else:
            seen_ids.add(eval_id)

        prompt = str(item.get("prompt", "")).strip()
        normalized_prompt = " ".join(prompt.lower().split())
        if not prompt:
            findings.append(_finding("golden_prompt_missing", f"evals[{index}].prompt is required", path=str(evals_path)))
        elif normalized_prompt in seen_prompts:
            findings.append(
                _finding(
                    "golden_prompt_duplicate",
                    f"evals[{index}].prompt duplicates evals[{seen_prompts[normalized_prompt]}].prompt",
                    path=str(evals_path),
                )
            )
        else:
            seen_prompts[normalized_prompt] = index

        if "[TODO" in str(item) or "TODO:" in str(item):
            findings.append(_finding("golden_prompt_placeholder", f"evals[{index}] contains TODO placeholder text", path=str(evals_path)))

        trigger_class = str(item.get("trigger_class", "")).strip()
        if trigger_class not in REQUIRED_TRIGGER_CLASSES:
            findings.append(
                _finding(
                    "trigger_class_invalid",
                    f"evals[{index}].trigger_class must be one of: {', '.join(sorted(REQUIRED_TRIGGER_CLASSES))}",
                    path=str(evals_path),
                )
            )
            continue

        class_counts[trigger_class] += 1
        tags = item.get("coverage_tags", [])
        tags = {str(tag) for tag in tags} if isinstance(tags, list) else set()
        if trigger_class == "negative" and "should-not-trigger" not in tags:
            findings.append(
                _finding(
                    "negative_class_missing_negative_tag",
                    f"evals[{index}] is negative but lacks should-not-trigger coverage tag",
                    path=str(evals_path),
                )
            )
        if trigger_class in {"direct", "indirect"} and "should-trigger" not in tags:
            findings.append(
                _finding(
                    "positive_class_missing_trigger_tag",
                    f"evals[{index}] is {trigger_class} but lacks should-trigger coverage tag",
                    path=str(evals_path),
                )
            )

    for trigger_class, minimum in MIN_CASES_PER_CLASS.items():
        if class_counts[trigger_class] < minimum:
            findings.append(
                _finding(
                    "trigger_class_minimum_not_met",
                    f"trigger_class {trigger_class!r} has {class_counts[trigger_class]} case(s), expected at least {minimum}",
                    path=str(evals_path),
                )
            )

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {
        "audit": "golden_trigger_set",
        "status": status,
        "skill_path": str(skill_dir),
        "class_counts": class_counts,
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit direct/indirect/negative golden trigger prompts")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_golden_trigger_set(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(
            "Golden trigger set audit: "
            f"{report['status']} "
            f"(direct={report.get('class_counts', {}).get('direct', 0)}, "
            f"indirect={report.get('class_counts', {}).get('indirect', 0)}, "
            f"negative={report.get('class_counts', {}).get('negative', 0)})"
        )

    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
