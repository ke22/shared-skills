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
| `iasdr` | **新簡報的視覺標準**：研討會、論文口試、研究與專案簡報；中英兩套排版。樣式 `templates/iasdr.css`、版型庫 `templates/iasdr-layouts.html`（46 個敘事版型）、icon `templates/icons.js`；規格見 `references/`（`iasdr-typesetting.md`、`narrative-layouts.md`、`components.md`、`zh-typesetting.md`） | 亮藍 `#3A77ED` | 1920×1080 |

選主題的原則：新的 HTML 研究簡報、研討會簡報用 `iasdr`；工作台產出的 PPTX 目前仍用 `research`（helper 尚未改成 iasdr）；產品或系統 demo 用 `demo`。同一場報告不混用。

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
