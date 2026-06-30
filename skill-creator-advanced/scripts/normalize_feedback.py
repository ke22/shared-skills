#!/usr/bin/env python3
"""Normalize runtime feedback folders into maintenance categories."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


CATEGORIES = {
    "under-trigger",
    "over-trigger",
    "wrong-output-shape",
    "too-much-clarification",
    "missed-tool-use",
    "unsafe-default-action",
    "too-expensive",
    "stale-reference",
}


def _classify(trace: dict[str, Any], feedback: dict[str, Any]) -> str:
    explicit = str(feedback.get("category") or trace.get("failure_type") or "").strip()
    if explicit in CATEGORIES:
        return explicit
    text = json.dumps({"trace": trace, "feedback": feedback}, ensure_ascii=False).lower()
    if "didn't trigger" in text or "under" in text or "沒觸發" in text:
        return "under-trigger"
    if "wrong skill" in text or "over" in text or "亂觸發" in text:
        return "over-trigger"
    if "format" in text or "shape" in text or "格式" in text:
        return "wrong-output-shape"
    if "tool" in text:
        return "missed-tool-use"
    if "stale" in text or "過期" in text:
        return "stale-reference"
    return "wrong-output-shape"


def normalize_feedback(runs_dir: Path | str, out: Path | str) -> dict[str, Any]:
    runs_dir = Path(runs_dir).resolve()
    counts: Counter[str] = Counter()
    samples = []
    for run_trace in runs_dir.glob("*/run_trace.json"):
        try:
            trace = json.loads(run_trace.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        feedback_path = run_trace.parent / "user_feedback.json"
        feedback = {}
        if feedback_path.exists():
            try:
                feedback = json.loads(feedback_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                feedback = {}
        category = _classify(trace if isinstance(trace, dict) else {}, feedback if isinstance(feedback, dict) else {})
        counts[category] += 1
        samples.append({"run": str(run_trace.parent), "category": category, "selected_skill": trace.get("selected_skill") if isinstance(trace, dict) else None})
    summary = {"runs_dir": str(runs_dir), "category_counts": dict(counts), "samples": samples}
    out_path = Path(out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize consumer feedback")
    parser.add_argument("runs_dir")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    print(json.dumps(normalize_feedback(args.runs_dir, args.out), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
