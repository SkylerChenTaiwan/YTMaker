# 專案管理 API

> **關聯文件:** [api-design.md](./api-design.md), [database.md](./database.md), [service-video-generation.md](./service-video-generation.md)

---

## 1. API 端點總覽

**基礎路徑:** `/api/v1/projects`

**端點列表:**
- `GET /projects` - 列出所有專案
- `POST /projects` - 建立新專案
- `GET /projects/:id` - 取得單一專案
- `PUT /projects/:id` - 更新專案
- `DELETE /projects/:id` - 刪除專案
- `POST /projects/:id/generate` - 開始生成影片
- `WS /projects/:id/progress` - 取得生成進度 (WebSocket)
- `GET /projects/:id/logs` - 取得生成日誌
- `POST /projects/:id/cancel` - 取消生成
- `POST /projects/:id/retry` - 重試失敗的生成
- `GET /projects/:id/assets` - 取得專案素材
- `DELETE /projects/:id/assets/:asset_id` - 刪除單一素材

**總計:** 12 個端點

---

## 2. API 詳細規格

### 2.1 列出所有專案

**端點:** `GET /api/v1/projects`

**描述:** 取得所有專案列表,支援分頁、篩選、排序

**查詢參數:**

| 參數 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| limit | integer | 否 | 20 | 每頁筆數 (1-100) |
| offset | integer | 否 | 0 | 偏移量 |
| status | string | 否 | all | 狀態篩選 (all, in_progress, completed, failed) |
| date_from | string | 否 | - | 開始日期 (ISO 8601) |
| date_to | string | 否 | - | 結束日期 (ISO 8601) |
| sort_by | string | 否 | updated_at | 排序欄位 (created_at, updated_at, name) |
| sort_order | string | 否 | desc | 排序方向 (asc, desc) |

**回應範例:**

```json
{
  "data": [
    {
      "id": "proj_123456",
      "name": "科技趨勢分析",
      "status": "completed",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T11:00:00Z",
      "youtube_url": "https://youtube.com/watch?v=xxxxx",
      "progress": 100
    }
  ],
  "meta": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

**狀態碼:**
- `200 OK`: 成功
- `400 Bad Request`: 參數錯誤
- `500 Internal Server Error`: 伺服器錯誤

---

### 2.2 建立新專案

**端點:** `POST /api/v1/projects`

**描述:** 建立新的影片生成專案

**請求 Body:**

```json
{
  "name": "科技趨勢分析",
  "content": "這是文字內容...(500-10000字)",
  "config": {
    "visual_config_id": "config_123",
    "prompt_template_id": "template_default",
    "gemini_model": "gemini-1.5-flash",
    "youtube_settings": {
      "title": "2025 科技趨勢",
      "description": "深入分析 2025 年的科技趨勢...",
      "tags": ["科技", "趨勢", "AI"],
      "privacy": "public",
      "publish_type": "immediate",
      "scheduled_time": null
    }
  }
}
```

**欄位驗證:**

| 欄位 | 類型 | 必填 | 驗證規則 |
|------|------|------|---------|
| name | string | 是 | 長度 1-100 字元 |
| content | string | 是 | 長度 500-10000 字元 |
| config.visual_config_id | string | 否 | 存在的配置 ID |
| config.prompt_template_id | string | 是 | 存在的範本 ID |
| config.gemini_model | string | 是 | "gemini-1.5-pro" 或 "gemini-1.5-flash" |

**回應範例:**

```json
{
  "id": "proj_123456",
  "name": "科技趨勢分析",
  "status": "initialized",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

**狀態碼:**
- `201 Created`: 成功建立
- `400 Bad Request`: 輸入驗證失敗
- `500 Internal Server Error`: 建立失敗

---

### 2.3 取得單一專案

**端點:** `GET /api/v1/projects/{id}`

**描述:** 取得指定專案的詳細資訊

**路徑參數:**
- `id` (string, required): 專案 ID

**回應範例:**

```json
{
  "id": "proj_123456",
  "name": "科技趨勢分析",
  "status": "completed",
  "content": "原始文字內容...",
  "config": {
    "visual_config_id": "config_123",
    "prompt_template_id": "template_default",
    "gemini_model": "gemini-1.5-flash",
    "youtube_settings": {
      "title": "2025 科技趨勢",
      "description": "...",
      "tags": ["科技", "趨勢", "AI"],
      "privacy": "public"
    }
  },
  "script": {
    "id": "script_789",
    "title": "2025 科技趨勢分析",
    "segments": [...]
  },
  "assets": {
    "audio": "/projects/proj_123456/audio.mp3",
    "images": [
      "/projects/proj_123456/image_01.png",
      "/projects/proj_123456/image_02.png"
    ],
    "avatar_intro": "/projects/proj_123456/intro_avatar.mp4",
    "avatar_outro": "/projects/proj_123456/outro_avatar.mp4"
  },
  "output": {
    "video": "/projects/proj_123456/final_video.mp4",
    "thumbnail": "/projects/proj_123456/thumbnail.jpg",
    "youtube_url": "https://youtube.com/watch?v=xxxxx"
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T11:00:00Z",
  "progress": 100
}
```

**狀態碼:**
- `200 OK`: 成功
- `404 Not Found`: 專案不存在
- `500 Internal Server Error`: 伺服器錯誤

---

### 2.4 更新專案

**端點:** `PUT /api/v1/projects/{id}`

**描述:** 更新專案資訊

**請求 Body:**

```json
{
  "name": "更新後的專案名稱",
  "youtube_settings": {
    "title": "更新後的影片標題",
    "description": "更新後的描述"
  }
}
```

**回應範例:**

```json
{
  "id": "proj_123456",
  "name": "更新後的專案名稱",
  "status": "initialized",
  "updated_at": "2025-01-15T10:35:00Z"
}
```

**狀態碼:**
- `200 OK`: 成功更新
- `400 Bad Request`: 輸入驗證失敗
- `404 Not Found`: 專案不存在

---

### 2.5 刪除專案

**端點:** `DELETE /api/v1/projects/{id}`

**描述:** 刪除專案及其所有相關檔案

**回應範例:**

```json
{
  "success": true,
  "message": "專案已刪除"
}
```

**狀態碼:**
- `200 OK`: 成功刪除
- `404 Not Found`: 專案不存在
- `500 Internal Server Error`: 刪除失敗

---

### 2.6 開始生成影片

**端點:** `POST /api/v1/projects/{id}/generate`

**描述:** 啟動影片生成流程 (非同步任務)

**回應範例:**

```json
{
  "task_id": "task_abc123",
  "project_id": "proj_123456",
  "status": "queued",
  "message": "影片生成任務已啟動"
}
```

**狀態碼:**
- `202 Accepted`: 任務已啟動
- `400 Bad Request`: 專案狀態不允許生成
- `404 Not Found`: 專案不存在

---

### 2.7 取得生成進度 (WebSocket)

**端點:** `WS /api/v1/projects/{id}/progress`

**描述:** 即時接收影片生成進度更新

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
      "images": "pending",
      "avatars": "pending",
      "rendering": "pending",
      "uploading": "pending"
    },
    "estimated_time_remaining": 900
  }
}
```

**進度階段:**
- `script_generating`: 腳本生成中 (0-20%)
- `assets_generating`: 素材生成中 (20-70%)
  - 語音合成 (20-35%)
  - 圖片生成 (35-60%)
  - 虛擬主播生成 (60-70%)
- `rendering`: 影片渲染中 (70-90%)
- `uploading`: 上傳中 (90-100%)
- `completed`: 已完成 (100%)
- `failed`: 失敗

---

### 2.8 取得生成日誌

**端點:** `GET /api/v1/projects/{id}/logs`

**描述:** 取得影片生成的詳細日誌

**回應範例:**

```json
{
  "logs": [
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "level": "INFO",
      "message": "開始生成腳本..."
    },
    {
      "timestamp": "2025-01-15T10:31:30Z",
      "level": "INFO",
      "message": "腳本生成完成"
    },
    {
      "timestamp": "2025-01-15T10:32:00Z",
      "level": "INFO",
      "message": "開始生成語音..."
    }
  ]
}
```

**狀態碼:**
- `200 OK`: 成功
- `404 Not Found`: 專案不存在

---

### 2.9 取消生成

**端點:** `POST /api/v1/projects/{id}/cancel`

**描述:** 取消正在進行的影片生成

**回應範例:**

```json
{
  "success": true,
  "message": "生成任務已取消"
}
```

**狀態碼:**
- `200 OK`: 成功取消
- `400 Bad Request`: 專案狀態不允許取消
- `404 Not Found`: 專案不存在

---

### 2.10 重試失敗的生成

**端點:** `POST /api/v1/projects/{id}/retry`

**描述:** 重試失敗的影片生成

**回應範例:**

```json
{
  "task_id": "task_def456",
  "project_id": "proj_123456",
  "status": "queued",
  "message": "重試任務已啟動"
}
```

**狀態碼:**
- `202 Accepted`: 重試任務已啟動
- `400 Bad Request`: 專案狀態不是 failed
- `404 Not Found`: 專案不存在

---

### 2.11 取得專案素材

**端點:** `GET /api/v1/projects/{id}/assets`

**描述:** 取得專案的所有素材檔案

**回應範例:**

```json
{
  "assets": [
    {
      "id": "asset_001",
      "type": "audio",
      "file_path": "/projects/proj_123456/audio.mp3",
      "size": 1024000,
      "created_at": "2025-01-15T10:35:00Z"
    },
    {
      "id": "asset_002",
      "type": "image",
      "file_path": "/projects/proj_123456/image_01.png",
      "size": 512000,
      "created_at": "2025-01-15T10:40:00Z"
    }
  ]
}
```

**狀態碼:**
- `200 OK`: 成功
- `404 Not Found`: 專案不存在

---

### 2.12 刪除單一素材

**端點:** `DELETE /api/v1/projects/{id}/assets/{asset_id}`

**描述:** 刪除專案的單一素材檔案

**回應範例:**

```json
{
  "success": true,
  "message": "素材已刪除"
}
```

**狀態碼:**
- `200 OK`: 成功刪除
- `404 Not Found`: 專案或素材不存在

---

## 3. 實作範例

### 3.1 FastAPI 路由定義

```python
# app/api/v1/projects.py
from fastapi import APIRouter, Depends, HTTPException, WebSocket
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.services.project_service import ProjectService

router = APIRouter()

@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(
    limit: int = 20,
    offset: int = 0,
    status: str = "all",
    db: Session = Depends(deps.get_db)
):
    """列出所有專案"""
    service = ProjectService(db)
    projects = service.list_projects(
        limit=limit,
        offset=offset,
        status=status
    )
    return projects

@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(
    project: ProjectCreate,
    db: Session = Depends(deps.get_db)
):
    """建立新專案"""
    service = ProjectService(db)
    return service.create_project(project)

@router.get("/projects/{id}", response_model=ProjectResponse)
async def get_project(
    id: str,
    db: Session = Depends(deps.get_db)
):
    """取得單一專案"""
    service = ProjectService(db)
    project = service.get_project(id)

    if not project:
        raise HTTPException(status_code=404, detail="專案不存在")

    return project

@router.post("/projects/{id}/generate", status_code=202)
async def start_generate(
    id: str,
    db: Session = Depends(deps.get_db)
):
    """開始生成影片"""
    service = ProjectService(db)
    task_id = service.start_generation(id)

    return {
        "task_id": task_id,
        "project_id": id,
        "status": "queued",
        "message": "影片生成任務已啟動"
    }
```

---

## 總結

### 端點統計
- **總端點數:** 12 個
- **HTTP 端點:** 11 個
- **WebSocket 端點:** 1 個

### 功能覆蓋
- ✅ 專案 CRUD
- ✅ 影片生成流程控制
- ✅ 即時進度更新
- ✅ 日誌查詢
- ✅ 素材管理

---

**下一步:** 詳見 [service-video-generation.md](./service-video-generation.md)、[background-jobs.md](./background-jobs.md)
