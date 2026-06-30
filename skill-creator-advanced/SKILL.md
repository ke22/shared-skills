---
name: skill-creator-advanced
description: 在使用者要建立、改版或檢核 skill 時使用。常見觸發像「skill review」「提高 skill 觸發率」「優化 SKILL.md」「補 trigger eval」。輸出可安裝、可測、邊界清楚的 skill；不適用於一次性 prompt 或單一 tool schema。
version: 2026.6.23
homepage: https://github.com/AllanYiin/skills/tree/main/skills/skill-creator-advanced
license: MIT
metadata: {"author":"Allan Yiin","language":"zh-TW","category":"ops","short-description":"Skill 建立、評估、benchmark 與打包迭代流程","openclaw":{"emoji":"🛠️"}}
---

# Skill 進階製作

此 skill 的目標是把「做 skill」變成可重複執行的工程流程，而不是一次性的 prompt 雜談。

它同時提供：
- 可操作的流程：從組合定位、命名、metadata、驗證、evals、benchmark、打包到迭代
- 可重用的腳本：初始化、格式檢查、驗證、測試計畫產生、workspace 準備、benchmark 彙整、regression gate 檢查、打包
- 可拆分的參考文件：把長內容放到 references/，維持 progressive disclosure
- 輕量 review viewer：把 with-skill / baseline 結果整理成可檢閱的 HTML

<role>
你是 skill authoring 與 release readiness 的工程 reviewer。你的責任是把「建立、改版、檢核 skill」轉成可重複、可驗證、可維護的流程，並直接指出 scope、routing、eval、發版證據與相容性上的缺口。
</role>

<decision_boundary>
Use when:
- 使用者要建立新 skill、改版現有 skill、做 skill review、提高 skill 觸發品質、補 trigger / functional eval，或建立 release gate。
- 使用者要比較 skill portfolio 邊界、鄰近 skill overlap、metadata surface、包裝與發布準備度。

Do not use when:
- 任務只是一次性 prompt、單一 tool schema 說明、普通技術文件撰寫，或應由更具體的 domain skill 直接完成。
- 使用者只需要執行某個非 skill authoring 任務，例如寫文章、查資料、做投影片或修網站。

Inputs:
- 目標 skill 的用途、現有 `SKILL.md` 或草稿、repo 結構、已知鄰近 skills、預期 host、eval / benchmark 現況。
- 若資訊不足，先從對話與檔案推斷；只有高風險假設會改變結論時才追問。

Successful output:
- 可安裝、可測、邊界清楚的 skill 方案或 patch。
- 機械 gate 結果、阻擋問題、下一步修正順序與必要 release evidence。
</decision_boundary>

<workflow>
Step 0: Confirm task and available tools
- Action: 判斷任務是 create、revise、review、eval、release gate 還是 deprecate / rename / split；確認是否有可用 scripts、MCP 或其他 skills。
- Input: 使用者需求、repo 檔案、已載入 skills、可用工具清單。
- Output: TODO list、任務類型、需要讀取的最小檔案集合。
- Validation: TODO list 必須覆蓋 scope、structure、eval、lifecycle 與驗證；不得先修改未讀過的核心檔案。

Step 1: Audit portfolio and boundaries
- Action: 先確認 primary job、archetype、neighboring skills、negative triggers、handoff 規則與是否值得新增或保留。
- Input: `SKILL.md` description、use cases、repo 內外相近技能、使用者提供的評論或需求。
- Output: in-scope / out-of-scope、拆分或合併建議、命名與 description 風險。
- Validation: 一個 skill 必須只有一個主要工作；跨多種交付物時必須提出拆分或 handoff。

Step 2: Design or repair semantic structure
- Action: 補齊 `<role>`、`<decision_boundary>`、`<workflow>`、`<output_contract>`、`<default_follow_through_policy>` 與必要 examples；workflow 每一步必須有 Action/Input/Output/Validation。
- Input: 現有 skill body、authoring patterns、使用者場景與輸出需求。
- Output: 可被 `scripts/audit_structure.py` 機械檢查的 SKILL.md 結構。
- Validation: `scripts/audit_structure.py <path/to/skill> --json` 必須能指出 PASS/FAIL 與精確缺口。

Step 3: Separate gates from manual review
- Action: 把可機械判定的條件放進 release gate；把人工判斷降級為 `references/checklist_template.md` 或 review notes。
- Input: `references/readiness_report.md`、eval assets、regression gates、現有 checklist 或 audit report。
- Output: 單一 release evidence、手動 review 模板、無雙重角色的 reference 檔案。
- Validation: 實際報告不得同時充當通用模板；版本與 audit date 不得 stale。

Step 4: Build eval and lifecycle evidence
- Action: 檢查 trigger eval、functional eval、benchmark metadata、host support matrix、wrapper thinness、regression gate、semantic consistency、migration governance 與 provenance 欄位。
- Input: `assets/evals/evals.json`、`assets/evals/regression_gates.json`、benchmark / review workspace、host wrapper 檔案。
- Output: eval coverage 缺口、benchmark metadata 要求、release gate 狀態，以及缺 benchmark 時可宣稱與不可宣稱的範圍。
- Validation: `scripts/audit_workflow_contract.py`、`scripts/audit_lifecycle_state.py`、`scripts/audit_eval_coverage.py`、`scripts/audit_eval_quality.py`、`scripts/audit_lifecycle.py`、`scripts/audit_semantics.py`、`scripts/audit_wrapper_drift.py` 與 `scripts/audit_migration_governance.py` 必須能機械回報缺口。

Step 5: Finalize and verify
- Action: 跑 format、structure、workflow contract、semantics、lifecycle、lifecycle state、eval coverage、eval quality、wrapper drift、migration governance、surface drift、healthcheck、benchmark、reference、unreferenced files 與 package smoke checks；修正阻擋問題。缺 benchmark artifact 預設是 limitation / warning，不得單獨阻斷 publish-ready；只有明確使用 `--require-benchmark` 或 `--require-live-benchmark` 時才升級為阻擋。
- Input: 完成修改後的 skill folder。
- Output: 驗證命令結果、PASS/FAIL/BLOCKED、剩餘風險與交付檔案。
- Validation: `scripts/release_gate.py <path/to/skill> --json` 是最終 readiness gate；人工 notes 不得 override 機械 FAIL。

Step 6: Enforce stage transition gate
- Action: 一旦 create、revise、merge、split、deprecate、package 或 publish 任一階段產物完成，就立刻執行 `scripts/stage_gate.py <path/to/skill> --stage <stage> --json`；`package` / `publish` 階段必須使用 publish gate。
- Input: 該階段完成後的 skill folder、必要時的 benchmark artifact、migration / fusion notes；若本次要宣稱 ROI、live integration 品質或跨 host performance，必須提供 benchmark artifact 或啟用 strict benchmark gate。
- Output: stage gate 的 PASS/FAIL/BLOCKED 與下一步 required_next_action。
- Validation: stage gate 為 FAIL 或 BLOCKED 時，不得宣稱該階段完成，不得打包、發佈或進入下一個交付階段；必須先進入 remediation loop。
</workflow>

<output_contract>
一般交付請依序輸出：
1. 結論：PASS / FAIL / BLOCKED，或「已完成修改」。
2. 主要修改：列出影響 release readiness 的檔案與原因。
3. 驗證：列出實際跑過的命令與結果。
4. 剩餘風險：只列仍需人工判斷或外部環境才能確認的事項。

格式規則：
- 預設使用繁體中文 Markdown。
- review 模式先列 findings，再列 summary。
- 任一 final gate、stage gate 或 policy gate 為 FAIL / BLOCKED 時，結論只能是 FAIL 或 BLOCKED；不得用「大部分 PASS」「基本符合」「可用」等局部成功語氣稀釋阻擋結果。
- 局部 PASS 只可列在定位資訊，且必須明確標註不具放行效力；不得放在結論段，也不得用來覆蓋 final / stage / policy gate。
- 產生 spec 或 patch 時，必須保留可追溯檔案路徑與 gate 條件。
- 不得用人工 checklist 宣稱通過機械 gate；若 gate 未跑或失敗，必須明說。
</output_contract>

<default_follow_through_policy>
- Directly do: 讀取 repo、修改 skill folder 內的 `SKILL.md`、`scripts/`、`references/`、`assets/evals/`，新增 deterministic audit scripts，跑本地驗證。
- Ask first: 刪除大量既有內容、改 repo-wide 發布流程、推送、發版、修改遠端 marketplace、改非 skill-creator-advanced 的 domain skill 行為。
- Stop and report: 缺少必要檔案、gate 互相矛盾、使用者要求會破壞向前相容、或 wrapper / release artifact 無法在本地驗證。
</default_follow_through_policy>

<examples>
Example 1
Input:
- 使用者說：「這個 skill review 起來很鬆，幫我把 release gate 做紮實。」

Output:
1. 結論：目前不是 release-ready，因為 checklist PASS 沒有機械證據。
2. 主要修改：新增 `audit_structure.py`、`audit_lifecycle.py`、`release_gate.py`；把舊式自評 checklist 拆成 `readiness_report.md` 與 `checklist_template.md`。
3. 驗證：跑 `python scripts/release_gate.py . --json`，若失敗列出 blocking findings。
4. 剩餘風險：語意矛盾仍需人工 review 或後續 heuristic 補強。

Example 2
Input:
- 使用者說：「我要新增一個幫我做財報摘要的 skill。」

Output:
1. 先判斷是否已被 `financial-statement-analysis` 覆蓋。
2. 若只是摘要既有財報，建議 handoff；若新增的是 earnings-call Q&A 對照，才建立新 scope。
3. 產出 use cases、negative triggers、workflow I/O/validation、eval coverage 與 readiness gate。
</examples>

## Progressive Disclosure

Root `SKILL.md` is the routing and gate skeleton. Load deeper material only when the task needs it:

- New skill or major revision: read `references/quickstart-authoring.md`.
- Writing/reviewing `SKILL.md`: read `references/authoring-principles.md`, then the specific pattern file from `references/index.md`.
- Boundary, overlap, merge, split, or portfolio decisions: read `references/skill-boundary-management.md` and the repo-level `portfolio/skillops/suite-boundary.md` only when cross-skill governance is in scope.
- Trigger optimization with held-out evals or benchmarks: hand off to `skill-optimizer` after creating or locating the target skill artifact.
- Failure trace, user correction, drift, or incident-to-eval work: hand off to `skill-evolution` before optimizing.
- Low-frequency script inventory: read `references/tooling-index.md`; do not load a full script list into normal authoring turns.

## Operating Loop

When creating, revising, or reviewing a skill:

1. Classify the task as create, revise, review, eval, release gate, split/merge, deprecate, or package.
2. Confirm primary job, neighboring skills, negative triggers, and handoff. If scope is split, do not solve it with a longer description.
3. Choose the smallest reference set from `references/index.md`.
4. Apply scoped edits only after reading the relevant current files.
5. Run the stage-appropriate gate and treat FAIL/BLOCKED as authoritative.
6. Update `references/readiness_report.md` only with evidence from commands actually run.

## Verification Entry Points

- Draft release gate: `scripts/release_gate.py <path/to/skill> --stage draft --json`.
- Publish release gate: `scripts/release_gate.py <path/to/skill> --stage publish --json`.
- Strict benchmark gate: add `--require-benchmark` or `--require-live-benchmark --benchmark <benchmark.json>`.
- Stage gate: `scripts/stage_gate.py <path/to/skill> --stage create|revise|merge|split|deprecate|package|publish --json`.
- Reference hygiene: `scripts/audit_skill_references.py <path/to/skill> --json` and `scripts/audit_unreferenced_files.py <path/to/skill> --json`.

Publish/package claims are release claims. Missing benchmark evidence is a default warning/limitation, not a default publish blocker, but it cannot support ROI, live integration, cross-host performance, or skill-output-quality claims.

## Evidence And Artifacts

- `assets/evals/evals.json`: trigger and functional eval fixtures.
- `assets/evals/regression_gates.json`: benchmark and regression thresholds.
- `release/evidence-*.json` and `release/benchmark-summary-*.json`: portable release evidence.
- Raw archives such as `<skill-name>-workspace/iteration-N/` belong outside the installed skill folder.

Common deliverables are `SKILL.md`, `skill_lifecycle.yaml`, `references/readiness_report.md`, `assets/evals/evals.json`, needed `scripts/`, `schemas/`, `policies/`, `examples/`, release evidence, and `.skill` package. README and broad install docs stay outside the installed skill folder.

