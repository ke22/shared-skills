#!/usr/bin/env python3
"""Run the required audit gate when a skill authoring stage completes."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from release_gate import run_release_gate


PUBLISH_STAGES = {"package", "publish"}
AUTHORING_STAGES = {"create", "revise", "merge", "split", "deprecate"}
ALL_STAGES = sorted(AUTHORING_STAGES | PUBLISH_STAGES)


def run_stage_gate(
    skill_dir: Path | str,
    *,
    stage: str,
    benchmark_path: Path | str | None = None,
    require_benchmark: bool = False,
    require_live_benchmark: bool = False,
) -> dict[str, Any]:
    """Run the stage-appropriate gate and return a machine-readable report."""

    if stage not in ALL_STAGES:
        return {
            "status": "BLOCKED",
            "stage": stage,
            "findings": [
                {
                    "severity": "error",
                    "code": "unknown_stage",
                    "message": f"Unknown stage {stage!r}; expected one of: {', '.join(ALL_STAGES)}",
                }
            ],
        }

    if require_live_benchmark and benchmark_path is None:
        return {
            "status": "BLOCKED",
            "stage": stage,
            "findings": [
                {
                    "severity": "error",
                    "code": "live_benchmark_required",
                    "message": "--require-live-benchmark requires --benchmark <benchmark.json>",
                }
            ],
        }

    gate = run_release_gate(
        skill_dir,
        benchmark_path=benchmark_path,
        require_benchmark=require_benchmark or require_live_benchmark,
    )
    return {
        "stage": stage,
        "status": gate["status"],
        "skill_path": gate["skill_path"],
        "required_next_action": _required_next_action(stage, gate["status"]),
        "audits": gate["audits"],
    }


def _required_next_action(stage: str, status: str) -> str:
    if status == "PASS":
        if stage in PUBLISH_STAGES:
            return "Proceed to package or publish after preserving release evidence; missing benchmark evidence limits ROI or live-quality claims only."
        return "Proceed to the next authoring stage."
    if status == "BLOCKED":
        return "Stop this stage; resolve blocked prerequisites before continuing."
    return "Enter remediation immediately; do not mark this stage complete."


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the skill stage transition gate")
    parser.add_argument("skill_path", help="Path to the skill folder")
    parser.add_argument("--stage", choices=ALL_STAGES, required=True)
    parser.add_argument("--benchmark", help="Path to a raw benchmark.json artifact")
    parser.add_argument(
        "--require-benchmark",
        action="store_true",
        help="Fail when no benchmark artifact is found in --benchmark, benchmark.json, or release evidence",
    )
    parser.add_argument(
        "--require-live-benchmark",
        action="store_true",
        help="Require --benchmark and audit that live benchmark artifact",
    )
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = run_stage_gate(
        Path(args.skill_path),
        stage=args.stage,
        benchmark_path=args.benchmark,
        require_benchmark=args.require_benchmark,
        require_live_benchmark=args.require_live_benchmark,
    )
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(f"Stage gate ({args.stage}): {report['status']}")
        print(report.get("required_next_action", ""))
        for audit in report.get("audits", []):
            print(f"{audit['audit']}: {audit['status']}")
            for finding in audit.get("findings", []):
                print(f"  [{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        for finding in report.get("findings", []):
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")

    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
