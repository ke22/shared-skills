#!/usr/bin/env python3
"""Audit public description drift between SKILL.md and catalog-like surfaces."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import yaml


TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)


def _tokens(text: str) -> set[str]:
    return {token.lower() for token in TOKEN_RE.findall(text) if len(token) > 1}


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def audit_surface_drift(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    findings: list[dict[str, Any]] = []
    text = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
    fm = yaml.safe_load(text.split("---\n", 2)[1]) if text.startswith("---\n") else {}
    fm = fm if isinstance(fm, dict) else {}
    description = str(fm.get("description", ""))
    base = _tokens(description)
    surfaces = [
        skill_dir / "skill-card.md",
        skill_dir.parent.parent / "catalog" / "skills.yaml",
        skill_dir.parent.parent / "README.md",
    ]
    for surface in surfaces:
        if not surface.exists():
            continue
        content = surface.read_text(encoding="utf-8")
        if skill_dir.name not in content and str(fm.get("name", skill_dir.name)) not in content:
            continue
        surface_tokens = _tokens(content)
        if base and len(base & surface_tokens) / len(base) < 0.35:
            findings.append(_finding("surface_description_drift", f"Surface may describe a different scope: {surface}", "warning", path=str(surface)))
        if "一次性 prompt" in description and re.search(r"所有\s*prompt|any prompt|all prompts", content, flags=re.IGNORECASE):
            findings.append(_finding("surface_boundary_conflict", "Surface overgeneralizes prompt use despite SKILL.md negative boundary", path=str(surface)))
    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "surface_drift", "status": status, "skill_path": str(skill_dir), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit skill surface drift")
    parser.add_argument("skill_path", nargs="?", default=".")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = audit_surface_drift(args.skill_path)
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Surface drift audit: {report['status']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
