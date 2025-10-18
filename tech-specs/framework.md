# 技術框架規範 (Technical Framework)

> **建立日期：** [日期]
> **最後更新：** [日期]
> **關聯文件：** `product-design/overview.md`

---

## 1. 技術棧選擇

### 前端技術

**框架：** [例如：React / Vue / Angular / Next.js]
- 版本：[版本號]
- 選擇理由：[為什麼選這個]

**UI 框架：** [例如：Tailwind CSS / Material-UI / Ant Design]
- 版本：[版本號]
- 選擇理由：[為什麼選這個]

**狀態管理：** [例如：Redux / Zustand / Context API]
- 版本：[版本號]
- 選擇理由：[為什麼選這個]

**其他關鍵套件：**
- [套件名稱 1]：[用途]
- [套件名稱 2]：[用途]
- [套件名稱 3]：[用途]

---

### 後端技術

**語言：** [例如：Node.js / Python / Go / Java]
- 版本：[版本號]

**框架：** [例如：Express / FastAPI / Gin / Spring Boot]
- 版本：[版本號]
- 選擇理由：[為什麼選這個]

**資料庫：** [例如：PostgreSQL / MongoDB / MySQL]
- 版本：[版本號]
- 選擇理由：[為什麼選這個]

**ORM/ODM：** [例如：Prisma / SQLAlchemy / GORM / Mongoose]
- 版本：[版本號]

**其他關鍵套件：**
- [套件名稱 1]：[用途]
- [套件名稱 2]：[用途]
- [套件名稱 3]：[用途]

---

### DevOps & 基礎設施

**版本控制：** Git
- 託管平台：[GitHub / GitLab / Bitbucket]
- 分支策略：見專案根目錄 Git 工作流程文件

**CI/CD：** [例如：GitHub Actions / GitLab CI / Jenkins]
- 自動化測試：[是/否]
- 自動化部署：[是/否]

**容器化：** [例如：Docker]
- 是否使用：[是/否]
- Orchestration：[Kubernetes / Docker Compose]

**雲端服務：** [例如：AWS / GCP / Azure / Vercel]
- 主要服務：
  - [服務 1]：[用途]
  - [服務 2]：[用途]

**監控與日誌：**
- 監控工具：[例如：Prometheus / Datadog]
- 日誌系統：[例如：ELK / Cloudwatch]
- 錯誤追蹤：[例如：Sentry / Rollbar]

---

## 2. 專案結構

### 前端專案結構
```
frontend/
├── src/
│   ├── components/       # 共用元件
│   │   ├── common/      # 通用元件 (Button, Input, etc.)
│   │   └── layout/      # 佈局元件 (Header, Footer, etc.)
│   ├── pages/           # 頁面元件
│   ├── hooks/           # 自定義 Hooks
│   ├── store/           # 狀態管理
│   ├── services/        # API 服務
│   ├── utils/           # 工具函數
│   ├── types/           # TypeScript 類型定義
│   ├── assets/          # 靜態資源
│   └── styles/          # 全域樣式
├── public/              # 公開資源
├── tests/               # 測試檔案
├── .env.example         # 環境變數範例
└── package.json
```

---

### 後端專案結構
```
backend/
├── src/
│   ├── controllers/     # 控制器 (處理請求)
│   ├── services/        # 業務邏輯
│   ├── models/          # 資料模型
│   ├── middlewares/     # 中介軟體
│   ├── routes/          # 路由定義
│   ├── utils/           # 工具函數
│   ├── config/          # 配置檔案
│   └── types/           # 類型定義
├── tests/               # 測試檔案
├── migrations/          # 資料庫遷移
├── seeds/               # 測試資料
├── .env.example         # 環境變數範例
└── package.json / requirements.txt
```

---

## 3. 開發環境設定

### 必要安裝
- **Node.js：** [版本]
- **套件管理器：** [npm / yarn / pnpm]
- **資料庫：** [名稱與版本]
- **其他工具：** [列出]

### 環境變數

**前端 (.env)**
```bash
VITE_API_URL=http://localhost:3000
VITE_API_KEY=your_api_key
# [其他變數]
```

**後端 (.env)**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your_jwt_secret
PORT=3000
NODE_ENV=development
# [其他變數]
```

### 本地開發啟動

**前端：**
```bash
cd frontend
npm install
npm run dev
```

**後端：**
```bash
cd backend
npm install
npm run dev
```

**資料庫：**
```bash
# [啟動資料庫的命令]
docker-compose up -d
```

---

## 4. 程式碼規範

### 命名規範

**檔案命名：**
- 元件檔案：PascalCase (例如：`UserProfile.tsx`)
- 工具函數：camelCase (例如：`formatDate.ts`)
- 常數檔案：UPPER_SNAKE_CASE (例如：`API_ENDPOINTS.ts`)

**變數命名：**
- 變數和函數：camelCase
- 類別和元件：PascalCase
- 常數：UPPER_SNAKE_CASE
- 私有屬性：前綴 `_` (例如：`_privateMethod`)

**資料庫命名：**
- 表格名稱：snake_case, 複數 (例如：`user_profiles`)
- 欄位名稱：snake_case (例如：`created_at`)

---

### 程式碼風格

**Linter：** [ESLint / Pylint / Golint]
- 配置檔：[`.eslintrc.js`]
- 規則：[Airbnb / Standard / Google]

**Formatter：** [Prettier / Black / gofmt]
- 配置檔：[`.prettierrc`]
- 自動格式化：保存時執行

**TypeScript (如果使用)：**
- 嚴格模式：[啟用/停用]
- 配置檔：`tsconfig.json`

---

### 註解規範

**函數註解：**
```javascript
/**
 * 計算兩個數字的總和
 * @param {number} a - 第一個數字
 * @param {number} b - 第二個數字
 * @returns {number} 兩數的總和
 */
function add(a, b) {
  return a + b;
}
```

**TODO 註解：**
```javascript
// TODO: 實作錯誤處理
// FIXME: 修復效能問題
// NOTE: 這裡需要特別注意...
```

---

## 5. 測試策略

### 測試框架

**前端測試：**
- 單元測試：[例如：Jest / Vitest]
- 元件測試：[例如：React Testing Library]
- E2E 測試：[例如：Playwright / Cypress]

**後端測試：**
- 單元測試：[例如：Jest / pytest / testing package]
- 整合測試：[例如：Supertest]
- API 測試：[例如：Postman / REST Client]

---

### 測試覆蓋率目標
- 單元測試：> 80%
- 關鍵業務邏輯：> 90%
- E2E 測試：覆蓋所有主要流程

---

### 測試檔案結構
```
tests/
├── unit/               # 單元測試
│   ├── components/
│   ├── services/
│   └── utils/
├── integration/        # 整合測試
└── e2e/               # E2E 測試
```

---

### 測試命名規範
```javascript
describe('UserService', () => {
  describe('createUser', () => {
    it('應該成功建立新用戶', () => {
      // ...
    });

    it('當 email 重複時應該拋出錯誤', () => {
      // ...
    });
  });
});
```

---

## 6. API 設計規範

### RESTful API 原則

**HTTP 方法：**
- `GET`：讀取資源
- `POST`：建立資源
- `PUT`：完整更新資源
- `PATCH`：部分更新資源
- `DELETE`：刪除資源

**URL 結構：**
```
/api/v1/{resource}
/api/v1/{resource}/{id}
/api/v1/{resource}/{id}/{sub-resource}
```

**範例：**
```
GET    /api/v1/users          # 取得用戶列表
GET    /api/v1/users/:id      # 取得單一用戶
POST   /api/v1/users          # 建立用戶
PUT    /api/v1/users/:id      # 更新用戶
DELETE /api/v1/users/:id      # 刪除用戶
```

---

### API 回應格式

**成功回應：**
```json
{
  "success": true,
  "data": {
    // 資料內容
  },
  "message": "操作成功"
}
```

**錯誤回應：**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "錯誤訊息",
    "details": []
  }
}
```

**分頁回應：**
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

### HTTP 狀態碼

- `200` OK：請求成功
- `201` Created：資源建立成功
- `204` No Content：請求成功但無內容
- `400` Bad Request：請求格式錯誤
- `401` Unauthorized：未認證
- `403` Forbidden：無權限
- `404` Not Found：資源不存在
- `422` Unprocessable Entity：驗證失敗
- `500` Internal Server Error：伺服器錯誤

---

## 7. 安全性規範

### 認證與授權
- 認證機制：[JWT / Session / OAuth]
- Token 有效期：[時間]
- Refresh Token：[是否使用]
- 權限控制：[RBAC / ABAC]

### 資料驗證
- 前端驗證：必須
- 後端驗證：必須（不信任前端輸入）
- 驗證庫：[例如：Zod / Joi / class-validator]

### 資料加密
- 傳輸加密：HTTPS (TLS 1.2+)
- 密碼加密：[bcrypt / argon2]
- 敏感資料：加密儲存

### 防護措施
- [ ] SQL Injection 防護
- [ ] XSS 防護
- [ ] CSRF Token
- [ ] Rate Limiting
- [ ] Input Sanitization
- [ ] CORS 設定

---

## 8. 效能優化策略

### 前端優化
- [ ] Code Splitting
- [ ] Lazy Loading
- [ ] Image Optimization
- [ ] Caching Strategy
- [ ] Bundle Size Optimization

### 後端優化
- [ ] Database Indexing
- [ ] Query Optimization
- [ ] Caching (Redis)
- [ ] Connection Pooling
- [ ] Load Balancing

---

## 9. 部署策略

### 環境
- **Development：** 開發環境
- **Staging：** 測試環境
- **Production：** 正式環境

### 部署流程
1. 程式碼推送到 Git
2. 自動執行測試
3. 測試通過後建立 Docker Image
4. 部署到對應環境
5. 健康檢查
6. 完成部署

### 回滾策略
- 保留最近 [X] 個版本
- 快速回滾機制
- 資料庫遷移回滾計劃

---

## 10. 文件化要求

### 必須文件
- [ ] API 文件 (Swagger / OpenAPI)
- [ ] 環境設定說明
- [ ] 部署指南
- [ ] 故障排除指南

### 程式碼文件
- [ ] 所有公開 API 有註解
- [ ] 複雜邏輯有說明
- [ ] README.md 保持更新

---

## 11. 依賴管理

### 套件更新政策
- 安全性更新：立即處理
- 主要版本更新：評估後決定
- 次要版本更新：定期更新
- 停止維護的套件：尋找替代方案

### 套件選擇原則
- [ ] 活躍維護
- [ ] 良好文件
- [ ] 社群支持
- [ ] 授權許可合適
- [ ] 效能與大小考量

---

## 12. 技術債務管理

### 識別技術債務
- 程式碼審查時標記
- 使用 TODO/FIXME 註解
- 定期技術債務會議

### 償還計劃
- 優先級評估
- 每個 Sprint 分配時間
- 重構前必須有測試

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| [日期] | 1.0 | 初始版本 | [名字] |
| | | | |
