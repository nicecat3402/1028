# 1028 - OmniCard AI 名片管理互動示範

> 前端概念驗證，尚非正式產品。使用合成資料，請勿輸入真實個資；重新整理會還原所有變更。

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)
[![Deploy GitHub Pages](https://github.com/nicecat3402/1028/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/nicecat3402/1028/actions/workflows/deploy-pages.yml)

> 🌐 **線上體驗**: <https://nicecat3402.github.io/1028/>

---

## 🌟 核心特色 (Core Features)

1. **瀏覽器記憶體內的示範資料**
   - 尚無 IndexedDB、LocalStorage 或離線快取；編輯、模擬匯入及歸併結果不會持久保存。
   - Google Fonts 與 Unsplash 示範圖片需要網路，並非完全離線或高機密部署環境。

2. **關鍵字、Trigram 與規則式概念匹配**
   - 使用 **Reciprocal Rank Fusion (RRF)** 融合三路結果；沒有 BM25、倒排索引或實際向量模型。
   - 支援三元語彙模糊匹配與階層篩選，仍有待正式驗證的搜尋邏輯。

3. **歸併流程與模擬掃描**
   - 展示公司相似度與預先建立的歸併佇列；尚無同名異人或升遷偵測。
   - 掃描按鈕僅產生預設合成名片，沒有相機、檔案上傳或 OCR 辨識。

4. **驗證台與架構示意**
   - Trigram 測試器可互動；GPU 配額、效能與服務狀態為靜態示意，沒有連接後端。
   - 統編檢核仍使用待修正的舊規則，合成資料也含無效號碼，請勿作為正式驗證依據。

5. **CSV、vCard 與本機 QR Code**
   - 產生 **vCard 3.0** 與本機 SVG QR Code，不會將 vCard 傳到第三方 QR 服務。特殊字元與長行的完整相容性留待後續修正。
   - 支援匯出含完整 BOM 的 **Excel 相容 CSV**，杜絕繁體中文亂碼。

---

## 🛠️ 技術棧 (Tech Stack)

- **前端框架**: React 19 + TypeScript
- **樣式系統**: Tailwind CSS (Elegant Dark 主題風格)
- **圖示庫**: Lucide React
- **建置工具**: Vite
- **儲存**: React 記憶體狀態（無持久化）

---

## 🚀 快速上手 (Quick Start)

### 1. 取得專案原始碼

```bash
git clone https://github.com/nicecat3402/1028.git
cd 1028
```

### 2. 安裝依賴項

```bash
npm ci
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

> ⚠️ 佈署到 GitHub Pages 專案網站 (子路徑 `/1028/`) 時需帶上 base 路徑，建置前請設定環境變數：
> `BASE_PATH=/1028/ npm run build`

### 5. GitHub Pages 自動佈署

推送至 `main` 分支後，GitHub Actions 會自動執行 `.github/workflows/deploy-pages.yml`：
`npm ci` → 嚴格型別檢查 → 建置與回歸測試 → 上傳 `dist/` → 發佈至 GitHub Pages。

PR 與 main 另有 CI：`npm run lint`（TypeScript 檢查）、`npm test`、`npm run build`。
CI 也會用 Playwright 驗證桌面／手機六個分頁、模擬匯入後搜尋及本機 QR。
本機執行瀏覽器測試：先以 `BASE_PATH=/1028/` 建置，再執行 `npx playwright install chromium` 與 `npm run test:smoke`。
`docs/` 保留的後端架構與階段交付文件為規劃／歷史示意，不代表本 repo 已實作。

亦可於 Actions 頁面選擇 **Deploy GitHub Pages** → **Run workflow** 手動觸發。

網站網址：<https://nicecat3402.github.io/1028/>

---

## 📂 專案架構 (Project Structure)

```
.
├── src/
│   ├── components/       # UI 元件 (搜尋引擎、實體消歧、掃描辨識、測試台等)
│   ├── data/             # 示範企業名片與統編資料庫
│   ├── types.ts          # TypeScript 型別定義
│   ├── utils/            # 比對、舊制統編檢核、三路搜尋與匯出
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
