# Optimization playbook

Use this playbook when a skill already exists and the user wants measurable improvement rather than a fresh authoring pass.

## 1. Minimum viable optimization spec

Record these fields before editing:

- Target skill path and version.
- Baseline snapshot or commit.
- Primary objective: pass rate, trigger precision, trigger recall, token cost, latency, tool reliability, output quality, or reviewer score.
- Secondary constraints: maximum token increase, maximum latency increase, no new over-trigger, no neighbor collision, no removal of required safety gates.
- Optimizer / target separation: who proposes edits, who executes tasks, who grades.
- Data split: train, validation, test, with source and contamination risk.
- Gate metric: hard, soft, mixed, multi-objective, or manual rubric.
- Adoption rule: accept, reject, rollback, split, or handoff.

## 2. Data split rules

- Train can include real tasks, synthetic variants, session replay, and dream-augmented prompts.
- Validation must be held out from edit generation and must decide whether a candidate is allowed forward.
- Test must be the final report split and should use real tasks whenever possible.
- Synthetic or dream examples must not enter validation or test unless explicitly labeled as synthetic stress tests, not release evidence.
- If the same user prompt appears in multiple forms, keep all close variants in one split to reduce leakage.

## 3. Rollout evidence

Collect enough fields to replay or audit the decision:

- task_id, split, origin, target_skill_version, candidate_id
- host, model, tool environment, timestamp, seed or run id
- input prompt, required files, tool availability
- output, pass/fail, soft score, fail reason
- token usage if provider reports it, latency_ms, retries, tool errors
- grader version and reviewer notes

When exact provider usage is available, use actual usage over local estimates. If only estimates exist, label them as estimates.

## 4. Candidate edit discipline

Use bounded add / delete / replace changes:

- Add a rule only when a rollout pattern shows a missing decision rule.
- Delete a rule when it causes measurable over-trigger, collision, excessive cost, or contradicted behavior.
- Replace a rule when the old wording is ambiguous or too broad.
- Move long details into references when `SKILL.md` becomes too large for stable routing.
- Update evals and gates together with behavior changes.

Avoid these anti-patterns:

- Accepting a full rewritten skill because it "looks better" without paired validation.
- Training on the same tasks used for final claims.
- Optimizing only easy happy paths.
- Treating one failed rollout as proof of a broad rule.
- Improving pass rate while silently increasing token cost, latency, or neighbor confusion.

## 5. Gate decision template

Use this template in final reports:

```markdown
## Optimization Decision

- Decision: ACCEPT / REJECT / ROLLBACK / HANDOFF / BLOCKED
- Target skill:
- Baseline version:
- Candidate version:
- Objective:
- Split:
- Validation result:
- Test result:
- ROI result:
- Trigger / overlap result:
- Accepted edits:
- Rejected edits:
- Rollback path:
- Residual risk:
```

## 6. SkillOpt artifact review

When a user provides SkillOpt output:

1. Treat `best_skill.md` as an optimizer proposal, not as an automatic replacement.
2. Compare it against the existing skill structure: frontmatter, role, decision boundary, workflow, output contract, follow-through policy, references, evals, lifecycle and release evidence.
3. Extract only bounded edits that preserve the local skill pack contract.
4. Run local validation and regression gates before adoption.
5. Save rejected proposals with a short reason so future optimization does not repeat them.

## 7. Adoption and monitoring

After accepting a patch:

- Update `references/readiness_report.md` with commands and results.
- Update `assets/evals/evals.json` or `assets/evals/regression_gates.json` when behavior changed.
- Keep old baseline and candidate artifact paths in release evidence or review notes.
- Add follow-up monitoring for under-trigger, over-trigger, cost drift and stale source references.
