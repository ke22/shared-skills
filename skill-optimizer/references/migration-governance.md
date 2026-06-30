# Migration governance

Use this reference when an optimization decision would adopt, reject, roll back, split, merge, rename, or hand off behavior across skills.

## Adoption rule

Adopt a candidate only when all are true:

- The target skill and baseline version are recorded.
- Validation and test splits are not contaminated by edit-generation examples.
- Regression gates pass for quality, cost, latency, trigger behavior and neighbor confusion.
- The patch is bounded and reversible.
- Readiness evidence records commands, results, residual risk and rollback path.

## Rollback rule

Rollback is required when:

- Final test regresses below baseline.
- Over-trigger or neighbor collision exceeds the gate.
- Token or latency cost exceeds the gate without explicit user approval.
- The candidate removes safety, approval, source-attribution or verification rules.
- The patch changes the skill primary job rather than optimizing it.

Rollback notes must include:

- Reverted candidate id or patch description.
- Blocking gate and evidence.
- Safe baseline version.
- Follow-up benchmark or handoff owner.

## Split / merge rule

Optimization may reveal that a skill is too broad. Do not solve primary-job conflict by adding more routing text. Use split / merge review when:

- Candidate edits improve one use case while regressing another unrelated use case.
- Neighbor confusion persists after a narrower description and negative triggers.
- The skill requires separate tools, outputs or approval boundaries for different tasks.

Split / merge decisions must be handed off to `skill-creator-advanced` for implementation and to `skill-evolution` when the trigger is a failure-driven lifecycle event.

## Rename

Rename is allowed only when the current name causes measurable routing confusion, does not match the primary job, or conflicts with another skill. Rename evidence must include:

- Current name and proposed name.
- Trigger queries affected by the rename.
- Neighbor skills that could be confused.
- Files that must be synchronized: frontmatter `name`, folder name, lifecycle manifest, eval `skill_name`, regression gates and homepage.
- Compatibility note for users or workflows that still reference the old name.

## Deprecate

Deprecation is appropriate when optimization evidence shows the skill no longer has positive ROI, is superseded by another skill, or cannot meet gate requirements without expanding beyond its primary job. Deprecation evidence must include:

- Superseding skill or fallback workflow.
- Last passing version, if any.
- Failing gates or ROI evidence.
- Migration path for active users.
- Review date and owner.

## Compatibility

Every optimization patch must preserve forward compatibility unless the user explicitly accepts a breaking change. Check:

- Public trigger surface and negative triggers.
- Output contract fields and order.
- Required approval gates and safety boundaries.
- Referenced files, scripts and schemas.
- Host support matrix and unsupported-host notes.
- Existing eval IDs, benchmark metadata and release evidence.

Breaking changes require a migration note, rollback path and user approval before adoption.

## Migration Evidence

Record migration evidence in `references/readiness_report.md` or release artifacts:

- Decision type: adopt, rollback, rename, deprecate, split, merge or handoff.
- Baseline version and candidate version.
- Validation/test/ROI gate results.
- Files changed.
- Compatibility risks and mitigations.
- Rollback path.
- Owner and next review date.

## External optimizer artifacts

Artifacts such as `best_skill.md`, patch proposals, sleep-cycle consolidation or replay-derived rules are proposals, not source of truth. Before adoption:

1. Diff against the current skill pack.
2. Convert broad rewrites into bounded edits.
3. Preserve frontmatter, lifecycle, references and eval assets unless the gate explicitly requires a change.
4. Run validation and final test.
5. Record rejected edits and reasons.
