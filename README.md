# 1028 - 企業級離線名片辨識與實體解析系統 (OmniCard AI)

> 專為高機密需求、地端部署設計的 B2B 名片數位化、全文本雙核心檢索與多維度實體消歧系統。

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)

---

## 🌟 核心特色 (Core Features)

1. **🔒 100% 離線隱私優先架構 (Air-Gapped & Offline Ready)**
   - 支援 IndexedDB 本地沙盒儲存，名片資料、OCR 辨識與聯絡人關係完全不離開用戶設備/企業內網。
   - 預設提供台灣在地常見職稱、分公司與統編 (8碼驗證演算法) 離線解析。

2. **🔍 雙核心混合搜尋引擎 (BM25 + Dense Semantic Hybrid Search via RRF)**
   - 採用 **Reciprocal Rank Fusion (RRF)** 融合倒排索引關鍵字評分與語意相似度。
   - 支援打字容錯、三元語彙 (Trigram) 模糊匹配與階層篩選。

3. **🧩 跨名片實體解析與消歧 (Entity Resolution & Disambiguation)**
   - 多維度比對電話格式化 (E.164)、企業統編、職稱層級推導 (C-Level, VP, Director, Manager)。
   - 智慧偵測並標記「同名異人」或「同人升遷/轉職」，提供一鍵合併比對視窗。

4. **⚡ 即時硬體效能與驗證台 (RTX 4070 Ti SUPER 16GB VRAM 規劃)**
   - 內建在地端大語言模型 (Ollama / Qwen2.5 / DeepSeek) 與 OCR 管道時的顯存分配即時試算。
   - 內建互動式三元詞 (Trigram) 測試器與台灣統一編號除數和檢核台。

5. **💼 企業級匯出與無痛整合**
   - 支援動態產生符合 RFC 6350 標準的 **vCard 4.0** 與即時 **QR Code**，手機一掃即可存入通訊錄。
   - 支援匯出含完整 BOM 的 **Excel 相容 CSV**，杜絕繁體中文亂碼。

---

## 🛠️ 技術棧 (Tech Stack)

- **前端框架**: React 19 + TypeScript
- **樣式系統**: Tailwind CSS (Elegant Dark 主題風格)
- **圖示庫**: Lucide React
- **建置工具**: Vite
- **持久化**: LocalStorage & IndexedDB 本地儲存相容

---

## 🚀 快速上手 (Quick Start)

### 1. 取得專案原始碼

```bash
git clone https://github.com/<您的GitHub帳號>/1028.git
cd 1028
```

### 2. 安裝依賴項

```bash
npm install
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

啟動後於瀏覽器開啟 `http://localhost:3000` 即可體驗所有功能！

### 4. 建置生產環境版本

```bash
npm run build
```

建置完成之靜態檔案將輸出至 `dist/` 資料夾，可直接佈署於任何 Web 伺服器 (Nginx, Caddy, Vercel, GitHub Pages 等)。

---

## 📂 專案架構 (Project Structure)

```
.
├── src/
│   ├── components/       # UI 元件 (搜尋引擎、實體消歧、掃描辨識、測試台等)
│   ├── data/             # 示範企業名片與統編資料庫
│   ├── types/            # 完整 TypeScript 型別定義
│   ├── utils/            # 實體解析演算法、統編驗證、BM25 & 雙核心搜尋
│   ├── App.tsx           # 主應用程式佈局與導覽
│   ├── main.tsx          # 應用程式進入點
│   └── index.css         # 全域 Tailwind CSS 樣式
├── index.html            # HTML 模板與 Metadata 設定
├── metadata.json         # AI Studio Applet 資訊
├── package.json          # 專案依賴與腳本
├── tsconfig.json         # TypeScript 設定
└── vite.config.ts        # Vite 設定檔
```

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權。
