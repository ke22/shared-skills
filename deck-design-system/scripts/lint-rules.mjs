// The lint rule table, shared by lint-deck.mjs (checks) and build-showcase.mjs (the rules section).
// level: error blocks, warn reports. tier: floor (readability) and system (design-system integrity) can never
// be overridden; style can be overridden on the element with data-lint-allow="R13: reason"; advisory never blocks.
// desc: what the check looks for (English, printed by the CLI). zh: the same in Chinese. fix: how to fix it.
export const RULES = {
  R01: { level: 'error', tier: 'system', desc: 'Hard-coded colour (use a token)', zh: '寫死的色碼', fix: '改用語意 token，例如 var(--struct-mark)、var(--status-gap)。' },
  R02: { level: 'error', tier: 'system', desc: 'Spacing not on the 4px sub-grid (layout spacing should be 8px)', zh: '間距不在 4px 格上', fix: '版面間距用 8 的倍數，元件內細節可用 4 的倍數。' },
  R03: { level: 'error', tier: 'floor', desc: 'Literal font size below the 18px minimum', zh: '寫死的字級小於 18px', fix: '改用字級 token；最小是 caption／micro（18px）。' },
  R04: { level: 'error', tier: 'system', desc: 'Serif typeface', zh: '用了襯線字', fix: '只用 Manrope、Inter、Noto Sans TC。' },
  R05: { level: 'error', tier: 'system', desc: 'Class not defined by the design system (typo or ad-hoc style)', zh: '設計系統沒有的 class', fix: '檢查拼字；真的需要新樣式時，先加進 iasdr.css 與 components.md。' },
  R10: { level: 'error', tier: 'floor', desc: 'Text contrast below WCAG AA (4.5:1, or 3:1 for >=24px bold / >=32px)', zh: '文字對比不足', fix: '一般文字至少 4.5:1；24px 粗體或 32px 以上至少 3:1。換成「可做內文」等級的顏色。' },
  R11: { level: 'error', tier: 'floor', desc: 'Text on the blue field below 24px bold / 32px', zh: '藍色色塊上的字太小', fix: '色塊頁上的字至少 24px 粗體或 32px；小字放進白卡。' },
  R12: { level: 'error', tier: 'floor', desc: 'Rendered text below 18px', zh: '畫面上的字小於 18px', fix: '縮短文字或換版型，不要縮小字級。' },
  R13: { level: 'error', tier: 'style', desc: 'Title over its line limit (h1: 2 lines, zh <= 20 CJK per line; display 3/2; statement 4)', zh: '標題超過行數', fix: '改寫成一句更短的斷言；中文每行不超過 20 字、最多 2 行。' },
  R14: { level: 'error', tier: 'style', desc: 'Centred paragraph longer than 2 lines', zh: '置中段落超過 2 行', fix: '長段落改成靠左。' },
  R15: { level: 'error', tier: 'style', desc: 'Line too long (en > 75 chars, zh > 32 chars)', zh: '單行太長', fix: '加 .measure 限制行寬，或分欄。' },
  R16: { level: 'error', tier: 'floor', desc: 'Content outside the 112px side margins', zh: '內容超出左右邊界', fix: '內容留在左右 112px 邊界內；頁碼、來源列等頁框元素例外。' },
  R17: { level: 'error', tier: 'style', desc: 'Chinese source text: missing CJK–Latin space, half-width punctuation, or curly quotes', zh: '中文排版：中英之間沒空白、半形標點或彎引號', fix: '中英、數字之間加半形空白；用全形標點；引號用「」。' },
  R18: { level: 'error', tier: 'floor', desc: 'Chinese punctuation at the start of a line', zh: '標點落在行首', fix: '內文用 line-break: strict；標題在語意單位之間手動斷行。' },
  R19: { level: 'warn', tier: 'advisory', desc: 'Text not rendered with the local design-system fonts', zh: '沒有用到本機字型', fix: '執行 scripts/fetch-fonts.sh 下載字型。' },
  R20: { level: 'error', tier: 'style', desc: 'Component text rule (chip on one line; id tag <= 4 chars)', zh: '元件文字規則（膠囊一行、代號 4 字內）', fix: '縮短膠囊文字；代號用 P1、D2 這種短碼。' },
  R21: { level: 'error', tier: 'floor', desc: 'Element outside the slide or content in the bottom margin', zh: '超出投影片或侵入底部留白', fix: '刪減內容或換成容量更大的變體。' },
  R22: { level: 'error', tier: 'floor', desc: 'Page script error', zh: '頁面程式錯誤', fix: '打開瀏覽器主控台修正錯誤。' },
  R23: { level: 'warn', tier: 'advisory', desc: 'Success colour used: confirm the item is completed AND verified', zh: '用了成功綠', fix: '確認該項已完成而且已驗證；只是完成就用 --status-met。' },
  R24: { level: 'warn', tier: 'advisory', desc: 'Custom figure used (counts toward promotion: same kind in 3 decks -> new component)', zh: '用了自訂圖解', fix: '同一種圖解在 3 份簡報出現，就提案成新元件。' },
  R25: { level: 'warn', tier: 'advisory', desc: 'Custom figure without data-figure-kind or figcaption', zh: '自訂圖解缺少種類或圖說', fix: '在 .figure 加 data-figure-kind，並寫 figcaption。' },
  R26: { level: 'error', tier: 'style', desc: 'Source line / APA reference (max 2 lines, clear of page number, journal+volume in <i>: italic for English, bold for Chinese)', zh: '來源列與 APA 文獻', fix: '最多 2 行、避開頁碼；期刊名與卷數放進 <i>，中文文獻會自動改粗體；完整書目放參考文獻頁。' },
  R27: { level: 'warn', tier: 'advisory', desc: 'Empty illustration slot (.illus with no image): a finished deck should not keep placeholders', zh: '插畫位置是空的', fix: '放入插畫，或拿掉 .illus。' },
  R28: { level: 'error', tier: 'style', desc: 'Title highlight (.hl only in a content-page h1, one phrase, zh <= 12 CJK / en <= 36 chars)', zh: '標題上色用法', fix: '.hl 只放在內容頁標題，一頁一處，中文 12 字內。' },
  R29: { level: 'error', tier: 'system', desc: 'Status colour outside a status component (warning / danger / success hues mean status only)', zh: '狀態色用在狀態元件以外', fix: '琥珀、紅、綠只表示狀態。裝飾或分類改用結構色、類別色；確實是狀態標記時，加 data-sem="status"。' },
  R30: { level: 'error', tier: 'style', desc: 'Title highlight plus another blue text emphasis on the same slide', zh: '標題上色與內文藍字強調並存', fix: '一頁只留一種強調：保留標題上色，內文改用粗體深色；或拿掉 .hl。' },
  R31: { level: 'error', tier: 'style', desc: 'Arrow between a claim and its evidence (arrows mean sequence or cause)', zh: '主張與佐證之間畫了箭頭', fix: '箭頭只表示順序或因果。主張與佐證用上下堆疊或並列表示支持關係，拿掉箭頭。' },
  R32: { level: 'error', tier: 'system', desc: 'Verdict badge: mark shape and verdict word must match the verdict (met = check, partly = half circle, gap = cross)', zh: '判定徽章的符號或判定詞與判定不一致', fix: '達成用勾、部分用半圓、缺口用叉，並配上對應的判定詞；不要只靠顏色。' },
  R33: { level: 'error', tier: 'system', desc: 'Numbered pins on the figure and in the list do not match one to one', zh: '圖上的編號與說明列表不一致', fix: '圖上每個編號在列表都要有一項，反之亦然。' },
  R34: { level: 'warn', tier: 'advisory', desc: 'Base colour token in an inline style (use the semantic token: structure / emphasis / status / category)', zh: 'inline style 直接用基礎色', fix: '改用提示中的語意 token。' },
};
export const TIERS = { floor: ['可讀性底線', '不能覆寫'], system: ['系統完整性', '不能覆寫'], style: ['風格', '可附理由覆寫'], advisory: ['提醒', '不擋產出'] };
