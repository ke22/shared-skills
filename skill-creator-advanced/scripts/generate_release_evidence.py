#!/usr/bin/env python3
"""Generate a release evidence bundle from the mechanical release gate."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from audit_benchmark import summarize_benchmark_artifact
from release_gate import run_release_gate
from utils import extract_frontmatter


def _git_commit(cwd: Path) -> str:
    try:
        commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=cwd, text=True, stderr=subprocess.DEVNULL).strip()
        dirty = subprocess.check_output(["git", "status", "--short"], cwd=cwd, text=True, stderr=subprocess.DEVNULL).strip()
        return f"{commit}+dirty" if dirty else commit
    except Exception:
        return "local working tree"


def _load_json_object(path: Path) -> dict[str, Any] | None:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return loaded if isinstance(loaded, dict) else None


def _benchmark_summary_from_gate(gate: dict[str, Any]) -> dict[str, Any] | None:
    for audit in gate.get("audits", []):
        if audit.get("audit") != "benchmark":
            continue
        benchmark_path = audit.get("benchmark_path")
        if not benchmark_path:
            return None
        loaded = _load_json_object(Path(str(benchmark_path)))
        if loaded is None:
            return None
        if isinstance(loaded.get("benchmark_summary"), dict):
            return loaded["benchmark_summary"]
        if loaded.get("artifact_type") == "benchmark-summary":
            return loaded
    return None


def _portable_path(path: Path, base: Path) -> str:
    try:
        return path.resolve().relative_to(base.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def generate_release_evidence(skill_dir: Path | str, out: Path | str, *, benchmark: Path | str | None = None) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    skill_text = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
    frontmatter, _ = extract_frontmatter(skill_text)
    gate = run_release_gate(skill_dir, benchmark_path=benchmark, require_benchmark=benchmark is not None)
    checks = {audit["audit"]: audit["status"] for audit in gate["audits"]}
    blocking = [
        {"check": audit["audit"], **finding}
        for audit in gate["audits"]
        for finding in audit.get("findings", [])
        if finding.get("severity") == "error"
    ]
    benchmark_summary = summarize_benchmark_artifact(benchmark) if benchmark else _benchmark_summary_from_gate(gate)
    benchmark_info = None
    if benchmark:
        benchmark_info = {"path": str(Path(benchmark).resolve()), "embedded_summary": benchmark_summary is not None}
    elif benchmark_summary is not None:
        benchmark_info = {
            "path": str(benchmark_summary.get("source_path", "")),
            "embedded_summary": True,
            "source": "release_gate_default",
        }
    evidence = {
        "skill_name": frontmatter.get("name", skill_dir.name),
        "version": frontmatter.get("version", ""),
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "commit": _git_commit(skill_dir),
        "status": gate["status"],
        "checks": checks,
        "benchmark": benchmark_info,
        "benchmark_summary": benchmark_summary,
        "blocking_findings": blocking,
    }
    out_path = Path(out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if benchmark_summary is not None:
        summary_path = out_path.with_name(f"benchmark-summary-{frontmatter.get('version', 'current')}.json")
        summary_path.write_text(json.dumps(benchmark_summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        evidence["benchmark_summary_path"] = _portable_path(summary_path, skill_dir)
        out_path.write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return evidence


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate release evidence JSON")
    parser.add_argument("skill_path", help="Path to the skill folder")
    parser.add_argument("--out", required=True, help="Output evidence JSON path")
    parser.add_argument("--benchmark", help="Optional benchmark.json")
    args = parser.parse_args()

    evidence = generate_release_evidence(Path(args.skill_path), Path(args.out), benchmark=args.benchmark)
    print(json.dumps(evidence, indent=2, ensure_ascii=False))
    return 0 if evidence["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
