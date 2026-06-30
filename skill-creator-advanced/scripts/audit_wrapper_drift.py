#!/usr/bin/env python3
"""Audit host wrapper drift risks.

Host-specific wrappers must stay thin. They may declare host metadata and point
back to the core skill, but they must not fork semantic blocks or workflow
instructions that belong in SKILL.md.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


WRAPPER_DIR_NAMES = ("wrappers", "host-adapters", "adapters", "plugins")
WRAPPER_ROOT_FILES = ("skill.yaml", "plugin.json", ".codex-plugin/plugin.json")
TEXT_EXTS = {".md", ".txt", ".yaml", ".yml", ".json", ".toml"}
FORBIDDEN_CORE_PATTERNS = (
    r"<role>",
    r"<decision_boundary>",
    r"<workflow>",
    r"<output_contract>",
    r"<default_follow_through_policy>",
    r"^Step\s+(?:\d+|N)\s*:",
)
REQUIRED_METADATA_FIELDS = (
    "host",
    "wrapper_version",
    "source_skill_version",
    "source_skill_commit",
    "core_skill_path",
    "generated_at",
)


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def _iter_wrapper_files(skill_dir: Path) -> list[Path]:
    files: list[Path] = []
    for dirname in WRAPPER_DIR_NAMES:
        root = skill_dir / dirname
        if root.exists():
            files.extend(path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in TEXT_EXTS)
    for rel in WRAPPER_ROOT_FILES:
        path = skill_dir / rel
        if path.is_file():
            files.append(path)
    return sorted(set(path.resolve() for path in files))


def _iter_wrapper_dirs(skill_dir: Path) -> list[Path]:
    dirs: list[Path] = []
    for dirname in WRAPPER_DIR_NAMES:
        root = skill_dir / dirname
        if root.is_dir():
            dirs.extend(path for path in root.iterdir() if path.is_dir())
    return sorted(set(path.resolve() for path in dirs))


def _load_metadata(path: Path) -> dict[str, Any] | None:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return loaded if isinstance(loaded, dict) else None


def audit_wrapper_drift(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    findings: list[dict[str, Any]] = []
    wrapper_files = _iter_wrapper_files(skill_dir)

    for path in wrapper_files:
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            findings.append(_finding("wrapper_not_utf8", "Wrapper text file is not UTF-8", path=str(path)))
            continue
        for pattern in FORBIDDEN_CORE_PATTERNS:
            if re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE):
                findings.append(
                    _finding(
                        "wrapper_reimplements_core_workflow",
                        f"Wrapper contains core semantic/workflow pattern {pattern!r}; keep it in SKILL.md",
                        path=str(path),
                    )
                )

    for wrapper_dir in _iter_wrapper_dirs(skill_dir):
        metadata_path = wrapper_dir / "wrapper_metadata.json"
        metadata = _load_metadata(metadata_path)
        if metadata is None:
            findings.append(
                _finding(
                    "wrapper_metadata_missing",
                    "Each host wrapper directory must include wrapper_metadata.json",
                    path=str(metadata_path),
                )
            )
            continue
        missing = [field for field in REQUIRED_METADATA_FIELDS if not str(metadata.get(field, "")).strip()]
        if missing:
            findings.append(
                _finding(
                    "wrapper_metadata_field_missing",
                    f"wrapper_metadata.json missing fields: {', '.join(missing)}",
                    path=str(metadata_path),
                )
            )

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {
        "audit": "wrapper_drift",
        "status": status,
        "skill_path": str(skill_dir),
        "checked_wrapper_files": len(wrapper_files),
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit host wrapper drift")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_wrapper_drift(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Wrapper drift audit: {report['status']} ({report['checked_wrapper_files']} wrapper file(s))")

    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
