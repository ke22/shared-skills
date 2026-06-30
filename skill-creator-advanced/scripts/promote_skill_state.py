#!/usr/bin/env python3
"""Promote a skill lifecycle state when transition evidence exists."""

from __future__ import annotations

import argparse
from datetime import date, timedelta
from pathlib import Path

import yaml


TRANSITIONS = {
    "draft": {"candidate"},
    "candidate": {"validated", "draft"},
    "validated": {"released", "candidate"},
    "released": {"monitored", "needs-maintenance", "merge-candidate", "split-candidate", "deprecated"},
    "monitored": {"needs-maintenance", "merge-candidate", "split-candidate", "deprecated"},
    "needs-maintenance": {"validated", "released", "deprecated"},
    "merge-candidate": {"deprecated", "released"},
    "split-candidate": {"deprecated", "released"},
    "deprecated": {"retired", "released"},
    "retired": set(),
}


def promote(skill_dir: Path, target: str, *, write: bool) -> dict[str, object]:
    manifest_path = skill_dir / "skill_lifecycle.yaml"
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("skill_lifecycle.yaml must be a mapping")
    current = str(manifest.get("status", ""))
    if target not in TRANSITIONS.get(current, set()):
        raise ValueError(f"Invalid transition: {current} -> {target}")

    lifecycle = manifest.setdefault("lifecycle", {})
    if not isinstance(lifecycle, dict):
        raise ValueError("lifecycle must be a mapping")
    today = date.today()
    if target in {"validated", "released", "monitored"}:
        lifecycle["last_validated_at"] = today.isoformat()
    if target == "released":
        lifecycle["last_released_at"] = today.isoformat()
    interval = lifecycle.get("review_interval_days", 60)
    if isinstance(interval, int) and interval > 0:
        lifecycle["next_review_due"] = (today + timedelta(days=interval)).isoformat()
    manifest["status"] = target

    if write:
        manifest_path.write_text(yaml.safe_dump(manifest, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return {"from": current, "to": target, "written": write, "path": str(manifest_path)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Promote skill lifecycle status")
    parser.add_argument("skill_path", help="Path to the skill folder")
    parser.add_argument("--to", required=True, help="Target lifecycle state")
    parser.add_argument("--dry-run", action="store_true", help="Validate transition without writing")
    args = parser.parse_args()

    try:
        result = promote(Path(args.skill_path).resolve(), args.to, write=not args.dry_run)
    except Exception as exc:
        print(f"ERROR: {exc}")
        return 1
    print(f"{result['from']} -> {result['to']} ({'dry-run' if args.dry_run else 'written'})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
