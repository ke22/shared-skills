#!/usr/bin/env python3
"""Find local skill files that are never referenced from skill docs.

By default this script scans references from:
- SKILL.md
- references/**/*.md

It then compares those references against actual files under:
- scripts/
- references/
- assets/

Use --ignore with repo-relative glob patterns for intentionally retained files.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import re
from pathlib import Path
from typing import Any

PATH_REFERENCE_PATTERN = re.compile(
    r"(?<![\w/.-])((?:scripts|references|assets)/[A-Za-z0-9_./-]*[A-Za-z0-9_-]\.[A-Za-z0-9_-]+)"
)
SOURCE_REFERENCE_GLOBS = ("SKILL.md", "references/**/*.md")
TARGET_DIRS = ("scripts", "references", "assets")
DEFAULT_IGNORE_PATTERNS = (
    "references/quality_checklist.md",
)


def _iter_reference_sources(skill_dir: Path) -> list[Path]:
    sources: list[Path] = []
    for pattern in SOURCE_REFERENCE_GLOBS:
        if "*" in pattern:
            sources.extend(path for path in skill_dir.glob(pattern) if path.is_file())
        else:
            path = skill_dir / pattern
            if path.is_file():
                sources.append(path)
    return sorted(set(path.resolve() for path in sources))


def _clean_token(token: str) -> str:
    cleaned = token.rstrip(".,:;`)\"'")
    while cleaned.endswith("/"):
        cleaned = cleaned[:-1]
    return cleaned


def _should_skip_output_reference(prefix: str) -> bool:
    return prefix.endswith("--out ") or prefix.endswith("--output ")


def _matches_any(path: str, patterns: tuple[str, ...] | list[str]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)


def _collect_referenced_files(skill_dir: Path, sources: list[Path]) -> set[str]:
    referenced: set[str] = set()
    for source in sources:
        content = source.read_text(encoding="utf-8")
        for match in PATH_REFERENCE_PATTERN.finditer(content):
            prefix = content[max(0, match.start() - 24) : match.start()]
            if _should_skip_output_reference(prefix):
                continue
            token = _clean_token(match.group(1))
            if any(marker in token for marker in ("<", ">", "*", "{", "}")):
                continue
            candidate = skill_dir / token
            if candidate.is_file():
                referenced.add(candidate.relative_to(skill_dir).as_posix())
    return referenced


def _iter_target_files(skill_dir: Path) -> list[Path]:
    targets: list[Path] = []
    for target_dir in TARGET_DIRS:
        root = skill_dir / target_dir
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(skill_dir)
            if "__pycache__" in rel.parts or path.suffix == ".pyc" or path.name == ".DS_Store":
                continue
            targets.append(path.resolve())
    return sorted(targets)


def audit_unreferenced_files(skill_path: Path | str, *, ignore: list[str] | tuple[str, ...] = ()) -> dict[str, Any]:
    skill_dir = Path(skill_path).resolve()
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return {
            "audit": "unreferenced_files",
            "status": "FAIL",
            "skill_path": str(skill_dir),
            "findings": [
                {
                    "severity": "error",
                    "code": "missing_skill_md",
                    "message": f"Missing SKILL.md: {skill_md}",
                    "path": str(skill_md),
                }
            ],
        }

    sources = _iter_reference_sources(skill_dir)
    if not sources:
        return {
            "audit": "unreferenced_files",
            "status": "FAIL",
            "skill_path": str(skill_dir),
            "findings": [
                {
                    "severity": "error",
                    "code": "reference_sources_missing",
                    "message": "No reference sources found (expected SKILL.md or references/**/*.md)",
                    "path": str(skill_dir),
                }
            ],
        }

    try:
        referenced = _collect_referenced_files(skill_dir, sources)
    except UnicodeDecodeError as exc:
        return {
            "audit": "unreferenced_files",
            "status": "FAIL",
            "skill_path": str(skill_dir),
            "findings": [
                {
                    "severity": "error",
                    "code": "invalid_utf8_source",
                    "message": str(exc),
                    "path": str(skill_dir),
                }
            ],
        }

    ignore_patterns = tuple(DEFAULT_IGNORE_PATTERNS) + tuple(ignore)
    unreferenced: list[str] = []
    for path in _iter_target_files(skill_dir):
        rel_path = path.relative_to(skill_dir).as_posix()
        if _matches_any(rel_path, ignore_patterns):
            continue
        if rel_path not in referenced:
            unreferenced.append(rel_path)

    findings = [
        {
            "severity": "error",
            "code": "unreferenced_file",
            "message": rel_path,
            "path": str(skill_dir / rel_path),
        }
        for rel_path in sorted(set(unreferenced))
    ]
    return {
        "audit": "unreferenced_files",
        "status": "FAIL" if findings else "PASS",
        "skill_path": str(skill_dir),
        "source_count": len(sources),
        "referenced_count": len(referenced),
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Find scripts/references/assets files that are never referenced from SKILL.md or references/**/*.md"
    )
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument(
        "--ignore",
        action="append",
        default=[],
        help="Repo-relative glob pattern to ignore. Can be repeated.",
    )
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_unreferenced_files(args.skill_path, ignore=args.ignore)
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0 if report["status"] == "PASS" else 1

    unreferenced = [finding["message"] for finding in report["findings"] if finding["code"] == "unreferenced_file"]
    if unreferenced:
        for rel_path in unreferenced:
            print(f"unreferenced_file:{rel_path}")
        return 1

    print(
        "Unreferenced file audit passed: "
        f"0 issues across {report['source_count']} source file(s), {report['referenced_count']} referenced file(s)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
