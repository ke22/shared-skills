#!/usr/bin/env python3
"""Generate a repo-level ROI dashboard from benchmark artifacts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def _recommend(delta: float, token_delta: float) -> str:
    if delta >= 0.2 and token_delta <= 5000:
        return "invest"
    if delta >= 0:
        return "keep"
    if delta < -0.1:
        return "deprecate"
    return "shrink"


def generate_roi_dashboard(repo_root: Path | str, out: Path | str) -> Path:
    repo_root = Path(repo_root).resolve()
    rows = []
    for benchmark in repo_root.glob("skills/*-workspace/iteration-*/benchmark.json"):
        try:
            data = json.loads(benchmark.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        comparison = data.get("comparison", {}) if isinstance(data, dict) else {}
        delta = float(comparison.get("pass_rate_delta", 0) or 0)
        token_delta = float(comparison.get("token_delta", 0) or 0)
        rows.append((benchmark.parts[-3].replace("-workspace", ""), delta, token_delta, _recommend(delta, token_delta), benchmark))
    lines = ["# Skill ROI Dashboard", "", "| Skill | Pass-rate delta | Token delta | Recommendation | Evidence |", "|---|---:|---:|---|---|"]
    for skill, delta, token_delta, recommendation, benchmark in rows:
        lines.append(f"| {skill} | {delta:.2f} | {token_delta:.0f} | {recommendation} | `{benchmark}` |")
    if not rows:
        lines.append("| n/a | 0.00 | 0 | keep | No benchmark artifacts found |")
    out_path = Path(out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate ROI dashboard")
    parser.add_argument("repo_root")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    path = generate_roi_dashboard(args.repo_root, args.out)
    print(f"Wrote {path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
