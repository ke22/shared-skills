---
name: audience-deck
description: >
  同一份研究內容，依「這次要講給誰聽」自動重新取捨、換框架、套 house style 產出簡報大綱與 HTML/pptx。
  核心差異：內容 bank 不變，聽眾決定選什麼、砍什麼、先講哪個。觸發詞：做簡報、整理一下要報告的東西、
  把這份重弄成給 X 看的版本、研討會用、口試用、跟老闆/業界報告、進度報告、換個對象再講一次、
  build a deck、turn this into slides、present to [audience]。即使使用者沒有明講「聽眾」兩個字，
  只要看得出這是要拿現有研究/資料去跟「某一群特定的人」報告，就該觸發本 skill 先問聽眾再動手，
  不要直接套用上一版的取捨。產出以 outline 先行，HTML/pptx 是後段產物，不做技術性 .pptx 修改。
---

# Audience Deck Skill

把一份研究內容，依「這次是講給誰聽」重新取捨、重新框架，並用固定的 house style 建構。
核心假設：**內容是同一個 bank，聽眾決定選哪些、先講哪個、砍掉哪個。**

## Load model（沿用 workspace 慣例）

- 本檔（SKILL.md）：精簡、進場即讀。工作流 + 聽眾快速路由 + 產出規則都在這。
- `references/audience-playbook.md`：**按需載入**。鎖定聽眾後才讀，取得完整 reweight 指令。權威版本——與下方速查表衝突時以此為準。
- `references/house-style.md`：**按需載入**。要建構或改版面時才讀，取 design tokens 與版型。
- `references/rubric.md`：**改版時載入**。每次修改 SKILL.md 後跑一次自評，<3.5 分先修再用。

## 核心原則

1. **內容先於版面。** 論證沒收斂前不碰配色。順序永遠是 論證 → 資料 → 版型 → 美感。
2. **一頁一主張，標題是句子不是標籤。** 「失智照護需求持續擴大，但既有支援難以轉化為當下行動」而非「研究背景」。
3. **Ghost-deck test。** 只把每頁 action title 串起來讀，要能講完整個論證；不行就改結構，不是改版面。
4. **聽眾決定取捨。** 同一份 bank，對不同聽眾砍/留/加/換序都不同。鎖定聽眾前不要出大綱。
5. **House style 一致。** 所有頁面共用同一套 tokens 與版型骨架（見 house-style.md）。

## Workflow

### Phase 1 — 盤點素材，建 content bank
把手上的素材（既有 deck、訪談、資料、逐字稿）拆成可重組的原子：
- **claims**：每個可當 action title 的主張句
- **quotes**：受訪者原話（標受訪者代號，如 I01 照護講師 / P02 居服員）
- **exhibits**：圖表、流程圖、mockup、統計數字（如 36.5 萬人、90.9%）
- **citations**：文獻（保留原格式，永遠放頁底灰字）
不要在此階段就摘要或刪減——先看清全部有什麼。

### Phase 2 — 鎖定聽眾（**必做，出大綱前**）
先從情境判讀（線索：誰會在現場、這份東西講完之後要拿去做什麼決定、對方怎麼稱呼這場會議——「進度會議」「demo」「口試」本身就是答案），
再向使用者確認一句：「這次是給 ___ 看、目的是讓他們 ___，對嗎？」
確認後才讀 `references/audience-playbook.md` 取得該聽眾的：主打鉤子 / 壓縮項 / 加強項 / 地雷 / 時間預算 / scaffold。

### Phase 3 — 產 action-title outline，跑 ghost-deck test
依聽眾的 reweight 指令，從 bank 選 claims，寫成逐頁 action title。
輸出格式：
```
## Slide N: [主張句]
- 佐證/證據 1（至多三點）
- exhibit：[版型名，見 house-style.md]
- citation：[若有]
transition：[如何接下一頁]
```
串讀所有 title → 論證是否完整？不完整就先修結構。

### Phase 4 — 選版型並建構
讀 `references/house-style.md`，為每頁挑版型（三卡 / 大數字 / 循環流程 / 痛點卡 / 對照表 / mockup+清單 / 綠勾 vs 紅叉 / 全幅圖）。
產出優先為 **HTML deck**（單檔、inline CSS/JS、用 tokens）；若使用者要 .pptx，交棒官方 pptx skill，tokens 直接對映。

### Phase 5 — AI-tell scrub + 口說測試
出稿前逐句掃：
- 砍套話：leverage、賦能、打造全方位、在快速變遷的時代、不只是 X 更是 Y。
- 砍假平行：不要每頁都剛好三點、每個 bullet 都同一句型時態。真實論證是不均勻的。
- 口說測試：每句 title 唸出聲，像新聞稿或顧問報告就重寫。標準——「這句話你會當面講給你尊重的人聽嗎？」

## Edge Cases

- **素材不齊**（例如只有半份 deck、沒有原始訪談逐字稿）：在 Phase 1 明講缺什麼，用現有素材先建 bank，缺口標記為「待補」而非憑空生成 quote 或數字。
- **聽眾身份重疊**（例如「教授同時也是這場的評審之一」）：不要硬選一種路由，改成向使用者確認優先序——「這場主要目的是進度確認還是通過審查？」目的決定 scaffold，重疊的身份只影響用詞的正式程度。
- **聽眾不在三個既有路由內**（例如要講給投資人聽）：不要勉強套用最接近的一種。先問使用者這個新聽眾的「已知／在乎／地雷」三項（同 audience-playbook 欄位結構），現場生成一列新路由，事後補進 audience-playbook.md 成為第四種。
- **Bank 為空或素材是全新主題**（還沒有像 v5 這樣的既有 deck）：Phase 1 改成訪談使用者取代「拆解既有 deck」，其餘 Phase 2–5 流程不變。
- **聽眾在會議前臨時改變**（例如原訂教授，改成教授+業界一起聽）：視為新的 Phase 2，重新走一次鎖定流程；不要在舊 outline 上直接增刪，避免論證斷裂。

## 聽眾快速路由（速查用，權威版本在 audience-playbook.md）

| | 指導教授 | 工作方聽眾 | 研討會評審委員 |
|---|---|---|---|
| 他們已知 | 全知，跟過全程 | 懂實務痛點、不懂學術脈絡 | 懂研究方法、不懂你的專案 |
| 最在乎 | 論證是否站得住、貢獻定位、缺口與下一步 | 實際痛點、產品能做什麼、落地價值 | 文獻缺口、方法正當性、效度與限制 |
| 可壓縮 | 背景動機、方法細節（口頭帶過） | RtD / 紮根理論 / 文獻 / 評估方法論 | 產品操作細節、實作技術棧 |
| 需加強 | 設計知識產出、V6 規劃、自我批判 | Demo、痛點共鳴、市場數字、應用場景 | 抽樣正當性、資料飽和、三軸比對效度 |
| 開場鉤子 | 直接進度：「上次之後我把 X 收斂成…」 | 情境痛點：「照護者半夜遇到這種狀況…」 | 文獻缺口：「現行 chatbot 研究缺真實場域視角」 |
| 主要地雷 | 過度 rehearse 背景浪費時間 | 太多學術術語會失去房間 | 把形成性評估講成成效驗證會被電 |
| scaffold | Report-Out / 進度深談 | The Case（近 The Pitch） | Structured Argument（SCR） |

## Claude Code Slash Command

`.claude/commands/deck.md` 已實作，一句話切聽眾，見該檔案。用法：

```
/deck advisor    → 讀本 skill + playbook「指導教授」段 → 產進度深談版 outline
/deck industry   → 產 demo 導向、砍方法論的落地版 outline
/deck committee  → 產嚴謹學術版 outline，Q&A 防守清單一併輸出
/deck [新聽眾]   → 走 Edge Cases 的「聽眾不在既有路由內」流程
```
