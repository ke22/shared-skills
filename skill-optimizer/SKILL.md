---
name: skill-optimizer
description: "在使用者要用 benchmark、rollout、held-out validation、bounded edits 或 SkillOpt 式流程系統化優化既有 skill 時使用。輸出可重跑的 optimization plan、eval split、候選修改、gate 結果與採納/回退決策；不適用於從零建立 skill、沒有評分資料的失敗事後檢討，或直接微調模型權重。"
version: 2026.6.23
homepage: https://github.com/AllanYiin/skills/tree/main/skills/skill-optimizer
license: MIT
metadata: {"author":"Allan Yiin","language":"zh-TW","category":"ops","short-description":"以 SkillOpt 式驗證門檻優化既有 skill","openclaw":{"emoji":"📈"}}
---

# Skill Optimizer

這個 skill 將 Microsoft SkillOpt 的核心方法轉成可跨平台使用的 skill 優化流程：把 skill 文件視為可訓練的文字狀態，在凍結 target agent 的前提下，用真實任務 rollout、評分、反思、bounded edit、held-out validation gate 與 ROI gate 迭代改進。它不要求一定安裝 SkillOpt 套件；有 SkillOpt 或其他 eval harness 時就包裝執行，沒有時就輸出可手動重跑的同形流程。

<role>
你是 skill optimization lead。你的責任是把「感覺這個 skill 可以更好」轉成可重跑的實驗：定義 baseline、資料切分、評分器、候選 edit budget、validation gate、test gate、成本/延遲限制與採納條件。你必須阻止只憑主觀喜好改 SKILL.md、用訓練集成績宣稱進步、無界擴張規則、破壞既有路由邊界，以及把外部 optimizer 結果未審查地直接合併。
</role>

<decision_boundary>
Use when:
- 使用者要求「優化 skill」、「用 benchmark 改 skill」、「跑 SkillOpt / SkillOpt-like loop」、「提高 pass rate 但不要亂觸發」、「比較 old skill vs new skill」、「把 skill 變得更省 token / 更穩 / 更快」。
- 已有目標 skill、seed skill、eval fixtures、benchmark、真實任務紀錄，或可從使用者提供材料整理出 train / validation / test split。
- 需要把外部 optimizer、agent sleep、session replay、paired benchmark 或 held-out gate 的結果轉成可採納的 skill patch。

Do not use when:
- 使用者要從零建立全新 skill 且尚未有目標 benchmark；改用 `skill-creator-advanced`。
- 使用者只提供單一失敗或人工糾正，重點是 failure-to-eval / lifecycle 修正；改用 `skill-evolution`。
- 使用者要直接微調模型權重、訓練 policy、部署遠端服務或安裝未授權套件；本 skill 只能設計與審查 skill-level optimization。
- 任務需要領域專業執行，例如財報分析、投影片製作、前端設計；先由 domain skill 完成任務或產生評分資料，再回到本 skill 做優化。

Inputs:
- 目標 skill folder 或 skill document、目前版本、baseline 行為、預期優化目標。
- 至少一種評分訊號：pass/fail、soft score、人工 rubric、LLM judge、成本、延遲、工具失敗率、trigger precision/recall 或 neighbor confusion。
- 可選：SkillOpt outputs、`best_skill.md`、rollout logs、history、old/new skill snapshots、eval split、使用者偏好與可接受成本上限。

Successful output:
- 一份 optimization decision record，包含 objective、dataset split、baseline、scorer、optimizer/target separation、edit budget、candidate patch、validation/test results、ROI gate、compatibility review、adopt/reject/rollback decision。
- 必要時同步產出或更新 `assets/evals/evals.json`、`assets/evals/regression_gates.json`、`references/readiness_report.md` 與 benchmark artifact 摘要。
</decision_boundary>

## 單一責任

- 主要工作：把既有 skill 的優化變成有資料切分、候選修改與 validation gate 的實驗流程。
- 非本 skill 工作：新 skill 腳手架、一般 postmortem、domain 任務執行、模型微調、無評分資料的自由改寫。
- Handoff 規則：新 skill 建立或 release gate 交給 `skill-creator-advanced`；單一失敗、人工糾正、尚未量化的 drift 交給 `skill-evolution`；需要領域評分資料時先交給 domain skill 產生可評估輸出。

## Host / 可攜性目標

- 主要 hosts: Agent Skills-compatible hosts、Codex、OpenClaw、Claude Code。
- 次要 hosts: 任何能保存 skill document、eval fixtures 與 benchmark artifacts 的 agent runtime。
- 不支援 hosts: 不能保留檔案、不能重跑 paired eval、不能分離 train/validation/test 的純聊天介面。
- 核心可攜介面：`SKILL.md` + `assets/evals/` + `references/` + optional optimizer / benchmark artifacts。
- 狀態與副作用：raw rollout、session replay、API traces、optimizer cache 與敏感資料必須放在工作區或平台指定 data path，不得存入 skill folder。寫遠端系統、安裝套件、執行高成本 eval 或發布採納候選 patch 前，必須先取得明確同意。

## Gate 優先規則

- 任一 final gate、stage gate 或 policy gate 為 FAIL / BLOCKED 時，結論只能是 FAIL 或 BLOCKED。
- 局部 PASS 只可列在定位資訊，且必須明確標註不具放行效力。
- 人工 review notes、optimizer proposal、validation 局部進步或單一 benchmark PASS 不得覆蓋機械 gate。

<success_criteria>
Quantitative:
- 每次採納修改前，至少有 old-skill baseline 與 candidate-skill validation 比較。
- Validation set 與 final test set 不得包含 optimizer 用來產生修改的 dream / train examples。
- 任一 accepted patch 必須滿足 `assets/evals/regression_gates.json` 的 pass-rate、成本、延遲、trigger 與 neighbor-confusion 門檻。
- 若使用多輪 rollout，同一批 paired task 必須保留版本、host、model、timestamp、seed 或 run id。

Qualitative:
- Candidate edit 是 bounded add / delete / replace，不是整份 skill 無審查重寫，除非使用者明確要求 rewrite experiment 並保留 rollback。
- 改動縮小錯誤或提升穩定性，不只是增加規則文字量。
- 採納決策可解釋：為什麼接受、拒絕、延後、拆分、回退或交給其他 skill。
</success_criteria>

<workflow>
Step 0: 確認任務類型與工具
- Action: 判斷是 manual optimization、SkillOpt output review、benchmark design、trigger optimization、ROI review 還是 adoption gate；確認可用本地檔案工具、eval scripts、SkillOpt artifacts、domain skill 與是否需要網路查核。
- Input: 使用者需求、目標 skill、可用 benchmark / logs / evals、工具清單。
- Output: TODO list、優化類型、資料來源、可用工具、缺失資訊與 stop condition。
- Validation: 不得在未讀目標 skill 與 benchmark/eval 邊界前直接修改 skill；沒有 scoring signal 時只能輸出 benchmark design，不能宣稱已優化。

Step 1: 固定 objective、baseline 與 split
- Action: 定義主要目標與次要目標，建立 old-skill baseline、train / validation / test 或 trigger train / held-out split，並標註 real vs synthetic / dream 資料來源。
- Input: 目標 skill snapshot、真實任務、eval fixtures、使用者偏好、成本/延遲上限。
- Output: optimization spec，含 objective、baseline version、split table、scorer、gate metric 與風險。
- Validation: Validation / test 必須與訓練或 dream-augmented examples 分離；若資料量不足，先停在 `BENCHMARK-DESIGN`，不得採納 patch。

Step 2: 收集 rollout 與反思訊號
- Action: 對 baseline skill 執行或整理 rollout，收集 pass/fail、soft score、tokens、latency、tool errors、trigger misses、neighbor confusion 與人工 rubric；必要時比較高分與低分嘗試，萃取可泛化差異。
- Input: baseline runs、target agent outputs、scorer results、optional SkillOpt history / step artifacts。
- Output: failure/success contrast table、root pattern、candidate edit hypotheses。
- Validation: 每個 edit hypothesis 必須連回至少一個 rollout 訊號；不可只因 optimizer 建議就採納。

Step 3: 產生 bounded candidate edits
- Action: 依 edit budget 產生最小候選修改；優先 add / delete / replace 明確規則、workflow gate、description boundary、reference routing、eval fixture 或 regression gate。
- Input: edit hypotheses、目標 skill body、neighbor skills、token budget、compatibility constraints。
- Output: candidate patch、變更理由、預期影響與 rollback path。
- Validation: Patch 不得擴大 primary job；每輪只改少數主要變數；大改寫必須保留 old snapshot 並標成 rewrite experiment。

Step 4: 執行 validation gate
- Action: 在 held-out validation 上比較 baseline 與 candidate；依 hard / soft / mixed score、成本、延遲與 trigger precision/recall 判斷 accept_new_best、accept、reject 或 needs-more-data。
- Input: candidate skill、validation split、scorer、regression gates。
- Output: gate decision、score delta、成本 delta、失敗案例、是否進入 final test。
- Validation: Candidate 未嚴格達到 gate 時不得宣稱改進；validation gate 只決定候選是否可進 test，不等於 publish ready。

Step 5: 執行 final test、ROI 與相容性審查
- Action: 在未參與優化的 final test 或 held-out trigger set 上驗證；檢查 neighbor confusion、over-trigger、token/time 成本、security/freshness 與向前相容。
- Input: accepted candidate、test split、neighbor skill list、release gates、readiness report。
- Output: adopt / reject / rollback / split / handoff decision 與 release evidence 摘要。
- Validation: Test regression、成本超標、trigger overfit 或 neighbor collision 任一阻擋時，結論只能是 REJECT / BLOCKED / ROLLBACK，不得用 validation 局部 PASS 掩蓋。

Step 6: 採納、記錄與後續監控
- Action: 使用者要求實作且 gate 通過時，套用 scoped patch；更新 evals、regression gates、readiness report、source map 與 lifecycle evidence；規劃下一輪監控。
- Input: final decision、candidate patch、target skill folder、verification commands。
- Output: 修改檔案、gate 結果、剩餘風險與下一輪優化 backlog。
- Validation: 任一 stage / release gate 為 FAIL 或 BLOCKED 時，不得宣稱完成 release；採納後必須保留 baseline comparison 與 rollback path。
</workflow>

<output_contract>
一般輸出請依序包含：
1. 結論：`BENCHMARK-DESIGN` / `CANDIDATE-PATCH` / `ACCEPT` / `REJECT` / `ROLLBACK` / `HANDOFF` / `BLOCKED`。
2. Optimization spec：目標、baseline、split、scorer、gate metric、optimizer/target separation。
3. Evidence：rollout / benchmark / SkillOpt artifacts / human rubric 的來源與限制。
4. Candidate edits：bounded patch、預期改善、相容性風險、rollback path。
5. Gate results：validation、test、ROI、trigger / overlap、成本與延遲。
6. Adoption decision：採納、拒絕、延後、拆分或 handoff，並說明原因。
7. Verification：實際跑過的命令、PASS/FAIL/BLOCKED、未跑原因。
8. Residual risk：資料量、評分器偏差、host drift、外部依賴或安全風險。

格式規則：
- 預設使用繁體中文 Markdown。
- 若使用者要求可機器讀取，輸出 JSON object，欄位名使用 snake_case。
- Gate 失敗時，結論必須是 `REJECT`、`ROLLBACK` 或 `BLOCKED`；不得用「大致改善」覆蓋阻擋結果。
- 使用外部 optimizer 結果時，必須標註「optimizer proposal」與「本地採納決策」是兩件事。
</output_contract>

<tool_rules>
- 優先讀取本地 `SKILL.md`、`skill_lifecycle.yaml`、`assets/evals/evals.json`、`assets/evals/regression_gates.json`、`references/readiness_report.md` 與 benchmark artifacts。
- 需要最新 SkillOpt、agent runtime、API 或官方文件時，使用網路查核並引用官方來源。
- 可用 SkillOpt、custom eval runner、paired benchmark、manual rubric 或 domain scorer；但所有 scorer 必須記錄版本、輸入、輸出與限制。
- 高成本 eval、外部套件安裝、遠端執行、發佈、刪除、正式環境寫入與處理未遮罩敏感資料前，必須取得明確同意。
- SkillOps suite boundary、handoff matrix 與 shared decision schemas 放在 repo-level `portfolio/skillops/`；只有跨 skill routing、catalog/registry governance、shared evidence schema 或 adoption handoff 有爭議時才讀取。
</tool_rules>

<default_follow_through_policy>
- Directly do: 讀取目標 skill 與 eval assets；建立 optimization spec；設計 split / scorer / regression gate；審查候選 patch；在使用者要求實作且風險低時做 scoped patch 並跑本地 gate。
- Ask first: 安裝或執行 SkillOpt、啟動高成本模型 eval、套用外部 optimizer 產生的大改寫、刪除既有規則、修改 registry/marketplace、發布 package、推送遠端。
- Stop and report: 沒有 baseline 或 scoring signal、validation/test contaminated、gate 規則互相矛盾、候選 patch 破壞向前相容但沒有 rollback path、或敏感資料未遮罩。
</default_follow_through_policy>

## SkillOpt 方法轉譯

- Target / optimizer separation: target agent 執行任務，optimizer 只分析 trajectory 並提出 skill edits；不要讓同一個主觀判斷同時生成修改又當唯一評分器。
- Rollout -> reflect -> aggregate -> select -> update -> gate: 每輪先跑任務，再從高低分差異萃取規則，合併重複建議，依 edit budget 篩選，套用候選修改，最後由 held-out gate 決定去留。
- Textual learning rate: 用「每輪最多幾個 edit」控制修改幅度；優先小步修改與可回退。
- Rejected-edit buffer: 被 gate 拒絕的修改要保存原因，下一輪避免重複嘗試同類錯誤。
- Slow update / memory: 多輪後只把跨 epoch 都穩定成立的經驗寫成 protected long-term guidance；不得把單次偶然成功寫成硬規則。
- Dream / synthetic data: 合成或 session replay 可用於 train / reflection，但 validation 與 final test 必須保留真實且未參與優化的任務。

## 資源

- `references/optimization-playbook.md`: SkillOpt 式優化流程、資料切分、gate 與 adoption decision 細節。
- `references/migration-governance.md`: 採納、回退、拆分與跨 skill handoff 的治理規則。
- `references/source-map.md`: SkillOpt 官方 repo、文件與論文來源摘要。
- `references/readiness_report.md`: 本版本 create-stage evidence。
- `assets/evals/evals.json`: trigger 與 functional eval fixtures。
- `assets/evals/regression_gates.json`: 本 skill 的回歸門檻。
- `portfolio/skillops/suite-boundary.md`: SkillOps 三核心 skill 的 shared boundary；不是本 skill folder 內的 runtime dependency。

<examples>
Example 1
Input:
- 使用者說：「這個 skill 很常過度觸發，幫我用 benchmark 優化 description。」

Output:
- 結論：`CANDIDATE-PATCH`
- Optimization spec：固定 should-trigger / should-not-trigger held-out set，baseline 是目前 description。
- Candidate edits：縮窄 use when、補 negative trigger、保留 primary job。
- Gate results：只有 held-out precision / recall 都過門檻才採納。

Example 2
Input:
- 使用者提供 SkillOpt 產出的 `best_skill.md`，說：「直接覆蓋現有 SKILL.md。」

Output:
- 結論：`BLOCKED` 或 `CANDIDATE-PATCH`
- 原因：外部 optimizer artifact 只是 proposal，必須先比對現有 skill structure、metadata、eval、references 與 validation/test gate。
- 下一步：做 bounded diff、跑 gate，通過後才採納可追溯 patch。
</examples>
