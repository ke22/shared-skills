#!/usr/bin/env python3
"""Fast install/use-time healthcheck for a skill folder."""

from __future__ import annotations

import argparse
import contextlib
import io
import json
import tempfile
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent


def _finding(code: str, message: str, severity: str = "error", path: str | None = None) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "path": path}


def _json_ok(path: Path) -> bool:
    try:
        json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    return True


def _package_smoke(skill_dir: Path) -> tuple[bool, str]:
    import importlib.util

    package_path = SCRIPT_DIR / "package_skill.py"
    spec = importlib.util.spec_from_file_location("_healthcheck_package_skill", package_path)
    if spec is None or spec.loader is None:
        return False, "cannot import package_skill.py"
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with tempfile.TemporaryDirectory() as tmp:
        stream = io.StringIO()
        with contextlib.redirect_stdout(stream):
            result = module.package_skill(skill_dir, tmp, enforce_publish_gate=False)
        return result is not None, stream.getvalue()


def healthcheck_skill(skill_dir: Path | str, *, package: bool = True) -> dict[str, Any]:
    skill_dir = Path(skill_dir).resolve()
    findings: list[dict[str, Any]] = []

    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        findings.append(_finding("skill_md_missing", "SKILL.md is missing", path=str(skill_md)))
    else:
        try:
            skill_md.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            findings.append(_finding("skill_md_not_utf8", f"SKILL.md is not valid UTF-8: {exc}", path=str(skill_md)))

    for script in sorted((skill_dir / "scripts").glob("*.py")) if (skill_dir / "scripts").exists() else []:
        try:
            compile(script.read_text(encoding="utf-8"), str(script), "exec")
        except Exception as exc:
            findings.append(_finding("script_compile_failed", str(exc), path=str(script)))

    for required_json in (skill_dir / "assets" / "evals" / "evals.json", skill_dir / "assets" / "evals" / "regression_gates.json"):
        if not required_json.exists():
            findings.append(_finding("required_asset_missing", f"Missing {required_json.relative_to(skill_dir).as_posix()}", path=str(required_json)))
        elif not _json_ok(required_json):
            findings.append(_finding("json_invalid", f"Invalid JSON: {required_json.relative_to(skill_dir).as_posix()}", path=str(required_json)))

    for required_ref in (skill_dir / "references" / "readiness_report.md",):
        if not required_ref.exists():
            findings.append(_finding("required_reference_missing", f"Missing {required_ref.relative_to(skill_dir).as_posix()}", path=str(required_ref)))

    if package:
        ok, output = _package_smoke(skill_dir)
        if not ok:
            findings.append(_finding("package_smoke_failed", output.strip() or "package_skill.py returned no package", path=str(skill_dir)))

    status = "PASS" if not any(item["severity"] == "error" for item in findings) else "FAIL"
    return {"audit": "healthcheck", "status": status, "skill_path": str(skill_dir), "findings": findings}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run skill healthcheck")
    parser.add_argument("skill_path", nargs="?", default=".", help="Path to the skill folder")
    parser.add_argument("--no-package", action="store_true", help="Skip package smoke check")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    report = healthcheck_skill(Path(args.skill_path), package=not args.no_package)
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for finding in report["findings"]:
            print(f"[{finding['severity'].upper()}] {finding['code']}: {finding['message']}")
        print(f"Healthcheck: {report['status']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
