#!/usr/bin/env python3
"""Run lightweight composition contract tests for skill chains."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def run_composition_tests(repo_root: Path | str) -> dict[str, Any]:
    repo_root = Path(repo_root).resolve()
    tests_path = repo_root / "portfolio" / "composition_tests.json"
    if not tests_path.exists():
        return {"audit": "composition_tests", "status": "SKIPPED", "repo_root": str(repo_root), "findings": [{"severity": "warning", "code": "composition_tests_missing", "message": "portfolio/composition_tests.json not found"}]}
    tests = json.loads(tests_path.read_text(encoding="utf-8"))
    tests = tests.get("tests", tests) if isinstance(tests, dict) else tests
    skill_names = {path.parent.name for path in (repo_root / "skills").glob("*/SKILL.md")} if (repo_root / "skills").exists() else {path.parent.name for path in repo_root.glob("*/SKILL.md")}
    findings = []
    for index, test in enumerate(tests if isinstance(tests, list) else []):
        chain = test.get("chain", []) if isinstance(test, dict) else []
        missing = [skill for skill in chain if skill not in skill_names]
        if missing:
            findings.append({"severity": "error", "code": "composition_skill_missing", "message": f"Test {index} references missing skills: {', '.join(missing)}"})
        if isinstance(test, dict) and not test.get("handoff_payload"):
            findings.append({"severity": "error", "code": "composition_payload_missing", "message": f"Test {index} missing handoff_payload"})
    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "composition_tests", "status": status, "repo_root": str(repo_root), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run composition tests")
    parser.add_argument("repo_root")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = run_composition_tests(args.repo_root)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if report["status"] in {"PASS", "SKIPPED"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
