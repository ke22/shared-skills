# 評估工作流程（viewer / subagent / benchmark）

這份文件把 upstream `skill-creator` 的 eval loop 轉成適合本地 `skill-creator-advanced` 的可落地版本。

## 目的

eval workflow 的目標不是「多做一些測試」，而是建立一個可比較、可回看、可迭代的回路：
- 用同一批 evals 比較 with-skill 與 baseline
- 保存每輪輸出、grading、benchmark 與 review
- 根據定量與定性證據決定下一輪該改 `description`、workflow，還是 resources

## 何時要用 eval workflow

優先用在這些情況：
- 你要證明 skill 比 baseline 更好
- 你要改版既有 skill，且怕 regression
- 你遇到 under-trigger / over-trigger / 執行不穩，需要證據而不是感覺
- 你要讓使用者檢閱多組輸出，而不是只看單次結果

如果只是一次性微調 wording，或任務高度主觀且使用者只想快速試看，不一定要啟動完整 workflow。

## 核心概念

### 1) evals

把核准過的測試 prompt 存進 `assets/evals/evals.json`。每筆 eval 應包含：
- `prompt`
- `expected_output`
- `files`（如果有）
- `expectations`

### 2) workspace

每輪評估用獨立 repo-level iteration 目錄保存 raw evidence。這個 workspace 是可重新產生 release evidence 的 archive，不應成為已安裝 skill 或 publish gate 的必要 sibling 目錄。

```text
<skill-name>-workspace/
  iteration-1/
    eval-001-my-case/
      eval_metadata.json
      with_skill/
        outputs/
        grading.json
        timing.json
      without_skill/
        outputs/
        grading.json
        timing.json
```

若是改版既有 skill，baseline 可改為 `old_skill/`。改版前先 snapshot 舊版 skill，並把 snapshot path 記錄在 iteration notes。新 skill 的 baseline 是 no-skill；既有 skill 的 baseline 是 old-skill snapshot。不要把兩者混用。

### 3) paired runs

同一個 eval 應同時有兩種配置：
- `with_skill`
- `without_skill` 或 `old_skill`

如果環境支援 subagents 或平行 workers，應在同一輪啟動兩邊，避免條件偏差。若不支援，序列執行也可以，但仍要沿用同一個 workspace 佈局。

### 4) review viewer

review viewer 的目的不是自動判斷誰贏，而是讓人快速檢閱：
- prompt 是什麼
- 各配置輸出了什麼
- grading / notes 怎麼寫
- benchmark summary 告訴你整體趨勢

## 建議流程

1) 規劃測試
- 用 `generate_test_plan.py` 先整理 should-trigger、should-not-trigger、functional cases、baseline 指標。
- 補上 multilingual cases 與 neighboring skill overlap cases。

2) 建立 evals
- 把核准過的測試案例寫進 `assets/evals/evals.json`。

3) 準備 workspace

```bash
python scripts/prepare_eval_workspace.py <path/to/skill>
```

這會建立 iteration 目錄、各 eval 的 metadata，以及 `with_skill/` / baseline 的輸出目錄。

4) 執行 runs
- 若環境支援 subagents：同回合啟動 with-skill 與 baseline。
- 若不支援：人工或其他自動化方式分別執行，但輸出要放回對應目錄。

5) 彙整 benchmark

```bash
python scripts/aggregate_benchmark.py <path/to/iteration-dir>
```

這會輸出：
- `benchmark.json`
- `benchmark.md`

6) 檢查 regression gates

```bash
python scripts/check_regression_gates.py <path/to/iteration-dir/benchmark.json> --config assets/evals/regression_gates.json
```

7) 產生 skill-local release evidence

```bash
python scripts/generate_release_evidence.py <path/to/skill> --out <path/to/skill>/release/evidence-<version>.json --benchmark <path/to/iteration-dir/benchmark.json>
```

這會把 raw benchmark 摘成 `release/benchmark-summary-*.json`，讓單一 skill folder 複製後仍能通過 publish gate。

8) 產生 review viewer

```bash
python scripts/generate_review.py <path/to/iteration-dir>
```

預設輸出 `review.html`，可用瀏覽器打開。

9) 迭代
- 看 benchmark 是哪裡輸了
- 看 review viewer 的實際輸出長什麼樣
- 做 analyst pass：找出非區分性 assertions、flaky / high-variance evals、時間與 token tradeoff、baseline 也會過的假指標，以及所有 runs 都重複手寫的 helper scripts。
- 回頭決定要改 `description`、instructions，還是 `scripts/` / `references/`
- 若多個 eval 都讓 agent 重複寫同一段 helper code，應把它固化到 skill 的 `scripts/`，而不是每次靠模型重造。
- 根據 feedback 修 skill 時要 generalize，不要為了單一例子寫過度擬合的硬規則。
- 若 ROI 不成立，考慮縮 scope、拆 skill，或不要做成 skill

## baseline 選擇規則

### 建立新 skill

baseline 通常是：
- 完全不用 skill

### 改版既有 skill

baseline 通常是：
- 舊版 skill snapshot

不要把這兩種 baseline 混在一起，否則結果會失真。

## Subagent 使用原則

若環境支援 subagents / parallel workers，可把它們當作執行器，而不是評估器本身。

建議分工：
- Executor：執行 with-skill 或 baseline 任務，產出 outputs / timing / notes
- Grader：依 `expectations` 審查輸出，寫 `grading.json`
- Human reviewer：透過 review viewer 做定性比較

重點：
- 同一輪 paired runs 盡量同步啟動
- 不要先做完所有 with-skill 再回頭補 baseline
- 每次只改少數變數，否則無法判斷哪個修改有用
- 每個 eval 目錄使用描述性名稱，不要只叫 `eval-0`；`eval_metadata.json` 內保留 `eval_id`、`eval_name`、`prompt` 與 `assertions`。
- runs 完成時立即保存 `timing.json`，包含 token、duration 與可得的 retry / tool-call 訊號。
- `grading.json` 欄位應穩定，例如每個 expectation 至少有文字、是否通過與 evidence，讓 viewer 和 aggregator 可重用。

## viewer / benchmark / test plan 的關係

- `generate_test_plan.py`：規劃測什麼
- `assets/evals/evals.json`：把測例正式化
- `prepare_eval_workspace.py`：建立執行空間
- `aggregate_benchmark.py`：把分散結果變成可比較統計
- `generate_release_evidence.py`：把 raw benchmark 摘成 skill-local release evidence
- `scripts/generate_review.py`：把結果變成人能快速檢閱的 HTML

## 常見錯誤

- 只保存最後輸出，不保存 prompt / metadata
- with-skill 與 baseline 用不同測例
- 沒保存 timing / grading，後面只能憑印象比較
- 一口氣改 description、workflow、scripts，最後不知道哪個改動有效
- 改版 existing skill 卻用 no-skill 當 baseline，導致無法判斷新版是否真的優於舊版
- benchmark 只看總 pass rate，沒有檢查 false positives、flaky evals、token/time 代價與 non-discriminating assertions
- 沒有把 raw workspace 摘成 skill-local release evidence，導致複製單一 skill folder 後 publish gate 失效
