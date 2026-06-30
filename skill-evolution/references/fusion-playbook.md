# 融合與拆分手冊

當失敗證據顯示兩個以上 skills 互相重疊、偷走彼此 query，或迫使使用者在幾乎相同的 workflows 之間選擇時，使用這份文件。

## Merge 候選

只有下列條件同時成立時，才適合 merge：

- Skills 擁有相同 primary job。
- Inputs、outputs、approval boundaries 與 validation gates 相容。
- 即使修過 description 與 negative triggers，routing failures 仍反覆發生。
- 合併後的 skill 會比現有兩個 skills 更小或更清楚。

必要證據：

- 至少三個 confusion cases。
- Neighbor matrix，明確列出「本 skill 應接」與「另一個 skill 應接」的案例。
- Eval migration plan。
- 若合併後 over-trigger 增加，必須有 rollback path。

## Split 候選

下列狀況才適合 split：

- 單一 skill 包含兩套不同使用者、工具、風險等級或 output contracts 的 workflows。
- 修一個 workflow 會反覆破壞另一個 workflow。
- Description 必須寫得很寬才接得住所有情境，導致 over-trigger。
- 某一分支需要大量 references 或 scripts，但多數 invocation 不應載入。

必要證據：

- 分開的 use cases 與 trigger phrases。
- 新 handoff rule。
- Evals 重新分配到拆分後的 skills。
- 舊 prompts 的 compatibility note。

## 預設決策

不要只因為兩個 skills 共用詞彙就 merge 或 split。除非失敗證據顯示 primary jobs 已結構性糾纏，否則優先做局部邊界修正。
