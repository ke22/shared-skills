# Authoring Principles

Use this reference when revising `SKILL.md` content, reviewing a skill, or
deciding whether a scope belongs in another skill.

## Required Principles

1. Write the `description` for routing, not marketing. Put real trigger phrases, work context, negative boundaries, and successful output first.
2. Learn from context before asking questions. Ask only when a high-risk missing fact would change the result.
3. Move brittle or repeatable checks into scripts.
4. Keep `SKILL.md` as routing and workflow. Put details in `references/` and load them only when needed.
5. Every skill needs `references/readiness_report.md` as release evidence.
6. Test realistic prompts, including direct, indirect, negative, near-miss, zh/en/mixed, and neighbor-confusion cases.
7. Compare with a baseline before claiming improvement. For existing skills, the baseline is usually the old skill snapshot.
8. Fix boundaries before wording. Do not use longer descriptions to hide unclear scope.
9. Public compatibility signals must be ready before release: frontmatter, homepage, license, installation path, permission story, support matrix.
10. Hard requirements must use hard wording. Avoid turning mandatory gates into soft "if possible" guidance.
11. If ROI is weak, reduce scope, split, or retire instead of adding more instructions.
12. Do not place `README.md` inside the installed skill folder.
13. Turn incidents into conditional, testable rules: trigger, default behavior, exception, and verification.
14. Prefer system design patterns over temporary file edits or brittle detours.
15. Keep cross-host core content as the source of truth; host adapters stay thin.
16. Tool schema is prompt surface: names, descriptions, enum values, required fields, and approval boundaries affect behavior.
17. Runtime state, caches, login data, raw traces, and benchmark archives belong in workspace or platform data paths, not the skill folder.
18. Layer checks: static lint, eval kit, collision detection, and freshness/security checks do not substitute for each other.

## Content Quality

- One skill has one primary job.
- Each workflow step needs input, action, output, and validation.
- Output contracts should specify section order, fields, format, and what freedom is allowed.
- Few-shot examples belong in `SKILL.md` only when they are short and frequently needed; longer examples belong in `examples/` or `references/`.
- Separate role, routing, workflow, output contract, tool policy, follow-through policy, and examples.
- Low-risk local edits may be done directly; deletion, publishing, remote writes, payments, emails, and production changes need explicit approval.
- Long workflows should be split across turns when each phase has distinct inputs, outputs, tools, or stop conditions.

## SkillOps Suite Boundary

Use `portfolio/skillops/suite-boundary.md` only for cross-skill routing,
registry governance, shared telemetry schemas, or suite-level policy decisions.
Do not copy shared governance rules into each root `SKILL.md`.
