#!/usr/bin/env python3
"""Legacy compatibility alias for the minimal skill validation gate.

The validation core now lives in format_check.py so format_check.py and
quick_validate.py cannot drift on overlapping frontmatter rules.

New release workflows should call release_gate.py or stage_gate.py. This file
stays only so older docs, scripts, and user muscle memory keep working. A PASS
here is not release readiness and must not be used to override a gate failure.
"""

from __future__ import annotations

import sys

from format_check import validate_skill


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python quick_validate.py <skill_directory>")
        return 1

    valid, message = validate_skill(sys.argv[1])
    if valid:
        print("Format smoke check passed; release gate was not run.")
        print("This result has no release, stage-completion, packaging, or publish authority.")
    else:
        print(message)
    return 0 if valid else 1


if __name__ == "__main__":
    raise SystemExit(main())
