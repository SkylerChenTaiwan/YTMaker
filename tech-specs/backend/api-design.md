# API 設計規範

> **關聯文件:** [api-system.md](./api-system.md), [api-projects.md](./api-projects.md)

## 1. API 基本資訊

**協議:** HTTP/HTTPS
**API 版本:** v1
**Base URL:** `http://localhost:8000/api/v1`
**認證方式:** 無 (本地端單用戶應用)
**資料格式:** JSON

---

## 2. 通用 API 規範

### 2.1 請求格式

```json
{
  "key": "value"
}
```

### 2.2 回應格式

#### 成功回應
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

#### 錯誤回應
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "錯誤訊息",
    "details": { ... }
  }
}
```

---

## 3. HTTP 狀態碼

| 狀態碼 | 說明 | 使用場景 |
|--------|------|----------|
| 200 | OK | 成功取得資源 |
| 201 | Created | 成功建立資源 |
| 204 | No Content | 成功刪除資源 |
| 400 | Bad Request | 請求參數錯誤 |
| 404 | Not Found | 資源不存在 |
| 409 | Conflict | 資源衝突 |
| 422 | Unprocessable Entity | 驗證錯誤 |
| 500 | Internal Server Error | 伺服器錯誤 |

---

## 4. 錯誤碼定義

| 錯誤碼 | 說明 | HTTP 狀態碼 |
|--------|------|-------------|
| `INVALID_INPUT` | 輸入參數錯誤 | 400 |
| `PROJECT_NOT_FOUND` | 專案不存在 | 404 |
| `PROJECT_NOT_COMPLETED` | 專案尚未完成 | 400 |
| `GEMINI_API_ERROR` | Gemini API 錯誤 | 500 |
| `STABILITY_AI_ERROR` | Stability AI 錯誤 | 500 |
| `DID_API_ERROR` | D-ID API 錯誤 | 500 |
| `YOUTUBE_API_ERROR` | YouTube API 錯誤 | 500 |
| `FILE_NOT_FOUND` | 檔案不存在 | 404 |
| `DISK_SPACE_INSUFFICIENT` | 磁碟空間不足 | 500 |
| `API_KEY_INVALID` | API Key 無效 | 401 |
| `QUOTA_EXCEEDED` | API 配額已用盡 | 429 |

---

## 5. RESTful 設計原則

### 5.1 資源命名

**規則:**
- 使用複數名詞 (`/projects` 而非 `/project`)
- 使用小寫和連字號 (`/prompt-templates`)
- 避免動詞 (用 HTTP 方法表達動作)

**範例:**
```
✅ GET /api/v1/projects
✅ POST /api/v1/projects
✅ GET /api/v1/projects/:id
✅ DELETE /api/v1/projects/:id

❌ GET /api/v1/getProjects
❌ POST /api/v1/createProject
```

### 5.2 HTTP 方法使用

| 方法 | 用途 | 是否冪等 | 範例 |
|------|------|---------|------|
| GET | 查詢資源 | 是 | GET /projects |
| POST | 建立資源 | 否 | POST /projects |
| PUT | 完整更新資源 | 是 | PUT /projects/:id |
| PATCH | 部分更新資源 | 否 | PATCH /projects/:id |
| DELETE | 刪除資源 | 是 | DELETE /projects/:id |

### 5.3 子資源操作

**格式:** `/父資源/:id/子資源`

**範例:**
```
POST   /api/v1/projects/:id/generate        # 開始生成影片
GET    /api/v1/projects/:id/result          # 取得結果
PUT    /api/v1/projects/:id/configuration   # 更新配置
```

---

## 6. 分頁查詢規範

### 6.1 查詢參數

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `limit` | integer | 20 | 每頁筆數 |
| `offset` | integer | 0 | 偏移量 |
| `sort_by` | string | updated_at | 排序欄位 |
| `order` | string | desc | 排序方向 (asc/desc) |

### 6.2 回應格式

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

---

## 7. 篩選查詢規範

### 7.1 查詢參數格式

**範例:**
```
GET /api/v1/projects?status=COMPLETED&sort_by=created_at&order=desc
```

### 7.2 支援的篩選欄位

| 端點 | 篩選欄位 | 範例 |
|------|---------|------|
| `/projects` | `status` | ?status=COMPLETED |
| `/batch` | `status` | ?status=RUNNING |

---

## 8. WebSocket 規範

### 8.1 端點格式

```
WS /api/v1/projects/:id/progress
```

### 8.2 訊息格式

**進度更新:**
```json
{
  "event": "progress_update",
  "data": {
    "status": "ASSETS_GENERATING",
    "progress": 45,
    "current_stage": "圖片生成中...",
    "estimated_remaining": 600
  }
}
```

**錯誤訊息:**
```json
{
  "event": "error",
  "data": {
    "error_code": "GEMINI_API_ERROR",
    "message": "Gemini API 錯誤",
    "timestamp": "2025-01-15T11:30:00Z"
  }
}
```

---

## 9. API 版本管理

### 9.1 版本策略

**URL 版本化:**
```
/api/v1/projects
/api/v2/projects
```

**原則:**
- Minor version 必須向下相容
- Major version 可破壞相容性
- 同時維護最新兩個 Major version

---

## 10. 輸入驗證規範

### 10.1 使用 Pydantic Schema

**範例:**
```python
from pydantic import BaseModel, Field, validator

class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=500, max_length=10000)

    @validator('content')
    def validate_content(cls, v):
        try:
            v.encode('utf-8')
        except UnicodeEncodeError:
            raise ValueError('文字編碼必須為 UTF-8')
        return v
```

---

## 11. 安全規範

### 11.1 輸入清理

- 驗證所有輸入參數
- 檢查檔案大小、類型
- 避免 SQL Injection (使用 ORM)
- 避免 Path Traversal

### 11.2 錯誤訊息

**不洩漏系統資訊:**
```python
# ❌ 錯誤
return {"error": "File not found: /Users/skyler/..."}

# ✅ 正確
return {"error": "檔案不存在"}
```

---

## 12. 效能優化

### 12.1 快取策略

**使用 Redis 快取:**
- API 回應 (TTL: 1 小時)
- 模板資料 (TTL: 永久，手動失效)
- 統計資料 (TTL: 5 分鐘)

### 12.2 查詢優化

- 使用索引
- 分頁查詢
- Eager Loading (避免 N+1)

---

## 總結

**設計原則:**
- ✅ RESTful 設計
- ✅ 統一的錯誤格式
- ✅ 完整的輸入驗證
- ✅ 清晰的 HTTP 狀態碼
- ✅ 支援分頁與篩選
- ✅ WebSocket 即時更新
- ✅ API 版本管理
- ✅ 安全性考量
