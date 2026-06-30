# Readiness report

This file is release evidence for the current skill version. It records mechanical gate results and must be updated whenever `SKILL.md`, references, scripts or eval assets change.

## Final gate

- Current version reviewed: 2026.6.23
- Audit date: 2026-06-23
- Overall status: PASS for revise stage; not publish-ready until benchmark evidence is added.
- Blocking issues:
  - None for revise stage.
  - Publish benchmark has not been run, so do not treat this as publish-ready.
- Git commit: local-only
- Audit runner: local

## Change scope

- Boundary with `skill-evolution` clarified: unscored drift or single failure first hands off to evolution.
- Boundary with `skill-creator-advanced` clarified: accepted candidate still hands off for stage, release and package gates.
- SkillOps suite pointer added: only cross-skill routing/catalog/registry/shared evidence work loads repo-level `portfolio/skillops/`.
- Added evals:
  - `trigger-negative-zh-003` for unscored routing drift handoff to `skill-evolution`.
  - `functional-handoff-001` for accepted optimization handoff to `skill-creator-advanced`.
- `skill_lifecycle.yaml` updated to version-date evidence.

## Evidence / commands run

- `python -m json.tool skills\skill-optimizer\assets\evals\evals.json`
- Repo maintainer stage gate for `skill-optimizer` revise stage.

## Format checks

- [x] Folder name is kebab-case.
- [x] `SKILL.md` exists.
- [x] YAML frontmatter starts and ends with `---`.
- [x] Frontmatter has `name` and `description`.
- [x] `references/readiness_report.md` is present.
- [x] No `README.md` inside the skill folder.
- [x] Mechanical format check run and recorded.

## Structure checks

- [x] `<role>` exists as a semantic block.
- [x] `<decision_boundary>` exists as a semantic block.
- [x] `<workflow>` exists as a semantic block.
- [x] Every workflow step has Action / Input / Output / Validation.
- [x] `<output_contract>` exists as a semantic block.
- [x] `<default_follow_through_policy>` exists as a semantic block.
- [x] Worked examples exist and are not placeholders.
- [x] Mechanical structure check run and recorded.

## Eval and lifecycle checks

- [x] `assets/evals/evals.json` exists.
- [x] `assets/evals/regression_gates.json` exists.
- [x] Trigger eval coverage includes direct, indirect and negative classes.
- [x] Trigger eval coverage includes zh, en and mixed language cases.
- [x] Functional eval coverage includes happy path, edge case and failure mode.
- [x] Handoff coverage includes `skill-evolution` and `skill-creator-advanced`.
- [x] Benchmark metadata requirements include skill version, git commit, host, model, timestamp and grader version.
- [x] `skill_lifecycle.yaml` identifies owner, status, hosts, risk, dependencies, overlaps and handoff targets.
- [x] Mechanical eval and lifecycle checks run and recorded.

## Manual review notes

- [x] Skill has one clear primary job: benchmark-driven optimization of existing skills.
- [x] Description states when to use and when not to use the skill.
- [x] Boundary distinguishes it from `skill-creator-advanced` and `skill-evolution`.
- [x] Output contract includes baseline, split, scorer, gates, adoption decision and verification.
- [x] Tool rules require approval before high-cost evals, external installation, publishing or remote side effects.
- [x] Source map records SkillOpt sources used for this adaptation.

## Common error checks

- [x] No release-blocking placeholder markers remain in user-facing instructions.
- [x] No hidden external side effects bypass the stated follow-through policy.
- [x] Neighbor-skill overlap and negative triggers were reviewed after authoring.
- [x] No missing local paths referenced from `SKILL.md` or `references/*.md`; mechanical check passed.
- [x] No unexplained orphan files remain; mechanical check passed.

## Maintenance

- [x] Version set in top-level frontmatter.
- [x] Evals saved to `assets/evals/evals.json`.
- [x] Regression gates defined in `assets/evals/regression_gates.json`.
- [x] ROI guardrail documented in `SKILL.md`.
- [x] Model / host portability notes added.
- [x] Revise-stage evidence updated after local gates passed.
- [ ] Publish-stage evidence still requires benchmark or release artifact.
## Maintenance verification 2026-06-23

- Scope: bumped the SkillOps suite package version to align `skill-creator-advanced`, `skill-evolution`, and `skill-optimizer` on `2026.6.23`.
- Package stage gate: `python skills\skill-creator-advanced\scripts\stage_gate.py skills\skill-optimizer --stage package --json` -> PASS.
