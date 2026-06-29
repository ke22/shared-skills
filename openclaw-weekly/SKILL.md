---
name: openclaw-weekly
description: Weekly retrospective on recent conversations (rolling 7 days): categorize commands, analyze tool usage and blind spots, and produce an /insight-style report with actionable improvements. Use when the user mentions 復盤（每週）, /insight, "分析對話紀錄", "盲點", "分類指令", or asks how to improve their agent workflow.
---

# OpenClaw Weekly Retro（每週）

把最近 7 天（rolling）的對話紀錄做成可行動的復盤報告：你下了哪些指令、我用了哪些工具、盲點在哪裡、下週怎麼更好。

## Triggers
- 使用者提到：`復盤（每週）`、`每週復盤`、`/insight`
- 使用者要你：`分析對話紀錄`、`我用了哪些工具`、`盲點是什麼`、`分類我下的指令`、`我可以怎麼做得更好`
- 使用者問：是不是只要用 A 工具就好、不需要 B 工具？

## Rolling Window
- 預設範圍：最近 7 天（rolling）
- 若使用者指定範圍（例如「上週」或日期區間），以使用者為準

## Required Inputs (ask if missing)
- 你想復盤的主題或問題（擇一）
  - 一句話：本週最困擾的問題是什麼
  - 或直接貼你要分析的對話連結/片段
- 若你提到「A 工具 vs B 工具」：A/B 的名稱

## Workflow
1. 蒐集最近 7 天的對話紀錄（`~/.claude/history.jsonl` 或 sessions 目錄），建立「會話清單」。
2. 對每個會話擷取四類訊號：
   - **UserIntent**：你想完成什麼（除錯/規劃/文件/自動化/爬蟲/測試）
   - **Commands**：你下的指令型句子（可分類）
   - **ToolsUsed**：我使用的工具（以及為什麼選它）
   - **DecisionPoints**：關鍵決策（例如：為何改用另一工具）
3. 產出 /insight 報告：
   - 任務類型分佈
   - 工具使用分佈 + 「可被替代」的機會點
   - 3 個盲點（可避免、可複用）
   - 下週 2–3 個可執行改進（包含觸發條件改寫）
4. 若復盤題目是「A 工具就好嗎？」：
   - 建立最小能力矩陣（Capabilities × 你的常見任務）
   - 結論分三類：Always_A / Sometimes_B / Never_B

## Command Categorization
- **Plan/Design**：要方案、要比較、要規格
- **Implement**：要直接改 code、加功能、重構
- **Debug/Fix**：報錯/不工作/要修
- **Ops/Run**：要跑指令、部署、同步、重啟
- **Docs/Knowledge**：要寫 doc、整理知識、做 skill

## Output Template (/insight)

### /insight — Weekly Retro（rolling 7 days）

#### 1) 本週你在做什麼（任務類型）
- **Top intents**：

#### 2) 你下的指令模式（分類）
- **Plan/Design**：
- **Implement**：
- **Debug/Fix**：
- **Ops/Run**：
- **Docs/Knowledge**：

#### 3) 工具使用與選擇理由
- **Tools used**：

#### 4) 盲點（3 個）
1. **Blind spot**：
   - **Symptom**：
   - **Root cause**：
   - **Next time rule**：

#### 5) 下週可執行的改進（2–3 個）
- **改進 1**：
  - **New trigger phrase(s)**：
  - **New default workflow**：

## Guardrails
- 復盤要導向「下週可用的規則」：每個盲點都要落地成一句可觸發/可執行的規則。
- 不要只做漂亮摘要；要回答「下次怎麼更快/更穩」。
