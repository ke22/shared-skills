---
name: openclaw-daily
description: Captures today's effort into reusable Skills improvements (triggers, output contracts, pitfalls). Use when the user mentions Skills（日常/每天）, "把今天的努力儲存下來", "做成 Skills", "盤點 skills", "觸發條件", or asks to refine A/B/C skills triggers.
---

# OpenClaw Daily Skills（每天）

把「今天做過的事」轉成可重用、可被觸發的 Skill 增量：更清楚的觸發條件、穩定的輸出模板、以及可避免的失敗模式。

## Triggers
- 使用者提到：`Skills（每天）`、`日常 Skills`、`把今天的努力儲存下來`、`做成 Skills`
- 使用者要你：`盤點 skills`、`修正既有 skills`、`觸發條件更明確`
- 使用者提出類似問題：
  - 「請反思，要怎麼做成 Skills」
  - 「既有 Skills 有什麼要修正的？」
  - 「盤點 A、B、C 三個 Skills，怎麼把觸發條件寫得更明確——什麼情境該用哪一個」

## Required Inputs (ask if missing)
- 今天要保存成 skill 的素材來源（擇一即可）
  - 今日的聊天對話（你可以直接貼關鍵段落）
  - 今日的任務列表（bullet list）
  - 今日產出的檔案/改動（檔名清單即可）
- 若你說「盤點 A/B/C skills」：A/B/C 的 skill 名稱或路徑

## Workflow (default)
1. 把今天的工作拆成 1–3 個「可重用的行為單元」(ReusableUnit)：
   - 一句話：今天我反覆做了什麼（不是做了哪個專案）
   - 觸發情境：什麼時候你會想再次做同一件事
   - 最小工作流：固定步驟（最多 6 步）
   - 產出 contract：你希望我每次輸出的固定格式
   - 失敗模式：最常見的 2–3 個踩雷點 + 防呆規則
2. 如果你點名要「做成 Skills」：把 ReusableUnit 轉成 Skill 草稿元素：
   - **Description**（第三人稱 + 明確 trigger terms）
   - **Triggers**（可複製的關鍵字）
   - **Inputs**（缺什麼必問）
   - **Workflow**（固定步驟）
   - **Output template**（你可直接貼到筆記/issue）
3. 如果你點名「盤點 A/B/C skills」：輸出「分流規則」：
   - 哪些訊號用 A、哪些訊號用 B、哪些訊號用 C
   - 彼此重疊時的優先順序（tie-breakers）

## Output Template

### 今日可保存的 Skill 增量

#### 1) ReusableUnit：[一句話命名]
- **When（觸發情境）**：
- **How（最小工作流）**：
  - [ ] Step 1:
  - [ ] Step 2:
  - [ ] Step 3:
- **What（輸出 contract）**：
- **Pitfalls（失敗模式與防呆）**：

#### 2) 既有 Skills 修正建議（如有）
- **Skill**：`<skill-name>`
  - **Trigger 修正**：
  - **輸出格式修正**：
  - **新增 guardrails**：

#### 3) A/B/C skills 分流（如有）
- **A：`<skill-a>` 用在**：
- **B：`<skill-b>` 用在**：
- **C：`<skill-c>` 用在**：
- **Tie-breakers（衝突時優先順序）**：

## Guardrails
- 不把「今天做了什麼專案」直接當成 skill；要抽象到「下次可重跑的行為」。
- Description 必須包含可被觸發的關鍵詞（具體詞彙 > 抽象詞彙）。
- 不要把一次性的情境（只發生一次的 bug）寫成 skill；改寫成「同類型問題的處理法」。
