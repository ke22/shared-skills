#!/usr/bin/env python3
"""Score skills that may need deprecation or retirement review."""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

import yaml


def score_deprecation_candidates(repo_root: Path | str, *, today: date | None = None) -> dict[str, Any]:
    repo_root = Path(repo_root).resolve()
    root = repo_root / "skills" if (repo_root / "skills").exists() else repo_root
    current = today or date.today()
    results = []
    for skill_md in root.glob("*/SKILL.md"):
        score = 0.0
        reasons = []
        manifest_path = skill_md.parent / "skill_lifecycle.yaml"
        manifest: dict[str, Any] = {}
        if manifest_path.exists():
            loaded = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
            manifest = loaded if isinstance(loaded, dict) else {}
        else:
            score += 0.25
            reasons.append("No lifecycle manifest")
        owner = str(manifest.get("owner", "")).strip()
        if not owner:
            score += 0.2
            reasons.append("No owner")
        status = str(manifest.get("status", ""))
        if status in {"deprecated", "retired"}:
            score += 0.35
            reasons.append(f"Status is {status}")
        lifecycle = manifest.get("lifecycle") if isinstance(manifest.get("lifecycle"), dict) else {}
        next_due = lifecycle.get("next_review_due")
        try:
            if date.fromisoformat(str(next_due)) < current:
                score += 0.15
                reasons.append("Review is overdue")
        except ValueError:
            score += 0.1
            reasons.append("No valid next review date")
        portfolio = manifest.get("portfolio") if isinstance(manifest.get("portfolio"), dict) else {}
        if portfolio.get("deprecated_by"):
            score += 0.25
            reasons.append("Has deprecated_by replacement")
        action = "keep"
        if score >= 0.75:
            action = "deprecate"
        elif score >= 0.45:
            action = "review"
        results.append({"skill": skill_md.parent.name, "deprecation_score": round(min(score, 1.0), 2), "reasons": reasons, "recommended_action": action})
    return {"status": "PASS", "repo_root": str(repo_root), "candidates": sorted(results, key=lambda item: item["deprecation_score"], reverse=True)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Score deprecation candidates")
    parser.add_argument("repo_root")
    args = parser.parse_args()
    print(json.dumps(score_deprecation_candidates(args.repo_root), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
