# 階段 1：系統架構與關鍵技術決策表

> 文件編號：`docs/01_decisions.md`  
> 建立日期：2026-09-07  
> 狀態：已批准執行

---

## 決策一覽表

| 項目 | 評估方案 | 選定決策 | 理由與代價 |
|---|---|---|---|
| **資料庫主鍵** | 自增整數 vs UUIDv4 | **UUIDv4 (`gen_random_uuid()`)** | **理由**：離線 PWA 端可預先產生 ID，避免合併與上傳時衝突；具防枚舉安全性。<br>**代價**：索引佔用空間略大於 BIGINT (16 bytes vs 8 bytes)。 |
| **公司刪除約束** | CASCADE vs RESTRICT | **`ON DELETE RESTRICT`** | **理由**：防止誤刪公司導致所屬名片聯絡人被連鎖刪除的災難性事故。<br>**代價**：需先手動處理/移轉聯絡人才能清理廢棄公司。 |
| **名片圖片去重** | 檔案名 vs SHA-256 | **DB 層 `UNIQUE` + SHA-256 (64 hex)** | **理由**：同一名片重複上傳直接於資料庫約束層阻斷，避免重複 OCR。<br>**代價**：上傳時需額外計算 SHA-256 哈希值。 |
| **部門樹結構** | 閉包表 vs Adjacency List + Trigger | **`parent_id` + Trigger 檢查同公司** | **理由**：名片階層僅為「部→課→組」，深度通常不超過 3 層，鄰接表直覺，Trigger 強制 `parent_id` 不得跨公司。<br>**代價**：查詢整棵樹需使用遞迴 CTE。 |
| **向量欄位維度** | 384 vs 768 vs 1024 | **`vector(1024)` (bge-m3)** | **理由**：bge-m3 為繁中地端檢索標竿模型，維度 1024 定案不再更動。<br>**代價**：HNSW 索引較消耗記憶體，已在 46GB RAM 充裕環境下評估通過。 |
| **OCR 推論引擎** | PaddleOCR vs RapidOCR (ONNX) | **RapidOCR (onnxruntime, CPU 執行)** | **理由**：系統 Python 3.14 無 Paddle wheel；RapidOCR 在 6 核 CPU 上輕量獨立、不佔用 GPU VRAM。<br>**代價**：批次處理耗用 CPU 運算。 |
| **VLM 排程策略** | 常駐記憶體 vs 短 keep_alive 批次單次載入 | **批次整批共用單次載入** | **理由**：ComfyUI 已佔 358MiB VRAM，VLM 頻繁載入/卸載會造成硬碟與 PCIe 震盪。以任務佇列整批處理完畢才釋放。<br>**代價**：需要設計背景佇列管理器 (Job Queue)。 |
| **UI 風格定位** | 亮色 vs 預設深色 | **Modern Clean SaaS，預設深色模式** | **理由**：符合工廠廠房、低光源會展、夜間商務使用，高對比度文字護眼且專業。<br>**代價**：需嚴謹控制灰階層次對比度，杜絕劣質 AI 漸層。 |
