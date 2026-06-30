#!/usr/bin/env python3
"""Generate a migration guide between two skills."""

from __future__ import annotations

import argparse
from pathlib import Path


def generate_migration_guide(old_skill: str, new_skill: str, out: Path | str) -> Path:
    old_name = Path(old_skill).name
    new_name = Path(new_skill).name
    content = f"""# Migration Guide

## 舊用法

`{old_name}` 的既有 trigger、輸入與輸出契約請在退役前盤點。

## 新用法

改用 `{new_name}`，並確認 replacement 已經是 released 狀態。

## Trigger 對照

- `[TODO: old trigger]` -> `[TODO: new trigger]`

## Output contract 差異

- `[TODO: section or field difference]`

## 行為差異

- `[TODO: behavior difference users may notice]`

## 已知不相容

- `[TODO: unsupported old workflow]`
"""
    out_path = Path(out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(content, encoding="utf-8")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate migration guide")
    parser.add_argument("old_skill")
    parser.add_argument("new_skill")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    path = generate_migration_guide(args.old_skill, args.new_skill, args.out)
    print(f"Wrote {path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
