---
name: product-download-page
description: >
  為有 GitHub Release 的工具做靜態產品介紹兼下載頁，部署到 GitHub Pages，並在每次發版後更新與驗證。
  涵蓋：頁面結構與文案、只放真實畫面（從發行版拍截圖並附來源紀錄）、產品影片壓縮與嵌入、
  研究素材的公開授權關卡、design token 投影、gh-pages 只放網站檔、上線驗證。
  觸發詞：產品頁、下載頁、產品網站、landing page、GitHub Pages、把影片或截圖放上網站、
  發版後更新網站、網站還是舊版、download page、product site、release page。
  不用於：多頁的行銷網站、需要後端的網站、只做 Release notes。
---

# 產品下載頁

一頁說清楚這個工具給誰用、長什麼樣、怎麼裝，按鈕連到最新 Release。來源案例見 `references/case-2026-10-research-workbench.md`。

## 原則

1. **只放真的畫面。** 截圖從安裝好的發行版拍、附來源紀錄；影片是真實操作剪輯。不用模擬介面，不用虛構案例冒充真實操作。
2. **下載按鈕連 `releases/latest`。** 發新版不用改按鈕；其他會過期的地方列進發版清單。
3. **網站和開發歷史分開。** 公開 repo 的 `gh-pages` 只放網站檔，網站原始碼在開發 repo 的獨立分支。
4. **研究素材逐項授權。** 畫面裡有受訪者稱呼、原話、案例名稱時，先拿到明確的同意範圍才公開。
5. **驗線上網址。** 本機看過不算，部署後跑 `scripts/verify_live.sh`。

## 檔案

| 檔案 | 用途 |
|---|---|
| `references/page-structure.md` | 區塊順序、文案規則、互動與無障礙、樣式來源 |
| `references/media-and-evidence.md` | 截圖流程、影片規格、授權關卡、示意圖配色 |
| `references/deploy-and-release.md` | 分支配置、第一次部署、更新流程、發新版之後的清單 |
| `assets/provenance.template.json` | 截圖來源紀錄範本 |
| `scripts/encode_web_film.sh` | 影片轉成網頁用 H.264（faststart、去 metadata）＋封面 |
| `scripts/verify_live.sh` | 線上檢查：頁面標記、每個資源、影片分段 206、`releases/latest` 指到的 tag |

## 流程

**新建一個下載頁**

1. 讀 `references/page-structure.md`，依區塊順序寫文案。平台、需求、資料位置以 README 和 LICENSE 為準。
2. 用小腳本從產品的 design token 產生 `tokens.css`，標誌從產品本身抽。
3. 產品畫面依 `references/media-and-evidence.md`：先過授權關卡，再拍截圖或壓影片。
4. 本機檢查：寬度 320／391px 不水平捲動、對話框可用 Escape 關、複製鈕、FAQ。
5. 依 `references/deploy-and-release.md` 第一次部署。推送前取得負責人同意。
6. 跑 `scripts/verify_live.sh <網址> <owner/repo> <標記>`。

**發新版之後更新**

照 `references/deploy-and-release.md` 的「發新版之後」清單：重拍畫面、圖說版本號、流程描述、安裝步驟、FAQ，然後部署並驗證。

**換產品影片或截圖**

先過授權關卡；`scripts/encode_web_film.sh` 壓片；更新圖說；部署；驗證時把影片的元素 id 當標記。

## 示範影片從哪裡來

影片本身的規劃與製作用 `product-demo-film`。這個 skill 只負責壓縮、嵌入、圖說與授權。

## 迭代

每做一個新產品的下載頁，或同一個產品經歷一輪大改，在 `references/` 加一份案例檔或在原案例補一節。發現新的會過期項目時，加進 `deploy-and-release.md` 的清單。
