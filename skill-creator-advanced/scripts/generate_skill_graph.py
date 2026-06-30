#!/usr/bin/env python3
"""Generate a portfolio graph from skill lifecycle manifests."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml


EDGE_FIELDS = ("overlaps_with", "hands_off_to", "depends_on", "supersedes", "deprecated_by", "shares_tool_contract_with")


def _skill_dirs(repo_root: Path) -> list[Path]:
    root = repo_root / "skills" if (repo_root / "skills").exists() else repo_root
    return sorted(path.parent for path in root.glob("*/SKILL.md"))


def generate_skill_graph(repo_root: Path | str, out: Path | str | None = None) -> dict[str, Any]:
    repo_root = Path(repo_root).resolve()
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    for skill_dir in _skill_dirs(repo_root):
        manifest_path = skill_dir / "skill_lifecycle.yaml"
        manifest: dict[str, Any] = {}
        if manifest_path.exists():
            loaded = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
            manifest = loaded if isinstance(loaded, dict) else {}
        name = str(manifest.get("name", skill_dir.name))
        nodes.append({"id": name, "path": str(skill_dir), "archetype": manifest.get("archetype"), "status": manifest.get("status")})
        portfolio = manifest.get("portfolio") if isinstance(manifest.get("portfolio"), dict) else {}
        for field in EDGE_FIELDS:
            value = portfolio.get(field)
            values = value if isinstance(value, list) else ([value] if value else [])
            for target in values:
                edges.append({"from": name, "to": target, "type": field})
    graph = {"nodes": nodes, "edges": edges}
    if out:
        out_path = Path(out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(graph, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return graph


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate portfolio skill graph")
    parser.add_argument("repo_root")
    parser.add_argument("--out")
    args = parser.parse_args()
    graph = generate_skill_graph(args.repo_root, args.out)
    print(json.dumps(graph, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
