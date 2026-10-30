# OmniCard 內網正式版（開發驗證中）

公開 DEMO 與內網正式版使用獨立入口：`index.html` 與 `onprem.html`。
正式版從空資料庫開始，不會載入 DEMO 名片。此分支尚未部署至公司伺服器。

## 功能與資料流

- FastAPI + PostgreSQL 16、pgvector、pg_trgm；團隊共用名片庫、個別帳號。
- HttpOnly session；管理員新增／停用帳號，成員可管理共用聯絡人。
- 圖片經格式驗證、旋轉校正、縮圖及 PNG 正規化後，以 SHA-256 去重保存。
- DB 背景工作執行 Ollama `glm-ocr:latest`，輸出原始文字供人工填寫／核對。
  **目前沒有自動結構化欄位擷取**。人工確認才建立聯絡人。
- `bge-m3:latest` 產生 1024 維向量；模型 digest、資料 revision 不符的向量不參與搜尋。
- 文字／正規化手機匹配、PostgreSQL 模糊匹配、向量搜尋以 RRF 融合排名。
  模型或索引不可用時明確顯示降級；RRF 分數不是準確率。
- 修訂號避免多人編輯覆寫；重複候選須人工合併。
- JSON 匯入為管理員操作，每批最多 1000 筆，衝突整批取消；JSON 匯出不包含圖片、帳號。
- QR 在瀏覽器本機產生；正式版不使用外部字型、圖片、分析或推論 API。

## 本機開發與測試

需求：Node.js 22、uv、Python 3.12。SQLite 僅供測試，不具正式語意搜尋能力。

```sh
npm ci
uv sync --project backend --python 3.12 --frozen
npm run lint
npm test
# DEMO smoke tests expect the GitHub Pages base path:
BASE_PATH=/1028/ npm run build
npm run build:onprem
uv run --project backend ruff check backend
uv run --directory backend pytest -q
npx playwright install chromium
npm run test:smoke
npm run test:onprem
```

Windows 若預設暫存目錄權限不足，pytest 指定可寫的 `--basetemp`；
瀏覽器測試設定 `OMNICARD_TEST_TEMP`。正式版 E2E 使用 18091／18092，啟動一次性 SQLite
與測試帳號，結束後移除資料。E2E 不啟動模型工作者，AI 單元測試使用替身。

PostgreSQL CI 使用專用 `omnicard_test` 資料庫，實際執行 Alembic 遷移與向量 SQL。
`TEST_DATABASE_URL` 必須指向可丟棄、名稱以 `_test` 結尾的資料庫；測試會重建資料表。

## 部署前必須完成的實測

1. 在隔離 PostgreSQL／容器環境通過 CI、映像建置及備份還原演練。
2. 使用獲准的名片樣本，檢查實際 OCR 品質、中文語意搜尋品質、耗時與 GPU 記憶體。
3. 確認 Ollama 從容器網路可達；`host.docker.internal` 不保證只監聽 loopback 的服務可連線。
4. 確認公司 HTTPS 路由、相機權限、帳號登入與多人操作；保留既有服務的連接埠。
5. 確認所有執行期推論留在內網；安裝套件／下載模型可使用外網。

程式測試通過不代表以上實機驗收已完成。不得用測試替身結果宣稱模型品質已驗證。

## 部署檔案與操作

`deploy/compose.yml` 提供 db、migrate、api、worker、web。資料庫不發布 host port；
web 僅綁定 `127.0.0.1:8090`，需由既有內網 HTTPS 反向代理轉送。
API 的變更請求要求 Origin 精確符合 `APP_ORIGIN`，正式 cookie 使用 Secure。

部署前將 `deploy/.env.example` 複製成 `.env`，設定隨機十六進位 DB 密碼、HTTPS origin、
Ollama `/api/tags` 的完整 bge-m3 digest。模型 tag 更換時必須同步 digest 並重建索引。
不要修改或停用公司既有 Ollama 模型。此專案 advisory lock 只協調本專案的 AI 呼叫。

獲准部署後，在 `deploy` 目錄執行 Compose 建置與啟動；管理員由互動式命令建立：

```sh
docker compose exec api uv run --no-sync python -m app.cli create-admin --username admin
```

密碼由 getpass 讀取，不寫入命令列。遷移以 Alembic 版號管理，禁止破壞性 downgrade。

## 備份與復原

`bash deploy/backup.sh /absolute/new-directory` 暫停本專案 web/api/worker，
保存 PostgreSQL dump、圖片 tar、格式標記及 SHA-256 校驗碼，再恢復服務。
備份包含個資與密碼 hash，應由公司既有機制限制存取、加密與保留週期。

`restore.sh` 只適用於隔離、全新 Compose 目標；驗證校驗碼、資料庫與圖片目錄為空、
archive 路徑合法，再還原並撤銷所有舊 sessions。必須提供 `--confirm-empty-target`。
若任一步驟失敗，保留現場並重新建立全新目標重試；資料庫與圖片並非跨儲存系統原子交易。
完成後先遷移、檢查圖片與名片數量、登入與搜尋，再開放流量。

## 尚待完善的運維項目

- 還原腳本與完整容器流程尚需隔離環境演練。
- 背景工作列表／圖片頁目前顯示最新 100 筆；聯絡人具分頁。
- OCR 失敗可重試，尚未整合 qwen3-vl fallback。
- 實際模型品質、HTTPS 路由與公司伺服器資源共存仍需驗收。
