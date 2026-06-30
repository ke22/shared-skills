# Telemetry playbook

Runtime traces should be small, structured, and stable enough to aggregate across hosts.

## Run trace fields

- `query`
- `selected_skill`
- `host`
- `version`
- `trigger_type`
- `user_intent`
- `tools_used`
- `completion_status`
- `user_correction`
- `failure_type`

## Feedback classes

- `under-trigger`
- `over-trigger`
- `wrong-output-shape`
- `too-much-clarification`
- `missed-tool-use`
- `unsafe-default-action`
- `too-expensive`
- `stale-reference`

Use `scripts/normalize_feedback.py` to convert run folders into a maintenance summary.
