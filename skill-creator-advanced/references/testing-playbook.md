# 測試手冊（觸發 / 功能 / 效能）

這份文件提供更具體的測試方法、判讀方式與迭代節奏。

## 1) Triggering tests

目標：確保 skill 在正確的時機自動載入，而且不會亂載入。

### Golden trigger set

Trigger rate 改進要先固定一組 golden prompt set，避免每輪都換測題導致結果不可比較。

最少分類：
- `direct`：明確、典型、應穩定觸發的提示。
- `indirect`：改寫、近義、near-miss、鄰近 skill 混淆但仍應觸發的提示。
- `negative`：看起來相近但不應觸發，或應交給其他 skill / 一般回覆的提示。

`assets/evals/evals.json` 中每筆 trigger eval 必須有 `trigger_class`，並由 `scripts/audit_golden_trigger_set.py` 檢查 direct / indirect / negative 是否都存在、ID 是否穩定、prompt 是否唯一、分類與 should-trigger / should-not-trigger 標籤是否一致。

測試集建議：
- 8-10 個 `should-trigger`
  - 明顯說法
  - 近義/改寫
  - 真實口語句
  - 相關檔案類型或工具名稱
- 8-10 個 `should-not-trigger`
  - 完全無關
  - 近似但不在範圍內（near-miss）
  - 容易混淆但應該由別的 skill 接手

判定：
- 是否自動載入
- 是否只在很特定 wording 才會載入
- 是否因為 description 太寬而誤觸發

如果 should-trigger 常 miss，優先改 `description`，不要先往 body 加更多規則。
更細的 description 調整方式見 `references/description-optimization.md`。

測試資料要像真實使用者 prompt，而不是抽象標籤：
- 加入檔名、欄位名、公司/專案脈絡、URL、錯字、縮寫、大小寫混用與中英混用。
- 不要用 host 本來就能單步完成的 prompt 來判定 description 壞掉；這類 prompt 可能不觸發是因為 skill 沒必要。
- 每輪 trigger rate 改進只改一個主要變數，保留固定 prompt IDs，才能知道是 description、boundary 還是 eval set 造成差異。

### Trigger recall benchmark

不要只測 should-trigger / should-not-trigger，還要刻意補這些案例：
- 同義改寫
- near-miss
- 錯誤競品
- 跨語言
- 縮寫 / 俗稱
- 檔案型態詞
- 上下游 handoff

最終至少輸出：
- `top1_similarity`
- `top3_similarity_sum`
- `false positive`
- neighbor confusion matrix

不要把 Jaccard 或其他 surface similarity 指標命名成 `hit@k`。真正的 Hit@K / Top-K routing metric 需要 ground truth target，表示正確目標是否出現在前 K 名。

## 1.5) Multilingual trigger tests

如果 skill 可能面對多語言或混合語料，請額外建立：
- `zh`：純中文、台灣常見口語、縮寫
- `en`：純英文、技術詞、常見簡寫
- `mixed`：中文句子 + 英文工具名 / 檔名 / 技術詞

檢查點：
- 只有英文才會觸發，中文不會
- 純中文會觸發，但 mixed prompt 失敗
- 工具名稱、檔案類型、deliverable 名稱在不同語言下是否仍穩定

## 1.6) Skill overlap tests

對每個 skill，至少列 2-3 個鄰近 skill 或容易混淆的任務類型。

對每個鄰近 skill 都要測：
- 這句 query 為什麼應該是我接
- 這句 query 為什麼應該是別的 skill 接
- 若兩邊都可能有用，該怎麼定主次

不要只寫「不相關」案例，因為真實 over-trigger 通常來自相鄰技能，而不是完全無關的句子。

## 2) Functional tests

目標：確保 skill 輸出正確、工具呼叫成功、錯誤處理可用。

用 Given/When/Then 寫測試案例：

範例：Create project with 5 tasks
- Given: project name、5 個 task 描述
- When: 執行 workflow
- Then:
  - project 已建立
  - 5 tasks 屬性正確
  - 無 API error

覆蓋面：
- Happy path：最常見使用流程
- Edge cases：空輸入、重複名稱、缺必填欄位
- Failure modes：MCP 連線失敗、rate limit、permission 不足
- Recovery path：失敗後是否有可執行的補救指引

測例來源優先順序：
1. 真實使用者需求
2. 近期失敗案例
3. 作者補出的邊界案例

## 3) Performance comparison

目標：證明 skill 相對 baseline 有明確改善，而不是只是多寫一堆規則。

建議紀錄：
- 對話輪次（messages）
- 工具呼叫數（tool calls）
- 失敗/重試（failed calls, retries）
- token（如可得）
- 達成任務的完整度
- 使用者是否還需要額外糾正
- trigger recall 指標與 overlap confusion 指標

模板：
- Baseline（不開 skill）
  - 結果品質：
  - 成本：
  - 主要失敗點：
- With skill
  - 結果品質：
  - 成本：
  - 主要失敗點：

如果可以，請做盲比或至少在看不到版本資訊時評估輸出，避免作者偏見。

## 3.5) ROI review

除了比較誰比較好，也要比較值不值得：
- pass rate 提升多少
- 速度變慢多少
- token 增加多少
- 維護成本是否提高
- 是否需要額外 scripts / docs / 人工審查

常見判斷：
- 小幅品質提升，但 token / 時間暴增：未必值得
- 明顯降低錯誤率或人類糾正次數：通常值得
- 只有作者自己覺得變好，但 benchmark 與 reviewer 都看不出差異：通常不值得

## 3.6) Regression gates

在發版前先定門檻，而不是跑完 benchmark 再憑感覺決定。

常見 gate：
- with-skill pass rate 不得低於 baseline
- pass rate delta 至少要達某值
- time / token 增幅不得超標
- under-trigger / over-trigger 失敗數不得超過上限

建議把門檻寫成機械可判斷的設定，並用 `scripts/check_regression_gates.py` 驗證。

## 4) Operationalizing evals

當測試案例穩定後，不要只留在文件裡，應把它們正式化：
- 寫入 `assets/evals/evals.json`
- 用 `prepare_eval_workspace.py` 建立 iteration workspace
- 將 with-skill 與 baseline / old-skill 的輸出放回對應目錄
- 跑 `aggregate_benchmark.py` 產生 `benchmark.json` / `benchmark.md`
- 跑 `scripts/generate_review.py` 產生 `review.html`

若環境支援 subagents / parallel workers：
- 優先同一輪啟動 with-skill 與 baseline
- 不要先做完整個 with-skill 再回頭補 baseline

若環境不支援：
- 可以序列執行
- 但仍要維持 paired run 的資料夾結構，避免後續無法比較

## 5) 迭代回路

每次測試後至少回答三件事：
1. 這次失敗是觸發問題、流程問題，還是資源問題？
2. 若修正後重新測，失敗型態有沒有變少？
3. 這個 skill 是否真的比 baseline 好，還是只是更囉唆？

常見對策：
- 觸發問題：改 description、補真實 trigger phrases
- 流程問題：重寫步驟順序、加入 validation gate
- 資源問題：新增 scripts、拆 references、補模板或樣本

## 6) 自動化方向（可選）

- 互動式測試：最快，用來先找到大問題
- 腳本化測試：固定 prompt 集，適合回歸
- API evaluation suite：最系統化，適合持續 benchmark

建議先把一個難 case 做穩，再擴大 coverage；不要一開始就追求很大的測試量卻沒有明確判準。

## 7) Gate taxonomy

外部工具生態通常把 skill validation 拆成幾類，這些類別不能互相替代：

### Static lint

檢查：
- frontmatter / name / directory match
- root 層是否有不該打包的 README / LICENSE / Makefile
- `scripts/`、`references/`、`assets/` 是否有 orphan files
- Markdown links、fragment anchors、unclosed code fences
- SKILL.md 行數、token budget、progressive disclosure 層級
- target-agent compatibility，例如 Claude / Codex / Copilot / Cursor / VS Code

### Eval kit

檢查：
- direct / indirect / negative trigger rate
- functional pass rate
- with-skill vs no-skill 或 old-skill snapshot
- repeated-run variance
- blind comparison / human reviewer feedback
- regression gates

### Collision detection

檢查：
- duplicate / near-duplicate descriptions
- overlap matrix
- neighbor confusion cases
- query stealing risk
- missing negative triggers
- handoff contract gaps

### Freshness and security

檢查：
- stale package / API / documentation references
- hallucinated dependencies
- secrets or credentials in skill resources
- prompt injection exposure
- suspicious shell commands or network operations
- content fingerprint / hash registry
- usage telemetry and policy compliance

Release gate 應把這些類別分開報告：static lint PASS 不代表 eval PASS，eval PASS 也不代表 supply-chain 或 registry governance PASS。

