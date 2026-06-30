#!/usr/bin/env python3
"""Generate a user-facing skill card from SKILL.md and lifecycle metadata."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import yaml


def _frontmatter(text: str) -> dict[str, object]:
    if not text.startswith("---\n"):
        return {}
    parts = text.split("---\n", 2)
    return yaml.safe_load(parts[1]) if len(parts) == 3 else {}


def _block(text: str, tag: str) -> str:
    match = re.search(rf"<{tag}>\s*(.*?)\s*</{tag}>", text, flags=re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ""


def _bullets_from_boundary(boundary: str, heading: str) -> list[str]:
    lines = boundary.splitlines()
    capture = False
    bullets: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith(heading.lower()):
            capture = True
            continue
        if capture and stripped.endswith(":") and not stripped.startswith("-"):
            break
        if capture and stripped.startswith("- "):
            bullets.append(stripped)
    return bullets


def generate_skill_card(skill_dir: Path | str, out: Path | str) -> Path:
    skill_dir = Path(skill_dir).resolve()
    text = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
    fm = _frontmatter(text)
    boundary = _block(text, "decision_boundary")
    output = _block(text, "output_contract")
    use_when = _bullets_from_boundary(boundary, "Use when")
    do_not = _bullets_from_boundary(boundary, "Do not use when")
    inputs = _bullets_from_boundary(boundary, "Inputs")
    name = str(fm.get("name", skill_dir.name))
    title = name.replace("-", " ").title()
    content = [
        f"# {title}",
        "",
        "## 適合用於",
        *(use_when or ["- 建立、改版或檢核 skill。"]),
        "",
        "## 不適合用於",
        *(do_not or ["- 與 skill 無關的一次性任務。"]),
        "",
        "## 需要你提供",
        *(inputs or ["- 目標任務、使用場景、既有檔案或 repo 結構。"]),
        "",
        "## 會產出",
        "- skill 邊界、workflow、eval plan、release gate 或可套用 patch。",
    ]
    if output:
        content.extend(["", "## 輸出契約摘要", output.splitlines()[0]])
    out_path = Path(out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(content).rstrip() + "\n", encoding="utf-8")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a user-facing skill card")
    parser.add_argument("skill_path")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    path = generate_skill_card(args.skill_path, args.out)
    print(f"Wrote {path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
