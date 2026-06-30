#!/usr/bin/env python3
"""將簡單的 skill failure record 正規化為 evolution decision seed。"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


CLASSIFICATION_RULES = [
    ("trigger", ("under-trigger", "over-trigger", "routing", "description", "wrong skill")),
    ("tool_contract", ("schema", "argument", "tool call", "api", "mcp", "timeout")),
    ("environment_drift", ("version", "dependency", "path", "permission", "renderer", "api changed")),
    ("safety_policy", ("secret", "credential", "privacy", "delete", "exfiltration", "approval")),
    ("output_contract", ("format", "section", "json", "markdown", "missing field", "wrong order")),
    ("library_drift", ("overlap", "duplicate", "stale", "retire", "merge", "split")),
    ("eval_gap", ("no eval", "regression", "benchmark", "coverage", "test missing")),
]

PATCH_SURFACE = {
    "trigger": "description / negative trigger / handoff 邊界",
    "tool_contract": "tool rules / schema / script validation / approval gate",
    "environment_drift": "compatibility note / reference rule / runtime QA gate",
    "safety_policy": "approval boundary / stop condition / redaction rule",
    "output_contract": "output contract / worked example / functional eval",
    "library_drift": "merge / split / deprecate / retirement policy / overlap eval",
    "eval_gap": "assets/evals/evals.json / regression_gates.json",
    "workflow": "workflow step / validation gate",
}


def load_record(path: str | None) -> dict[str, Any]:
    raw = Path(path).read_text(encoding="utf-8") if path else sys.stdin.read()
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise SystemExit("輸入必須是 JSON object。")
    return data


def classify(record: dict[str, Any]) -> str:
    haystack = " ".join(str(record.get(key, "")) for key in ("summary", "actual", "feedback", "trace_summary", "error")).lower()
    for label, needles in CLASSIFICATION_RULES:
        if any(needle in haystack for needle in needles):
            return label
    return "workflow"


def normalize(record: dict[str, Any]) -> dict[str, Any]:
    required = ["summary", "expected", "actual", "affected_skill"]
    missing = [field for field in required if not record.get(field)]
    classification = classify(record)
    return {
        "status": "blocked" if missing else "ready_for_review",
        "missing_fields": missing,
        "failure_record": {
            "summary": record.get("summary"),
            "affected_skill": record.get("affected_skill"),
            "skill_version": record.get("skill_version", "unknown"),
            "expected": record.get("expected"),
            "actual": record.get("actual"),
            "environment": record.get("environment", "unknown"),
            "severity": record.get("severity", "medium"),
            "reproducibility": record.get("reproducibility", "unknown"),
        },
        "root_cause_candidate": classification,
        "patch_surface_candidate": PATCH_SURFACE[classification],
        "eval_candidate": {
            "type": "trigger" if classification in {"trigger", "library_drift"} else "functional",
            "coverage_tags": [classification, "failure-mode"],
        },
        "review_notes": [
            "修改任何 skill 檔案前，先確認證據足夠。",
            "優先選擇能阻止復發且影響面最小的相容修改。",
            "宣稱失敗已修復前，必須新增或更新 eval coverage。",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("record", nargs="?", help="JSON failure record 的路徑；省略時從 stdin 讀取。")
    parser.add_argument("--pretty", action="store_true", help="以縮排格式輸出 JSON。")
    args = parser.parse_args()
    result = normalize(load_record(args.record))
    print(json.dumps(result, ensure_ascii=False, indent=2 if args.pretty else None))


if __name__ == "__main__":
    main()
