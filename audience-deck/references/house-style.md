# House Style — 版型系統

按需載入。要建構或改版面時讀這份。目的：任何人（或任何 Claude session）重建頁面都維持一致外觀。

## 0. 權威來源：先掃現有簡報，再用本檔（硬規則）

**建構任何 HTML deck 前，第一件事是掃描現有簡報、比對當前模板——不要直接套本檔的 tokens。**

- **掃描順序跟 §0.5 的輸出資料夾判定順序完全一致，不是另一套邏輯**：
  1. 使用者明講的資料夾——先掃這裡有沒有既有 `.html` 成品。
  2. 專案內既有成品 deck 所在資料夾——掃描專案找出來。
  3. **Workspace 預設輸出資料夾 `/Users/yulincho/Documents/01_Github/audien-deck`**——前兩者都沒有既有成品時，一定要掃這裡；不要因為這是「別的專案」的資料夾就跳過，這裡的 `.html` 一樣是權威樣式來源，不只是輸出位置。
  4. 三個位置都沒有任何 `.html` 時，才真的落到本檔的 fallback tokens。
- 找到的話，把最近修改那份 `.html` 的 `:root` tokens、標題骨架（indicator-bar／sec-title／main-title）、元件（table-design / 手機 mockup / 卡片 / 動畫）當**權威**，新頁面直接沿用同一套 CSS——不管這份成品是不是在「這次專案」的資料夾裡。
- 本檔的 tokens 是**上面三個位置都沒有任何成品 deck 時的 fallback**，不是覆蓋現有模板的依據。找到的模板與本檔衝突時，**以找到的現有成品為準**，並回頭把本檔同步更新。
- 真的要從零決定配色與字體時（三個位置都沒有既有 deck），避免落入制式 AI 感設計——不要預設 Inter / Roboto / 系統字體＋淡紫漸層這種到哪個專案都一樣的組合。比照 `frontend-design` skill 的判斷方式：先想清楚這份 deck 的基調（嚴謹學術／活潑業界／內部工作會議…），再選字體與配色，讓設計看起來是為這場報告做的，不是套版。
- 為什麼：house-style.md 會隨時間與實際 deck 分岔（曾發生過舊 tokens 與現行成品 tokens 兩套並存、導致新 deck 套錯色的情況；也曾發生過「掃描範圍」只看單一專案資料夾、沒看 workspace 預設資料夾，導致明明有真實成品放在預設資料夾卻沒被套用的情況）。掃描涵蓋三個位置能保證新舊頁面同場並排不違和。

> **這裡刻意不寫死任何特定檔名或版本號**——先前版本曾在這裡記錄一個具體檔名當「目前權威實體」的快取，但那份記錄後來被發現查無實體（見 rubric.md v1.2 修正紀錄）。掃描結果永遠是即時的：每次建新 deck 前，實際跑一次「列出輸出資料夾、取最近修改者」，不要相信任何寫在文件裡的舊檔名快取，包含這一段。

## 0.5 產出契約：檔案、資料夾、命名與版本（硬規則）

每次建 deck，**一律同時產兩個檔、放同一資料夾、用同一組檔名**：

- **兩份都要產**：
  - `.html` — 套 house style 的成品簡報（單檔、inline CSS/JS、可直接開）。
  - `.md` — 純內容鏡像（action title ＋ bullet ＋ citation），供 Obsidian 閱讀、diff、餵給 pptx skill。兩份**內容必須同步**，只差呈現層。
- **輸出資料夾判定順序**：
  1. 使用者明講的資料夾——直接用，優先度最高。
  2. 專案內既有成品 deck 所在資料夾——動手前實際掃描專案找出來，不要憑之前的紀錄或印象猜測路徑。
  3. **Workspace 預設輸出資料夾：`/Users/yulincho/Documents/01_Github/audien-deck`**——跨專案通用的固定位置，找不到專案內既有 deck 時，直接用這裡，不用先問使用者。
  4. 連這個固定位置都不合適的特殊情境——動手寫檔前先問使用者放哪裡，不要自己另外決定路徑。
- **動手寫檔前的強制動作**：不論落在上面哪一種情況，寫入任何 `.html`/`.md` 前，先實際列出目標資料夾現有檔案（沒有資料夾就回報「資料夾不存在」，視為情況 2 沒找到、改用情況 3），並把這份列表寫進回報——版號與 archive 與否，都要從這份實際列表推算，不能憑記憶或假設既有檔案長怎樣。
- **命名系統**：`{聽眾類型}-{短名}-{日期}-v{major}.{minor}.{html|md}`
  - `{聽眾類型}` 用 Phase 2 鎖定的聽眾代稱（`advisor` / `industry` / `committee`，或 edge case 現場生成的新聽眾代稱）。
  - `{短名}` 用可讀中文短名，與內容一致、跨版本穩定。
  - `{日期}` 為本次產出（這個版本被寫入的當下）日期，格式 `YYYYMMDD`；每次寫入新版本（不論 major 或 minor）都更新成當天日期，不是保留最初建立日期。
  - 同一份 deck 的 `.html` 與 `.md` 用**完全相同的聽眾類型、短名、日期、版本號**。
  - 範例：`advisor-V6場域驗證-20260717-v1.0.html` / `advisor-V6場域驗證-20260717-v1.0.md`。
- **版本號規則**：
  - `major` — 結構性改版（換聽眾、增刪頁、重排論證骨架）時 +1，`minor` 歸零。
  - `minor` — 同結構下的內容/文案/樣式修訂 +1。
  - 預設**原地覆寫同版號檔**；只有在使用者要保留舊版對照時才升號並保留舊檔。升 `major` 時，把前一版移到輸出資料夾下的 `_archive/`（若無此資料夾則建立），避免同資料夾堆疊多版造成「哪份才是現行」的混淆。**只搬移（archive），不刪除**——舊版內容永遠保留得到。
  - 首次產出從 `v1.0` 起算（除非沿用既有 deck 的版本脈絡）。
- **交叉指標**：`.md` frontmatter 標 `html: {同名}.html`；若專案有 wiki，wiki 內對應 topic 頁指向 `.html` 完整路徑。

> 產出後回報時，明確列出兩個檔名與版本號，讓使用者一眼知道現行版本是哪個。

## Design tokens（CSS custom properties，可直接用於 HTML deck）

**色票來源已統一**：下面「色票」區塊由 `shared-skills/deck-design-system/tokens.json` 的 `research` 主題產生，不要在這裡手改。要改色票，改那個檔後跑 `node shared-skills/deck-design-system/scripts/sync-tokens.mjs --write`；`check-tokens.mjs` 會檢查這份有沒有漂移。若專案已有掃描得到的成品 deck，仍以那份實際模板為準（見 §0）。

色票（fallback；角色說明：`primary` 深藍＝main-title／indicator-bar 底／強調字；`secondary` 亮藍＝sec-title pill／表頭／箭頭；`warning`＝note-amber 系列；`text-muted`＝頁碼與 citation 灰字，勿再調淺）：

<!-- deck-tokens:research:start -->
```css
:root {
  --color-primary: #144BB8;
  --color-secondary: #1C5CE2;
  --color-bg-light: linear-gradient(135deg, #F5F8FC 0%, #E2EBF8 100%);
  --color-bg-dark: radial-gradient(circle at center, #2551CC 0%, #0E2656 100%);
  --color-surface: #FFFFFF;
  --color-success: #268956;
  --color-danger: #C34733;
  --color-warning: #9B6410;
  --text-main: #0E2656;
  --text-muted: #596C91;
  --text-inverse: #FFFFFF;
}
```
<!-- deck-tokens:research:end -->

間距、圓角、字體（版型專用，不屬於色票，在這裡維護）：

```css
:root {
  --space-sm: 20px; --space-md: 40px; --space-lg: 60px; --space-xl: 80px;
  --radius-sm: 10px; --radius-md: 20px; --radius-pill: 999px;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                 "Helvetica Neue", Arial, "Microsoft JhengHei", "PingFang TC", sans-serif;
}
```

畫布：`.slide-canvas` 固定 **1920×1080**，用 JS `transform: scale(min(vw/1920, vh/1080))` 置中縮放；每頁 `.slide` 絕對定位、`opacity` 切換。導覽：← / → / Space / 點擊左右半屏。

配色規則：最多三色使用（primary / secondary / 一個 alert 色）。色彩用來**導引視線**（標出關鍵發現、alert box），漸層只用於底色與 indicator-bar，不做裝飾性漸層。無障礙：內文一律 `--text-main`、灰字一律 `--text-muted`（勿更淺）。

## 標題骨架與核心元件（依真實成品 deck 校正，取代先前未驗證的 64px 單一標題假設）

**校正依據**：`references/V6場域驗證規劃v2-edited-2026-07-09 (1).html` 是目前唯一真正產出過、可實際開啟檢視的成品 deck；先前（2026-07-06）記錄的「單一 main-title（64px）取代 sec-title+lede 三層」是一次未經真實案例驗證就寫進文件的改版判斷——事後稽核（見 rubric.md 修正紀錄）發現當時宣稱依此規則重建的範例檔案根本不存在。現在有了真正的成品可核對，發現真實成品從頭到尾都固定使用 `sec-title`＋`main-header-group` 兩層，`main-title` 字級是 **48px**，不是 64px。本節依真實檔案改回這個規格；「單一大標題」不再是預設，除非未來有新的真實成品刻意這樣做並在此更新。

- **標題組（預設，即真實成品的固定寫法，三個元件都在）**：
  - `.slide-nav`：頁面右上角，格式「頁碼 / 該頁所屬階段」（例：「01 / 貢獻定位」），`--text-muted`、20px、bold、`letter-spacing:1.5px`，`position:absolute; top:40px; right:100px`。封面頁（`.layout-cover`）改用 `rgba(255,255,255,0.5)`。
  - `.sec-title`：小節標籤，內容主題的短名（例：「V6 vs PDC30」），`--color-primary`、28px、`font-weight:700`、`margin-bottom:16px`、`letter-spacing:1px`。
  - `.main-header-group`：左側 14px 漸層 `indicator-bar` 直條（`background: linear-gradient(180deg, var(--color-secondary), var(--color-primary))`、`min-height:64px`、隨內容自動撐開、`margin-right:32px`）＋ `.main-title`（斷言句，`--text-main` 近黑、**48px**、`font-weight:800`、`line-height:1.34`、`letter-spacing:-0.5px`）。
  - `main-title` 依然要是完整、可獨立朗讀的斷言句（Phase 3 標準不變：不是反問句、不是條列標籤）；`sec-title` 是短主題標籤，不承載完整論述，兩者分工明確，不是互相重複。
- **`.lede`**：真實成品裡完全沒有出現這個元件——目前沒有真實案例支持它的存在，也沒有真實案例反對；維持「未使用即為常態，需要時才加」的既有保守態度，不強推使用。
- **卡片**：`.card`（白底、`--radius-md`、hover 上浮陰影）；grid-2 / grid-3 排列。
- **表格**：`.table-design`（`--color-secondary` 深藍表頭、白底、可用 `tr.hl` 加淺黃底標記重點列，`.mech-cell` 標記關鍵詞欄位為 `--color-primary` 粗體）。
- **提示框（note）**：`.note-amber`（`--color-warning` 系配色、左側粗色框、琥珀底）標記待解決疑問或警示；`.note-blue`（`--color-secondary` 系配色、藍底）標記需要強調的結構化重點。兩者都疊加在任何版型的 body 內，不是獨立版型。
- **Chip 標籤**：`.chip`（`--color-primary` 淺藍底圓角小標籤）標記關鍵詞／分類；`.chip.warn` 為警示色版本（用於需要凸顯風險的標記）。
- **雙欄任務卡**：`.prep-cols`／`.analysis-grid`（2 欄等寬 grid）＋ `.prep-block`（白底卡，標題 `--color-primary` 粗體 + bullet list，關鍵詞用 `<b>`）。用途：兩組平行但同層次的行動項或分析結果並列（例：「系統調整」vs「招募」，或「資料分析」vs「後續研究」）。
- **代辦檢核清單**：`.layer-list`（`.layer` 橫列，細灰線分隔）——左側大數字或勾選框（`.ln`，`--color-secondary`），右側標題（`.lt`，`--color-primary` 粗體）+ 說明（`.lb`）。用途：todo/checklist、驗收清單、流程步驟條列。
- **字母卡橫列**：`.abcd-grid`（`.abcd-card` 逐列排列）——左側圓形字母／編號徽章（`.abcd-letter`，`--color-secondary` 底、白字）、中間標題（`.t`）+ 說明（`.d`）、右側可選「看細節」按鈕（`.card-detail-btn`）開啟對應內容。用途：呈現有固定字母/序號代稱、彼此平行的階段或資料來源（例：A/B/C/D 四段資料收集）。
- **手機 mockup**：`.phone`（深色外框、`phone-bar` 標題列、`pb.bot`／`pb.user` 對話泡，泡泡內可加 `.tags` 顯示分類標籤），demo/機制頁用；內容較長時加 `.scrollphone` 讓對話框內部可捲動。
- **時程軸**：三節點卡片（`.tl-box`，左側粗色框依序 blue/purple/teal 標記三個階段）＋ 下方 `.tl-axis` 時間軸（`.tl-dot` 對應節點位置）與週次標記（`.tl-weeks`），用途：呈現多天/多週的執行歷程與關鍵節點。比純線性流程版型更適合需要標出精確天數/週次的場合。
- **進場動畫**：`fadeUp`／`barGrow`（indicator-bar）／`softIn`（卡片、表格逐項延遲），必附 `@media (prefers-reduced-motion: reduce)` 降級。
- **citation**：`.slide-citation` 一律頁底、`--text-muted` 灰字、小級。

## 通用頁面骨架

每一頁內容頁都是這個骨架，只換 body；`sec-title` ＋ `main-title` 兩層都在，`.lede` 預設不用：

```
┌─────────────────────────────────────────────┐
│                          頁碼 / 階段（slide-nav）│  ← 右上角，灰字小
│ 小節標籤（sec-title，28px、primary 藍）          │
│ ▌大標題（main-title，48px，近黑，action title）  │  ← 左側 indicator-bar 直條
│                                               │
│         [ BODY：換下面版型庫其中一種 ]           │
│                                               │
│ 文獻 citation……（灰字，頁底）                  │
└─────────────────────────────────────────────┘
```

## 版型庫（來自 v5，標註用途與觸發時機）

> 下面用「失智照護研究」的具體例子說明每種版型的用途，是本專案的示範，不是版型本身的限制。
> 換到別的研究主題時，替換掉括號裡的具體案例（例如「痛點卡」換成任何「一個問題+佐證引用」的內容），
> 版型的結構與觸發時機邏輯不變。這是目前唯一還沒真正跨專案驗證過的部分（見 rubric.md 可攜性項），
> 下次套用到非失智照護主題時，第一件事就是回頭檢查這裡的命名是否還合理。

1. **三卡並列** — 用途：把一個主張拆成三個平行支點（背景三面向、三目標）。結構：三張等寬卡，各含子標題 + 內文 +（可選）小圖/citation。何時用：主張天然是三分時；不要硬湊三點。

2. **大數字 / 大statement** — 用途：一個數字或一句話就是證據（36.5 萬人 donut、90.9% callout）。結構：巨大數字置中或置左 + 一行說明。何時用：stakes 頁、想讓房間停在一個念頭時。**不加 bullet，別跟數字搶。**

3. **循環 / 線性流程** — 用途：呈現歷程或機制流（任務鏈 提問→判斷→行動，帶回圈箭頭）。結構：3–5 個節點 + 箭頭，循環則加回頭箭頭。何時用：講「這是一段反覆循環而非一次性」時。

4. **痛點卡（招牌版型）** — 用途：呈現一個痛點 + 佐證引用。結構：左側大圓標籤（痛點名）+ 箭頭 + 右側 2 張堆疊 quote 卡（受訪者原話，關鍵句 bold，標代號）。何時用：所有 pain point 頁；三個痛點共用同一模板才有節奏。

5. **推導對照表** — 用途：顯示 A→B→C 的映射邏輯（歷程→痛點→設計方向）。結構：行=映射層，欄=三條線；用箭頭串直。何時用：要讓評審一眼看到「設計方向是從資料推出來的、不是拍腦袋」。

6. **Mockup + 編號清單** — 用途：展示介面機制。結構：左側機制名 + 編號步驟清單，右側手機 mockup（含標註氣泡）。何時用：V5 三個設計機制頁；demo 導向聽眾加大 mockup 比例。

7. **綠勾 vs 紅叉（成對頁）** — 用途：結果的正反面。結構：三張綠勾卡（做到什麼）一頁，三張紅叉卡（缺口）緊接一頁。何時用：評估結果；學術聽眾務必保留紅叉頁（自我批判 = 效度）。

8. **全幅圖 + 置中句** — 用途：研究問題 / 章節轉場的呼吸頁。結構：滿版照片壓深藍疊色 + 置中大字，關鍵詞 bold。何時用：研究問題、Q&A、想製造停頓時。

9. **缺口深講版**（advisor-cut 新增） — 用途：對「已知全局」的聽眾（如指導教授）深講單一缺口，而非快速掃過三個。結構：左側固定寬紅框圓角卡（✕ + 缺口名稱），右側 1–2 張堆疊 quote 卡深入證據；比版型 7 的三卡並列更聚焦、更慢。何時用：進度會議、需要對方給判斷而非只是知會結果時；業界/評審版通常不用（他們要的是掃過，不是深講）。

10. **雙欄任務卡**（來自真實成品 deck，`.prep-cols`/`.analysis-grid`） — 用途：兩組平行但同層次的行動項或分析結果並列（例：「系統調整」vs「招募」，或「資料分析」vs「後續研究」）。結構：2 欄等寬白底卡，各卡標題 + bullet list，關鍵詞用 `<b>`。何時用：需要並排比較的兩組同層次項目，內容量不到需要三卡的程度。

11. **代辦檢核清單**（來自真實成品 deck，`.layer-list`） — 用途：todo/checklist、驗收清單、流程步驟條列。結構：橫列排列，左側大數字或勾選框，右側標題 + 說明，列間細灰線分隔。何時用：需要條列可勾選/可編號的待辦或步驟，而非平行論點。

12. **字母卡橫列**（來自真實成品 deck，`.abcd-grid`） — 用途：呈現有固定字母/序號代稱、彼此平行的階段或資料來源（例：A/B/C/D 四段資料收集）。結構：逐列排列，左側圓形字母/編號徽章、中間標題+說明、右側可選「看細節」按鈕開啟對應深入內容。何時用：階段/來源本身已有慣用代稱（A/B/C/D、①②③）且需要「先掃過、可選深入」的呈現。

## 一致性硬規則

- Citation 永遠頁底、灰字、小級，格式不變。
- Action title 一律左側 accent-bar（`indicator-bar`）直條。
- **預設 `sec-title`（28px、小節標籤）＋ `main-title`（48px、近黑、斷言句）兩層都在，`.lede` 預設不用**——這是真實成品 deck 的固定寫法（見標題骨架章節校正說明）；`sec-title` 只放短主題標籤，不承載完整論述，跟 `main-title` 分工明確，不是同一句話拆兩處講。
- 同一類內容用同一版型（三個痛點都用版型 4，三組結果都用版型 7）——重複才有節奏，別每頁換花樣。
- 一頁一版型；body 不混用兩種版型。
- Action title（以及例外加上的 `.lede`）都是可獨立朗讀的斷言句，不加「（交付物清單）」「（風險預警）」這類括號分類尾綴——句子本身就該講清楚這頁在講什麼，不需要再貼一個類別名。
- `sec-title` 不掛「· 為什麼...」「· 為何...」這種反問句後綴；理由要講，就直接寫進 main-title，或拆成單獨一頁講深。
