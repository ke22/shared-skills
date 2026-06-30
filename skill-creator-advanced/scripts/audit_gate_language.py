#!/usr/bin/env python3
"""Audit gate precedence language and weak validation bypass wording."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


FORBIDDEN_WEAK_SUCCESS_PHRASES = (
    "Skill is " + "valid!",
    "Skill is " + "valid! (fallback validator without PyYAML)",
)

REQUIRED_SKILL_PHRASES = (
    "任一 final gate、stage gate 或 policy gate 為 FAIL / BLOCKED 時，結論只能是 FAIL 或 BLOCKED",
    "局部 PASS 只可列在定位資訊，且必須明確標註不具放行效力",
)


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def audit_gate_language(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    findings: list[dict[str, Any]] = []

    skill_md = skill_dir / "SKILL.md"
    try:
        skill_text = skill_md.read_text(encoding="utf-8")
    except OSError as exc:
        return {
            "audit": "gate_language",
            "status": "BLOCKED",
            "skill_path": str(skill_dir),
            "findings": [_finding("skill_md_unreadable", f"Cannot read SKILL.md: {exc}", path=str(skill_md))],
        }

    for phrase in REQUIRED_SKILL_PHRASES:
        if phrase not in skill_text:
            findings.append(
                _finding(
                    "gate_precedence_rule_missing",
                    f"SKILL.md must include fail-first gate precedence wording: {phrase}",
                    path=str(skill_md),
                )
            )

    scripts_dir = skill_dir / "scripts"
    if scripts_dir.exists():
        for script in sorted(scripts_dir.glob("*.py")):
            try:
                text = script.read_text(encoding="utf-8")
            except OSError:
                continue
            for phrase in FORBIDDEN_WEAK_SUCCESS_PHRASES:
                if phrase in text:
                    findings.append(
                        _finding(
                            "weak_validation_bypass_phrase",
                            f"Weak validation entrypoint must not use release-like success wording: {phrase}",
                            path=str(script),
                        )
                    )

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "gate_language", "status": status, "skill_path": str(skill_dir), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit fail-first gate language and bypass wording")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_gate_language(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Gate language audit: {report['status']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
