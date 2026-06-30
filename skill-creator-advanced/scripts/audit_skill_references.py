#!/usr/bin/env python3
"""Check local skill references that break after standalone packaging.

By default this script scans:
- SKILL.md
- references/**/*.md

It validates that any referenced local paths under scripts/, references/, or
assets/ actually exist inside the skill folder.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

PATH_REFERENCE_PATTERN = re.compile(
    r"(?<![\w/.-])((?:scripts|references|assets)/[A-Za-z0-9_./-]*[A-Za-z0-9_-]\.[A-Za-z0-9_-]+)"
)
SOURCE_REFERENCE_GLOBS = ("SKILL.md", "references/**/*.md")


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


def audit_skill_references(skill_path: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_path).resolve()
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return {
            "audit": "skill_references",
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
            "audit": "skill_references",
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

    findings: list[dict[str, Any]] = []
    for source in sources:
        try:
            content = source.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            rel_source = source.relative_to(skill_dir).as_posix()
            findings.append(
                {
                    "severity": "error",
                    "code": "invalid_utf8_source",
                    "message": f"{rel_source}: {exc}",
                    "path": str(source),
                }
            )
            continue

        rel_source = source.relative_to(skill_dir).as_posix()
        for match in PATH_REFERENCE_PATTERN.finditer(content):
            prefix = content[max(0, match.start() - 24) : match.start()]
            if prefix.endswith("--out ") or prefix.endswith("--output "):
                continue
            token = _clean_token(match.group(1))
            if any(marker in token for marker in ("<", ">", "*", "{", "}")):
                continue
            if not (skill_dir / token).exists():
                findings.append(
                    {
                        "severity": "error",
                        "code": "missing_referenced_path",
                        "message": f"{rel_source}:{token}",
                        "path": str(source),
                        "referenced_path": token,
                    }
                )

    unique_findings = []
    seen = set()
    for finding in findings:
        key = (finding["code"], finding["message"])
        if key in seen:
            continue
        seen.add(key)
        unique_findings.append(finding)

    return {
        "audit": "skill_references",
        "status": "FAIL" if any(item["severity"] == "error" for item in unique_findings) else "PASS",
        "skill_path": str(skill_dir),
        "source_count": len(sources),
        "findings": unique_findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate that SKILL.md local path references exist inside the skill folder"
    )
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_skill_references(args.skill_path)
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    elif report["status"] == "PASS":
        print(f"Skill reference audit passed: 0 issues across {report['source_count']} source file(s)")
    else:
        for finding in report["findings"]:
            if finding["code"] == "missing_referenced_path":
                print(f"missing_referenced_path:{finding['message']}")
            else:
                print(f"{finding['code']}:{finding['message']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
