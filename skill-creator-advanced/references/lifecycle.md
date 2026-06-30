# Skills 開發生命週期（端到端）

此文件提供一個可重複執行的 skills 開發流程（從需求到發布與迭代），適合作為 skill-creator-advanced 的第二層細節。

## Skill state machine

每個 skill 應以 `skill_lifecycle.yaml` 保存可被腳本讀取的狀態，而不是只在文件中描述生命週期。

狀態流：

```text
draft
  ↓
candidate
  ↓
validated
  ↓
released
  ↓
monitored
  ↓
needs-maintenance
  ↓
merge-candidate / split-candidate / deprecated
  ↓
retired
```

最低欄位：
- `name`
- `status`
- `owner`
- `archetype`
- `primary_structure_pattern`
- `lifecycle.created_at`
- `lifecycle.last_validated_at`
- `lifecycle.review_interval_days`
- `lifecycle.next_review_due`
- `support.primary_hosts`
- `risk.external_side_effects`
- `risk.requires_secrets`
- `dependencies.scripts`
- `dependencies.references`

對應工具：
- `scripts/audit_lifecycle_state.py <skill-path>`：檢查狀態、owner、review cadence、support matrix、risk、dependencies 與 released-state evidence。
- `scripts/promote_skill_state.py <skill-path> --to validated`：依允許轉移表更新狀態與日期。
- `scripts/generate_lifecycle_report.py <repo-root> --out portfolio/lifecycle_report.md`：彙整 repo 級 lifecycle 狀態。
- `scripts/generate_release_evidence.py <skill-path> --out release/evidence.json`：保存 release gate 結果、版本、commit 與 blocking findings。

## Registry governance model

若 skill repo 會被多人或團隊使用，應把 registry governance 當成生命週期的一部分，而不是發布後才補。

最低概念：
- Namespace：用 team、domain、visibility 或 host 劃分治理邊界；全域公開技能比 team/internal 技能需要更嚴格 gate。
- Roles：至少區分 author、owner、reviewer、release approver、auditor；小型 repo 可先用 `skill_lifecycle.yaml` 或 CODEOWNERS 表示。
- Review states：把 uploaded / pending-review / published / rejected / yanked 映射到本 repo 的 candidate / validated / released / needs-maintenance / deprecated。
- Audit log：publish、approve、reject、promote、yank、deprecate、retire、owner change 都要能追溯。
- Promotion：team/internal skill 要升到 global / marketplace 時，必須重跑 surface、security、eval、package 與 compatibility checks。
- Tags：`latest` 應由 release metadata 推導，不應人工移動；`stable`、`beta`、`edge` 這類 channel 要有明確含義。

建議在 `skill_lifecycle.yaml` 加上：

```yaml
registry:
  namespace: "@team-platform"
  visibility: internal
  channel: stable
  reviewers:
    - platform
  audit_log: references/readiness_report.md
```

## Phase -1：Portfolio & competition

建立 skill 前先回答三件事：
- 它是 `router`、`executor`、`ops` 還是 `utility`
- 它的上游與下游 handoff skill 是誰
- 它和 repo 內外最像的技能相比，憑什麼不會被取代

最低要求：
- repo 內最相近的 3 個技能
- repo 外最相近的 3 個公開技能
- 一段明確的差異化敘事，不准只寫 marketing 詞

如果這一步答不出來，通常代表這不是新 skill，而是舊 skill 的 scope 問題。

## Phase 0：需求與定位（先觀察，再追問）

先看現有上下文：
- 對話歷史
- 現有 skill / scripts / references
- 使用者已提過的限制、術語、輸出格式

判斷這個任務是否值得做成 skill：
- 適合：會重複發生、流程可重用、容易出錯、需要固定品質
- 不適合：一次性任務、沒有穩定 workflow、只差一個臨時 prompt

定位方式通常有兩類：
1) 問題導向（Problem-first）
- 使用者描述想完成什麼，skill 負責選工具、排順序、做檢查。
2) 工具導向（Tool-first）
- 使用者已經有某 MCP/工具，skill 教怎麼用得穩、快、少踩坑。

產出物（最少）：
- 2-3 個主要 use case
- in-scope / out-of-scope
- 對使用者熟悉語言的觀察筆記

## Phase 1：規格化 use cases

針對每個 use case，寫清楚：
- Trigger：使用者會怎麼說，包含明顯說法、近義句、口語改寫
- Inputs：需要的輸入、檔案類型、必填欄位、前置條件
- Steps：多步流程、依賴關係、validation gates
- Outputs：最終交付物（檔案、連結、報表、結構化結果）
- Done looks like：怎樣算完成，避免只寫「成功處理」

如果使用者沒有給例子，先提出一組合理 use cases 讓對方修正，通常比一連串抽象提問更有效。

## Phase 2：Naming / description / metadata surface

關鍵決策：
- slug 是否太長、太像現有名稱、太依賴內部術語
- description 是否同時帶到真實 trigger phrase 與 boundary
- metadata、homepage、license、安裝路徑是否在所有 surface 上一致
- 是否需要 scripts：步驟重複、易出錯、需 deterministic
- 是否需要 references：長文規格、API docs、schema、style guide
- 是否需要 assets：模板、字體、icon、樣式檔、範本專案
- 是否有鄰近 skill：需要明確 overlap matrix、handoff 規則、negative triggers
- 是否需要 multilingual support：要不要為 zh / en / mixed 各自測試

核心原則：
- Progressive disclosure：前置欄位（name/description）決定何時載入；細節移到 body / references
- Composability：不要假設只會載入你這個 skill
- Least surprise：預設行為要符合一般使用者直覺，不要偷偷換目標
- Token discipline：只寫會改變行為的內容
- Single source of truth：若要跨工具重用，先固定同一份 skill pack，再讓各 host 做薄包裝

若目標是跨工具可攜，這一階段要多回答：
- primary hosts / secondary hosts / unsupported hosts 是誰
- 什麼算共通核心：skill pack only、skill + scripts，或 skill + MCP / OpenAPI
- 哪些平台差異只能留在 wrapper，不能污染核心 `SKILL.md`

## Phase 3：撰寫 SKILL.md（高影響）

### Description

重點放在 YAML frontmatter 的 `description`：
- 必須同時包含做什麼 + 何時用
- 用使用者真實語句、任務名稱、檔案類型、工具名稱
- 如有 over-trigger 風險，可加入 negative triggers
- 先讓 obvious queries 穩定命中，再處理少數邊角 case
- 若 skill 會和其他 skill 競爭，需把界線寫清楚，不要只堆砌關鍵詞
- 若使用者語料可能中英混用，要為 multilingual query 設計 wording

詳細調整流程見 `references/description-optimization.md`。

### Body

Body 建議結構：
- Quick start：最短成功路徑
- Workflow overview / decision tree：有分支就明寫
- Step-by-step：每步有成功條件與失敗處理
- Examples：輸入/輸出對照，盡量接近真實使用場景
- Troubleshooting：錯誤訊息 → 原因 → 解法

寫法原則：
- 操作性指令用動詞開頭，避免模糊建議句
- 描述性段落（例如 opening summary、Purpose、Scope、Boundary）維持陳述句，先交代定位與邊界，不要為了形式一致硬改成祈使句
- 若某規則的理由能降低誤用，就把 why 補一句
- 不要把模型已知常識寫成長篇背景說明

若此 skill 需要跨工具可攜，補一份簡短 architecture note：
- Core skill pack：哪些內容必須保持 host-agnostic
- Tool gateway：工具契約、auth、timeout、approval、state path 放哪一層
- Host adapters：哪些 plugin / manifest / marketplace/config 只是薄包裝

更完整的拆法見 `references/cross-tool-portability.md`。

## Phase 4：Compatibility / trust / install audit（上線前必做）

建議把驗證分成兩層：
1) **格式檢查（format_check.py）**：檔名、前置欄位、禁用檔案、常見格式問題。
2) **結構檢查（audit_structure.py）**：確認語意區塊真的存在，且 workflow 每一步都有 Action/Input/Output/Validation。
3) **生命週期檢查（audit_lifecycle.py）**：確認 readiness report、版本 freshness、eval assets 與 benchmark metadata requirements。
4) **eval 覆蓋檢查（audit_eval_coverage.py）**：確認 trigger / functional / multilingual coverage 達最低門檻。
5) **eval 品質檢查（audit_eval_quality.py）**：確認 prompt、expected output 與 expectations 不是 placeholder 或過短敘述。
6) **語意一致性檢查（audit_semantics.py）**：確認 follow-through policy 沒有把危險動作放進 Directly do，也沒有用弱語氣包裝 gate。
7) **wrapper drift 檢查（audit_wrapper_drift.py）**：若有多個 host wrapper，確認它們沒有複製或改寫核心 `SKILL.md`，且 wrapper metadata 可追溯。
8) **migration governance 檢查（audit_migration_governance.py）**：確認 rename、deprecate、merge、split 有相容性與遷移證據流程。
9) **benchmark 檢查（audit_benchmark.py）**：publish gate 必須檢查可用的 benchmark metadata 與 regression gates；缺 benchmark artifact 預設是 warning / limitation，不是 publish-ready 的唯一阻擋條件。只有 release policy、使用者要求或命令列明確使用 `--require-benchmark` / `--require-live-benchmark` 時，缺 benchmark 才是 hard fail。
10) **相容別名（quick_validate.py）**：只作為 legacy wrapper；核心規則與 `format_check.py` 共用，避免兩邊各自漂移。
11) **metadata consistency**：binary、env、config path、install path、secret、persistence 是否前後一致。
12) **trust audit**：homepage、license、權限敘事、持久化敘事是否讓公開頁面讀者看得懂風險。

這一步的目標不是求全，而是先排除低階結構錯誤，避免把時間浪費在壞掉的封裝上。

## Phase 5：Trigger / overlap evals

測試資料要盡量接近真實對話，而不是只用作者發明的乾淨 prompt。

- Triggering tests：應觸發 vs 不應觸發，包含 paraphrase、near-miss、模糊說法
- Multilingual tests：zh、en、mixed、縮寫、俗稱
- Overlap tests：與鄰近 skill 的界線案例
- Recall 擴充：同義改寫、錯誤競品、跨語言、縮寫、檔案型態詞、上下游 handoff
- 指標：至少整理 `top1_similarity`、`top3_similarity_sum`、`false positive risk`、neighbor confusion matrix；真正的 routing Hit@K 必須有 ground truth target 才能使用該名稱
- 若為跨工具 skill，至少對 primary hosts 做 routing smoke tests，避免同一 description 在不同 host 上明顯漂移

## Phase 6：Functional benchmark / ROI
- Functional tests：Given/When/Then，覆蓋 happy path、edge cases、failure modes
- 將核准過的 prompt 存入 `assets/evals/evals.json`
- 為每輪建立 repo-level `<skill-name>-workspace/iteration-N/` 作為 raw evidence archive；publish gate 可以使用 skill folder 內 `release/benchmark-summary-*.json` 或 `release/evidence-*.json` 作為可攜 benchmark evidence，但不得因沒有 sibling workspace 或 live benchmark artifact 就單獨阻斷 publish-ready。
- 若環境支援 subagents / parallel workers，with-skill 與 baseline 應同回合啟動
- Performance comparison：與 baseline 比較，記錄對話輪次、tool calls、錯誤率、輸出品質
- Feedback loop：收集實際失敗案例與使用者回饋，再反推是 description、workflow、還是 resources 有問題
- ROI review：檢查提升是否值得額外成本與維護負擔
- Regression gates：定義沒有過門檻就不發布的規則
- 若 skill 支援多個 host，品質或 performance 宣稱至少要保留 `host × workflow` benchmark 與 host-specific regression gates。
- 產生 raw benchmark 後，用 `scripts/generate_release_evidence.py` 把精簡 benchmark summary 寫回 skill folder 的 `release/`，讓複製後的單一 skill folder 仍能重現 benchmark audit；沒有 benchmark summary 時仍可發布，但必須揭露限制且不得宣稱 ROI / live-quality 已驗證。

執行結果應盡量保存成可重看的 artifacts：
- outputs/
- grading.json
- timing.json
- benchmark.json
- review.html

## Phase 7：Publish surface / registry readiness

- 打包：`package_skill.py` 產生 `.skill`
- Repo：README、安裝說明、release notes 放在 skill folder 外
- README 首屏要先回答：這是什麼、支援平台、代表 skills、怎麼安裝、怎麼搜尋、怎麼貢獻
- GitHub About、topics、homepage、license 與 registry 說明要一起檢查，不要只看 repo 內文
- Release：提供 `.skill` 或 zip，並附最短安裝/驗證方式
- 發布前至少重跑一次格式檢查與最小驗證
- 若有多個 host wrapper，README / marketplace / registry 需明寫支援矩陣、授權方式、approval 邊界與已知限制

## Phase 8：Post-publish telemetry loop

訊號 → 對策：
- Under-trigger：補 triggers、加入專有名詞、提到檔案類型
- Over-trigger：加 negative triggers、縮小範圍、刪除過度泛化 wording
- 執行不穩：增加 validation、把脆弱步驟放入 scripts
- 內容過大：把細節移到 references，保留導航與關鍵流程在 SKILL.md
- 使用者常抱怨結果不符預期：回頭檢查是否違反 least surprise 或 use case 定義太模糊
- 公開採用率低：回頭檢查 README、topics、homepage、short description 與競品差異是否講清楚
