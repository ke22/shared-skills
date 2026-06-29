---
name: openclaw-monthly
description: Runs monthly A/B experiments on tools/settings/whitelists using recent sessions (rolling 30 days). Re-runs representative tasks with parallel subagents, defines measurable success criteria, and outputs a decision (A replaces B or not) plus exceptions and long-term defaults. Use when the user mentions 實驗（每月）, A/B 實驗, 工具取代, 白名單, 重跑任務, or wants to compare tool stacks.
---

# OpenClaw Monthly Experiments（每月）

每月把「工具/設定檔/白名單」的選擇變成可重跑、可量化的 A/B 實驗，最後輸出可採納的長期預設。

## Triggers
- 使用者提到：`實驗（每月）`、`每月實驗`、`A/B 實驗`
- 使用者要你：`A 工具取代 B 工具`、`重跑我當初的任務`、`使用最大量最聰明的 Subagents`
- 使用者要你：掃 sessions（例如：`找出最近所有曾經使用 1password 的 session`）
- 使用者要你：更換模型重跑比較

## Rolling Window
- 預設範圍：最近 30 天（rolling）
- 若使用者指定範圍（例如「最近三個月」），以使用者為準

## Required Inputs (ask if missing)
- **Experiment target**：Tool A 與 Tool B（或設定組合 A/B）
- **Success criteria**（至少 2 個）：成功率、速度、成本、穩定性、維護性
- **Test set**（至少 3 個任務）：指定 sessions / 任務描述 / 檔案或 repo 操作

## Workflow
1. 定義假說（Hypothesis）：A 是否可在常見任務中取代 B。
2. 決定測試集（TestSet）：覆蓋「容易」與「麻煩」兩端；優先選過去真的做過、且未來會再做的任務。
3. 固定成功判準（SuccessCriteria）與記錄格式（LogSchema）。
4. 平行重跑（Parallel Re-run）：用 subagents 平行跑每個任務在 A 與 B 下的執行；保留輸入、關鍵決策、輸出、失敗原因。
5. 彙整結論：A 是否取代 B（Yes/No/Partial）、例外清單、推薦長期預設。

## Output Template

### Monthly Experiment Memo（rolling 30 days）

#### 1) Experiment
- **Goal**：
- **A**：
- **B**：
- **Hypothesis**：

#### 2) Success criteria
- [ ] 成功率：
- [ ] 速度：
- [ ] 成本：
- [ ] 穩定性：
- [ ] 維護性：

#### 3) Test set
1. Task 1：
2. Task 2：
3. Task 3：

#### 4) Results summary
- **A results**：
- **B results**：
- **Decision**：Yes / No / Partial

#### 5) Exceptions (when B still needed)
- 例外 1：
- 例外 2：

#### 6) Long-term defaults
- **Default stack**：
- **Whitelist / policy updates**：

## Decision Framework (reusable)

### Headless 爬蟲選工具
- **Block rate**、**Speed**、**Reproducibility**、**Coverage**、**Maintainability**
- 合規前提：優先用官方 API / RSS / sitemap；降低不必要請求、加強重試與退避

### Playwright vs Chrome MCP 能力矩陣
- Reliability、Network control、Downloads/files、Cross-browser、CI friendliness、Ergonomics

### 多 Agent 平行測試控管
- 每個 worker 使用獨立 profile / storage state（避免互相踩 session）
- 對同一網域做 concurrency cap
- 記錄每個任務的重試次數、錯誤分類、被擋比例
- 把「失敗」分成可修復 flake vs 站台阻擋，避免誤判工具好壞

## Guardrails
- 實驗必須可重跑：固定輸入、固定判準、固定記錄格式。
- 結論必須包含例外清單；不要用一句「可以/不可以」結束。
