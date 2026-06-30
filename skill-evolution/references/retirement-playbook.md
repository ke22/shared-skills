# 退役手冊

當 skill 反覆傷害 routing、已過期、已被取代，或不再產生可量測 outcome lift 時，啟動 retirement review。

## 退役訊號

- 反覆 over-trigger 或 false-positive injection。
- 在 review window 內沒有成功使用紀錄。
- 存在維護更好的替代 skill。
- 必要外部 dependency 或 environment contract 已失效。
- Security、privacy 或 supply-chain 風險無法在 skill 內緩解。
- Paired eval 顯示沒有收益，且維護成本仍高。

## 決策層級

- `needs-maintenance`: 保留可用性，但修復前阻擋 publish。
- `deprecated`: 為相容性保留，但盡可能從預設 routing 移除。
- `retired`: 記錄 migration path 後，從 active catalog 移除。

## 必要證據

- 受影響使用者或 workflows。
- 替代 skill 或 fallback workflow。
- 證明替代方案覆蓋重要 use cases 的 evals。
- Notice period、rollback condition 與 owner。

退役是 outcome decision，不是整理偏好。不要只因為 wording 看起來舊，就退役一個 skill。
