# 後端技術規格 (Backend Specification)

> **建立日期：** [日期]
> **最後更新：** [日期]
> **關聯文件：** `framework.md`, `product-design/flows.md`

---

## 1. 資料庫設計

### 資料庫架構

**資料庫類型：** [PostgreSQL / MongoDB / MySQL]
**資料庫名稱：** [database_name]

---

### 資料表設計

#### 表格 1：users (用戶表)

**用途：** [描述這個表格的用途]

**欄位定義：**

| 欄位名稱 | 資料類型 | 限制 | 預設值 | 說明 |
|---------|---------|------|--------|------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | 用戶唯一識別碼 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | - | 用戶信箱 |
| password_hash | VARCHAR(255) | NOT NULL | - | 加密後的密碼 |
| username | VARCHAR(50) | UNIQUE | - | 用戶名稱 |
| role | ENUM | NOT NULL | 'user' | 用戶角色 (admin/user) |
| is_active | BOOLEAN | NOT NULL | true | 帳號是否啟用 |
| created_at | TIMESTAMP | NOT NULL | NOW() | 建立時間 |
| updated_at | TIMESTAMP | NOT NULL | NOW() | 更新時間 |

**索引：**
- PRIMARY KEY: `id`
- UNIQUE INDEX: `email`
- UNIQUE INDEX: `username`
- INDEX: `created_at`

**關聯：**
- 一對多：`users` → `posts` (一個用戶可以有多篇文章)
- 一對多：`users` → `comments` (一個用戶可以有多則評論)

---

#### 表格 2：[表格名稱]

**用途：** [描述]

**欄位定義：**

| 欄位名稱 | 資料類型 | 限制 | 預設值 | 說明 |
|---------|---------|------|--------|------|
| | | | | |

**索引：**
-

**關聯：**
-

---

### 資料表關聯圖

```
users (1) ─────< (n) posts
  │
  └─────< (n) comments

posts (1) ─────< (n) comments

categories (n) >─────< (n) posts
                (透過 post_categories 關聯表)
```

---

### 資料庫遷移策略

**遷移工具：** [Prisma Migrate / Alembic / Flyway / TypeORM]

**遷移檔案命名：**
```
YYYYMMDDHHMMSS_description.sql
例如：20240115120000_create_users_table.sql
```

**遷移流程：**
1. 建立遷移檔案
2. 在 development 環境測試
3. Code Review
4. 部署到 staging 測試
5. 部署到 production

**回滾計劃：**
- 每個遷移必須有對應的回滾 SQL
- 保留遷移記錄
- 測試回滾流程

---

## 2. API 端點設計

### API 版本
**當前版本：** v1
**Base URL：** `/api/v1`

---

### 認證相關 API

#### POST /api/v1/auth/register
**用途：** 用戶註冊

**請求：**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "username": "john_doe"
}
```

**驗證規則：**
- email: 必填, 有效的 email 格式, 唯一
- password: 必填, 至少 8 字元, 包含大小寫字母和數字
- username: 必填, 3-50 字元, 只能包含字母數字和底線

**成功回應 (201)：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john_doe",
    "token": "jwt_token"
  },
  "message": "註冊成功"
}
```

**錯誤回應：**
- 400: 驗證失敗
- 409: Email 或用戶名已存在

**業務邏輯：**
1. 驗證輸入資料
2. 檢查 email 和 username 是否已存在
3. 加密密碼 (bcrypt, salt rounds: 10)
4. 建立用戶記錄
5. 生成 JWT token
6. 回傳用戶資訊和 token

**測試要點：**
- [ ] 正常註冊流程
- [ ] Email 重複
- [ ] Username 重複
- [ ] 密碼強度不足
- [ ] Email 格式錯誤

---

#### POST /api/v1/auth/login
**用途：** 用戶登入

**請求：**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**成功回應 (200)：**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "john_doe",
      "role": "user"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**錯誤回應：**
- 401: 帳號或密碼錯誤
- 403: 帳號已停用

**業務邏輯：**
1. 驗證輸入
2. 查找用戶
3. 驗證密碼
4. 檢查帳號狀態
5. 生成 token
6. 記錄登入時間

---

### 用戶相關 API

#### GET /api/v1/users/:id
**用途：** 取得用戶資訊

**權限：** 需要認證

**路徑參數：**
- id: 用戶 UUID

**成功回應 (200)：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

**錯誤回應：**
- 401: 未認證
- 403: 無權限
- 404: 用戶不存在

---

#### PUT /api/v1/users/:id
**用途：** 更新用戶資訊

**權限：** 需要認證, 只能更新自己的資料或 admin

**請求：**
```json
{
  "username": "new_username",
  "email": "newemail@example.com"
}
```

**業務邏輯：**
1. 驗證認證
2. 檢查權限
3. 驗證輸入資料
4. 檢查 username/email 唯一性
5. 更新資料
6. 回傳更新後的資料

---

### [其他功能] API

#### GET /api/v1/[resource]
[繼續定義其他 API...]

---

## 3. 業務邏輯層

### Service 1: AuthService

**職責：** 處理認證相關的業務邏輯

**方法：**

#### `register(userData)`
**參數：**
- userData: `{ email, password, username }`

**回傳：**
- 成功: `{ user, token }`
- 失敗: 拋出錯誤

**邏輯：**
```
1. 驗證 email 格式
2. 檢查 email 唯一性
3. 驗證密碼強度
4. Hash 密碼
5. 建立用戶記錄
6. 生成 JWT token
7. 回傳結果
```

**依賴：**
- UserRepository: 資料庫操作
- JWTService: Token 生成
- PasswordService: 密碼加密

---

#### `login(email, password)`
**參數：**
- email: string
- password: string

**回傳：**
- 成功: `{ user, token, refreshToken }`
- 失敗: 拋出 UnauthorizedError

**邏輯：**
```
1. 根據 email 查找用戶
2. 驗證用戶存在
3. 驗證密碼
4. 檢查帳號狀態
5. 生成 token
6. 更新最後登入時間
7. 回傳結果
```

---

### Service 2: [Service 名稱]

**職責：** [描述]

**方法：**
[定義所有方法]

---

## 4. 資料驗證

### 驗證 Schema

**使用工具：** [Zod / Joi / class-validator]

#### UserRegistrationSchema
```typescript
{
  email: string()
    .email("無效的 email 格式")
    .min(5, "Email 至少 5 個字元")
    .max(255, "Email 不能超過 255 個字元"),

  password: string()
    .min(8, "密碼至少 8 個字元")
    .regex(/[A-Z]/, "密碼必須包含大寫字母")
    .regex(/[a-z]/, "密碼必須包含小寫字母")
    .regex(/[0-9]/, "密碼必須包含數字"),

  username: string()
    .min(3, "用戶名至少 3 個字元")
    .max(50, "用戶名不能超過 50 個字元")
    .regex(/^[a-zA-Z0-9_]+$/, "用戶名只能包含字母、數字和底線")
}
```

---

## 5. 錯誤處理

### 錯誤類型定義

#### ValidationError
- HTTP Status: 400
- 使用時機: 輸入驗證失敗
- 錯誤碼: `VALIDATION_ERROR`

#### UnauthorizedError
- HTTP Status: 401
- 使用時機: 認證失敗
- 錯誤碼: `UNAUTHORIZED`

#### ForbiddenError
- HTTP Status: 403
- 使用時機: 無權限
- 錯誤碼: `FORBIDDEN`

#### NotFoundError
- HTTP Status: 404
- 使用時機: 資源不存在
- 錯誤碼: `NOT_FOUND`

#### ConflictError
- HTTP Status: 409
- 使用時機: 資源衝突 (如重複)
- 錯誤碼: `CONFLICT`

#### InternalServerError
- HTTP Status: 500
- 使用時機: 伺服器內部錯誤
- 錯誤碼: `INTERNAL_ERROR`

---

### 全域錯誤處理器

**位置：** `middlewares/errorHandler.ts`

**處理流程：**
1. 捕捉錯誤
2. 記錄日誌
3. 判斷錯誤類型
4. 格式化錯誤回應
5. 隱藏敏感資訊 (production)
6. 回傳給客戶端

**錯誤回應格式：**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "使用者友善的錯誤訊息",
    "details": [],  // 驗證錯誤的詳細資訊
    "stack": "..."  // 只在 development 環境顯示
  }
}
```

---

## 6. 中介軟體 (Middlewares)

### authMiddleware
**用途：** 驗證 JWT token

**流程：**
1. 從 Header 取得 token
2. 驗證 token 有效性
3. 解析 user 資訊
4. 附加到 request object
5. 繼續下一個 middleware

**使用範例：**
```typescript
router.get('/protected', authMiddleware, controller)
```

---

### roleMiddleware
**用途：** 檢查用戶角色權限

**參數：** 允許的角色陣列

**流程：**
1. 從 request 取得 user
2. 檢查 user.role
3. 驗證是否在允許清單
4. 通過或拒絕

**使用範例：**
```typescript
router.delete('/users/:id', authMiddleware, roleMiddleware(['admin']), controller)
```

---

### validationMiddleware
**用途：** 驗證請求資料

**參數：** 驗證 schema

**流程：**
1. 根據 schema 驗證 request body
2. 驗證成功: 繼續
3. 驗證失敗: 回傳 400 錯誤

**使用範例：**
```typescript
router.post('/users', validationMiddleware(UserSchema), controller)
```

---

### rateLimitMiddleware
**用途：** API 請求頻率限制

**設定：**
- 時間窗口: [15] 分鐘
- 最大請求數: [100] 次
- 儲存方式: [Redis / Memory]

**超過限制回應：**
- HTTP Status: 429
- 錯誤訊息: "Too Many Requests"

---

## 7. 認證與授權

### JWT Token 設計

**Token 內容：**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "user",
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Token 有效期：**
- Access Token: 15 分鐘
- Refresh Token: 7 天

**Token 刷新機制：**
1. Access Token 過期
2. 使用 Refresh Token 請求新的 Access Token
3. 驗證 Refresh Token
4. 生成新的 Access Token
5. 回傳新 Token

---

### 權限控制

**角色定義：**
- `admin`: 管理員, 完整權限
- `user`: 一般用戶, 基本權限
- `guest`: 訪客, 唯讀權限

**權限矩陣：**

| 操作 | admin | user | guest |
|-----|-------|------|-------|
| 讀取公開內容 | ✓ | ✓ | ✓ |
| 讀取自己的資料 | ✓ | ✓ | - |
| 建立內容 | ✓ | ✓ | - |
| 更新自己的內容 | ✓ | ✓ | - |
| 刪除自己的內容 | ✓ | ✓ | - |
| 管理所有用戶 | ✓ | - | - |
| 管理系統設定 | ✓ | - | - |

---

## 8. 資料快取策略

### 快取工具
**使用：** [Redis / Memcached]

### 快取策略

#### 查詢快取
**使用場景：** 頻繁讀取、不常變動的資料

**範例：** 用戶資訊、設定檔
- Key: `user:{userId}`
- TTL: 1 小時
- 更新策略: 資料變更時清除快取

#### 計算結果快取
**使用場景：** 複雜計算結果

**範例：** 統計資料、報表
- Key: `stats:{type}:{date}`
- TTL: 5 分鐘
- 更新策略: 定時重新計算

#### Session 快取
**使用場景：** 用戶 session

**範例：** 登入狀態
- Key: `session:{sessionId}`
- TTL: 30 分鐘
- 更新策略: 滑動過期時間

---

## 9. 背景任務

### 任務佇列
**工具：** [Bull / Bee-Queue / Celery]

### 任務類型

#### 郵件發送
**觸發時機：** 用戶註冊、密碼重設
**優先級：** 高
**重試：** 3 次
**逾時：** 30 秒

#### 資料匯出
**觸發時機：** 用戶請求匯出
**優先級：** 中
**重試：** 1 次
**逾時：** 5 分鐘

#### 定期清理
**觸發時機：** Cron schedule
**優先級：** 低
**重試：** 無
**逾時：** 10 分鐘

---

## 10. 日誌與監控

### 日誌策略

**日誌等級：**
- ERROR: 錯誤事件
- WARN: 警告訊息
- INFO: 一般資訊
- DEBUG: 除錯資訊 (僅 development)

**日誌內容：**
```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "level": "INFO",
  "message": "User login successful",
  "context": {
    "userId": "uuid",
    "ip": "192.168.1.1",
    "userAgent": "..."
  }
}
```

**日誌儲存：**
- Development: Console
- Production: [CloudWatch / ELK / File]
- 保留期限: 30 天

---

### 監控指標

**效能指標：**
- API 回應時間
- 資料庫查詢時間
- 記憶體使用量
- CPU 使用率

**業務指標：**
- 每分鐘請求數 (RPM)
- 錯誤率
- 用戶活躍度
- API 端點使用統計

**警報設定：**
- 錯誤率 > 5%: 發送警報
- API 回應時間 > 2 秒: 發送警報
- 記憶體使用 > 80%: 發送警報

---

## 11. 第三方服務整合

### 服務 1: [例如：AWS S3 - 檔案儲存]

**用途：** 儲存用戶上傳的檔案

**設定：**
- Bucket: [bucket-name]
- Region: [region]
- Access: Private

**SDK：** [AWS SDK]

**操作：**
- 上傳檔案
- 取得檔案 URL
- 刪除檔案

---

### 服務 2: [例如：SendGrid - 郵件服務]

**用途：** 發送郵件通知

**設定：**
- API Key: 環境變數
- From Email: [email]

**郵件範本：**
- 註冊確認信
- 密碼重設信
- 通知信

---

## 12. 資料庫查詢優化

### 查詢原則
- [ ] 使用索引欄位查詢
- [ ] 避免 N+1 查詢問題
- [ ] 使用 SELECT 指定欄位, 不用 *
- [ ] 適當使用 JOIN
- [ ] 分頁大量資料

### 效能目標
- 簡單查詢: < 50ms
- 複雜查詢: < 200ms
- 分頁查詢: < 100ms

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| [日期] | 1.0 | 初始版本 | [名字] |
| | | | |
