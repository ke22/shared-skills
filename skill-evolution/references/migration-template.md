# Migration Note Template

當 evolution decision 需要 rename、merge、split、deprecation、retirement 或 rollback 時，使用這份模板。

```yaml
migration_type: merge | split | rename | deprecate | retire | rollback
decision_date: YYYY-MM-DD
owner: ""
from:
  - skill-name
to:
  - skill-name
reason: ""
failure_evidence:
  - ""
compatibility_policy: ""
handoff_rule: ""
evals_updated:
  - ""
wrappers_updated:
  - ""
rollback_condition: ""
verification:
  commands_run:
    - ""
  gate_result: PASS | FAIL | BLOCKED
residual_risk:
  - ""
```

這份 note 應放在受影響 skill 的 readiness 或 migration governance evidence 中；不要把它藏在 host-specific wrapper 裡。
