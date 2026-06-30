#!/usr/bin/env python3
"""Generate a fusion plan for two skills."""

from __future__ import annotations

import argparse
from pathlib import Path


def _name(path_or_name: str) -> str:
    path = Path(path_or_name)
    return path.name if path.exists() else path_or_name


def plan_skill_fusion(skill_a: str, skill_b: str, out: Path | str) -> Path:
    a = _name(skill_a)
    b = _name(skill_b)
    content = f"""# Fusion Plan

## Source skills

- `{a}`
- `{b}`

## Decision

- Recommended action: `[TODO: merge | keep separate with handoff | split | deprecate]`
- Rationale: `[TODO: explain why this remains one primary job or why fusion is rejected]`

## Base skill profile

- Base skill: `[TODO: target/base skill]`
- Primary job and final output owner: `[TODO]`
- Public name, aliases, package path, and catalog impact: `[TODO]`
- State ownership: `[TODO: reads/writes/owns/forbidden state]`
- Contract and schema versions: `[TODO: skill contract, tool schema, workflow topology, state schema]`
- Side effects and approval points: `[TODO]`
- Guardrails and safety assumptions: `[TODO]`
- Extension points: `[TODO: tools, handoff, workflow node, adapter, resource loader]`

## Compatibility matrix

| Area | `{a}` | `{b}` | Decision |
|---|---|---|---|
| Contract | `[TODO]` | `[TODO]` | `[direct | adapter | reject; strict schema if supported]` |
| State | `[TODO]` | `[TODO]` | `[owner and merge rule]` |
| Control flow | `[TODO]` | `[TODO]` | `[manager | handoff | pipeline | graph | service]` |
| Errors | `[TODO]` | `[TODO]` | `[retry | fail | compensate | escalate]` |
| Security | `[TODO]` | `[TODO]` | `[approval and least privilege policy]` |
| Operations | `[TODO]` | `[TODO]` | `[trace, metrics, version, rollback impact]` |

## Keep

- Preserve the clearer workflow and the stricter output contract.
- Preserve all passing eval cases from both skills.
- Preserve release evidence that still applies after the fusion.

## Orchestration

- Pattern: `[TODO: manager plus tools | triage plus handoff | sequential pipeline | mediator/graph | service boundary]`
- Final output owner: `[TODO]`
- Route decision owner: `[TODO]`
- State commit owner: `[TODO]`
- Human approval or interrupt points: `[TODO]`

## Rename

- Proposed replacement: `[TODO: new skill name]`
- Alias strategy: keep old names as deprecated/tombstone entries until routing tests pass.
- Package/catalog impact: `[TODO]`

## Merge

- Combine non-overlapping use cases.
- Merge trigger evals into one fixed golden trigger set.
- Deduplicate references and scripts.
- Define a single shared output contract.

## Drop

- Duplicate examples.
- Outdated trigger phrases.
- Any wrapper content that forks the core workflow.
- Any side-effect path that cannot be governed by the target policy.

## Failure policy

- Validation failure: `[TODO: reject before execution]`
- Protocol error: `[TODO: invalid arguments, unknown tool, malformed schema]`
- Execution error: `[TODO: API failure, business-rule failure, tool crash]`
- Authorization or approval denial: `[TODO: block or request approval]`
- Timeout or transient tool failure: `[TODO: retry, degrade, or fail]`
- State conflict: `[TODO: owner wins, merge rule, or escalate]`
- External write failure: `[TODO: checkpoint, compensate, rollback]`

## Observability

- Required trace fields: `workflow_id`, `trace_id`, `base_skill_version`, `skill_contract_version`, `tool_schema_version`, `workflow_topology_version`, `fusion_plan_version`, `route_decision`, `approval_outcome`.
- Metrics to track when available: task completion, routing correctness, schema failure rate, tool success rate, rollback success rate, p95 latency, token/cost, approval rate, state conflict rate.

## Versioning and compatibility

- Version skill contract, tool schema, workflow topology, and state schema separately when they can change independently.
- Additive compatible fields may use a minor version; renamed, removed, or redefined fields require migration, deprecation, or a major version bump.
- Do not change published routing, state ownership, approval policy, side effects, or rollback behavior in place.

## Migration

- Mark one or both source skills as `deprecated` when replacement routing is ready.
- Set `deprecated_by` to the replacement skill.
- Add migration notes with `scripts/generate_migration_guide.py`.
- Keep compatibility aliases or tombstone content until should-trigger and should-not-trigger evals pass.
- Re-run release gate and routing simulation before removal.

## Validation

- Base skill alone preserves baseline behavior.
- One extension mounted routes correctly.
- Multiple extensions available follow the conflict policy.
- Schema-incompatible input is rejected before execution.
- Approval denial leaves an auditable blocked result.
- Timeout or tool failure follows the failure policy.
- External write followed by failure triggers rollback or compensation.
- Malicious or untrusted resource content is isolated by guardrails.
- Upgrade from the previous skill or workflow version preserves compatibility.

## Stage gate

- When the merged target skill has been updated, immediately run:
  - `python scripts/stage_gate.py <target-skill> --stage merge --json`
- Do not mark the merge stage complete while the stage gate is `FAIL` or `BLOCKED`.
- Before packaging or publishing the merged skill, run:
  - `python scripts/stage_gate.py <target-skill> --stage publish --json`
"""
    out_path = Path(out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(content, encoding="utf-8")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Plan skill fusion")
    parser.add_argument("skill_a")
    parser.add_argument("skill_b")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    path = plan_skill_fusion(args.skill_a, args.skill_b, args.out)
    print(f"Wrote {path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
