#!/usr/bin/env python3
"""Generate a repo-level lifecycle report."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml


def generate_lifecycle_report(repo_root: Path | str, out: Path | str) -> Path:
    repo_root = Path(repo_root).resolve()
    root = repo_root / "skills" if (repo_root / "skills").exists() else repo_root
    rows: list[dict[str, Any]] = []
    for skill_md in root.glob("*/SKILL.md"):
        manifest_path = skill_md.parent / "skill_lifecycle.yaml"
        manifest: dict[str, Any] = {}
        if manifest_path.exists():
            loaded = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
            manifest = loaded if isinstance(loaded, dict) else {}
        lifecycle = manifest.get("lifecycle") if isinstance(manifest.get("lifecycle"), dict) else {}
        rows.append(
            {
                "skill": manifest.get("name", skill_md.parent.name),
                "status": manifest.get("status", "unknown"),
                "owner": manifest.get("owner"),
                "next_review_due": lifecycle.get("next_review_due"),
            }
        )
    lines = ["# Skill Lifecycle Report", "", "| Skill | Status | Owner | Next review due |", "|---|---|---|---|"]
    for row in sorted(rows, key=lambda item: str(item["skill"])):
        lines.append(f"| {row['skill']} | {row['status']} | {row.get('owner') or ''} | {row.get('next_review_due') or ''} |")
    out_path = Path(out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate lifecycle report")
    parser.add_argument("repo_root")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    path = generate_lifecycle_report(args.repo_root, args.out)
    print(f"Wrote {path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
