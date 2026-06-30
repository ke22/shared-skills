# 人工 review notes 模板

這份檔案只用於尚未能安全機械化的 reviewer 判斷。不要把這份模板當成 release evidence；完成後的 findings 應回填到 `references/readiness_report.md`。

## 邊界 review

- 這個 skill 是否只擁有一個直覺清楚的 primary job？
- 相鄰 skills 與 handoffs 是否清楚？
- 新使用者能否理解何時不該使用這個 skill？

## Trigger review

- Trigger examples 是否接近真實使用者語句？
- Negative triggers 是否夠具體？
- 必要時是否覆蓋 zh / en / mixed-language phrases？

## 輸出品質 review

- Worked examples 是否能教出預期輸出品質？
- Output contract 是否足以讓結果可重複？
- Default follow-through policy 是否清楚處理外部副作用？

## 維護 review

- 這個 skill 是否應 rename、merge、split、deprecate 或 retire？
- Wrappers 是否夠薄，能避免 host drift？
- Release notes 與 public descriptions 是否和 skill folder 一致？
