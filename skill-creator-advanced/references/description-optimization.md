# Description 最佳化

這份文件說明如何把 `SKILL.md` 的 `description` 從「大致能用」調到「穩定觸發且不亂觸發」。

## 目標

`description` 要同時做到兩件事：
- 讓該觸發的 query 穩定觸發
- 讓不相關或近似但不同的 query 不要誤觸發

如果只能先優先一件事，先讓明顯該觸發的 query 穩定命中，再處理邊界案例。

## 建立最小評估集

至少準備約 20 筆測試句，分成兩組：
- 8-10 個 should-trigger
- 8-10 個 should-not-trigger

內容來源優先順序：
1. 使用者真實講過的話
2. 你從現有對話改寫出的近義句
3. 容易混淆的 near-miss 句子
4. 鄰近 skill / 競品 skill 會搶走的 query

測試句要像真實使用者會打的 prompt：
- 有檔名、專案背景、欄位名稱、公司/產品名稱、URL 或具體情境。
- 可包含口語、縮寫、大小寫不一致、錯字、中英混用。
- direct / indirect / negative 的 ID 要穩定，方便跨版本重跑。
- negative 優先選 near-miss，不要只放明顯無關句子。
- 避免用單步、host 本來就能直接完成的 trivial prompt，例如「讀這個 PDF」或「格式化這段資料」。這類 prompt 常常不觸發 skill，原因可能是 host 不需要 skill，而不是 description 失敗。

建議把 trigger eval set 獨立存成另一份 JSON，不要混用 `assets/evals/evals.json`。後者是 task eval，不是 description trigger eval。

最小格式：

```json
[
  {
    "id": "trigger-01",
    "query": "請幫我把這個 skill 的 description 改到比較不會亂觸發，順便規劃 should-trigger / should-not-trigger 測試。",
    "should_trigger": true
  },
  {
    "id": "non-trigger-01",
    "query": "我只想寫一段一般說明文字，不需要建立或優化 skill。",
    "should_trigger": false
  }
]
```

## 撰寫 description 的原則

1) 先寫 outcome 與完成定義
- 先講這個 skill 能幫忙完成什麼結果。
- 最好順手交代「成功輸出長什麼樣」，讓 description 不只是能力介紹。

2) 再寫觸發情境
- 明確寫出常見工作情境、任務名稱、檔案類型、工具名稱。

3) 用真實語言
- 優先使用者真的會說的詞，不要只寫作者內部分類詞。

4) 視需要加入 negative triggers
- 如果 skill 容易 over-trigger，就補一句「不適用於哪些情境」。
- 對多 skill 環境，`Do not use when...` 不是可有可無的附註，而是 decision boundary 的一部分。

5) 避免貪心
- 不要為了覆蓋少數特殊 prompt，把 description 寫成看什麼都像自己該觸發。

## 迭代流程

1) 寫第一版 description
2) 跑 should-trigger / should-not-trigger 測試
3) 做 train / held-out test split；優化時看 train，選最終結果時看 held-out test
4) 若 host 支援重複執行，同一 query 至少跑 3 次並記錄 variance，避免把偶然觸發當成穩定提升
5) 記錄失敗型態
- 明顯該觸發卻沒觸發
- 不該觸發卻誤觸發
- 只在奇怪 wording 才會成功
6) 每輪只改一個主要變數，例如 description wording、negative boundary、trigger phrase coverage 或 skill scope
7) 依失敗型態調整 wording
8) 重新測試，直到明顯 query 穩定

可用腳本：

```bash
python scripts/run_eval.py --eval-set <path/to/trigger-evals.json> --skill-path . --model <model-id> --output trigger-eval-results.json
python scripts/improve_description.py --eval-results trigger-eval-results.json --skill-path . --model <model-id>
python scripts/run_loop.py --eval-set <path/to/trigger-evals.json> --skill-path . --model <model-id> --apply-best
```

`run_eval.py` 會輸出：
- query-level pass/fail
- run-level precision / recall / accuracy
- 每個 query 的 repeated-run termination 與 duration 診斷

`run_loop.py` 會：
- 自動做 train / test split
- 保存每輪結果與 HTML report
- 在 `--apply-best` 時把最佳 description 回寫到 `SKILL.md`
- 以 test score 選最佳 description，降低為了 train set 過度調整的風險

每輪結束後要向使用者回報：
- 原 description 與最佳 description 的差異
- should-trigger recall、should-not-trigger precision / false positive 變化
- held-out test 是否真的改善
- 是否因為 scope 太寬導致 over-trigger，需要回到 boundary / split skill，而不是繼續加詞

## 常見修正手法

### Under-trigger

可加：
- 使用者常說的動詞
- 任務名稱與 deliverable 名稱
- 相關檔案類型
- 工具或平台名詞

### Over-trigger

可加：
- 更窄的任務定義
- 限定情境或輸入條件
- negative triggers
- 移除過度泛化的字眼，例如「處理所有」「任何」「通用」

## 驗收標準

- 明顯 should-trigger 句子大多能命中
- 明顯 should-not-trigger 句子大多不命中
- 改寫句和真實口語句都可用
- description 仍然短、可讀、像人會寫的句子

## 失敗訊號

下列現象代表 description 需要重寫，而不是再補一兩個字：
- 必須靠非常特定的 wording 才會觸發
- 只要提到某個廣義名詞就會誤觸發
- 加了很多條件後 description 變成難讀的大雜燴
- 測試通過，但真實使用時仍然常常 miss

## 注意

- 若你傳入的是 `assets/evals/evals.json`，`run_eval.py` 應直接報 schema 錯誤，因為那是 task eval，不是 trigger eval。
- 若環境沒有 `claude` CLI，這些腳本無法執行；它們依賴當前 Claude Code session 的登入狀態。
- description 還是要保留 safety margin，實務上建議控制在 900 字元內，而不是硬貼 1024 上限。
- description optimization 是 trigger gate，不是 functional benchmark；觸發率提高後仍需跑 with-skill / baseline 或 old-skill benchmark。
