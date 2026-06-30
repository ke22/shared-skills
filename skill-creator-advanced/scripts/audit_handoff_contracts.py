#!/usr/bin/env python3
"""Audit portfolio handoff contracts declared in lifecycle manifests."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def audit_handoff_contracts(repo_root: Path | str) -> dict[str, Any]:
    repo_root = Path(repo_root).resolve()
    root = repo_root / "skills" if (repo_root / "skills").exists() else repo_root
    skill_names = {path.parent.name for path in root.glob("*/SKILL.md")}
    findings: list[dict[str, Any]] = []
    checked = 0
    for manifest_path in root.glob("*/skill_lifecycle.yaml"):
        checked += 1
        manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        manifest = manifest if isinstance(manifest, dict) else {}
        portfolio = manifest.get("portfolio") if isinstance(manifest.get("portfolio"), dict) else {}
        for target in portfolio.get("hands_off_to", []) or []:
            if target not in skill_names:
                findings.append(_finding("handoff_target_missing", f"Handoff target does not exist: {target}", path=str(manifest_path)))
        handoff = manifest.get("handoff")
        if handoff and not isinstance(handoff, dict):
            findings.append(_finding("handoff_contract_invalid", "handoff contract must be a mapping with from/to/when/payload", path=str(manifest_path)))
        if isinstance(handoff, dict):
            for field in ("from", "to", "when", "payload"):
                if field not in handoff:
                    findings.append(_finding("handoff_contract_field_missing", f"handoff missing {field}", path=str(manifest_path)))
    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "handoff_contracts", "status": status, "repo_root": str(repo_root), "checked": checked, "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit skill handoff contracts")
    parser.add_argument("repo_root")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = audit_handoff_contracts(args.repo_root)
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Handoff contracts audit: {report['status']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
