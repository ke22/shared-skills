#!/usr/bin/env python3
"""Audit actual benchmark metadata and regression gates."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from check_regression_gates import DEFAULT_GATES, evaluate_gates
from utils import extract_frontmatter


DEFAULT_REQUIRED_METADATA = (
    "skill_version",
    "git_commit",
    "host",
    "model",
    "temperature",
    "run_timestamp",
    "grader_version",
)


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def _load_json(path: Path) -> dict[str, Any] | None:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return loaded if isinstance(loaded, dict) else None


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def summarize_benchmark_artifact(benchmark_path: Path | str) -> dict[str, Any]:
    """Return a compact benchmark summary suitable for release evidence."""

    benchmark_path = Path(benchmark_path).resolve()
    benchmark = _load_json(benchmark_path)
    if benchmark is None:
        raise ValueError(f"benchmark must be a JSON object: {benchmark_path}")
    return {
        "artifact_type": "benchmark-summary",
        "source_path": str(benchmark_path),
        "source_sha256": _sha256(benchmark_path),
        "metadata": benchmark.get("metadata", {}),
        "run_summary": benchmark.get("run_summary", {}),
        "notes": benchmark.get("notes", []),
    }


def _latest_release_artifact(skill_dir: Path) -> Path | None:
    release_dir = skill_dir / "release"
    if not release_dir.exists():
        return None
    candidates = sorted(release_dir.glob("benchmark-summary-*.json"))
    if candidates:
        return candidates[-1]
    candidates = sorted(release_dir.glob("evidence-*.json"))
    if candidates:
        return candidates[-1]
    return None


def _default_benchmark_path(skill_dir: Path) -> Path | None:
    default_path = skill_dir / "benchmark.json"
    if default_path.exists():
        return default_path
    return _latest_release_artifact(skill_dir)


def _extract_benchmark(data: dict[str, Any]) -> tuple[dict[str, Any], str]:
    if isinstance(data.get("benchmark_summary"), dict):
        return data["benchmark_summary"], "release_evidence"
    if data.get("artifact_type") == "benchmark-summary":
        return data, "benchmark_summary"
    if isinstance(data.get("run_summary"), dict):
        return data, "benchmark"
    return data, "unknown"


def _required_metadata(skill_dir: Path) -> list[str]:
    evals = _load_json(skill_dir / "assets" / "evals" / "evals.json") or {}
    declared = evals.get("benchmark_metadata_required")
    if isinstance(declared, list) and declared:
        return [str(item) for item in declared]
    return list(DEFAULT_REQUIRED_METADATA)


def _current_skill_version(skill_dir: Path) -> str:
    try:
        frontmatter, _ = extract_frontmatter((skill_dir / "SKILL.md").read_text(encoding="utf-8"))
    except Exception:
        return ""
    return str(frontmatter.get("version", "")).strip()


def audit_benchmark(skill_dir: Path | str, benchmark_path: Path | str | None = None, *, require_benchmark: bool = False) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    findings: list[dict[str, Any]] = []
    explicit_benchmark = benchmark_path is not None
    strict_benchmark = require_benchmark or explicit_benchmark

    if benchmark_path is None:
        benchmark_path = _default_benchmark_path(skill_dir)

    if benchmark_path is None:
        status = "FAIL" if require_benchmark else "SKIPPED"
        severity = "error" if require_benchmark else "warning"
        findings.append(
            _finding(
                "benchmark_missing",
                "No benchmark artifact found; benchmark evidence is optional unless --require-benchmark or --require-live-benchmark is set",
                severity=severity,
                path=str(skill_dir / "benchmark.json"),
            )
        )
        return {"audit": "benchmark", "status": status, "skill_path": str(skill_dir), "findings": findings}

    benchmark_path = Path(benchmark_path).resolve()
    loaded = _load_json(benchmark_path)
    if loaded is None:
        return {
            "audit": "benchmark",
            "status": "BLOCKED",
            "skill_path": str(skill_dir),
            "benchmark_path": str(benchmark_path),
                "findings": [_finding("benchmark_invalid_json", "benchmark.json must be a JSON object", path=str(benchmark_path))],
        }
    benchmark, source_type = _extract_benchmark(loaded)
    if not isinstance(benchmark.get("run_summary"), dict):
        findings.append(
            _finding(
                "benchmark_summary_missing",
                "Benchmark artifact must include run_summary or benchmark_summary.run_summary",
                severity="error" if strict_benchmark else "warning",
                path=str(benchmark_path),
            )
        )

    metadata = benchmark.get("metadata", {})
    if not isinstance(metadata, dict):
        metadata = {}
        findings.append(
            _finding(
                "benchmark_metadata_invalid",
                "benchmark.metadata must be an object",
                severity="error" if strict_benchmark else "warning",
                path=str(benchmark_path),
            )
        )

    missing = [field for field in _required_metadata(skill_dir) if not str(metadata.get(field, "")).strip()]
    if missing:
        findings.append(
            _finding(
                "benchmark_metadata_missing",
                f"benchmark.metadata missing required fields: {', '.join(missing)}",
                severity="error" if strict_benchmark else "warning",
                path=str(benchmark_path),
            )
        )

    current_version = _current_skill_version(skill_dir)
    benchmark_version = str(metadata.get("skill_version", "")).strip()
    if current_version and benchmark_version and benchmark_version != current_version:
        findings.append(
            _finding(
                "benchmark_version_stale",
                f"benchmark.metadata.skill_version {benchmark_version!r} does not match current SKILL.md version {current_version!r}",
                severity="error" if strict_benchmark else "warning",
                path=str(benchmark_path),
            )
        )

    gates_path = skill_dir / "assets" / "evals" / "regression_gates.json"
    gates = _load_json(gates_path)
    if gates is None:
        findings.append(
            _finding(
                "regression_gates_invalid",
                "regression_gates.json must be a JSON object",
                severity="error" if strict_benchmark else "warning",
                path=str(gates_path),
            )
        )
    else:
        try:
            ok, messages = evaluate_gates(benchmark, DEFAULT_GATES | gates)
        except (KeyError, TypeError, ValueError) as exc:
            findings.append(
                _finding(
                    "regression_gate_unreadable",
                    f"Cannot evaluate regression gates: {exc}",
                    severity="error" if strict_benchmark else "warning",
                    path=str(benchmark_path),
                )
            )
        else:
            if not ok:
                findings.append(
                    _finding(
                        "regression_gate_failed",
                        "; ".join(messages),
                        severity="error" if strict_benchmark else "warning",
                        path=str(benchmark_path),
                    )
                )

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {
        "audit": "benchmark",
        "status": status,
        "skill_path": str(skill_dir),
        "benchmark_path": str(benchmark_path),
        "benchmark_source_type": source_type,
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit benchmark metadata and regression gates")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--benchmark", help="Path to benchmark.json")
    parser.add_argument(
        "--require-benchmark",
        action="store_true",
        help="Fail when no benchmark artifact is found in --benchmark, benchmark.json, or release evidence",
    )
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = audit_benchmark(Path(args.skill_path), args.benchmark, require_benchmark=args.require_benchmark)
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Benchmark audit: {report['status']}")

    return 0 if report["status"] in {"PASS", "SKIPPED"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
