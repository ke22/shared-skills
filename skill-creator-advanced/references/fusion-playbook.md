# Fusion playbook

Use this playbook when two or more skills overlap enough that maintaining them
separately creates routing confusion, duplicated workflows, or unclear ownership.
Fusion is not prompt concatenation. It is a governed composition where one base
skill keeps explicit ownership of the primary job, state, policies, and final
output contract while other skills become constrained extensions.

## Merge candidate signals

- Descriptions target the same user intent.
- Trigger evals repeatedly select the wrong neighbor skill.
- Output contracts are materially similar.
- One skill is rarely used but appears as a top overlap neighbor.
- Users frequently ask which one to use.
- The same handoff happens in most successful runs and adds no separate review value.
- Two skills require the same external tools, state, approvals, and release gates.

## Do not fuse when

- The candidate skills own different primary jobs or unrelated deliverables.
- One skill is a router or reviewer and the other is an executor with distinct follow-through policy.
- The overlap can be solved by clearer handoff rules, negative triggers, or eval coverage.
- A merge would hide external side effects, approval requirements, or security boundaries inside a larger prompt.
- The target skill would need multiple independent output contracts.

When these are true, keep the skills separate and document handoff or split rules instead.

## Base skill profile

Before designing adapters or edits, define the base skill invariants:

- Primary job and final output responsibility.
- Public name, aliases, package path, and catalog surface.
- State channels it reads, writes, owns, or must never mutate.
- External side effects and approval points.
- Guardrails, safety policy, and data sensitivity assumptions.
- Existing evals, benchmark baselines, and release evidence that must survive.
- Extension points where another skill can be called without changing ownership.

If these invariants are unclear, stop and repair the boundary first. Do not start by merging descriptions.

## Compatibility matrix

For each extension skill, record whether it can align with the base skill:

| Area | Question | Required decision |
|---|---|---|
| Contract | Are input, output, and error shapes schema-compatible? | direct, adapter, or reject |
| State | Which shared, private, ephemeral, or external state does it touch? | owner and merge rule |
| Control flow | Does it require manager control, handoff, pipeline, graph, or service isolation? | orchestration pattern |
| Errors | Are protocol errors, execution errors, timeout, tool crash, and semantic conflicts classified? | retry, fail, compensate, or escalate |
| Security | Does it need approval, least-privilege credentials, or untrusted-content isolation? | policy gate |
| Operations | Can tracing, metrics, versioning, rollback, and benchmark evidence be preserved? | release gate impact |

Prefer a canonical contract over one-off field mapping. The target skill should call extensions through a stable internal interface, while adapters handle source-specific naming, schemas, errors, and state boundaries. Use strict schemas where the host supports them, including explicit required fields and closed objects when safe. Constraints that schemas cannot express must become contract tests rather than prompt-only advice.

## Orchestration choices

- Manager plus tools: use when the base skill must keep final-answer ownership, guardrails, rate limits, and output formatting. Watch for prompt bloat and tool-choice confusion.
- Triage plus handoff: use when the base skill only classifies the request and a specialist should take over. Document who owns final output and state commits.
- Sequential pipeline: use when the workflow is predictably ordered, such as collect, normalize, analyze, generate, review.
- Mediator or graph: use when multiple skills can conflict, run in parallel, need checkpoints, require human approval, or must resume after interruption.
- Service or MCP/OpenAPI boundary: use when extension skills differ in language, deployment domain, credentials, trust level, or side-effect risk.

## Conflict policy

Resolve conflicts in this order:

1. Safety and explicit approval requirements.
2. Hard schemas, version compatibility, and release gates.
3. Base skill invariants and ownership.
4. State ownership and side-effect policy.
5. Consistency and rollback guarantees.
6. Latency, token cost, and convenience.

If the conflict still cannot be resolved, reject the fusion and keep handoff rules.

## Fusion plan sections

- Keep: workflow, evals, scripts, references, or examples worth preserving.
- Base profile: invariants, state ownership, approvals, and extension points.
- Compatibility: contract, state, control-flow, error, security, and operations matrix for each source skill.
- Orchestration: manager/tools, handoff, pipeline, mediator/graph, or service boundary, with final-output ownership.
- Rename: final skill name, aliases, package path, and catalog strategy.
- Merge: shared output contract, trigger set, references, scripts, and release gates.
- Drop: outdated triggers, duplicated examples, stale references, and wrapper forks.
- Failure policy: validation failure, protocol error, execution error, authorization or approval denial, timeout, tool error, state conflict, external-write failure, retry, compensation, and escalation behavior.
- Migration: deprecate source skills, route old triggers to the replacement, keep tombstone content until safe removal, and record rollback conditions.
- Observability: trace fields, version fields, route decisions, state diff, side-effect log, latency, token/cost, and approval outcomes.

## Validation matrix

Minimum fusion validation must cover:

- Base skill alone, to preserve baseline behavior.
- One extension mounted, to prove the adapter and route are correct.
- Multiple extensions available, to prove selection and conflict policy.
- Schema-incompatible input, to prove pre-execution rejection.
- Approval denied or missing authorization, to prove policy blocking.
- Timeout or transient tool failure, to prove retry or degraded output behavior.
- External write followed by failure, to prove checkpoint and compensation.
- Malicious or untrusted resource content, to prove guardrails and data isolation.
- Upgrade from previous skill or workflow version, to prove compatibility.

Track at least task completion, routing correctness, schema failure rate, tool success rate, rollback success rate, p95 latency, token/cost, approval rate, and state conflict rate when benchmark data exists.

## Versioning and compatibility

- Version the skill contract, tool schema, orchestration pattern, and state schema separately when they can change independently.
- Additive compatible fields can use a minor version; renamed, removed, or redefined fields require migration, deprecation, or a major version bump.
- Published skill behavior must not be changed in place when the change affects routing, state ownership, approval policy, side effects, or rollback behavior.
- Keep reader compatibility for old aliases, old eval IDs, and old workflow state until the migration evidence says removal is safe.

## Evidence

Run `scripts/detect_merge_candidates.py`, then create a concrete plan with `scripts/plan_skill_fusion.py`.

Before claiming the merge is complete:

1. Preserve or redistribute trigger and functional evals from all source skills.
2. Add should-trigger and should-not-trigger cases for every new boundary.
3. Run composition or handoff tests when a chain remains after fusion.
4. Run `scripts/stage_gate.py <target-skill> --stage merge --json`.
5. Run publish gate before packaging or public release.

No manual review note can override a failing stage or release gate.
