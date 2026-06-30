#!/usr/bin/env python3
"""Heuristic semantic consistency audit for SKILL.md.

This audit intentionally stays deterministic. It does not try to prove every
semantic claim; it catches high-signal contradictions that checklist-only
reviews tend to miss.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


DANGEROUS_ACTION_TERMS = (
    "delete",
    "remove",
    "publish",
    "release",
    "push",
    "deploy",
    "send",
    "email",
    "payment",
    "prod",
    "production",
    "刪除",
    "移除",
    "發佈",
    "發布",
    "推送",
    "部署",
    "寄信",
    "付款",
    "正式環境",
)
WEAK_WORDS = ("建議", "可以", "可考慮", "盡量", "最好", "should", "may", "can consider")
GATE_WORDS = ("release gate", "readiness gate", "PASS/FAIL", "BLOCKED", "發版門檻", "機械 gate")
MULTI_DELIVERABLE_WORDS = ("、", "/", " and ", "與", "以及")


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def _strip_frontmatter(text: str) -> str:
    if not text.startswith("---\n"):
        return text
    parts = text.split("---\n", 2)
    return parts[2] if len(parts) == 3 else text


def _extract_block(body: str, tag: str) -> str:
    match = re.search(rf"<{tag}>\s*(.*?)\s*</{tag}>", body, flags=re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ""


def _extract_policy_bucket(policy: str, label: str) -> str:
    pattern = rf"^\s*-\s*{re.escape(label)}\s*:\s*(.*?)(?=^\s*-\s*\w.*?:|\Z)"
    match = re.search(pattern, policy, flags=re.IGNORECASE | re.MULTILINE | re.DOTALL)
    return match.group(1).strip() if match else ""


def _contains_any(text: str, words: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(word.lower() in lowered for word in words)


def _line_number(text: str, needle: str) -> int | None:
    idx = text.find(needle)
    if idx < 0:
        return None
    return text[:idx].count("\n") + 1


def audit_semantics(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    skill_md = skill_dir / "SKILL.md"
    findings: list[dict[str, Any]] = []

    try:
        text = skill_md.read_text(encoding="utf-8")
    except OSError as exc:
        return {
            "audit": "semantics",
            "status": "BLOCKED",
            "skill_path": str(skill_dir),
            "findings": [_finding("skill_md_unreadable", f"Cannot read SKILL.md: {exc}", path=str(skill_md))],
        }

    body = _strip_frontmatter(text)
    policy = _extract_block(body, "default_follow_through_policy")
    direct = _extract_policy_bucket(policy, "Directly do")
    ask = _extract_policy_bucket(policy, "Ask first")

    if direct and _contains_any(direct, DANGEROUS_ACTION_TERMS):
        findings.append(
            _finding(
                "dangerous_action_marked_direct",
                "Default follow-through policy allows a dangerous external or destructive action under Directly do",
                path=str(skill_md),
            )
        )

    if direct and ask:
        direct_terms = {term for term in DANGEROUS_ACTION_TERMS if term.lower() in direct.lower()}
        ask_terms = {term for term in DANGEROUS_ACTION_TERMS if term.lower() in ask.lower()}
        overlap = sorted(direct_terms & ask_terms)
        if overlap:
            findings.append(
                _finding(
                    "follow_through_policy_conflict",
                    f"Action terms appear in both Directly do and Ask first: {', '.join(overlap)}",
                    path=str(skill_md),
                )
            )

    for raw_line in body.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if _contains_any(line, GATE_WORDS) and _contains_any(line, WEAK_WORDS):
            findings.append(
                _finding(
                    "gate_rule_softened",
                    f"Gate language is softened by weak wording: {line}",
                    path=str(skill_md),
                )
            )

    if re.search(r"一個\s*skill\s*只.*一件主要工作|one\s+primary\s+job|single responsibility", body, flags=re.IGNORECASE):
        desc_line = next((line.strip() for line in text.splitlines() if line.startswith("description:")), "")
        if desc_line.count("、") >= 5 and not re.search(r"不適用|Do not use|Not this skill", desc_line):
            findings.append(
                _finding(
                    "description_too_many_deliverables",
                    "Description lists many deliverables but does not state a boundary; this can weaken single responsibility",
                    path=str(skill_md),
                )
            )

    if "single source of truth" in body.lower() or "單一真實來源" in body:
        if "quality_checklist.md" in body:
            findings.append(
                _finding(
                    "legacy_checklist_truth_conflict",
                    "SKILL.md still references quality_checklist.md while claiming single source of truth",
                    path=str(skill_md),
                )
            )

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "semantics", "status": status, "skill_path": str(skill_dir), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit SKILL.md semantic consistency")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_semantics(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Semantics audit: {report['status']}")

    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
