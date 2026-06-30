# Manual review notes template

Use this file for reviewer judgment that is not yet safely mechanical.
Do not treat this template as release evidence; completed release evidence belongs in `references/readiness_report.md`.

## Boundary Review

- Does the skill own one intuitive primary job?
- Are neighboring skills and handoffs clear?
- Would a new user understand when not to use this skill?
- Should the skill be renamed, split, merged, deprecated, or retired?

## Trigger Review

- Are should-trigger examples realistic?
- Are should-not-trigger examples specific enough?
- Are near-miss examples close to real confusion cases?
- Are zh, en, and mixed-language phrases covered where relevant?

## Output Quality Review

- Do worked examples teach the intended output quality?
- Is the output contract strict enough for repeatable results?
- Are missing-information and stop conditions explicit?
- Are high-risk external side effects gated by ask-first rules?

## Lifecycle Review

- Is `references/readiness_report.md` current for the version being shipped?
- Are benchmark metadata fields sufficient to reproduce the run?
- Are wrappers thin enough to avoid host-specific forks of the core workflow?
- Are public README, registry, marketplace, homepage, and release notes consistent?
