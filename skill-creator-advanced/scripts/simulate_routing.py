#!/usr/bin/env python3
"""Simulate simple lexical routing across a skill repository."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import yaml


TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)


def _tokens(text: str) -> set[str]:
    return {token.lower() for token in TOKEN_RE.findall(text) if len(token) > 1}


def _skill_surfaces(repo_root: Path) -> list[dict[str, Any]]:
    roots = [repo_root / "skills", repo_root] if (repo_root / "skills").exists() else [repo_root]
    skills: list[dict[str, Any]] = []
    for root in roots:
        for skill_md in root.glob("*/SKILL.md"):
            text = skill_md.read_text(encoding="utf-8")
            fm = yaml.safe_load(text.split("---\n", 2)[1]) if text.startswith("---\n") else {}
            if not isinstance(fm, dict):
                fm = {}
            name = str(fm.get("name", skill_md.parent.name))
            description = str(fm.get("description", ""))
            skills.append({"skill": name, "path": str(skill_md.parent), "surface": f"{name} {description}"})
    return skills


def _load_queries(queries: Path | str) -> list[Any]:
    query_arg = str(queries)
    query_path = Path(query_arg)
    try:
        is_file = query_path.exists()
    except OSError:
        is_file = False
    if is_file:
        loaded = json.loads(query_path.read_text(encoding="utf-8"))
    else:
        loaded = json.loads(query_arg)
    if isinstance(loaded, dict):
        loaded = loaded.get("queries", [])
    if not isinstance(loaded, list):
        raise ValueError("--queries must be a JSON list, a {queries: [...]} object, or a path to either")
    return loaded


def simulate_routing(repo_root: Path | str, queries_path: Path | str) -> dict[str, Any]:
    repo_root = Path(repo_root).resolve()
    queries = _load_queries(queries_path)
    skills = _skill_surfaces(repo_root)
    results = []
    for item in queries:
        query = item.get("query") if isinstance(item, dict) else str(item)
        expected = item.get("expected_skill") if isinstance(item, dict) else None
        q_tokens = _tokens(query)
        candidates = []
        for skill in skills:
            s_tokens = _tokens(skill["surface"])
            overlap = q_tokens & s_tokens
            denom = len(q_tokens | s_tokens) or 1
            score = len(overlap) / denom
            candidates.append({"skill": skill["skill"], "score": round(score, 4), "matched_terms": sorted(overlap)[:12]})
        candidates.sort(key=lambda entry: entry["score"], reverse=True)
        top = candidates[:5]
        status = "PASS" if expected is None or (top and top[0]["skill"] == expected) else "FAIL"
        if len(top) > 1 and top[0]["score"] - top[1]["score"] < 0.05:
            top[1]["risk"] = "near neighbor"
        results.append({"query": query, "expected_skill": expected, "top_candidates": top, "status": status})
    overall = "PASS" if all(item["status"] == "PASS" for item in results) else "FAIL"
    return {"status": overall, "repo_root": str(repo_root), "results": results}


def main() -> int:
    parser = argparse.ArgumentParser(description="Simulate skill routing")
    parser.add_argument("repo_root")
    parser.add_argument("--queries", required=True, help="JSON list or {queries: [...]}")
    args = parser.parse_args()
    report = simulate_routing(args.repo_root, args.queries)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
