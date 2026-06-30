# External ecosystem methodology

This playbook captures methods worth importing from public skill-creation, registry, discovery, linting, and validation projects. Treat it as design guidance for `skill-creator-advanced`; do not copy external repository structure blindly.

## Sources Reviewed

- `anthropics/skills` and `anthropics/claude-plugins-official`: official skill-creator workflow for intent capture, realistic trigger evals, description optimization, with-skill/baseline comparison, reviewer feedback, and packaging.
- `iflytek/skillhub`: private registry governance with namespaces, RBAC, audit logs, review gates, version states, tags, promotion, and yank/deprecation concepts.
- `dmgrok/agent_skills_directory`: discovery-oriented registry with project matching, quality scoring, maintenance tracking, security validation, duplicate detection, and CI validation.
- `skills-check`, `skillscheck`, and `skillcheck`: quality-toolchain patterns for freshness, policy, token budget, semver/version verification, fingerprinting, usage telemetry, orphan/link/code-fence checks, progressive disclosure, description quality scoring, agent compatibility, JSON output, and CI gates.

## Adoption Rules

### 1. Trigger improvement must use realistic prompts

Borrow from official skill-creator:

- Generate a fixed trigger eval set before changing the description.
- Use realistic prompts with context, filenames, company/project details, typos, abbreviations, and mixed levels of formality.
- Include near-miss negatives. Obvious irrelevant negatives do not test over-trigger risk.
- Avoid one-step prompts that the host can solve without a skill; they are poor trigger tests even when the wording matches.
- Keep direct, indirect, and negative prompt IDs stable across versions. Only change one variable per experiment when diagnosing trigger rate.

Minimum artifact:

```json
[
  {
    "id": "trigger-direct-001",
    "query": "realistic user prompt",
    "should_trigger": true,
    "trigger_class": "direct",
    "neighbor_skill": null
  }
]
```

### 2. Description optimization must guard against overfitting

The official loop optimizes the description as the primary routing surface. Adapt it with these gates:

- Split trigger evals into train and held-out test.
- Run repeated trials when the host allows it; report variance, not just one score.
- Select the best description by held-out test performance, not train score.
- Show before/after descriptions and score deltas.
- If a description fix requires making the scope much broader, stop and revisit skill boundaries instead.

### 3. With-skill/baseline comparison must be paired

Functional evals must compare the same prompt under comparable conditions:

- New skill baseline: no skill.
- Existing skill baseline: old skill snapshot, not no-skill.
- Start with-skill and baseline runs in the same round when the environment supports parallel executors.
- Preserve prompt, eval metadata, timing, grading, outputs, benchmark, and reviewer feedback.
- Use blind comparison for high-stakes or subjective output quality when possible.

Required raw evidence shape:

```text
<skill-name>-workspace/
  iteration-N/
    eval-001-realistic-name/
      eval_metadata.json
      with_skill/
        outputs/
        timing.json
        grading.json
      without_skill/ or old_skill/
        outputs/
        timing.json
        grading.json
```

Skill-local publish gates must depend on summarized release evidence, not the raw workspace.

### 4. Registry governance requires ownership and auditability

Borrow from SkillHub, scaled down for local repos:

- Namespace: classify skills by team, domain, or lifecycle surface. Public/global skills need stricter gates than team/private skills.
- Roles: distinguish author, owner, reviewer, release approver, and auditor, even if these are just YAML fields at first.
- States: use draft, candidate, validated, released, monitored, needs-maintenance, deprecated, retired. Map registry states such as uploaded, pending review, published, rejected, and yanked into this lifecycle where useful.
- Review gates: namespace/team review before broader publication; global or marketplace promotion requires stricter evidence.
- Audit log: record publish, approve, reject, yank, deprecate, retire, promote, and owner changes.
- Tags: keep `latest` system-derived; use `stable`, `beta`, or similar channels only as explicit release metadata.

Minimum local artifact:

```yaml
registry:
  namespace: "@team-platform"
  visibility: internal
  channel: stable
  reviewers:
    - platform
  audit_log: references/readiness_report.md
```

### 5. Discovery quality should be scored, not guessed

Borrow from Agent Skills Directory:

- Analyze project context before recommending or creating skills.
- Rank candidate skills with quality, maintenance, security, and fit signals.
- Detect duplicates and near-duplicates before adding a new skill.
- Track maintenance freshness, owner status, compatibility, and risk signals.
- Make validation reusable in CI and visible in registry/catalog metadata.

Suggested scoring dimensions:

| Dimension | Signal |
| --- | --- |
| Fit | project terms, trigger overlap, use-case match |
| Quality | structure, examples, output contract, eval evidence |
| Maintenance | owner, review cadence, stale references, version freshness |
| Security | secrets, suspicious commands, prompt injection exposure |
| Compatibility | host support, wrapper drift, package smoke test |
| Collision | duplicate descriptions, neighbor confusion, handoff gaps |

### 6. Static linting, eval kits, and collision checks are different gates

Use external quality tools as design references, but keep their roles separate:

- Static lint: frontmatter, root file layout, links, orphaned files, code fences, progressive disclosure, token budget, host compatibility.
- Eval kit: trigger rate, functional pass rate, regression gates, repeated trials, blind comparison, reviewer feedback.
- Collision detection: overlap matrix, duplicate detection, negative triggers, routing simulation, project-specific recommendations.
- Freshness/security: outdated packages, deprecated APIs, hallucinated dependencies, secrets, injection patterns, fingerprint/hash registry, telemetry policy.

Do not let a static linter PASS replace eval evidence. Do not let eval success hide a packaging or security failure.

## Integration Points in This Skill

- `references/description-optimization.md`: official trigger-eval and held-out description optimization loop.
- `references/eval-workflow.md`: paired with-skill/baseline evidence capture and human reviewer loop.
- `references/testing-playbook.md`: static/eval/collision/freshness/security gate taxonomy.
- `references/lifecycle.md`: namespace, RBAC, audit log, review gate, promotion, and yank/deprecation concepts.
- `scripts/audit_golden_trigger_set.py`: verifies direct / indirect / negative prompt classes.
- `scripts/audit_eval_coverage.py`: verifies trigger, functional, language, overlap, edge, and failure coverage.
- `scripts/simulate_routing.py`, `scripts/audit_skill_overlap.py`, and `scripts/detect_merge_candidates.py`: portfolio-level routing and collision checks.
- `scripts/generate_skill_graph.py`, `scripts/audit_skill_ownership.py`, and `scripts/generate_lifecycle_report.py`: registry and lifecycle visibility.

## Release Checklist Additions

Before marking a skill `released`, confirm:

- Trigger eval prompts are realistic and include direct, indirect, and negative classes.
- Description optimization uses stable eval IDs and does not change multiple variables at once.
- Functional benchmark compares with-skill against a proper baseline or old snapshot.
- Registry metadata includes owner, namespace/visibility, review state, support matrix, and audit trail.
- Quality score or equivalent evidence covers structure, evals, maintenance, security, compatibility, and collision risk.
- Static lint, eval benchmark, collision simulation, and security/freshness checks are reported as separate gates.
