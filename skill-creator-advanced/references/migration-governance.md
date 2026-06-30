# Migration governance

This document defines the required evidence for renaming, deprecating, merging, splitting, or retiring a skill. These changes are higher risk than ordinary wording edits because they can break routing, user muscle memory, package paths, wrapper metadata, and downstream references.

## Rename

A rename requires:
- Old name and new name.
- Reason for rename.
- Routing compatibility plan for old trigger phrases.
- Package path and registry impact.
- Search / README / catalog update list.
- Evidence that no local references still point to the old name unless they are intentional aliases.

Do not rename only to make an internal implementation detail visible. The public name must optimize discoverability and user language.

## Deprecate

A deprecation requires:
- Deprecation reason.
- Replacement skill or fallback workflow.
- Effective date.
- Expected removal date or explicit statement that the alias remains indefinitely.
- User-facing notice text.
- Regression risk and rollback condition.

The deprecated skill must not silently continue to receive broad queries if a replacement exists.

## Merge

A merge requires:
- Source skills being merged.
- Target skill.
- Boundary rationale explaining why the merged job remains one primary responsibility.
- Conflict resolution for overlapping triggers and incompatible follow-through policies.
- Migration notes for references, evals, package names, and wrapper metadata.

If the merged result owns multiple unrelated deliverables, reject the merge and keep handoff rules instead.

## Split

A split requires:
- Original skill.
- New target skills.
- Routing boundary for each new skill.
- Handoff rules for requests spanning multiple targets.
- Eval redistribution plan.
- Compatibility aliases or deprecation notes for old trigger phrases.

The split is not complete until should-trigger and should-not-trigger cases exist for each new boundary.

## Compatibility

Compatibility review must cover:
- Existing package paths.
- Skill names and aliases.
- Catalog / README / registry entries.
- Host wrapper metadata.
- Local references in `SKILL.md`, `references/`, `scripts/`, and eval assets.
- Old benchmark and review workspace paths.

Backward compatibility may be intentionally broken only when the readiness report records the reason, migration path, and rollback condition.

## Migration Evidence

Every migration event must leave evidence:
- `migration_type`: rename, deprecate, merge, split, or retire.
- `from`: old skill name(s).
- `to`: new skill name(s) or replacement workflow.
- `effective_date`.
- `compatibility_policy`.
- `references_checked`.
- `evals_updated`.
- `wrappers_updated`.
- `release_gate_result`.

Store completed evidence in the release notes, readiness report, or a dedicated migration record outside the skill folder when it applies to the whole repo.
