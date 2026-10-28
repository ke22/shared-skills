---
name: demo-player-deck
description: >
  用單一 HTML 檔做產品或系統的 demo 簡報。1920×1080 舞台，可按鍵翻頁、分步顯示，
  內嵌依研究階段分段的影片播放器：左欄是階段清單與定格說明，右邊是影片與刻度，可拖動定格。
  完成後打包成線上版（Artifact 或靜態網站）與離線 zip，並留一份決策紀錄。
  觸發詞：demo 簡報、網頁簡報、系統成果報告、把 demo 影片放進簡報、簡報裡要能播影片、
  研究歷程播放器、機制與實機、HTML deck with video、interactive demo deck、walkthrough deck。
  內容取捨用 audience-deck，文字用 tw-presentation-writing，影片本身的規劃與製作用 product-demo-film；
  這個 skill 管的是播放器簡報的建構、檢查、打包與迭代。
---

# Demo 播放器簡報

把「AI 做一步、使用者接一步」這類流程，用一頁播放器講清楚，不再用三頁靜態分工表。來源案例見 `references/case-2026-10-research-workbench.md`。

## 檔案

| 檔案 | 用途 |
|---|---|
| `assets/deck-template.html` | 模板：翻頁引擎＋播放器＋四頁範例（封面、分步顯示、播放器、結語） |
| `references/player-stages.md` | 播放器的 `data-video`／`data-roles`／`data-stages` 格式 |
| `references/packaging.md` | 線上／離線打包、Artifact 發佈、決策紀錄格式 |
| `scripts/check_stages.py` | 檢查時間軸：空檔、重疊、超出範圍、待補、比影片長 |
| `scripts/package_deck.sh` | 壓縮影片、產出 online/ 與 offline.zip |

## 流程

1. **授權關卡。** 列出影片與截圖裡的研究素材（受訪者稱呼、原話、品牌、案例名稱）。問清楚公開範圍，記下來。範圍沒確認前，只做私人預覽，不分享連結、不放公開網站。
2. **聽眾與論述。** 用 `audience-deck` 定聽眾。對外報告從「這對我有什麼用」切入：現行問題 → 產品價值 → 方法與流程（播放器）→ 使用者的位置 → 未來計畫。研究提問放在頁內回答，不當段落標題。目標 8 頁左右。
3. **Wireframe。** 先做低擬真 wireframe，確認頁序和播放器的互動，再做正式頁面。
4. **鎖色票和用字。** 開始排版前先定：色票（角色用灰階分層，顏色只在小圓點），以及對使用者的稱呼、標題句型。影片字幕要一起對照。
5. **從模板做頁。** 複製 `assets/deck-template.html`。每頁一個 `<section class="slide">`；`chrome-bot` 的頁碼手動更新；要分步顯示就在 slide 加 `data-steps="2"`，第二次才出現的元素加 `class="step2"`。還沒完成的目標用分步顯示和現有價值分開。
6. **播放器資料。** 階段和說明從影片腳本來（`product-demo-film` 的腳本審閱頁有逐段時間表），不用估的時間碼（格式見 `references/player-stages.md`）。說明放左欄，不疊在影片上；剪輯、展示圖層這類誠實註記寫在 `n`。
7. **檢查。** 跑 `python3 scripts/check_stages.py deck.html --video film.mp4`。用瀏覽器實際翻一次：鍵盤翻頁、分步顯示、每個階段點下去說明對得上畫面、拖動會定格。再跑下面的上台前清單。
8. **打包發佈。** `scripts/package_deck.sh deck.html film.mp4 out/`。線上版發佈成 HTML Artifact（影片用 `files` 一起發），離線版給現場備用。不要用簡報編輯器（Slides 類型）做，它放不進播放器。
9. **決策紀錄。** 定稿時寫一份：定稿每頁一覽、版本歷程、決策與理由、刻意不採用、上台前待確認。舊版 Artifact 等紀錄寫好再刪。

## 上台前清單

- [ ] 研究素材的公開範圍已確認，涵蓋影片裡每一位出現稱呼或原話的人。
- [ ] 對使用者的稱呼一致（簡報、影片字幕、口頭說法）。
- [ ] 時間碼沒有估計值；有的話已校正或標明。
- [ ] 每一個「我們做到了」的說法都在執行中；還沒做的改成未來式。
- [ ] 講到 AI 節點的輸入、模型或「訓練」時，已對照實作確認。
- [ ] 線上版影片能播（發佈檔案路徑等於 `data-video`），離線 zip 解壓後能播。

## 迭代

每做一次新簡報，在 `references/` 加一份案例檔，或在原案例補「這次不同的地方」。模板若改了引擎或播放器，案例檔的「樣板缺陷」一節要寫清楚改了什麼、為什麼。
