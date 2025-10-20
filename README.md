# YTMaker - AI 驅動的 YouTube 影片生成工具

本地端桌面應用程式，使用 AI 自動生成 YouTube 影片。

## 技術棧

**前端：**
- Next.js 14 + React 18
- TypeScript
- Ant Design + Tailwind CSS
- Zustand (狀態管理)

**後端：**
- FastAPI + Python 3.9+
- SQLAlchemy + SQLite
- Celery + Redis
- FFmpeg

**第三方整合：**
- Google Gemini API (腳本生成)
- Stability AI (圖片生成)
- D-ID (虛擬主播)
- YouTube Data API (影片上傳)

---

## 開發環境需求

### 必要軟體
- **Node.js:** v18.x 或更高
- **Python:** 3.9 或更高
- **Docker:** 最新版本 (用於 Redis)
- **FFmpeg:** 4.4 或更高

### 安裝 FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
下載並安裝: https://ffmpeg.org/download.html

---

## 🚀 快速開始

### 一鍵啟動（推薦）

**macOS / Linux:**
```bash
./start.sh
```

**Windows:**
```batch
start.bat
```

或雙擊 `start.sh` (macOS/Linux) 或 `start.bat` (Windows) 檔案。

**就這樣！** 腳本會自動：
- ✅ 檢查並安裝所有依賴
- ✅ 啟動 Redis 和 Celery 背景服務
- ✅ 啟動後端 API (http://localhost:8000)
- ✅ 啟動前端介面 (http://localhost:3000)
- ✅ 按 Ctrl+C 自動關閉所有服務

### 手動啟動（進階用戶）

如果你想手動控制每個服務：

#### 1. Clone 專案
```bash
git clone <repository-url>
cd YTMaker
```

#### 2. 安裝 Redis (只需一次)
```bash
# macOS
brew install redis

# Linux
sudo apt-get install redis-server

# Windows - 使用 Docker
docker run -d --name ytmaker-redis -p 6379:6379 redis:alpine
```

#### 3. 啟動後端（會自動啟動 Redis 和 Celery）
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 4. 啟動前端
```bash
cd frontend
npm install
npm run dev
```

#### 5. 開啟瀏覽器
- 📱 前端介面: http://localhost:3000
- 🔧 後端 API: http://localhost:8000
- 📚 API 文件: http://localhost:8000/docs
- 📊 服務狀態: http://localhost:8000/status

---

## 開發指南

### 程式碼格式化

**前端:**
```bash
cd frontend
npm run lint
npm run format
```

**後端:**
```bash
cd backend
ruff check .
ruff format .
mypy app/
```

### 執行測試

**前端:**
```bash
cd frontend
npm test
```

**後端:**
```bash
cd backend
pytest
```

---

## 專案結構

```
YTMaker/
├── frontend/           # Next.js 前端應用
├── backend/            # FastAPI 後端應用
├── product-design/     # 產品設計文件
├── tech-specs/         # 技術規格文件
├── development/        # 開發計劃與任務
├── docker-compose.yml  # Docker Compose 配置
└── README.md
```

---

## 相關文件

- **產品設計:** [product-design/overview.md](product-design/overview.md)
- **技術框架:** [tech-specs/framework.md](tech-specs/framework.md)
- **開發指南:** [.claude/CLAUDE.md](.claude/CLAUDE.md)
- **Phase 1 計劃:** [development/phase-1/overview.md](development/phase-1/overview.md)

---

## 授權

MIT License
