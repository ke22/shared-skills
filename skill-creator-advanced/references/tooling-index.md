# Tooling index

This file keeps low-frequency script references out of `SKILL.md` while preserving package-level traceability for orphan-file audits.

## Repo surface and naming

- `scripts/audit_repo_discovery.py`: checks repo-level README, discovery entry points, representative skills, and install surfaces.
- `scripts/check_skill_name_surface.py`: checks slug, slash-command, description, trigger phrase, and command-prefix risks.
- `scripts/generate_catalog.py`: generates a repo-level catalog from local skill metadata.
- `scripts/audit_openclaw_frontmatter.py`: checks OpenClaw-facing frontmatter.
- `scripts/audit_surface_drift.py`: detects public surface drift between skill metadata and repo surfaces.
- `scripts/audit_skill_ownership.py`: checks ownership metadata.

## Reports and examples

- `scripts/generate_report.py`: renders the description-optimization report.
- `scripts/generate_review.py`: builds a lightweight review viewer.
- `scripts/generate_lifecycle_report.py`: generates lifecycle summaries.
- `scripts/generate_release_evidence.py`: writes release evidence JSON.
- `scripts/generate_skill_card.py`: produces a portable skill card.
- `scripts/run_example_tests.py`: validates `examples/*/input.md` and `expected_properties.json` fixtures when outputs exist.
- `scripts/run_composition_tests.py`: checks portfolio-level composition fixtures and handoff chains.

## Schemas and helpers

- `scripts/validate_skill_spec.py`: validates `skill_spec.yaml` against required use-case fields.
- `scripts/utils.py`: shared `SKILL.md`, JSON, and frontmatter helpers used by audit and release scripts.

## Authoring and packaging

- `scripts/init_skill_advanced.py`: scaffolds an advanced skill folder.
- `scripts/compile_use_cases.py`: compiles use-case inputs.
- `scripts/generate_test_plan.py`: produces a test plan.
- `scripts/prepare_eval_workspace.py`: creates a paired eval workspace.
- `scripts/package_skill.py`: packages a skill after publish gate.
- `scripts/quick_validate.py`: legacy smoke alias with no release authority.
- `scripts/format_check.py`: format smoke check.

## Release and stage gates

- `scripts/release_gate.py`: final draft or publish gate.
- `scripts/stage_gate.py`: create/revise/merge/split/deprecate/package/publish stage gate.
- `scripts/enforce_policy.py`: applies a YAML release policy to gate output.
- `scripts/promote_skill_state.py`: updates lifecycle state after valid transitions.
- `scripts/healthcheck_skill.py`: runs package-oriented health checks.

## Structure, semantics, and references

- `scripts/audit_structure.py`: checks required semantic blocks.
- `scripts/audit_workflow_contract.py`: checks workflow step contracts.
- `scripts/audit_semantics.py`: checks semantic consistency.
- `scripts/audit_semantic_rules.py`: checks semantic rule quality.
- `scripts/audit_gate_language.py`: blocks release-like wording in weak validators.
- `scripts/audit_skill_references.py`: validates local references.
- `scripts/audit_unreferenced_files.py`: detects orphan scripts/references/assets.

## Lifecycle, migration, and wrapper drift

- `scripts/audit_lifecycle.py`: checks lifecycle metadata.
- `scripts/audit_lifecycle_state.py`: checks lifecycle state.
- `scripts/audit_migration_governance.py`: checks migration governance evidence.
- `scripts/audit_wrapper_drift.py`: checks host wrapper drift.
- `scripts/check_retirement_gate.py`: checks retirement prerequisites.
- `scripts/generate_migration_guide.py`: creates migration guidance.

## Eval and benchmark

- `scripts/audit_eval_coverage.py`: checks eval coverage tags and languages.
- `scripts/audit_eval_quality.py`: checks eval fixture quality.
- `scripts/audit_golden_trigger_set.py`: checks trigger class coverage.
- `scripts/audit_benchmark.py`: checks benchmark metadata and regression gates.
- `scripts/aggregate_benchmark.py`: aggregates benchmark output.
- `scripts/check_regression_gates.py`: evaluates benchmark gate thresholds.
- `scripts/run_eval.py`: runs eval fixtures.
- `scripts/run_loop.py`: optimization loop helper.
- `scripts/improve_description.py`: proposes description changes.
- `scripts/normalize_feedback.py`: normalizes feedback into structured records.

## Portfolio governance

- `scripts/audit_skill_overlap.py`: checks overlap between skills.
- `scripts/audit_handoff_contracts.py`: checks handoff chains.
- `scripts/simulate_routing.py`: simulates routing behavior.
- `scripts/generate_skill_graph.py`: creates a skill graph.
- `scripts/generate_roi_dashboard.py`: summarizes ROI evidence.
- `scripts/score_deprecation_candidates.py`: scores deprecation candidates.
- `scripts/detect_merge_candidates.py`: finds merge candidates.
- `scripts/plan_skill_fusion.py`: plans skill fusion.
- `scripts/resolve_skill_conflicts.py`: resolves collision candidates.
