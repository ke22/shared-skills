---
name: deck-design-system
description: >
  簡報設計 token 的唯一來源。管色票、字體、畫布尺寸，以及 research（藍）與 demo（暖）兩個主題；
  其他簡報 skill 與 presentation-studio 都從這裡取值，不各自抄一份。
  觸發詞：簡報色票、design token、換簡報主題、統一簡報樣式、token 漂移、deck 設計系統、
  deck design system、sync tokens、check tokens。
  做 deck 時要決定配色、字級、畫布，或發現不同簡報顏色對不上時，先讀這個 skill。
  內容取捨用 audience-deck，文字用 tw-presentation-writing；這個 skill 只管視覺 token 與同步。
---

# Deck Design System

簡報的視覺 token 只有一個來源：`tokens.json`。其他地方都是它的複本或投影，由腳本產生並檢查。

## 主題

| 主題 | 用在 | 主色 | 畫布 |
|---|---|---|---|
| `research`（工作台 PPTX 預設） | 工作台產出的研究 PPTX、`audience-deck` 舊 HTML | 藍 `#2551CC` | 1280×720（studio）／1920×1080（HTML） |
| `demo` | 帶影片播放器的 demo 簡報（`demo-player-deck`） | 暖 `#D97757` | 1920×1080 |
| `iasdr` | **新簡報的視覺標準**：研討會、論文口試、研究與專案簡報；中英兩套排版。樣式 `templates/iasdr.css`、版型庫 `templates/iasdr-layouts.html`（47 個敘事版型）、icon `templates/icons.js`；規格見 `references/`（`iasdr-typesetting.md`、`narrative-layouts.md`、`components.md`、`zh-typesetting.md`） | 亮藍 `#3A77ED` | 1920×1080 |

選主題的原則：新的研究簡報、研討會簡報用 `iasdr`，要 PPTX 就用 `scripts/html-to-pptx.mjs` 從 HTML 轉（見下方「HTML 轉 PPTX」）；工作台兩個主題都能選（預設 `research`；選 `iasdr` 時 HTML 用 iasdr 版型、PPTX 由 HTML 轉出）；產品或系統 demo 用 `demo`。同一場報告不混用。

## 檔案

| 檔案 | 用途 |
|---|---|
| `tokens.json` | 唯一來源。`themes.research`、`themes.demo`，每個主題有語意色票與 `css` 投影 |
| `scripts/check-tokens.mjs` | 檢查所有使用方是否和來源一致，有漂移就 exit 1 |
| `scripts/sync-tokens.mjs` | 從來源重新產生使用方；預設 dry run，加 `--write` 才寫入；`--css <theme>` 印出 `:root` |
| `scripts/tokens-lib.mjs` | 共用函式與使用方路徑清單 |

## 使用方（由腳本維護，不要手改）

| 使用方 | 內容 | 同步方式 |
|---|---|---|
| `presentation-studio/skills/research-deck-production/assets/tokens.json` | `themes.research` 去掉 `label` 與 `css`，格式與 studio 驗證器相同 | `sync-tokens.mjs --write` |
| `shared-skills/audience-deck/references/house-style.md` | 兩個 `deck-tokens:research` 標記之間的 CSS 區塊 | `sync-tokens.mjs --write` |
| `shared-skills/demo-player-deck/assets/deck-template.html` | 第一個 `:root` 區塊 | `sync-tokens.mjs --write` |
| `presentation-studio/skills/research-deck-production/iasdr/` | iasdr 執行檔的複本：`html-to-pptx`、`pptx-post`、`browser-lib`、`lint-deck`、`iasdr.css`、`manifest.json`、`tokens.json`、字型（字型不進 Git） | `node scripts/sync-runtime.mjs`；`--check` 已列入 `test-design-system.mjs` |
| `deck-design-system/templates/iasdr-deck.html` | `:root` 與 `[lang="zh-Hant"]` 區塊 | 由範本反向產生 tokens；改範本後要同步 `themes.iasdr.css`／`cssZh`（check 會擋） |

已知舊拷貝（只警告，不改）：`訪談LLMwiki/skill/` 已於 2026-11-06 封存到 `訪談LLMwiki/_archive/20261106-ppt-migration/`，檢查時若不存在就略過。

## 流程

**改色票或字級**
1. 只改 `tokens.json`。`research` 主題改動後，要同步想一下 `css` 投影的對應欄位。
2. `node scripts/sync-tokens.mjs`（先看 dry run），確認後加 `--write`。
3. `node scripts/check-tokens.mjs` 要全部 OK。
4. 如果動了 `research`，在 `presentation-studio/app/presentation-workbench` 跑 `npm test`，因為 `design-tokens.test.js` 會斷言 `accent` 是 `#2551CC`；改主色要一併更新那個測試。

**新增主題**
1. 在 `tokens.json` 的 `themes` 加一個，至少有 `label`、`canvas`、`colors`、`css`。
2. 在 `tokens-lib.mjs` 的 `CONSUMERS` 加使用方，並在 `check-tokens.mjs` 加對應檢查。

**做新 deck 時**
- 先決定主題，再用 `node scripts/sync-tokens.mjs --css <theme>` 取得 `:root`，貼進新 deck。
- 不要憑記憶寫色碼。

## 邊界

- `demo` 主題不經過 studio 的 `validateDesignTokens`，它只有 HTML 投影。
- `audience-deck/house-style.md` 的 §0 仍然成立：專案內已有成品 deck 時，以成品為準。但新成品應該從這裡取色，不再各自定義。
- 版型、元件、圖解規則仍在各自的 skill：`research-deck-production/references/` 與 `audience-deck/references/house-style.md`。

## 元件清單與檢查（iasdr）

參考 Gen UI 的做法：**AI 選元件、平台用同一份規格檢查、畫面由固定元件組成。**

| 檔案 | 用途 |
|---|---|
| `manifest.json` | **元件清單**，由程式產生，不要手改。記錄 62 個元件的用途、選擇器、用到的 token、文字欄位與字數規則、在 HTML／PPTX 的實作狀態、實際出現在哪些版型，以及每個版型由哪些元件組成 |
| `scripts/build-manifest.mjs` | 從 `components.md`、`iasdr.css`、`tokens.json` 與兩份範本的渲染結果產生清單；`--check` 檢查清單是否過期 |
| `scripts/lint-deck.mjs` | 用清單與排版規則檢查任何 iasdr HTML 簡報：R01–R05 靜態檢查（色碼、間距、字級、襯線字、未定義 class），R10–R26 渲染檢查（對比、藍底字、最小字級、標題行數、置中行數、行長、邊界、中文混排與標點、字型、元件文字、越界、腳本錯誤、綠色語意、自訂圖解、頁尾 APA 文獻）；有錯就 exit 1 |
| `layouts.json` | **敘事版型清單**，由 `scripts/build-layouts.mjs` 從 `narrative-layouts.md` 與 `manifest.json` 產生：47 個版型各自回答的問題、82 個變體與「什麼時候用」、組成元件、對應的工作台元件與敘事關係（讀自工作台註冊表）、實作狀態，以及 5 條簡報主線。選法：**先依問題選版型，再依條件選變體** |
| `scripts/test-design-system.mjs` | 一個指令跑完：tokens 一致、清單沒過期、兩份範本 lint 全過、`tests/fixtures/bad-deck.html` 會觸發每一條規則（確認沒有失效的規則）、範本轉 PPTX 不掉字 |
| `scripts/html-to-pptx.mjs` | **HTML 轉可編輯 PPTX**（見下節） |
| `scripts/pptx-post.mjs` | PPTX 匯出後處理：中英字型分開、行高改為固定點數 |
| `scripts/test-html-to-pptx.mjs` | 轉換檢查：頁數、文字不遺失（對照頁面 innerText）、字型、行高、文字框不出界、檔案可重新讀入 |

**規則分層**（`lint-deck.mjs` 每條規則標出層級）：

| 層級 | 規則 | 能不能覆寫 |
|---|---|---|
| 可讀性底線 floor | R03、R10、R11、R12、R16、R18、R21、R22 | 不能；寫了覆寫也會被忽略並標註 |
| 系統完整性 system | R01、R02、R04、R05 | 不能 |
| 風格 style | R13、R14、R15、R17、R20、R26 | 可以：在元素或其上層加 `data-lint-allow="R13: 理由"`，理由至少 4 個字；報告會列出所有覆寫 |
| 提醒 advisory | R19、R23、R24、R25 | 不擋產出 |

**表達力的出口與指標**：
- 沒有版型能不變形地表達時，用 **N47 自訂圖解**（元件 C62，`<figure class="figure" data-figure-kind="類型">`）。內容形式不限，但要通過底線規則。不要把內容硬塞進 N38、N39。
- 同一個 `data-figure-kind` 在 3 份簡報出現，就提案升格成正式元件。lint 報告最後的 `Metrics` 會統計自訂圖類型與覆寫次數。
- 工作台的 QA 報告有提醒級的 `semantic.component-fallbacks`：列出被退回通用元件或換成其他元件的頁面與比例（不擋產出）。比例高代表版型庫不夠。

**改了設計系統之後**：

```bash
node scripts/build-manifest.mjs        # 重新產生元件清單
node scripts/build-layouts.mjs         # 重新產生版型清單
node scripts/test-design-system.mjs    # 全部要 PASS
```

**檢查自己的簡報**：`node scripts/lint-deck.mjs path/to/deck.html --json report.json`

需要 Chrome 與 Playwright（預設用 Codex runtime；可用 `WORKBENCH_RUNTIME_MODULES`、`CHROME_PATH` 指定），以及本機字型（`scripts/fetch-fonts.sh`）。

## HTML 轉 PPTX（iasdr）

**HTML 是唯一的設計來源，PPTX 由它轉出**，不另外寫一套 PowerPoint 版的元件。這樣 lint 檢查過的 HTML 就是 PPTX 的樣子，新增版型也不用另外移植。

```bash
node scripts/html-to-pptx.mjs deck.html --out deck.pptx --lang zh-Hant          # 或 --lang en；省略則全部
node scripts/html-to-pptx.mjs deck.html --out deck.pptx --compare out/          # 另存每頁 HTML／PPTX 並排比對圖
```

做法：在 Chrome 渲染後，量出每個元素實際的位置與樣式，換算成 1280×720（13.33 吋標準 16:9）。

| HTML | PPTX |
|---|---|
| 底色、框線、圓角、內框線（inset box-shadow）、陰影 | 原生形狀，可編輯 |
| 文字 | 原生文字框，可編輯；保留每段的顏色、粗細、字級、字型。**斷行位置照瀏覽器**，所以中文標點禁則以瀏覽器（`line-break: strict`）為準，不交給 PowerPoint |
| 行高 | 固定點數，和 CSS 一樣（PowerPoint 的「倍數」是乘字型自身行高，會比 CSS 鬆） |
| 中英混排 | 英文 Manrope／Inter，中文 Noto Sans TC（分別寫進拉丁與東亞字型欄） |
| icon、SVG 圖 | 內嵌 SVG（向量，保留漸層） |
| 漸層背景、clip-path 形狀（漏斗、箭頭） | 元素本身的底色存成透明 PNG；裡面的文字仍是文字框 |
| 偽元素 `::before`／`::after` | 先轉成真的元素再量 |
| 疊放順序 | 依 z-index 與定位排序 |

**已知損失**：字距（letter-spacing）、regular／bold 以外的字重（500 會變一般、800 會變粗體）、模糊陰影統一成一種柔和陰影。

**字型**：開啟 PPTX 的電腦要安裝 `templates/fonts/` 的三套字型（Manrope、Inter、Noto Sans TC），否則 PowerPoint 會換成其他字型，行寬和斷行都會跑掉。

**驗證狀態**：`iasdr-deck.html` 中英各 10 頁、`iasdr-layouts.html` 中文 47 頁，已用 artifact-tool 渲染並排比對。**還沒在 PowerPoint 實機開過**：行高小於字身的大字（例如封面大標）的垂直位置，以及 SVG 內文字的粗細，要以 PowerPoint 實際畫面為準。
