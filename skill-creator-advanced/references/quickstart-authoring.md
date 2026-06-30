# Quickstart Authoring

Use this reference when the task is creating a new skill or doing a substantial
revision of an existing skill.

## New Skill Loop

1. Extract 2-3 concrete use cases from the conversation, repo, or examples.
2. Confirm the skill has one primary job. If it mixes unrelated deliverables, split or define handoff.
3. For each use case, write trigger phrases, required inputs, main steps, expected output, and done criteria.
4. Create the folder:

```bash
python scripts/init_skill_advanced.py <skill-name> --path <output-dir>
```

5. Add `references/readiness_report.md` immediately and record format, structure, lifecycle, eval coverage, and release gate evidence.
6. Choose the portfolio archetype: `router`, `executor`, `ops`, or `utility`.
7. Choose the primary `SKILL.md` structure pattern: `Tool Wrapper`, `Generator`, `Reviewer`, `Inversion`, or `Pipeline`.
8. Fill `SKILL.md` with decision boundary, workflow, output contract, follow-through policy, and examples.
9. If the skill wraps tools, define the smallest cross-host contract first: conservative JSON Schema or MCP, then optional OpenAPI.
10. Run staged validation before claiming completion.

## Core Validation Commands

```bash
python scripts/format_check.py <path/to/skill>
python scripts/audit_structure.py <path/to/skill> --json
python scripts/audit_workflow_contract.py <path/to/skill> --json
python scripts/audit_semantics.py <path/to/skill> --json
python scripts/audit_eval_coverage.py <path/to/skill> --json
python scripts/audit_eval_quality.py <path/to/skill> --json
python scripts/release_gate.py <path/to/skill> --stage draft --json
python scripts/stage_gate.py <path/to/skill> --stage create --json
```

## Publish-Oriented Commands

```bash
python scripts/release_gate.py <path/to/skill> --stage publish --json
python scripts/release_gate.py <path/to/skill> --stage publish --require-benchmark --json
python scripts/release_gate.py <path/to/skill> --stage publish --require-live-benchmark --benchmark <benchmark.json> --json
python scripts/package_skill.py <path/to/skill> <output-dir>
```

`package_skill.py` runs the publish gate before writing `.skill`. Missing
benchmark evidence is a limitation by default, not automatic publish failure,
but ROI, live-integration, or cross-host performance claims require benchmark
evidence or strict benchmark mode.

## Eval Workspace

```bash
python scripts/generate_test_plan.py <path/to/skill> --out references/test_plan.md
python scripts/prepare_eval_workspace.py <path/to/skill>
python scripts/run_eval.py --eval-set <path/to/trigger-evals.json> --skill-path <path/to/skill> --model <model-id>
python scripts/run_loop.py --eval-set <path/to/trigger-evals.json> --skill-path <path/to/skill> --model <model-id> --apply-best
```

For trigger optimization with held-out splits, prefer handing off to
`skill-optimizer` after the initial skill artifact exists.
