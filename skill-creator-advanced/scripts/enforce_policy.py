#!/usr/bin/env python3
"""Enforce a YAML release policy against release gate results."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import yaml

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from release_gate import run_release_gate


def enforce_policy(skill_dir: Path | str, policy_path: Path | str) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    policy = yaml.safe_load(Path(policy_path).read_text(encoding="utf-8"))
    release_policy = policy.get("release_policy", policy) if isinstance(policy, dict) else {}
    required = set(release_policy.get("required_checks", []))
    gate = run_release_gate(skill_dir)
    statuses = {audit["audit"]: audit["status"] for audit in gate["audits"]}
    findings = []
    for check in sorted(required):
        if check not in statuses:
            findings.append({"severity": "error", "code": "required_check_missing", "message": f"Policy required check not run: {check}"})
        elif statuses[check] != "PASS":
            findings.append({"severity": "error", "code": "required_check_failed", "message": f"Policy required check failed: {check}={statuses[check]}"})
    status = "PASS" if not findings else "FAIL"
    return {"audit": "policy", "status": status, "skill_path": str(skill_dir), "policy": str(Path(policy_path).resolve()), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Enforce policy-as-code")
    parser.add_argument("skill_path")
    parser.add_argument("--policy", required=True)
    args = parser.parse_args()
    report = enforce_policy(args.skill_path, args.policy)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
