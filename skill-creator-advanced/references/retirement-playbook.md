# Retirement playbook

Retirement is a staged lifecycle transition, not a folder deletion.

## Deprecated state

Deprecated skills must keep a manifest with:

- `status: deprecated`
- `deprecated_at`
- `deprecated_by` or `replacement.skill`
- `replacement.migration_notes`
- `sunset.remove_after`
- `sunset.allow_install`
- `sunset.allow_runtime_redirect`

## Tombstone behavior

Replace active workflow instructions with a short tombstone skill that redirects to the replacement unless the user explicitly asks for historical behavior.

## Safe removal gate

Before deleting a skill, run `scripts/check_retirement_gate.py` and verify:

- The skill has been deprecated for the configured number of days.
- Replacement is released.
- Migration guide exists.
- Catalog and routing tests no longer require the old skill.
- No active handoff dependency points to it.
- Release notes record the removal.
