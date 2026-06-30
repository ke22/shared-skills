#!/usr/bin/env python3
"""Audit semantic SKILL.md structure and workflow step contracts.

This is stricter than format_check.py. It checks that required semantic blocks
exist as real blocks, and that workflow steps contain Action/Input/Output/
Validation fields instead of merely mentioning those words somewhere else.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import yaml


REQUIRED_FRONTMATTER = ("name", "description", "version")
REQUIRED_BLOCKS = (
    "role",
    "decision_boundary",
    "workflow",
    "output_contract",
    "default_follow_through_policy",
)
WORKFLOW_FIELDS = ("Action", "Input", "Output", "Validation")
STEP_HEADING_RE = re.compile(r"^Step\s+(?:\d+|N)\s*:", re.IGNORECASE)


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def _extract_frontmatter_and_body(text: str) -> tuple[dict[str, Any], str]:
    if not text.startswith("---\n"):
        raise ValueError("SKILL.md must start with YAML frontmatter")
    parts = text.split("---\n", 2)
    if len(parts) != 3:
        raise ValueError("SKILL.md frontmatter must have an opening and closing --- delimiter")
    frontmatter = yaml.safe_load(parts[1])
    if not isinstance(frontmatter, dict):
        raise ValueError("SKILL.md frontmatter must be a YAML mapping")
    return frontmatter, parts[2]


def _extract_block(body: str, tag: str) -> str | None:
    match = re.search(rf"<{tag}>\s*(.*?)\s*</{tag}>", body, flags=re.IGNORECASE | re.DOTALL)
    if match is None:
        return None
    return match.group(1).strip()


def _looks_like_placeholder(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True
    if re.fullmatch(r"\[?TODO:?.*?\]?", stripped, flags=re.IGNORECASE | re.DOTALL):
        return True
    return False


def _split_workflow_steps(workflow: str) -> list[tuple[str, str]]:
    steps: list[tuple[str, str]] = []
    current_heading: str | None = None
    current_lines: list[str] = []

    for line in workflow.splitlines():
        if STEP_HEADING_RE.match(line.strip()):
            if current_heading is not None:
                steps.append((current_heading, "\n".join(current_lines).strip()))
            current_heading = line.strip()
            current_lines = []
            continue
        if current_heading is not None:
            current_lines.append(line)

    if current_heading is not None:
        steps.append((current_heading, "\n".join(current_lines).strip()))

    return steps


def _has_field(step_body: str, field: str) -> bool:
    return re.search(rf"^\s*-\s*{field}\s*:", step_body, flags=re.IGNORECASE | re.MULTILINE) is not None


def audit_structure(skill_dir: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    skill_md = skill_dir / "SKILL.md"
    findings: list[dict[str, Any]] = []

    try:
        text = skill_md.read_text(encoding="utf-8")
    except OSError as exc:
        return {
            "audit": "structure",
            "status": "BLOCKED",
            "skill_path": str(skill_dir),
            "findings": [_finding("skill_md_unreadable", f"Cannot read SKILL.md: {exc}", "error", str(skill_md))],
        }

    try:
        frontmatter, body = _extract_frontmatter_and_body(text)
    except (ValueError, yaml.YAMLError) as exc:
        return {
            "audit": "structure",
            "status": "FAIL",
            "skill_path": str(skill_dir),
            "findings": [_finding("frontmatter_invalid", str(exc), "error", str(skill_md))],
        }

    for key in REQUIRED_FRONTMATTER:
        value = frontmatter.get(key)
        if not isinstance(value, str) or not value.strip():
            findings.append(
                _finding("frontmatter_required_field_missing", f"Missing non-empty frontmatter field: {key}", path=str(skill_md))
            )

    blocks: dict[str, str] = {}
    for tag in REQUIRED_BLOCKS:
        block = _extract_block(body, tag)
        if block is None:
            findings.append(_finding("semantic_block_missing", f"Missing <{tag}>...</{tag}> block", path=str(skill_md)))
            continue
        if _looks_like_placeholder(block):
            findings.append(_finding("semantic_block_placeholder", f"<{tag}> is empty or only a placeholder", path=str(skill_md)))
            continue
        blocks[tag] = block

    workflow = blocks.get("workflow")
    if workflow is not None:
        steps = _split_workflow_steps(workflow)
        if not steps:
            findings.append(_finding("workflow_step_missing", "<workflow> must contain at least one Step N heading", path=str(skill_md)))
        for heading, step_body in steps:
            for field in WORKFLOW_FIELDS:
                if not _has_field(step_body, field):
                    findings.append(
                        _finding(
                            "workflow_step_field_missing",
                            f"{heading} is missing '- {field}:'",
                            path=str(skill_md),
                        )
                    )

    examples = _extract_block(body, "examples")
    if examples is None:
        findings.append(_finding("worked_example_missing", "Missing <examples>...</examples> block", path=str(skill_md)))
    elif _looks_like_placeholder(examples) or "[TODO" in examples:
        findings.append(_finding("worked_example_placeholder", "<examples> exists but is only a placeholder", path=str(skill_md)))
    else:
        if not re.search(r"^\s*Input\s*:", examples, flags=re.IGNORECASE | re.MULTILINE):
            findings.append(_finding("worked_example_input_missing", "Worked example must include an Input section", path=str(skill_md)))
        if not re.search(r"^\s*Output\s*:", examples, flags=re.IGNORECASE | re.MULTILINE):
            findings.append(_finding("worked_example_output_missing", "Worked example must include an Output section", path=str(skill_md)))

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {
        "audit": "structure",
        "status": status,
        "skill_path": str(skill_dir),
        "required_blocks": list(REQUIRED_BLOCKS),
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit SKILL.md semantic structure")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_structure(Path(args.skill_path))
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Structure audit: {report['status']}")

    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
