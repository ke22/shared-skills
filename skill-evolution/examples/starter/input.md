目標 skill 是 `pptx-maker`。失敗案例：使用者提供的 SVG 在 PowerPoint 轉成 PPTX 後跑版，但原本 workflow 只檢查 SVG 原圖，沒有檢查轉換後的投影片。預期行為是完成 PPTX 後要做 render QA；實際行為是直接交付。請把這次失敗轉成 skill evolution decision，並補一個 regression eval 草案。
