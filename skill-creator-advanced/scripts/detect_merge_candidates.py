#!/usr/bin/env python3
"""Detect skill pairs that may be merge candidates."""

from __future__ import annotations

import argparse
import json
import re
from itertools import combinations
from pathlib import Path
from typing import Any

import yaml


TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)


def _tokens(text: str) -> set[str]:
    return {token.lower() for token in TOKEN_RE.findall(text) if len(token) > 1}


def _skills(repo_root: Path) -> list[dict[str, Any]]:
    root = repo_root / "skills" if (repo_root / "skills").exists() else repo_root
    result = []
    for skill_md in root.glob("*/SKILL.md"):
        text = skill_md.read_text(encoding="utf-8")
        fm = yaml.safe_load(text.split("---\n", 2)[1]) if text.startswith("---\n") else {}
        fm = fm if isinstance(fm, dict) else {}
        result.append({"name": str(fm.get("name", skill_md.parent.name)), "path": str(skill_md.parent), "surface": f"{fm.get('name', '')} {fm.get('description', '')}"})
    return result


def detect_merge_candidates(repo_root: Path | str, *, threshold: float = 0.28) -> dict[str, Any]:
    repo_root = Path(repo_root).resolve()
    candidates = []
    for left, right in combinations(_skills(repo_root), 2):
        lt = _tokens(left["surface"])
        rt = _tokens(right["surface"])
        score = len(lt & rt) / (len(lt | rt) or 1)
        if score >= threshold:
            candidates.append(
                {
                    "skills": [left["name"], right["name"]],
                    "score": round(score, 4),
                    "reason": "High lexical overlap in name/description surface",
                    "recommendation": "review-for-merge-or-boundary-tightening",
                    "confidence": round(min(0.95, score + 0.35), 2),
                }
            )
    return {"status": "PASS", "repo_root": str(repo_root), "merge_candidates": sorted(candidates, key=lambda item: item["score"], reverse=True)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Detect merge candidates")
    parser.add_argument("repo_root")
    parser.add_argument("--threshold", type=float, default=0.28)
    args = parser.parse_args()
    print(json.dumps(detect_merge_candidates(args.repo_root, threshold=args.threshold), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
