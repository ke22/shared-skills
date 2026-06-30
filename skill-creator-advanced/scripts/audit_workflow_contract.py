#!/usr/bin/env python3
"""Audit executable workflow contract details in SKILL.md."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


FIELD_RE = re.compile(r"^\s*-\s*(Action|Input|Output|Validation)\s*:", re.IGNORECASE | re.MULTILINE)
STEP_RE = re.compile(r"^Step\s+(?:\d+|N)\s*:\s*(.*)$", re.IGNORECASE | re.MULTILINE)


def _finding(code: str, message: str, severity: str = "error", path: str | None = None, step: str | None = None) -> dict[str, Any]:
    item: dict[str, Any] = {"severity": severity, "code": code, "message": message, "path": path}
    if step:
        item["step"] = step
    return item


def _extract_tag(text: str, tag: str) -> str:
    match = re.search(rf"<{tag}>\s*(.*?)\s*</{tag}>", text, flags=re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ""


def _split_steps(workflow: str) -> list[tuple[str, str]]:
    matches = list(STEP_RE.finditer(workflow))
    steps: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(workflow)
        heading = match.group(0).strip()
        steps.append((heading, workflow[start:end].strip()))
    return steps


def audit_workflow_contract(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    skill_md = skill_dir / "SKILL.md"
    findings: list[dict[str, Any]] = []

    try:
        text = skill_md.read_text(encoding="utf-8")
    except OSError as exc:
        return {
            "audit": "workflow_contract",
            "status": "BLOCKED",
            "skill_path": str(skill_dir),
            "findings": [_finding("skill_md_unreadable", f"Cannot read SKILL.md: {exc}", path=str(skill_md))],
        }

    workflow = _extract_tag(text, "workflow")
    if not workflow:
        findings.append(_finding("workflow_block_missing", "Missing <workflow> block", path=str(skill_md)))
    else:
        steps = _split_steps(workflow)
        if not steps:
            findings.append(_finding("workflow_steps_unparseable", "No parseable Step headings found", path=str(skill_md)))
        for heading, body in steps:
            present = {match.group(1).lower() for match in FIELD_RE.finditer(body)}
            for required in ("action", "input", "output", "validation"):
                if required not in present:
                    findings.append(
                        _finding(
                            f"workflow_step_missing_{required}",
                            f"{heading} is missing explicit {required.title()} field",
                            path=str(skill_md),
                            step=heading,
                        )
                    )
        if not re.search(r"\b(stop|停止|blocked|阻擋|report|回報)\b", workflow, flags=re.IGNORECASE):
            findings.append(_finding("workflow_stop_condition_missing", "Workflow should include an explicit stop/report condition", path=str(skill_md)))
        if not re.search(r"\b(QA|quality|validate|validation|驗證|檢查)\b", workflow, flags=re.IGNORECASE):
            findings.append(_finding("workflow_qa_pass_missing", "Workflow should include an explicit QA or validation pass", path=str(skill_md)))

    follow = _extract_tag(text, "default_follow_through_policy")
    if not follow:
        findings.append(_finding("follow_through_policy_missing", "Missing <default_follow_through_policy> block", path=str(skill_md)))
    else:
        for label in ("Directly do", "Ask first", "Stop and report"):
            if label.lower() not in follow.lower():
                findings.append(_finding("follow_through_policy_section_missing", f"Missing follow-through section: {label}", path=str(skill_md)))

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "workflow_contract", "status": status, "skill_path": str(skill_dir), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit SKILL.md workflow contract")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_workflow_contract(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Workflow contract audit: {report['status']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
