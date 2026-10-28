# 階段 0：實測環境勘查報告

> 文件編號：`docs/00_env_report.md`  
> 建立日期：2026-09-07  
> 狀態：已完成 (驗證通過)

---

## 一、硬體與作業系統查證結果

| 項目 | 實測數值 | 影響評估與決策 |
|---|---|---|
| **OS** | Ubuntu 22.04.5 LTS (jammy)，headless | 標準 Linux 環境，支援 Docker 與 systemd |
| **CPU** | Intel Core i5-9600K，**6 核心、無超執行緒 (6C6T)** | CPU 執行緒有限，多工背景處理需注意 CPU 飽和；ONNX 運算需綁定合適執行緒數 |
| **RAM** | 46Gi 總量，42Gi 可用 | 記憶體非常充裕，適合配置足夠的快取與向量檢索 RAM |
| **GPU** | NVIDIA GeForce RTX 4070 Ti SUPER (16376 MiB) | 驅動 595.84 / CUDA 13.2。VRAM 16GB，足夠執行 1024 維 embedding 與中小型 VLM |
| **磁碟** | NVMe 938G，**611G 可用** | 磁碟空間充足，圖片庫存於本機 `data/images/`，暫不需要 NAS 即時掛載 |
| **系統 Python** | **3.14.4 (Homebrew)** | **禁止**對系統 Python 安裝套件（無 wheel、破壞相容性）；必須用 `uv venv --python 3.12` |
| **NAS 掛載** | **未掛載** (fstab 無 NFS/CIFS 項目) | 第一階段圖片存於本機 NVMe，NAS 僅規劃作為非同步排程備份目的地 |

---

## 二、既有服務與已佔用 Port 清單

以下為實測既有監聽服務，本專案一律避開：

| Port | 服務名稱 | 備註 |
|---|---|---|
| **22** | OpenSSH | 遠端管理維護 |
| **139 / 445** | Samba | 檔案共享 |
| **443 / 55971 / 47594** | Tailscale | 安全跨網段虛擬專網 |
| **631** | CUPS | 列印服務 |
| **3000** | **open-webui** | 使用 host network，`docker ps` 看不到，不可佔用！ |
| **3389 / 3350** | xrdp | 遠端桌面 |
| **4040** | ngrok | 隧道服務 |
| **5678** | n8n | 自動化工作流引擎 |
| **8000** | embed-service | Discord 附件審查用 pipeline，不可複用 |
| **8188** | ComfyUI | PID 1309，背景常態佔用約 358MiB VRAM |
| **8888** | searxng | 隱私搜尋引擎 |
| **11434** | Ollama | 地端 LLM / VLM / Embedding 核心推論引擎 |

---

## 三、本專案選定 Port 與 Network 隔離

- **PostgreSQL (Docker)**: `5432` (獨立 network `namecard_net`，不碰既有 `n8n_ngrok_n8n_bridge`)
- **FastAPI 後端 API**: `8090`
- **前端 Web/PWA**: 經由內部反向代理或獨立靜態託管

---

## 四、Ollama 現有模型清查

1. **`bge-m3:latest` (1.2GB)**：
   - 支援 1024 維度 dense 向量，多語言能力極強（尤其是繁體中文名片與組織名），已定為**本專案唯一指定 embedding 模型**。
2. **`qwen3-embedding:latest` (4.7GB)**：
   - 體積大且佔用過多 VRAM，不予採用。
3. **`glm-ocr:latest` (2.2GB)**：
   - Bake-off 候選模型之一，具備端到端 OCR + 欄位辨識能力。
