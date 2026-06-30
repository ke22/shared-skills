#!/usr/bin/env python3
"""Run the mechanical release audit pipeline for a skill."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from audit_benchmark import audit_benchmark
from audit_eval_coverage import audit_eval_coverage
from audit_eval_quality import audit_eval_quality
from audit_gate_language import audit_gate_language
from audit_golden_trigger_set import audit_golden_trigger_set
from audit_lifecycle import audit_lifecycle
from audit_lifecycle_state import audit_lifecycle_state
from audit_migration_governance import audit_migration_governance
from audit_semantic_rules import audit_semantic_rules
from audit_semantics import audit_semantics
from audit_skill_references import audit_skill_references
from audit_structure import audit_structure
from audit_surface_drift import audit_surface_drift
from audit_unreferenced_files import audit_unreferenced_files
from audit_workflow_contract import audit_workflow_contract
from audit_wrapper_drift import audit_wrapper_drift
from format_check import FULL_PROFILE, lint_skill
from healthcheck_skill import healthcheck_skill


def _format_check_report(skill_dir: Path) -> dict[str, Any]:
    findings = lint_skill(skill_dir, profile=FULL_PROFILE)
    formatted = [
        {
            "severity": "error" if finding.level == "ERROR" else "warning",
            "code": "format_check",
            "message": finding.message,
            "path": str(finding.path) if finding.path else None,
            "line": finding.line,
        }
        for finding in findings
    ]
    has_errors = any(item["severity"] == "error" for item in formatted)
    return {
        "audit": "format",
        "status": "PASS" if not has_errors else "FAIL",
        "skill_path": str(skill_dir),
        "findings": formatted,
    }


def run_release_gate(
    skill_dir: Path | str,
    *,
    benchmark_path: Path | str | None = None,
    require_benchmark: bool = False,
) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    audits = [
        _format_check_report(skill_dir),
        audit_structure(skill_dir),
        audit_workflow_contract(skill_dir),
        audit_semantics(skill_dir),
        audit_semantic_rules(skill_dir),
        audit_gate_language(skill_dir),
        audit_lifecycle(skill_dir),
        audit_lifecycle_state(skill_dir),
        audit_eval_coverage(skill_dir),
        audit_eval_quality(skill_dir),
        audit_golden_trigger_set(skill_dir),
        audit_wrapper_drift(skill_dir),
        audit_migration_governance(skill_dir),
        audit_surface_drift(skill_dir),
        audit_skill_references(skill_dir),
        audit_unreferenced_files(skill_dir),
        healthcheck_skill(skill_dir),
        audit_benchmark(skill_dir, benchmark_path, require_benchmark=require_benchmark),
    ]
    statuses = [audit["status"] for audit in audits]
    if "BLOCKED" in statuses:
        status = "BLOCKED"
    elif any(item not in {"PASS", "SKIPPED"} for item in statuses):
        status = "FAIL"
    else:
        status = "PASS"
    return {"status": status, "skill_path": str(skill_dir), "audits": audits}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the skill release gate")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--benchmark", help="Path to benchmark.json")
    parser.add_argument(
        "--require-benchmark",
        action="store_true",
        help="Fail when no benchmark artifact is found in --benchmark, benchmark.json, or release evidence",
    )
    parser.add_argument(
        "--require-live-benchmark",
        action="store_true",
        help="Fail unless --benchmark points to a raw benchmark artifact",
    )
    parser.add_argument(
        "--stage",
        choices=("draft", "publish"),
        default="draft",
        help="Release stage label; publish does not require benchmark evidence unless a strict benchmark flag is set",
    )
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    if args.require_live_benchmark and not args.benchmark:
        message = "--require-live-benchmark requires --benchmark <benchmark.json>"
        if args.json:
            print(json.dumps({"status": "BLOCKED", "findings": [{"severity": "error", "code": "live_benchmark_required", "message": message}]}, indent=2, ensure_ascii=False))
        else:
            print(message)
        return 1

    report = run_release_gate(
        Path(args.skill_path),
        benchmark_path=args.benchmark,
        require_benchmark=args.require_benchmark or args.require_live_benchmark,
    )
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for audit in report["audits"]:
            print(f"{audit['audit']}: {audit['status']}")
            for finding in audit.get("findings", []):
                print(f"  [{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Release gate: {report['status']}")

    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
