#!/usr/bin/env python3
"""Compile rough notes into a starter skill_spec.yaml."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import yaml


def _sentences(text: str) -> list[str]:
    parts = re.split(r"[\n。.!?]+", text)
    return [part.strip(" -\t") for part in parts if len(part.strip(" -\t")) >= 6]


def compile_use_cases(source: Path, out: Path) -> dict[str, object]:
    text = source.read_text(encoding="utf-8")
    candidates = _sentences(text)[:3] or ["[TODO: add a concrete use case]"]
    use_cases = []
    for index, item in enumerate(candidates, start=1):
        use_cases.append(
            {
                "id": f"uc-{index:03d}",
                "name": item[:48],
                "trigger_examples": [item],
                "required_inputs": ["primary job", "2-3 sample tasks"],
                "output_contract": ["draft SKILL.md", "scripts/references/assets plan"],
                "done_looks_like": ["clear in-scope/out-of-scope", "eval suggestions"],
            }
        )
    spec = {
        "name": "[TODO]",
        "description": "[TODO: decision boundary]",
        "archetype": "ops",
        "primary_job": candidates[0],
        "in_scope": candidates,
        "out_of_scope": [],
        "handoff": [],
        "negative_triggers": [],
        "use_cases": use_cases,
        "workflow": [{"step": "Step 1", "input": "use cases", "action": "draft workflow", "output": "SKILL.md structure", "validation": "reviewable sections exist"}],
        "output_contract": ["SKILL.md", "eval plan", "release gate"],
        "tool_policy": [],
        "eval_plan": ["direct", "indirect", "negative trigger cases"],
        "release_gates": ["format", "structure", "workflow_contract", "eval_coverage"],
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(yaml.safe_dump(spec, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return spec


def main() -> int:
    parser = argparse.ArgumentParser(description="Compile notes into skill_spec.yaml")
    parser.add_argument("source_notes", help="Source notes markdown")
    parser.add_argument("--out", required=True, help="Output skill_spec.yaml")
    args = parser.parse_args()
    compile_use_cases(Path(args.source_notes), Path(args.out))
    print(f"Wrote {Path(args.out).resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
