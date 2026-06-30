# 失敗分類法

修改 skill 前，先用這份 taxonomy 分類失敗證據。一個失敗可以有次要原因，但每個 accepted evolution decision 都需要一個主要原因與一個主要 patch surface。

## 類別

| 類別 | 典型證據 | 優先 patch surface | 避免 |
|---|---|---|---|
| `trigger` | Skill 沒載入、載入太頻繁，或偷走相鄰 query | `description`、negative triggers、overlap evals、handoff rule | 不改 routing surface，只加很長的 body 文字 |
| `workflow` | 正確 skill 已載入，但跳過 context gathering、validation、QA 或 stop condition | `<workflow>`、gate language、examples | 只加泛泛提醒，卻不改步驟順序 |
| `tool_contract` | 工具選錯、參數錯、schema 不合、MCP/API error 未處理 | `tool_rules`、script validation、schema、timeout/retry/approval gate | 只用 prose 隱含工具行為 |
| `environment_drift` | dependency、renderer、host、path、permission、API 或格式假設改變 | compatibility note、runtime QA、reference rule、freshness check | 未說明 host scope 就硬 pin 行為 |
| `safety_policy` | secrets、破壞性動作、資料外洩、缺 approval、不安全權限 | approval boundary、redaction rule、stop condition、audit log | 用直接執行高風險動作來「修復」 |
| `output_contract` | 格式錯、缺欄位、順序不穩、結果無法驗證 | `<output_contract>`、worked example、functional eval | 只要求「品質更好」但沒有 rubric |
| `library_drift` | 重複 skill、過期 skill、retrieval degraded、query stealing、無界增長 | merge/split/deprecate/retire decision、active-cap、overlap matrix | 沒有 outcome evidence 就擴大 active skill set |
| `eval_gap` | 沒有測試、oracle 太弱、benchmark 過期、缺 near-miss | `assets/evals/evals.json`、regression gate、benchmark metadata | 只靠人工看過就宣稱已修好 |
| `stale_knowledge` | 外部事實、法律、API、標準、model docs 或 package 行為改變 | source refresh、freshness policy、citation update、time-bounded rule | 把不穩定事實寫成永久 skill 規則 |

## 嚴重度

- `critical`: safety、破壞性副作用、資料遺失、安全事件，或反覆錯誤外部動作。
- `high`: 使用者可見失敗、錯誤檔案/輸出、release gate 壞掉，或高可信 regression。
- `medium`: 可恢復 workflow miss、over/under-trigger、缺 eval，或可避免的使用者糾正。
- `low`: wording 模糊、小型效率問題，或證據不足以 patch 但值得追蹤。

## 演化類型

- `NO-CHANGE`: 證據無效、不可重現、已覆蓋，或在 skill 邊界之外。
- `PATCH`: 應修改 skill 內容或 helper script。
- `EVAL-ONLY`: 行為已正確，但 coverage 缺失。
- `ROLLBACK`: 近期變更造成 regression，應透過正常版本控制回退。
- `MERGE-SPLIT`: 失敗來自邊界混淆或 primary job 過載。
- `RETIRE`: skill 過期、有害、重複，或已不再產生 outcome lift。
- `BLOCKED`: 缺少證據、含敏感資料、目標不可讀，或請求動作不安全。

## 決策規則

Accepted lessons 必須寫成條件式規則：

1. 觸發條件：lesson 何時適用。
2. 預設動作：agent 必須做什麼。
3. 例外條件：何時不適用。
4. 驗證方式：下一次執行如何證明 lesson 生效。

無法滿足四個欄位的 lesson 只能留在 review notes，不能變成 release evidence。
