#!/usr/bin/env python3
"""Compatibility entry point for semantic rule linting.

The core implementation lives in audit_semantics.py; this file keeps the
newer, more explicit command name available without duplicating logic.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from audit_semantics import audit_semantics


def audit_semantic_rules(skill_dir: Path | str) -> dict[str, object]:
    report = audit_semantics(Path(skill_dir))
    report["audit"] = "semantic_rules"
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit semantic rule consistency")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to skill folder")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = audit_semantic_rules(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Semantic rules audit: {report['status']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
