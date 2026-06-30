# 演化操作手冊

這份手冊負責把失敗證據轉成有範圍的 skill 更新。使用前必須先讀目標 skill，並把失敗案例正規化。

## 1. 證據收集

只收集完成判斷所需的資料：

- 使用者看見的失敗摘要。
- 預期行為與實際行為。
- 受影響 skill 的名稱、版本、host、model 與日期。
- Trace 摘要：tool calls、參數、被碰到的檔案、handoff、approval、錯誤訊息。
- 人工回饋或 grader 結果。
- 是否可重現。

分析前必須遮罩 secrets。若遮罩會移除判斷失敗所需的核心證據，就停止並回報。

## 2. 根因審查

依序回答：

1. 正確的 skill 有載入嗎？
2. 已載入的 skill 有選對 workflow 分支嗎？
3. tool contract 或環境假設有失效嗎？
4. output contract 足以檢查預期結果嗎？
5. 現有 eval 或 gate 已覆蓋這個案例嗎？
6. 這次失敗是否代表多個 skills 之間的邊界問題？

第一個「否」通常就是主要 patch surface。

## 3. 最小相容修改

優先順序如下：

1. `NO-CHANGE`：失敗不在 scope、證據無效，或已被現有規則擋住。
2. 新增或調整 eval coverage：行為已正確，但缺少測試。
3. 調整 description 或 negative trigger：路由錯誤。
4. 增加 workflow validation gate：正確 skill 有載入，但漏掉必要步驟。
5. 把長期規則移到 `references/`：lesson 成立，但不適合塞進 `SKILL.md`。
6. 新增 deterministic helper script：手動解析或驗證容易反覆出錯。
7. 新增 regression gate：可量測的失敗必須阻擋 release。
8. 建議 rollback、merge/split、deprecate 或 retire：局部 patch 會掩蓋 lifecycle 問題。

不要為了吸收所有相關失敗而擴大 skill 的 primary job。

## 4. Eval 轉換

Trigger 類失敗要建立：

- `direct`：明顯應觸發的 prompt。
- `indirect`：改寫、多語或 mixed-language，但仍應觸發的 prompt。
- `negative`：近似但不應觸發，或應 hand off 的 prompt。

Functional 類失敗要建立：

- `happy-path`：最常見的預期流程。
- `edge-case`：真實但容易漏掉的變形。
- `failure-mode`：重現本次觀察到的失敗。

每筆 eval 都需要穩定 ID、真實 prompt、expected output、coverage tags、language 與 verification expectations。

## 5. Lifecycle 決策

只有證據支持時才能採取 lifecycle action：

- `merge`：兩個 skills 反覆處理同一個 primary job，且沒有清楚邊界。
- `split`：同一 skill 內含兩套不同輸入、輸出或風險等級的 workflow。
- `deprecate`：保留相容性，但預設不再路由到該 skill。
- `retire`：skill 有害、過期、已被取代，或 remediation 後仍沒有 outcome lift。
- `rollback`：近期變更造成 regression，且已知先前版本可用。

每個 lifecycle action 都需要 migration note、owner、rollback path 與 eval evidence。

## 6. 驗證

執行本地可用的最強 gate。最低要求：

- format check。
- structure 與 workflow contract audit。
- lifecycle state audit。
- eval coverage 與 eval quality audit。
- reference 與 unreferenced file audit。
- 實作後跑 create/revise stage gate。

若必要 gate 無法執行，結論必須標為 `BLOCKED`，或明確標示目前只是 draft decision record。
