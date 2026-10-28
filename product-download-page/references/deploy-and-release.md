# 部署與發版連動

## 分支與資料夾

| 東西 | 放哪裡 | 為什麼 |
|---|---|---|
| 網站原始碼 | 開發 repo 的獨立分支（例：`website/product-landing`），用一個 worktree 打開 | 和產品程式分開改，不會混進產品 commit |
| 公開網站 | 公開 repo 的 `gh-pages` 分支，只放網站檔＋`.nojekyll` | 開發歷史可能有不能公開的資料，永遠不推到公開遠端 |
| 公開安裝包 | 公開 repo 的 Release，用白名單打包的 ZIP | 同上 |

本機只留一份網站來源。舊副本（例如主工作樹裡未追蹤的 `website/`）要移走，否則本機預覽可能開到過期內容。

## 第一次部署

```sh
# 在公開 repo 的一個獨立 clone 裡
git switch --orphan gh-pages
cp -R <網站 worktree>/website/. .
rm -f README.md VERIFICATION.md build_assets.py   # 只留瀏覽器需要的檔案
touch .nojekyll
git add -A && git commit -m "Product website"
git -c credential.helper= -c credential.helper='!gh auth git-credential' push -u origin gh-pages
gh api -X POST repos/<owner>/<repo>/pages -f 'source[branch]=gh-pages' -f 'source[path]=/'
```

SSH 推送在某些環境會被拒；用上面的 HTTPS＋`gh auth git-credential` 寫法。

## 之後每次更新

1. 在網站 worktree 修改並 commit（網站分支保留完整歷史和 README、驗證紀錄）。
2. 把瀏覽器需要的檔案複製到 `gh-pages` clone，commit 一句說明，推送。
3. 等 Pages 建置（通常一分鐘內），跑 `scripts/verify_live.sh <網址> <owner/repo> <這次新增的標記>`。

推送是對外發佈。每一次都要負責人同意；內容含研究素材時，先過 `media-and-evidence.md` 的授權關卡。

## 發新版之後

下載按鈕連 `releases/latest`，發版本身不用改網站。但下面這些會過期，發版清單要列進去：

- [ ] 截圖或影片：介面有變就從新版重拍，更新來源紀錄。
- [ ] 圖說上的版本號。
- [ ] 流程描述：每一步對照新版產品。
- [ ] 安裝步驟、系統需求、FAQ：對照新版 README。
- [ ] 跑 `verify_live.sh`，確認 `releases/latest` 指到新 tag、而且有附件。

## Release 本身

- `gh release create <tag> <zip> --latest --verify-tag`，tag 必須已經推上去。
- 發佈後從 GitHub 下載那一份 ZIP 實際安裝一次，確認版本號。
- 範例資料若另外打包成附件，也在 Release 頁說明它的來源與授權。
