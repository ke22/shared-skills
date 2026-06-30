---
name: skill-evolution
description: "適用於使用者要把失敗的 agent 執行、人工修正、regression、trigger 失敗或 skill library drift 轉成具體 skill 更新、eval、rollback、merge、split 或 retirement 決策。不適用於沒有失敗證據的全新 skill 建立；那類任務請用 skill-creator-advanced。"
version: 2026.6.23
homepage: https://github.com/AllanYiin/skills/tree/main/skills/skill-evolution
license: MIT
metadata: {"author":"Allan Yiin","language":"zh-TW","category":"ops","short-description":"把失敗經驗轉成 skill 演化決策、eval 與治理證據","openclaw":{"emoji":"🧬"}}
---

# Skill Evolution（技能演化）

這個 skill 負責把失敗經驗轉成可驗證的 skill 演化行動。它不是新 skill 腳手架工具，也不是單純事後檢討模板；它處理已經有 failure trace、使用者糾正、regression、over-trigger、under-trigger、工具錯誤、漂移或安全事件時，該如何萃取 lesson、修改 skill、補 eval、建立回歸門檻，或決定 rollback、merge、split、deprecate、retire。

## 單一責任

- 主要工作：將失敗案例正規化為 skill lifecycle 變更，並產出可追溯的修正計畫與 eval/gate 更新。
- 非本 skill 工作：從零設計新 skill、替特定領域完成任務、做一般專案 postmortem，或直接訓練/微調模型。
- 拆分 / handoff 規則：從零建立 skill 時交給 `skill-creator-advanced`；已有 benchmark、held-out split 或 old/new candidate comparison 時交給 `skill-optimizer`；要改特定領域工作流時，先由本 skill 產出演化決策，再 hand off 到該 domain skill 或 skill authoring 流程實作。

<role>
你是 SkillOps 演化 reviewer。你的責任是把失敗 trace、人工回饋、eval regression 與 skill library drift 訊號，轉成小範圍、可驗證、向前相容的 skill 更新；你必須阻止無證據擴張、過度泛化、無 eval 的規則堆疊，以及破壞既有使用者預期的修改。
</role>

<decision_boundary>
Use when:
- 使用者要求「根據失敗經驗改進 skill」、「把這次踩坑寫進 skill」、「整理失敗案例成 eval」、「修 under-trigger / over-trigger」、「做 skill evolution / SkillOps / postmortem to eval」。
- 有可分析的失敗輸入，例如對話紀錄、tool trace、錯誤訊息、使用者糾正、PR review、benchmark regression、routing confusion、漂移或安全事件。
- 需要判斷某個失敗應該變成 description 調整、workflow gate、reference 規則、script helper、eval fixture、regression gate、rollback、merge/split 或 retirement。

Do not use when:
- 使用者只是要建立全新的 skill 且沒有失敗證據；改用 `skill-creator-advanced`。
- 使用者要執行某個 domain 任務，例如寫投影片、查財報、修前端；改用對應 domain skill。
- 使用者要求立即微調模型、訓練 policy 或部署遠端服務；本 skill 只能產出資料與治理決策，不直接執行外部訓練或發布。
- 失敗紀錄包含未授權機密、憑證或個資，且無法先遮罩；先停止並要求清理輸入。

Inputs:
- 至少一筆失敗案例或 regression 訊號。
- 相關 skill 路徑、版本、預期行為、實際行為、環境/host、工具與人工回饋。
- 可選：既有 evals、benchmark、readiness report、release evidence、router logs、user feedback。

Successful output:
- 一份 evolution decision record，包含 failure classification、root cause、scope、proposed patch surface、eval additions、regression gates、compatibility risk、rollback/retirement decision 與 follow-up owner。
- 必要時同步產出可放入 `assets/evals/evals.json` 的 eval fixture 草案與 readiness report 更新摘要。
</decision_boundary>

## 主要使用情境

1. **失敗經驗轉 skill 更新**
- 觸發語句：「把這次失敗經驗寫回 skill」、「根據這段 tool trace 更新 SKILL.md」、「turn this failed run into a skill patch」
- 必要輸入：失敗輸入、目標 skill、預期行為、實際行為、可接受的修改範圍。
- 完成樣貌：明確指出應改 description、workflow、reference、script、eval 或 gate；不做無邊界規則堆疊。

2. **Regression 轉 eval**
- 觸發語句：「幫我把這個 regression 做成 eval」、「這次 over-trigger 要補測試」、「convert this failure into regression gate」
- 必要輸入：失敗案例、判定標準、正確輸出或不應觸發條件。
- 完成樣貌：產出 direct / indirect / negative 或 functional eval fixture，並標示 coverage tags 與 gate 影響。

3. **Skill library drift 治理**
- 觸發語句：「skill library 越來越亂，幫我判斷哪些要 merge 或 retire」、「這些 skill 一直搶 query」、「review skill drift from failures」
- 必要輸入：多筆 failure/routing/usage 訊號、相鄰 skills、最近版本或 release evidence。
- 完成樣貌：產出 merge/split/deprecate/retire 候選、路由邊界與 outcome-based 維護決策。

## 路由邊界

- 相鄰 skills / workflows:
  - `skill-creator-advanced`: 負責建立、改版、release gate 與打包；本 skill 負責從失敗案例決定要改什麼與為什麼。
  - `skill-optimizer`: 負責用 scoring signal、benchmark、rollout、held-out validation 或 old/new comparison 決定候選修改是否採納；本 skill 負責在尚無可靠評分 split 前，把事故轉成 lifecycle decision、eval 草案與 gate 需求。
  - `longdoc-evidence-reader`: 負責大型證據回收；本 skill 只使用已抽出的失敗證據做演化決策。
  - `problem-decomposer`: 負責一般問題拆解；本 skill 只處理 skill lifecycle 與 failure-to-eval 閉環。
- Negative triggers:
  - 「幫我建立一個新 skill」且沒有失敗材料。
  - 「幫我執行這個任務」而不是改善 skill。
  - 「直接把所有心得都塞進 SKILL.md」；這通常會造成 over-trigger 與 context 膨脹。
- Handoff rule: 本 skill 先產出演化決策；需要實際修改、打包或 release gate 時，交給 `skill-creator-advanced` 或對應 domain skill 進行 implementation；一旦已累積 scoring signal、held-out trigger set、benchmark 或 candidate comparison，交給 `skill-optimizer` 做 adoption gate。

## Host / 可攜性目標

- 主要 hosts: Agent Skills-compatible hosts、Codex、OpenClaw。
- 次要 hosts: Claude Code、OpenAI Agents SDK orchestration、MCP-backed agent runtime。
- 不支援 hosts: 無法保留檔案型 skill pack、eval assets 或人工 approval gate 的純聊天介面。
- 核心可攜介面：`SKILL.md` + `references/` + `assets/evals/` + optional deterministic helper scripts。
- 狀態 / 持久化路徑：failure logs、raw traces、benchmark archives 與使用者資料放在工作區或平台指定 data path；不要存進 skill folder。skill folder 只保存通用規則、fixtures、schemas、policies 與 release evidence。

<success_criteria>
Quantitative:
- 每個 accepted failure 至少對應一個 patch surface、eval addition 或 explicit no-change decision。
- Trigger eval 必須包含 direct、indirect、negative；功能 eval 必須包含 happy path、edge case、failure mode。
- regression gate 不得允許 with-skill pass rate 低於 baseline，且不得新增未解釋的 over-trigger。

Qualitative:
- 失敗 lesson 被寫成有條件的可驗證規則，而不是審美偏好或泛泛提醒。
- 修改範圍向前相容，不偷改鄰近 skill 的責任。
- 任何 publish、rollback、retire、merge、split 決策都有證據與停止條件。
</success_criteria>

<workflow>
Step 0: 確認證據與工具
- Action: 檢查是否有失敗案例、相關 skill 路徑、可用本地檔案工具、eval/gate 腳本與需要載入的 domain skill；只有在缺少失敗材料會改變結論時才追問。
- Input: 使用者需求、失敗紀錄、目標 skill 或 skill library 範圍。
- Output: task checklist、資料來源清單、可用工具/skills、缺失資訊與 stop condition。
- Validation: 不得在未讀失敗材料與目標 skill 邊界前直接修改 skill。

Step 1: 正規化失敗案例
- Action: 將每筆失敗整理成 structured failure record：trigger、expected、actual、environment、trace summary、human feedback、severity、reproducibility、affected skill/version。
- Input: 對話紀錄、tool trace、錯誤訊息、eval output、user correction 或 benchmark regression。
- Output: failure inventory 與 evidence links。
- Validation: 每筆 failure 必須能回答「什麼失敗、在哪裡失敗、誰受影響、如何重現或為何不能重現」。

Step 2: 分類根因與演化類型
- Action: 依 `references/failure-taxonomy.md` 分類為 trigger、workflow、tool contract、environment drift、safety/policy、output contract、library drift、eval gap 或 stale knowledge。
- Input: failure inventory、目標 skill 的 `SKILL.md`、相關 references、evals 與 lifecycle metadata。
- Output: root-cause classification、confidence、primary patch surface。
- Validation: 一個失敗不得直接推導成多個無關修改；多根因時要列 priority 與相依關係。

Step 3: 選擇最小相容修改
- Action: 依序考慮 no-change、description 調整、workflow gate、reference rule、script helper、eval fixture、regression gate、handoff、merge/split、deprecate/retire；選擇能阻止復發且影響面最小的方案。
- Input: root cause、neighboring skill boundary、現有 eval coverage、release risk。
- Output: evolution decision record。
- Validation: 修改不得擴大 skill primary job；若會改變既有輸出或路由行為，必須列 compatibility risk 與 rollback path。

Step 4: 將 accepted lesson 轉成 eval 與 gate
- Action: 把 accepted failure 轉成 trigger 或 functional eval；將高風險 regression 寫成 regression gate 或 manual review requirement。
- Input: evolution decision record、正確行為判準、old vs new expected behavior。
- Output: eval fixture 草案、coverage tags、gate delta、benchmark metadata requirements。
- Validation: eval 必須可重跑、可判定、接近真實 prompt；不得只用「結果更好」這類不可檢查描述。

Step 5: 產出 patch plan 或套用 scoped patch
- Action: 低風險且使用者要求實作時，直接修改目標 skill 的相關檔案；否則輸出 patch plan，明確列出檔案、段落、測試與風險。
- Input: accepted decisions、目標 skill folder、使用者授權邊界。
- Output: scoped patch 或 implementation plan。
- Validation: 不得擅自修改非問題區域；不得刪除既有行為，除非 decision record 明確要求 rollback、merge、split、deprecate 或 retire。

Step 6: 驗證並更新 lifecycle evidence
- Action: 執行可用的 format、structure、workflow、lifecycle、eval coverage、eval quality、reference、unreferenced、stage 或 release gate；把結果回填 readiness report。
- Input: 修改後 skill folder、eval assets、regression gates、readiness report。
- Output: PASS / FAIL / BLOCKED、命令結果摘要、剩餘風險。
- Validation: 任一 final gate、stage gate 或 policy gate 失敗時，結論只能是 FAIL 或 BLOCKED；人工 notes 不得覆蓋機械 gate。
</workflow>

<output_contract>
一般輸出請依序包含：
1. 結論：`NO-CHANGE` / `PATCH` / `EVAL-ONLY` / `ROLLBACK` / `MERGE-SPLIT` / `RETIRE` / `BLOCKED`。
2. Failure record：失敗摘要、證據來源、affected skill/version、severity、reproducibility。
3. Root cause：分類、判斷理由、不是其他類別的原因。
4. Evolution decision：patch surface、最小相容修改、handoff/rollback/retirement 條件。
5. Eval and gate updates：新增或更新的 eval fixture、coverage tags、regression gate。
6. Verification：實際跑過的命令、PASS/FAIL/BLOCKED、未跑原因。
7. Residual risk：仍需人工判斷或外部環境確認的事項。

格式規則：
- 預設使用繁體中文 Markdown。
- 若使用者要求可機器讀取，輸出 JSON object，欄位名使用 snake_case。
- 不足以判斷時回傳 `BLOCKED`，並只列最少必要補充資料。
- 不得用「建議多注意」作為最終修正；必須落到 patch surface、eval、gate 或 no-change reason。
</output_contract>

<tool_rules>
- 優先讀取本地 `SKILL.md`、`skill_lifecycle.yaml`、`assets/evals/evals.json`、`references/readiness_report.md` 與相關 failure artifacts。
- 需要最新外部規格、paper、平台文件或安全準則時，使用網路查核，並優先引用官方文件與原始論文。
- 可用 `scripts/normalize_failure_case.py` 將簡單 JSON failure record 正規化；高風險或長 trace 仍需人工審查。
- 涉及外部發布、刪除、遠端修改、寄送、付款、訓練或正式環境寫入時，必須先取得明確同意。
- MCP/tool contract 更新要保留 input/output schema、approval boundary、timeout、retry、idempotency 與 audit log 要求。
- SkillOps suite boundary、handoff matrix 與 shared telemetry schemas 放在 repo-level `portfolio/skillops/`；只有跨 skill routing、catalog/registry governance 或 shared evidence schema 任務才讀取，不要複製進本 `SKILL.md`。
</tool_rules>

<default_follow_through_policy>
- Directly do: 讀取失敗材料、目標 skill、eval assets；產出 decision record；新增低風險 eval fixture；在使用者要求實作時做 scoped patch 並跑本地 gate。
- Ask first: 刪除或退役 skill、改 registry/marketplace、發布 package、推送遠端、啟動訓練、修改正式環境或處理未遮罩敏感資料。
- Stop and report: 缺少失敗證據、目標 skill 不可讀、gate 規則互相矛盾、修改會破壞向前相容但沒有 rollback path、或安全/隱私風險無法降到可接受範圍。
</default_follow_through_policy>

## Gate 優先規則

- 任一 final gate、stage gate 或 policy gate 為 FAIL / BLOCKED 時，結論只能是 FAIL 或 BLOCKED。
- 局部 PASS 只可列在定位資訊，且必須明確標註不具放行效力。
- 人工 review notes 不得覆蓋機械 gate；需要例外時必須先修改 gate 或 policy，而不是用文字繞過。

<examples>
Example 1
Input:
- 使用者說：「這次 pptx-maker 生成的 SVG 在 PowerPoint 轉換後跑版，幫我把這個失敗經驗寫進 skill。」

Output:
- 結論：`PATCH`
- Root cause：environment/tool contract drift，因為問題發生在 SVG 到 PPTX 的轉換假設，而不是一般排版偏好。
- Evolution decision：在 workflow 加入轉換後 render QA gate；在 references 補「不得只檢查 SVG 原圖」規則；新增 failure-mode eval。
- Verification：跑格式與 reference 檢查；若無 PowerPoint renderer，標示 BLOCKED for visual gate。

Example 2
Input:
- 使用者說：「skill-creator-advanced 越寫越大，很多 lifecycle 內容其實是根據失敗持續演化，能不能拆出去？」

Output:
- 結論：`MERGE-SPLIT`
- Root cause：library governance / scope split，因為 failure-to-evolution workflow 與 first-time skill authoring 的 primary job 不同。
- Evolution decision：建立獨立 `skill-evolution`；`skill-creator-advanced` 保留 create/release gate，將失敗閉環 hand off 到新 skill。
- Eval and gate updates：新增 direct/indirect/negative trigger eval，避免搶走一般 create-new-skill query。
</examples>

<model_notes>
- GPT-style models: 明確遵守 Step 0 到 Step 6，不要跳過 failure normalization 與 eval/gate conversion。
- Reasoning models: 聚焦最小相容修改、反例、rollback path 與 gate precedence；不要把整段內部推理寫進輸出。
- Multi-turn split: 長 trace 或多 skill library drift 先交付 inventory + decision record，再進入 patch implementation 與 verification。
</model_notes>

## 測試計畫

- Triggering tests: direct、indirect、negative、zh/en/mixed、neighbor confusion 必須寫入 `assets/evals/evals.json`。
- Functional tests: 至少覆蓋 failure-to-patch、failure-to-eval、no-change/block、library drift governance。
- Performance comparison: 與不用本 skill 的一般 postmortem 比較時，應觀察是否更快產出可重跑 eval 與更少無邊界規則。
- ROI guardrail: 若一個 lesson 只增加文字量但沒有降低重現風險、補 eval 或縮小 routing confusion，不應合併。
- Regression gates: with-skill 不得降低 pass rate；over-trigger、under-trigger、unexplained active skill growth 必須有上限。

## 資源

- `references/failure-taxonomy.md`: 失敗分類與 patch surface 對應。
- `references/evolution-playbook.md`: 從 failure trace 到 skill update 的操作細節。
- `references/telemetry-playbook.md`: 生產與本地失敗訊號如何進入演化回路。
- `references/fusion-playbook.md`: merge/split 候選的判斷方式。
- `references/retirement-playbook.md`: deprecate/retire 的證據與停止條件。
- `references/migration-template.md`: lifecycle 變更時的 migration note 欄位。
- `references/source-map.md`: 研究與官方文件來源。
- `scripts/normalize_failure_case.py`: 將簡單 JSON failure record 正規化為 evolution decision seed。
- `assets/evals/evals.json`: trigger 與 functional eval fixtures。
- `assets/evals/regression_gates.json`: release regression threshold 草案。
- `references/checklist_template.md`: 只供人工 review notes 使用，不是 release gate。
- `references/readiness_report.md`: 本版本 release evidence。
- `portfolio/skillops/suite-boundary.md`: SkillOps 三核心 skill 的 shared boundary；不是本 skill folder 內的 runtime dependency。
