#!/usr/bin/env python3
"""Audit rename/deprecate/merge/split governance documentation."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


REQUIRED_SECTIONS = (
    "Rename",
    "Deprecate",
    "Merge",
    "Split",
    "Compatibility",
    "Migration Evidence",
)


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def audit_migration_governance(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    doc_path = skill_dir / "references" / "migration-governance.md"
    findings: list[dict[str, Any]] = []

    if not doc_path.exists():
        findings.append(
            _finding(
                "migration_governance_missing",
                "references/migration-governance.md is required for rename/deprecate/merge/split governance",
                path=str(doc_path),
            )
        )
    else:
        text = doc_path.read_text(encoding="utf-8")
        for section in REQUIRED_SECTIONS:
            if not re.search(rf"^#+\s+.*{re.escape(section)}", text, flags=re.IGNORECASE | re.MULTILINE):
                findings.append(
                    _finding(
                        "migration_governance_section_missing",
                        f"Missing section covering {section}",
                        path=str(doc_path),
                    )
                )
        if "[TODO" in text or "TODO:" in text:
            findings.append(_finding("migration_governance_placeholder", "migration governance doc contains TODO placeholders", path=str(doc_path)))

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "migration_governance", "status": status, "skill_path": str(skill_dir), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit skill migration governance")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_migration_governance(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Migration governance audit: {report['status']}")

    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
