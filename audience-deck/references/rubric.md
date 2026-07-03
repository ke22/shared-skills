# Skill Quality Rubric — 自評表

改編自 skill-creator 的 grading 邏輯（evidence-based pass/fail、找出「表面通過但實質沒做到」的假通過），
但對象換成 **SKILL.md 本身的品質**，不是執行結果。每次改版後跑一次，分數 <3.5 的維度要先修再上線。

## 評分方式

7 個維度，各 1–5 分，**證據制**——每個分數都要能指出 SKILL.md 裡具體哪一行/哪一段作為依據，不能憑印象打分。
目標：平均 **≥ 3.5**，且任一維度不得低於 3。

| # | 維度 | 檢查問題 |
|---|---|---|
| 1 | **Description 觸發力** | 描述是否夠「pushy」？是否同時涵蓋 what（做什麼）+ when（何時觸發），還是只寫了 what？沒明講的觸發詞會不會被漏判？ |
| 2 | **Naming 辨識度** | 名稱是否讓人一看就懂跟其他同類 skill（pptx、academic-pptx、presentation-writing）的差異在哪，還是換誰來看都像同一種東西？ |
| 3 | **Progressive disclosure** | SKILL.md 是否 <500 行？references 是否真的「按需」而非其實每次都得整份讀完才能動作？>300 行的 reference 是否有目錄？ |
| 4 | **Workflow 可執行性** | 每個 Phase 是否具體到可以直接照做，還是有「自行判斷」的模糊地帶會導致不同 session 做出不一樣的事？ |
| 5 | **Edge case 覆蓋** | 素材不齊、聽眾給不出明確答案、聽眾中途改變、bank 為空等情況，SKILL.md 有沒有講怎麼辦，還是只寫了 happy path？ |
| 6 | **一致性／無矛盾硬規則** | 核心原則、workflow、reference 三處的規則是否互相打架（例如某處說「一定要」某處卻沒提）？ |
| 7 | **可攜性** | 拿掉這次的失智照護專案語境，骨架（audience-playbook 的欄位結構、house-style 的 token 命名）能不能套到下一個完全不同主題的研究，還是寫死了無法遷移？ |

---

## v1 自評（rename 前，也就是上一輪產出的版本）

| # | 維度 | 分數 | 證據 |
|---|---|---|---|
| 1 | Description 觸發力 | 3 | 有列觸發詞，但語氣是描述性的（「將…重組為…」），沒有 skill-creator 建議的「即使使用者沒明講也要觸發」的 pushy 收尾句；容易在使用者只說「幫我準備一下要跟老闆報告的東西」時漏判。 |
| 2 | Naming 辨識度 | 2 | `research-deck` 太泛用——跟 `presentation-writing-claude-skill`、`academic-pptx-skill` 放在同一個 skills 目錄裡，名字完全看不出這支的核心差異是「同一份研究、多聽眾路由」。 |
| 3 | Progressive disclosure | 5 | SKILL.md 84 行、兩份 reference 各 73–74 行，遠低於 500/300 行門檔，且 Phase 2/4 明確寫「才讀」。 |
| 4 | Workflow 可執行性 | 4 | Phase 1–5 步驟具體，唯一模糊點是 Phase 2「先從情境判讀」沒講判讀依據是什麼線索。 |
| 5 | Edge case 覆蓋 | 2 | 完全沒寫：素材只有半份 v5、聽眾給的答案橫跨兩種身份（例如「教授也是評審之一」）、使用者要求的聽眾不在三個路由裡時該怎麼辦。目前只有 happy path。 |
| 6 | 一致性 | 4 | 核心原則第 4 條與 Phase 2 一致（鎖定聽眾前不出大綱），無矛盾；扣分是「聽眾快速路由」表格與 audience-playbook 的內容有一段重複，沒講清楚哪個是權威版本。 |
| 7 | 可攜性 | 3 | house-style 的 8 個版型命名（痛點卡、mockup+清單）綁死在失智照護語境，換一個主題（例如做電商成效報告）時使用者得自己重新對應版型用途；token 命名本身（--c-primary 等）是通用的，可攜。 |

**平均：3.29 / 5 → 未達標。** 主要缺口在 naming（2）與 edge case（2），其次是 description 觸發力（3）。這三項直接修。

---

## v1 → v1.1 修正紀錄

| 問題 | 修法 | 落在哪裡 |
|---|---|---|
| Naming 不辨識 | `research-deck` → `audience-deck`，直接把差異化賣點（聽眾路由）放進名字 | SKILL.md frontmatter `name` |
| Description 不夠 pushy | 改寫成「即使使用者只說『準備報告』『重弄一份』也要觸發」的收尾句，並把「同一份內容、多聽眾」的差異化賣點前移到第一句 | SKILL.md frontmatter `description` |
| Edge case 缺失 | 新增「Edge Cases」小節，處理：素材不齊、聽眾身份重疊、聽眾不在三路由內、bank 為空 | SKILL.md 新增章節 |
| 聽眾路由表重複 | 明講 SKILL.md 表格是「速查」、audience-playbook 是「權威完整版」，衝突時以 playbook 為準 | SKILL.md 路由表下方加一行 |
| Phase 2 判讀依據模糊 | 補上具體判讀線索（誰在場、投影片會後去哪、對方怎麼稱呼這次會議） | SKILL.md Phase 2 |
| 可攜性 | house-style 版型名稱旁加註「這是本專案的例子，換題目時替換為對應內容，版型用途不變」 | house-style.md 版型庫標頭 |

## v1.1 自評（修正後，見同批次更新的 SKILL.md / house-style.md）

| # | 維度 | 分數 | 變化原因 |
|---|---|---|---|
| 1 | Description 觸發力 | 4 | 加了 pushy 收尾句，仍非滿分——尚未實測不同措辭在真實對話中的觸發率（skill-creator 建議用 `improve_description.py` 跑 train/test split 才能拿到實測分數，這裡只做了人工改寫）。 |
| 2 | Naming 辨識度 | 4 | `audience-deck` 明顯優於原名，但跟 `presentation-writing-claude-skill` 相比還是有一點重疊感（兩者都處理「內容先於設計」），可再觀察是否需要更明確切割。 |
| 3 | Progressive disclosure | 5 | 未變動，仍達標。 |
| 4 | Workflow 可執行性 | 5 | Phase 2 補上判讀線索後，模糊地帶消除。 |
| 5 | Edge case 覆蓋 | 4 | 補上四種常見例外，但「聽眾中途改變」的處理目前只寫了偵測方式，沒寫要不要整份重跑的判斷標準——留待下次實戰後補。 |
| 6 | 一致性 | 5 | 明確權威來源後不再有表格打架問題。 |
| 7 | 可攜性 | 3 | 未變動——版型命名的可攜性問題本質是內容問題，加註解不能真正解決，要等下一個非失智照護主題的專案實測後才能重構出真正通用的版型命名。 |

**平均：4.29 / 5 → 達標。** 剩下最低分是可攜性（3）——誠實標記為已知限制，不假裝解決；下次換主題套用時，這是第一個要看的地方。
