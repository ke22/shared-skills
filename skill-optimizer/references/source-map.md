# Source map

This skill is inspired by Microsoft SkillOpt but is intentionally a portable workflow skill, not a vendored copy of the SkillOpt codebase.

## Primary sources checked on 2026-06-11

- Microsoft SkillOpt GitHub repository: https://github.com/microsoft/SkillOpt
  - Used for the project framing: text-space optimization for reusable natural-language skills, trajectory-driven edits, validation-gated updates, and deployable `best_skill.md` artifacts.
- SkillOpt README: https://raw.githubusercontent.com/microsoft/SkillOpt/main/README.md
  - Used for the public overview: rollout, reflect, aggregate, select, update, evaluate loop; optimizer/target separation; multi-backend support; SkillOpt-Sleep deployment-time loop.
- SkillOpt documentation and reproduction guide: https://raw.githubusercontent.com/microsoft/SkillOpt/main/docs/guideline.html
  - Used for the deep-learning analogy, training loop stages, validation gate, slow update, meta skill, output structure, config knobs and split naming.
- SkillOpt new benchmark guide: https://raw.githubusercontent.com/microsoft/SkillOpt/main/docs/guide/new-benchmark.md
  - Used for the benchmark adapter shape: loader, rollout helper, env adapter, YAML config, registration and the requirement to score inside rollout.
- SkillOpt-Sleep controllable dreaming architecture: https://raw.githubusercontent.com/microsoft/SkillOpt/main/docs/sleep/CONTROLLABLE_DREAMING.md
  - Used for train / validation / test split discipline, dream data restrictions, optional gate reporting, multi-rollout contrastive reflection, token/time budgets and multi-objective reward.
- SkillOpt arXiv page: https://arxiv.org/abs/2605.23904
  - Used for paper metadata and high-level method claims.

## Local interpretation

- This skill keeps SkillOpt's useful control ideas: frozen target agent, separate optimizer, scored rollouts, bounded edits, held-out gate, slow long-term guidance, multi-objective reward and deployable skill artifact.
- This skill does not require Microsoft SkillOpt to be installed. It can review SkillOpt outputs, design compatible benchmarks, or run the same discipline manually with local eval scripts.
- Any external optimizer output is treated as a proposal until local structure, lifecycle, compatibility and regression gates pass.
