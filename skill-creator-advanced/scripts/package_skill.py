#!/usr/bin/env python3
"""Skill Packager - Creates a distributable .skill file from a skill folder.

This script intentionally performs validation before packaging.

Usage:
  python scripts/package_skill.py <path/to/skill-folder> [output-directory]

Notes:
  - The .skill file is a zip archive with a .skill extension.
  - __pycache__/ and *.pyc are excluded from the package.
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys

# Avoid generating __pycache__/ during import and runtime.
sys.dont_write_bytecode = True

import re
import zipfile
from pathlib import Path
from typing import Any


def _safe_print(*args: object, sep: str = " ", end: str = "\n", file=None) -> None:
    """Print without crashing on Windows consoles that cannot encode emoji."""

    stream = sys.stdout if file is None else file
    if stream is None:
        return

    text = sep.join(str(arg) for arg in args)
    try:
        print(text, end=end, file=stream)
    except UnicodeEncodeError:
        encoding = getattr(stream, "encoding", None) or "utf-8"
        safe_text = text.encode(encoding, errors="backslashreplace").decode(encoding)
        print(safe_text, end=end, file=stream)


_FRONTMATTER_KEY_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_-]*$")
_KEBAB_CASE_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_SHARED_VALIDATE_SKILL = None


def _extract_frontmatter_parts(text: str) -> tuple[str, str] | None:
    if not text.startswith("---\n"):
        return None
    parts = text.split("---\n", 2)
    if len(parts) < 3:
        return None
    return parts[1], parts[2]


def _parse_basic_frontmatter(frontmatter_text: str) -> dict[str, object]:
    parsed: dict[str, object] = {}
    current_nested_key: str | None = None

    for raw_line in frontmatter_text.splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue

        if raw_line.startswith((" ", "\t")):
            if current_nested_key is None:
                raise ValueError(f"unexpected indentation: {raw_line!r}")
            stripped = raw_line.strip()
            if ":" not in stripped:
                raise ValueError(f"invalid nested line: {raw_line!r}")
            key, value = stripped.split(":", 1)
            key = key.strip()
            if not _FRONTMATTER_KEY_RE.match(key):
                raise ValueError(f"invalid nested key: {key!r}")
            container = parsed.setdefault(current_nested_key, {})
            if not isinstance(container, dict):
                raise ValueError(f"frontmatter key {current_nested_key!r} cannot mix scalar and mapping values")
            container[key] = value.strip()
            continue

        current_nested_key = None
        if ":" not in raw_line:
            raise ValueError(f"invalid frontmatter line: {raw_line!r}")

        key, value = raw_line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not _FRONTMATTER_KEY_RE.match(key):
            raise ValueError(f"invalid key: {key!r}")

        if not value:
            parsed[key] = {}
            current_nested_key = key
            continue

        parsed[key] = value

    return parsed


def _fallback_validate_skill(skill_path: Path) -> tuple[bool, str]:
    skill_md = skill_path / "SKILL.md"
    try:
        skill_text = skill_md.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return False, "SKILL.md is not valid UTF-8 text"

    frontmatter_parts = _extract_frontmatter_parts(skill_text)
    if frontmatter_parts is None:
        return False, "Missing or invalid YAML frontmatter. SKILL.md must start with '---' and include a closing '---' delimiter"

    frontmatter_text, _body = frontmatter_parts
    try:
        frontmatter = _parse_basic_frontmatter(frontmatter_text)
    except ValueError as exc:
        return False, f"Invalid YAML in frontmatter: {exc}"

    name = frontmatter.get("name")
    if not isinstance(name, str) or not name.strip():
        return False, "Missing required field 'name' in frontmatter"
    if not _KEBAB_CASE_RE.fullmatch(name.strip()):
        return False, f"Frontmatter 'name' must be kebab-case. Got: {name!r}"

    description = frontmatter.get("description")
    if not isinstance(description, str) or not description.strip():
        return False, "Missing required field 'description' in frontmatter"

    return True, "Format smoke check passed; release gate was not run. (fallback validator without PyYAML)"


def _validate_skill(skill_path: Path) -> tuple[bool, str]:
    global _SHARED_VALIDATE_SKILL

    try:
        if _SHARED_VALIDATE_SKILL is None:
            format_check_path = Path(__file__).resolve().with_name("format_check.py")
            module_name = "_package_skill_format_check"
            spec = importlib.util.spec_from_file_location(module_name, format_check_path)
            if spec is None or spec.loader is None:
                raise ModuleNotFoundError("No module named 'format_check'")
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            _SHARED_VALIDATE_SKILL = module.validate_skill
    except ModuleNotFoundError as exc:
        if exc.name not in {"yaml", "format_check", None}:
            raise
        return _fallback_validate_skill(skill_path)

    return _SHARED_VALIDATE_SKILL(skill_path)


def _run_publish_gate(skill_path: Path) -> tuple[bool, str]:
    try:
        result = subprocess.run(
            [
                sys.executable,
                "-B",
                str(Path(__file__).resolve().with_name("release_gate.py")),
                str(skill_path),
                "--stage",
                "publish",
                "--json",
            ],
            check=False,
            capture_output=True,
            cwd=str(skill_path),
            text=True,
        )
        if not result.stdout.strip():
            return False, (result.stderr.strip() or "release gate produced no JSON output")
        report: dict[str, Any] = json.loads(result.stdout)
    except Exception as exc:
        return False, f"publish gate could not run: {exc}"

    if report.get("status") == "PASS":
        return True, "Publish gate passed."

    blocking = []
    for audit in report.get("audits", []):
        for finding in audit.get("findings", []):
            if finding.get("severity") == "error":
                blocking.append(f"{audit.get('audit')}.{finding.get('code')}: {finding.get('message')}")
    if not blocking:
        blocking.append(f"release gate returned {report.get('status')}")
    return False, "Publish gate failed: " + "; ".join(blocking[:5])


def _should_exclude(file_path: Path) -> bool:
    parts = set(file_path.parts)
    if "__pycache__" in parts:
        return True
    if file_path.suffix == ".pyc":
        return True
    if file_path.name in {".DS_Store"}:
        return True
    return False


def package_skill(
    skill_path: str | Path,
    output_dir: str | Path | None = None,
    *,
    enforce_publish_gate: bool = True,
) -> Path | None:
    """Package a skill folder into a .skill file."""

    skill_path = Path(skill_path).resolve()

    # Validate skill folder exists
    if not skill_path.exists():
        _safe_print(f"❌ Error: Skill folder not found: {skill_path}")
        return None

    if not skill_path.is_dir():
        _safe_print(f"❌ Error: Path is not a directory: {skill_path}")
        return None

    # Validate SKILL.md exists
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        _safe_print(f"❌ Error: SKILL.md not found in {skill_path}")
        return None

    # Run validation before packaging
    _safe_print("🔍 Validating skill...")
    valid, message = _validate_skill(skill_path)
    if not valid:
        _safe_print(f"❌ Validation failed: {message}")
        _safe_print("   Please fix the validation errors before packaging.")
        return None
    _safe_print(f"✅ {message}\n")

    if enforce_publish_gate:
        _safe_print("🔍 Running publish gate...")
        gate_valid, gate_message = _run_publish_gate(skill_path)
        if not gate_valid:
            _safe_print(f"❌ {gate_message}")
            _safe_print("   Packaging is blocked until the publish gate passes.")
            return None
        _safe_print(f"✅ {gate_message}\n")

    # Determine output location
    skill_name = skill_path.name
    if output_dir:
        output_path = Path(output_dir).resolve()
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path = Path.cwd()

    skill_filename = output_path / f"{skill_name}.skill"

    # Create the .skill file (zip format)
    try:
        with zipfile.ZipFile(skill_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_path in skill_path.rglob("*"):
                if not file_path.is_file():
                    continue
                if _should_exclude(file_path):
                    continue

                # relative path within the zip must include the skill folder name
                arcname = file_path.relative_to(skill_path.parent)
                zipf.write(file_path, arcname)
                _safe_print(f"  Added: {arcname}")

        _safe_print(f"\n✅ Successfully packaged skill to: {skill_filename}")
        return skill_filename

    except Exception as e:
        _safe_print(f"❌ Error creating .skill file: {e}")
        return None


def main() -> int:
    if len(sys.argv) < 2:
        _safe_print("Usage: python scripts/package_skill.py <path/to/skill-folder> [output-directory]")
        _safe_print("\nExample:")
        _safe_print("  python scripts/package_skill.py skills/public/my-skill")
        _safe_print("  python scripts/package_skill.py skills/public/my-skill ./dist")
        return 1

    skill_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    _safe_print(f"📦 Packaging skill: {skill_path}")
    if output_dir:
        _safe_print(f"   Output directory: {output_dir}")
    _safe_print()

    result = package_skill(skill_path, output_dir)
    return 0 if result else 1


if __name__ == "__main__":
    raise SystemExit(main())
