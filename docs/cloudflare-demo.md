# Cloudflare Pages：DEMO 部署

GitHub Pages 可繼續提供目前的展示網址。Cloudflare 設定須在已授權的帳號中完成；本 repo 不包含帳號憑證。

1. Workers & Pages → Create application → Pages → Import existing Git repository。
2. 選 `nicecat3402/1028`、production branch `main`、root directory 留空。
3. Build command：`npm run lint && npm test && npm run build`；output：`dist`。
4. 環境變數 `NODE_VERSION=22`、`BASE_PATH=/`（production 和 preview 都設定）。
5. 部署後用 `SMOKE_URL=https://你的專案.pages.dev/ npm run test:smoke` 驗證；Windows PowerShell 請先 `$env:SMOKE_URL='https://你的專案.pages.dev/'`。
6. 確認主要公開網址後，更新 `index.html` 的 canonical、og:url、og:image 與 README 網址。

勿沿用 GitHub Pages 的 `/1028/` base。此網站是記憶體內的示範，無需 API key、資料庫或 Worker。切換平台不會提供 OCR 或資料持久化。
