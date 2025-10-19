# Task-001: 專案初始化與開發環境設定

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 4 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 技術規格
- **技術框架：** `tech-specs/framework.md`
- **後端架構：** `tech-specs/backend/overview.md`
- **前端架構：** `tech-specs/frontend/overview.md`

### 相關任務
- **前置任務：** 無
- **後續任務：** Task-002 (資料庫設計), Task-003 (API 基礎架構)
- **依賴關係：** 所有後續任務都依賴此任務

---

## 任務目標

### 簡述
建立完整的前後端專案結構，安裝所有必要依賴，配置開發環境，確保本地開發環境可正常運行。

### 成功標準
- [x] 前後端目錄結構完整建立（frontend/, backend/）
- [x] 所有依賴正確安裝（package.json, requirements.txt）
- [x] Docker Compose 配置完成並可啟動 Redis
- [x] 開發環境可正常運行（`npm run dev`, `uvicorn` 啟動成功）
- [x] 程式碼品質工具配置完成（ESLint, Prettier, Ruff）
- [x] Git 忽略檔案正確設定

---

## 主要產出

### 1. 前端專案結構
```
frontend/
├── public/
├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── store/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── styles/
├── tests/
├── package.json
├── next.config.js
├── tsconfig.json
├── .eslintrc.js
└── .prettierrc
```

### 2. 後端專案結構
```
backend/
├── app/
│   ├── api/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── tasks/
│   ├── utils/
│   ├── security/
│   └── main.py
├── tests/
├── logs/
├── requirements.txt
├── pyproject.toml
└── .env.example
```

### 3. Docker Compose 配置
- Redis 服務定義
- 開發環境配置

### 4. 開發工具配置
- ESLint + Prettier（前端）
- Ruff + mypy（後端）
- Git hooks（pre-commit）

---

## 驗證檢查

### 前端驗證
```bash
cd frontend
npm install
npm run dev
# 應該成功啟動 Next.js 開發伺服器
```

### 後端驗證
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# 應該成功啟動 FastAPI 伺服器
```

### Docker 驗證
```bash
docker-compose up -d redis
# Redis 應該成功啟動並監聽 6379 埠
```

---

## 注意事項

1. **Node.js 版本：** 確保使用 v18.x 或更高
2. **Python 版本：** 確保使用 3.9 或更高
3. **FFmpeg：** 需要在系統中安裝 FFmpeg 4.4+
4. **環境變數：** 複製 `.env.example` 為 `.env` 並填入必要配置

---

## 完成檢查清單

- [ ] 前端專案結構建立完成
- [ ] 後端專案結構建立完成
- [ ] 所有依賴安裝成功
- [ ] Docker Compose 配置完成
- [ ] 前端開發伺服器可啟動
- [ ] 後端開發伺服器可啟動
- [ ] Redis 可正常啟動
- [ ] ESLint 和 Prettier 配置完成
- [ ] Ruff 和 mypy 配置完成
- [ ] Git 忽略檔案配置完成
- [ ] README.md 包含啟動指南
