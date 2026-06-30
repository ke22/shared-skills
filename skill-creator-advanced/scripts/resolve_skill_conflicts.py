#!/usr/bin/env python3
"""Suggest concrete fixes for skill overlap conflicts."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from detect_merge_candidates import detect_merge_candidates


def resolve_skill_conflicts(repo_root: Path | str) -> dict[str, object]:
    detected = detect_merge_candidates(repo_root)
    suggestions = []
    for item in detected["merge_candidates"]:
        left, right = item["skills"]
        suggestions.append(
            {
                "skills": [left, right],
                "actions": [
                    f"Add negative trigger examples to {left} for requests owned by {right}.",
                    f"Add negative trigger examples to {right} for requests owned by {left}.",
                    "If output contracts are the same, run plan_skill_fusion.py.",
                    "If one skill supersedes the other, mark the older skill deprecated and generate a migration guide.",
                ],
            }
        )
    return {"status": "PASS", "repo_root": str(Path(repo_root).resolve()), "suggestions": suggestions}


def main() -> int:
    parser = argparse.ArgumentParser(description="Resolve skill conflicts")
    parser.add_argument("repo_root")
    args = parser.parse_args()
    print(json.dumps(resolve_skill_conflicts(args.repo_root), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
