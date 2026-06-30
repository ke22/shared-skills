# Telemetry 操作手冊

使用 telemetry 判斷哪些失敗值得進入 skill evolution。Raw telemetry 可以包含 production traces、本地 command logs、eval runs、使用者修正、review comments 與 router observations。

## 最低欄位

- `run_id`
- `timestamp`
- `host`
- `model`
- `skill_name`
- `skill_version`
- `user_intent`
- `expected_behavior`
- `actual_behavior`
- `tools_called`
- `errors`
- `human_feedback`
- `safety_events`
- `final_outcome`

## 訊號路由

- Under-trigger 或 over-trigger：更新 description、negative triggers 或 overlap evals。
- Tool argument errors：更新 tool contract、validation script 或 schema notes。
- 反覆人工修正：更新 workflow gate 或 output contract。
- Safety blocks：更新 approval boundary 或 stop condition。
- Stale dependency：更新 compatibility notes 與 freshness checks。
- Pass rate 下降：建立 regression gate，並評估 rollback。

## 資料衛生

把 telemetry 存成 eval fixture 前，必須先遮罩 secrets 與敏感個資。Raw traces 應保留在 skill folder 外；skill folder 內只保存通用化 fixture、摘要與 release evidence。
