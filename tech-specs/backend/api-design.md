# API 設計原則

> **關聯文件:** [overview.md](./overview.md), [api-projects.md](./api-projects.md), [api-configurations.md](./api-configurations.md)

---

## 1. API 端點總覽

### 基礎 URL

```
http://localhost:8000/api/v1
```

### 認證方式

**本地端應用,無需認證**

---

## 2. API 端點分類

| 分類 | 端點數量 | 說明 |
|------|---------|------|
| 專案管理 (Projects) | 12 個 | 專案 CRUD、影片生成 |
| 配置管理 (Configurations) | 6 個 | 視覺配置管理 |
| 模板管理 (Templates) | 10 個 | Prompt 範本管理 |
| 系統設定 (Settings) | 5 個 | API Keys、YouTube 授權 |
| 批次處理 (Batch) | 6 個 | 批次任務管理 |
| 統計資訊 (Stats) | 3 個 | 使用統計 |

**總計:** 42 個 API 端點

---

## 3. RESTful 設計規範

### 3.1 資源命名

**規則:**
- 使用複數名詞 (e.g., `/projects`, `/configurations`)
- 使用小寫字母
- 使用連字號分隔 (e.g., `/prompt-templates`)
- 避免動詞 (除非是操作,如 `/generate`)

**範例:**
```
✅ GET /api/v1/projects
✅ GET /api/v1/prompt-templates
❌ GET /api/v1/getProjects
❌ GET /api/v1/PromptTemplates
```

---

### 3.2 HTTP 方法

| 方法 | 用途 | 範例 |
|------|------|------|
| GET | 查詢資源 | GET /projects |
| POST | 建立資源 | POST /projects |
| PUT | 更新資源 (完整更新) | PUT /projects/:id |
| PATCH | 更新資源 (部分更新) | PATCH /projects/:id |
| DELETE | 刪除資源 | DELETE /projects/:id |

---

### 3.3 端點設計範例

**資源 CRUD:**
```
GET    /api/v1/projects               # 列出所有專案
POST   /api/v1/projects               # 建立新專案
GET    /api/v1/projects/:id           # 取得單一專案
PUT    /api/v1/projects/:id           # 更新專案
DELETE /api/v1/projects/:id           # 刪除專案
```

**子資源與操作:**
```
POST   /api/v1/projects/:id/generate  # 開始生成影片
WS     /api/v1/projects/:id/progress  # WebSocket 進度更新
GET    /api/v1/projects/:id/logs      # 取得生成日誌
```

---

## 4. 請求與回應格式

### 4.1 統一回應格式

**成功回應:**
```json
{
  "data": {
    "id": "proj_123",
    "name": "專案名稱",
    ...
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**列表回應 (含分頁):**
```json
{
  "data": [
    { "id": "proj_1", "name": "專案一" },
    { "id": "proj_2", "name": "專案二" }
  ],
  "meta": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 4.2 錯誤回應格式

**統一錯誤格式:**
```json
{
  "error": {
    "code": "E-1.2",
    "message": "專案不存在",
    "details": {
      "project_id": "proj_invalid"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**欄位說明:**
- `code`: 錯誤碼 (格式: `E-[Category].[Number]`)
- `message`: 用戶友善的錯誤訊息
- `details`: 詳細資訊 (可選)
- `timestamp`: 錯誤發生時間

---

## 5. 錯誤碼系統

### 5.1 錯誤碼分類

**格式:** `E-[Category].[Number]`

| 分類 | 代碼 | 說明 | HTTP 狀態碼 |
|------|------|------|------------|
| API 錯誤 | E-1.x | 外部 API 調用失敗 | 502, 503 |
| 檔案系統錯誤 | E-2.x | 檔案讀寫錯誤 | 500 |
| 配置錯誤 | E-3.x | 配置格式或驗證錯誤 | 400 |
| 內容錯誤 | E-4.x | 輸入內容驗證錯誤 | 400 |
| 渲染錯誤 | E-5.x | FFmpeg 渲染錯誤 | 500 |
| 網路錯誤 | E-6.x | 網路連線錯誤 | 503 |
| 資源不存在 | E-7.x | 資源找不到 | 404 |
| 權限錯誤 | E-8.x | 權限不足 | 403 |

---

### 5.2 常見錯誤碼定義

**API 錯誤 (E-1.x):**
```python
ERROR_CODES = {
    "E-1.1": "Gemini API 錯誤",
    "E-1.2": "Stability AI 錯誤",
    "E-1.3": "D-ID API 錯誤",
    "E-1.4": "YouTube API 錯誤",
    "E-1.5": "API 金鑰無效",
    "E-1.6": "API 配額用盡",
}
```

**內容錯誤 (E-4.x):**
```python
ERROR_CODES = {
    "E-4.1": "文字長度不符合要求 (500-10000 字)",
    "E-4.2": "專案名稱不能為空",
    "E-4.3": "無效的檔案格式",
    "E-4.4": "檔案大小超過限制",
}
```

**資源不存在 (E-7.x):**
```python
ERROR_CODES = {
    "E-7.1": "專案不存在",
    "E-7.2": "配置不存在",
    "E-7.3": "範本不存在",
}
```

---

### 5.3 錯誤處理範例

```python
# app/api/deps.py
from fastapi import HTTPException

class APIError(Exception):
    """自訂 API 錯誤"""
    def __init__(self, code: str, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details

# 使用範例
from app.api.deps import APIError

def get_project(project_id: str):
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise APIError(
            code="E-7.1",
            message="專案不存在",
            details={"project_id": project_id}
        )

    return project

# 全局錯誤處理器
from fastapi import Request
from fastapi.responses import JSONResponse
from datetime import datetime

@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )
```

---

## 6. 查詢參數設計

### 6.1 分頁參數

**標準分頁參數:**
```
GET /api/v1/projects?limit=20&offset=0
```

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| limit | integer | 20 | 每頁筆數 (1-100) |
| offset | integer | 0 | 偏移量 |

**回應:**
```json
{
  "data": [...],
  "meta": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 6.2 篩選參數

**範例:**
```
GET /api/v1/projects?status=completed&date_from=2024-01-01&date_to=2024-01-31
```

| 參數 | 類型 | 說明 |
|------|------|------|
| status | string | 狀態篩選 (all, in_progress, completed, failed) |
| date_from | string | 開始日期 (ISO 8601) |
| date_to | string | 結束日期 (ISO 8601) |

---

### 6.3 排序參數

**範例:**
```
GET /api/v1/projects?sort_by=updated_at&sort_order=desc
```

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| sort_by | string | updated_at | 排序欄位 (created_at, updated_at, name) |
| sort_order | string | desc | 排序方向 (asc, desc) |

---

## 7. 輸入驗證

### 7.1 使用 Pydantic

**定義 Schema:**
```python
from pydantic import BaseModel, Field, validator

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=500, max_length=10000)
    prompt_template_id: str
    gemini_model: str = Field(default="gemini-1.5-flash")

    @validator('gemini_model')
    def validate_gemini_model(cls, v):
        allowed_models = ["gemini-1.5-pro", "gemini-1.5-flash"]
        if v not in allowed_models:
            raise ValueError(f"模型必須是 {allowed_models} 之一")
        return v

    @validator('content')
    def validate_content_length(cls, v):
        if len(v) < 500:
            raise ValueError("文字長度至少 500 字")
        if len(v) > 10000:
            raise ValueError("文字長度最多 10000 字")
        return v
```

**使用:**
```python
@router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate):
    # Pydantic 自動驗證輸入
    # 驗證失敗會返回 422 Unprocessable Entity
    ...
```

---

### 7.2 驗證錯誤回應

**Pydantic 自動返回:**
```json
{
  "detail": [
    {
      "loc": ["body", "content"],
      "msg": "文字長度至少 500 字",
      "type": "value_error"
    }
  ]
}
```

---

## 8. WebSocket 設計

### 8.1 進度更新 (WebSocket)

**端點:** `WS /api/v1/projects/{id}/progress`

**訊息格式 (Server → Client):**
```json
{
  "type": "progress",
  "data": {
    "stage": "script_generating",
    "progress": 15,
    "message": "腳本生成中...",
    "substages": {
      "script": "completed",
      "audio": "in_progress",
      "images": "pending"
    },
    "estimated_time_remaining": 900
  }
}
```

**進度階段:**
- `script_generating`: 腳本生成中
- `assets_generating`: 素材生成中
- `rendering`: 影片渲染中
- `uploading`: 上傳中
- `completed`: 已完成
- `failed`: 失敗

---

### 8.2 WebSocket 實作範例

```python
from fastapi import WebSocket, WebSocketDisconnect

@router.websocket("/projects/{project_id}/progress")
async def websocket_progress(websocket: WebSocket, project_id: str):
    await websocket.accept()

    try:
        while True:
            # 從 Redis 讀取最新進度
            progress_data = redis_client.get(f"progress:{project_id}")

            if progress_data:
                await websocket.send_json(json.loads(progress_data))

            await asyncio.sleep(1)  # 每秒更新一次

    except WebSocketDisconnect:
        print(f"Client disconnected from project {project_id}")
```

---

## 9. 速率限制

### 9.1 外部 API 速率限制

**避免過度使用 API 配額:**

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/projects/{id}/generate")
@limiter.limit("5/minute")  # 每分鐘最多 5 次
async def start_generate(request: Request, id: str):
    ...
```

---

## 10. CORS 設定

### 本地端應用 CORS

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 前端 URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 總結

### API 設計原則
- ✅ RESTful 風格,資源導向
- ✅ 統一的錯誤格式與錯誤碼
- ✅ Pydantic 自動驗證輸入
- ✅ WebSocket 即時進度更新
- ✅ 分頁、篩選、排序支援

### 端點統計
- **總端點數:** 42 個
- **HTTP 端點:** 39 個
- **WebSocket 端點:** 3 個

---

**下一步:** 詳見具體 API 規格
- [api-projects.md](./api-projects.md) - 專案管理 API
- [api-configurations.md](./api-configurations.md) - 配置管理 API
