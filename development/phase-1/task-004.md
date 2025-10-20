# Task-004: Projects API 實作

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 12 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **使用者流程:** `product-design/flows.md#Flow-1` (基本影片生成流程,步驟 1-2)
- **使用者流程:** `product-design/flows.md#Flow-6` (斷點續傳)

### 技術規格
- **API 規格:** `tech-specs/backend/api-projects.md` (12 個端點詳細規格)
- **資料庫設計:** `tech-specs/backend/database.md#projects` (Project 資料模型)
- **資料庫設計:** `tech-specs/backend/database.md#assets` (Asset 資料模型)
- **業務邏輯:** `tech-specs/backend/business-logic.md#31-腳本生成邏輯`
- **業務邏輯:** `tech-specs/backend/business-logic.md#36-錯誤處理與重試邏輯`

### 相關任務
- **前置任務:** Task-002 ✅ (資料庫 Schema), Task-003 ✅ (API 基礎架構)
- **後續任務:** Task-014 (Celery 背景任務), Task-024 (前端進度頁面)
- **並行任務:** Task-005 ~ 009 (其他 API 模塊,可並行開發)

---

## 任務目標

### 簡述
實作專案管理的完整 RESTful API,包含 CRUD 操作、生成控制(啟動/取消/暫停/恢復)、進度查詢、素材管理等 **12 個端點**,支援分頁、篩選、排序等進階功能。

### 詳細目標
1. **專案 CRUD:** 建立、讀取(列表/單一)、更新、刪除專案
2. **配置管理:** 更新視覺配置、Prompt 設定、YouTube 設定
3. **生成控制:** 開始生成、取消、暫停、恢復
4. **進度監控:** WebSocket 即時進度推送
5. **結果查詢:** 取得生成結果(YouTube URL、本地檔案)

### 成功標準
- [ ] 12 個 API 端點全部實作完成
- [ ] ProjectService 業務邏輯完整(12 個方法)
- [ ] Pydantic schemas 定義完整(7 個 schemas)
- [ ] 請求驗證正確(字數限制、狀態限制、檔案格式)
- [ ] 錯誤處理完整(404, 400, 409, 500 等)
- [ ] 單元測試覆蓋率 > 85%
- [ ] API 文件(OpenAPI/Swagger)自動生成正確

---

## API 端點清單 (12 個)

### 1. 專案 CRUD (5 個)
| 端點 | 方法 | 說明 | 優先級 |
|------|------|------|--------|
| `/api/v1/projects` | GET | 列出所有專案(分頁、篩選、排序) | P0 |
| `/api/v1/projects` | POST | 建立新專案(上傳文字內容) | P0 |
| `/api/v1/projects/:id` | GET | 取得單一專案詳細資訊 | P0 |
| `/api/v1/projects/:id` | DELETE | 刪除專案及相關檔案 | P0 |
| `/api/v1/projects/:id/configuration` | PUT | 更新視覺配置 | P0 |

### 2. 配置與設定 (2 個)
| 端點 | 方法 | 說明 | 優先級 |
|------|------|------|--------|
| `/api/v1/projects/:id/prompt-model` | PUT | 更新 Prompt 範本與 Gemini 模型 | P0 |
| `/api/v1/projects/:id/youtube-settings` | PUT | 更新 YouTube 設定 | P0 |

### 3. 生成控制 (4 個)
| 端點 | 方法 | 說明 | 優先級 |
|------|------|------|--------|
| `/api/v1/projects/:id/generate` | POST | 開始生成影片 | P0 |
| `/api/v1/projects/:id/cancel` | POST | 取消生成 | P1 |
| `/api/v1/projects/:id/pause` | POST | 暫停生成 | P1 |
| `/api/v1/projects/:id/resume` | POST | 恢復生成(斷點續傳) | P1 |

### 4. 進度與結果 (1 個)
| 端點 | 方法 | 說明 | 優先級 |
|------|------|------|--------|
| `/api/v1/projects/:id/result` | GET | 取得生成結果(YouTube URL、檔案) | P0 |

**注意:** WebSocket 端點 `WS /api/v1/projects/:id/progress` 將在 Task-016 中實作。

---

## 測試要求

### 單元測試 (10 個核心測試案例)

#### 測試 1: 成功建立新專案

**目的:** 驗證可以成功建立專案並返回正確的資料結構

**前置條件:**
- 資料庫中存在一個 Prompt 範本(id: `default-prompt-id`)

**輸入:**
```http
POST /api/v1/projects
Content-Type: application/json

{
  "name": "測試專案",
  "content": "<500-10000 字的文字內容>",
  "prompt_template_id": "default-prompt-id",
  "gemini_model": "gemini-1.5-flash"
}
```

**預期輸出:**
```json
Status: 201 Created
{
  "success": true,
  "data": {
    "id": "<UUID>",
    "name": "測試專案",
    "status": "INITIALIZED",
    "created_at": "2025-10-19T10:00:00Z",
    "updated_at": "2025-10-19T10:00:00Z"
  }
}
```

**驗證點:**
- [ ] 回傳 201 Created 狀態碼
- [ ] 資料庫中新增了 project 記錄
- [ ] 專案狀態為 `INITIALIZED`
- [ ] `id` 為有效的 UUID 格式
- [ ] `created_at` 和 `updated_at` 為當前時間
- [ ] `content` 已正確儲存
- [ ] `prompt_template_id` 關聯正確

---

#### 測試 2: 文字內容長度不符時建立失敗

**目的:** 驗證文字長度限制(500-10000 字)

**輸入:**
```http
POST /api/v1/projects
Content-Type: application/json

{
  "name": "測試專案",
  "content": "只有 100 字的內容...",
  "prompt_template_id": "default-prompt-id",
  "gemini_model": "gemini-1.5-flash"
}
```

**預期輸出:**
```json
Status: 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "文字長度必須在 500-10000 字之間",
    "details": {
      "current_length": 100,
      "required_range": "500-10000"
    }
  }
}
```

**驗證點:**
- [ ] 回傳 400 Bad Request 狀態碼
- [ ] 錯誤訊息清楚說明問題
- [ ] `details` 包含當前字數和要求範圍
- [ ] 未在資料庫中建立 project 記錄

**額外測試案例:**
- 測試 11000 字(超過上限)
- 測試 5000 字(正常範圍)

---

#### 測試 3: 列出專案(分頁與篩選)

**目的:** 驗證列表 API 的分頁、排序、篩選功能

**前置條件:**
資料庫中存在以下專案:
- Project A: status=COMPLETED, updated_at=2025-10-19T09:00:00Z
- Project B: status=INITIALIZED, updated_at=2025-10-19T10:00:00Z
- Project C: status=FAILED, updated_at=2025-10-19T11:00:00Z

**輸入:**
```http
GET /api/v1/projects?limit=2&offset=0&sort_by=updated_at&order=desc&status=all
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "<UUID of Project C>",
        "name": "Project C",
        "status": "FAILED",
        "created_at": "...",
        "updated_at": "2025-10-19T11:00:00Z",
        "youtube_url": null
      },
      {
        "id": "<UUID of Project B>",
        "name": "Project B",
        "status": "INITIALIZED",
        "created_at": "...",
        "updated_at": "2025-10-19T10:00:00Z",
        "youtube_url": null
      }
    ],
    "total": 3,
    "limit": 2,
    "offset": 0
  }
}
```

**驗證點:**
- [ ] 回傳 200 OK 狀態碼
- [ ] 依 `updated_at` 降序排列(最新的在前)
- [ ] 只回傳 2 筆資料(limit=2)
- [ ] `total` 正確為 3
- [ ] 分頁資訊正確(limit, offset)

**額外測試案例:**
- 測試 `status=completed` 篩選
- 測試 `sort_by=created_at&order=asc` 排序
- 測試 `offset=2` 取得第三筆

---

#### 測試 4: 取得單一專案

**目的:** 驗證可以取得專案的完整詳細資訊

**前置條件:**
資料庫中存在專案(id: `project-123`):
- name: "測試專案"
- status: SCRIPT_GENERATED
- configuration: {...視覺配置...}
- script: {...腳本內容...}

**輸入:**
```http
GET /api/v1/projects/project-123
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "id": "project-123",
    "name": "測試專案",
    "content": "原始文字內容...",
    "status": "SCRIPT_GENERATED",
    "configuration": {
      "subtitle": { "font_family": "Noto Sans TC", ... },
      "logo": { "file_path": "/path/to/logo.png", ... }
    },
    "prompt_template_id": "default-prompt-id",
    "gemini_model": "gemini-1.5-flash",
    "youtube_settings": null,
    "script": {
      "intro": { "text": "開場白", "duration": 10 },
      "segments": [...]
    },
    "created_at": "2025-10-19T10:00:00Z",
    "updated_at": "2025-10-19T10:05:00Z"
  }
}
```

**驗證點:**
- [ ] 回傳 200 OK 狀態碼
- [ ] 包含所有欄位(content, configuration, script)
- [ ] JSON 格式欄位正確解析
- [ ] 時間格式正確(ISO 8601)

---

#### 測試 5: 專案不存在時取得失敗

**目的:** 驗證 404 錯誤處理

**輸入:**
```http
GET /api/v1/projects/non-existent-id
```

**預期輸出:**
```json
Status: 404 Not Found
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "找不到專案 'non-existent-id'"
  }
}
```

**驗證點:**
- [ ] 回傳 404 Not Found 狀態碼
- [ ] 錯誤訊息包含專案 ID
- [ ] 錯誤碼為 `PROJECT_NOT_FOUND`

---

#### 測試 6: 更新專案的視覺配置

**目的:** 驗證可以更新 configuration 欄位

**前置條件:**
資料庫中存在專案(id: `project-123`)

**輸入:**
```http
PUT /api/v1/projects/project-123/configuration
Content-Type: application/json

{
  "subtitle": {
    "font_family": "Noto Sans TC",
    "font_size": 48,
    "font_color": "#FFFFFF",
    "position": { "x": 960, "y": 950 },
    "border_enabled": true,
    "border_color": "#000000",
    "border_width": 2,
    "shadow_enabled": true,
    "shadow_color": "#000000",
    "shadow_offset": { "x": 2, "y": 2 }
  },
  "logo": {
    "file_path": "/path/to/logo.png",
    "position": { "x": 50, "y": 50 },
    "size": 100,
    "opacity": 100
  },
  "overlays": [
    {
      "type": "text",
      "content": "標題文字",
      "position": { "x": 100, "y": 100 },
      "font_size": 36,
      "color": "#FFFFFF"
    }
  ]
}
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "message": "配置已更新"
}
```

**驗證點:**
- [ ] 回傳 200 OK 狀態碼
- [ ] 資料庫中 `configuration` 欄位已更新
- [ ] `updated_at` 時間已更新
- [ ] JSON 格式正確儲存

---

#### 測試 7: 開始生成影片

**目的:** 驗證可以觸發影片生成流程

**前置條件:**
- 資料庫中存在專案(id: `project-123`, status: `INITIALIZED`)
- 專案已設定所有必要欄位(content, configuration, prompt_template_id, gemini_model, youtube_settings)

**輸入:**
```http
POST /api/v1/projects/project-123/generate
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "task_id": "celery-task-uuid",
    "status": "SCRIPT_GENERATING",
    "estimated_time": 1500
  }
}
```

**驗證點:**
- [ ] 回傳 200 OK 狀態碼
- [ ] 專案狀態從 `INITIALIZED` 變更為 `SCRIPT_GENERATING`
- [ ] 回傳 Celery task_id
- [ ] `estimated_time` 為合理值(1500 秒 = 25 分鐘)
- [ ] (在 Task-014 後)確認 Celery 任務已排入佇列

---

#### 測試 8: 專案狀態不允許時開始生成失敗

**目的:** 驗證狀態機制,不允許重複生成

**前置條件:**
- 資料庫中存在專案(id: `project-123`, status: `SCRIPT_GENERATING`)

**輸入:**
```http
POST /api/v1/projects/project-123/generate
```

**預期輸出:**
```json
Status: 409 Conflict
{
  "success": false,
  "error": {
    "code": "INVALID_PROJECT_STATUS",
    "message": "專案目前狀態為 'SCRIPT_GENERATING',無法開始生成",
    "details": {
      "current_status": "SCRIPT_GENERATING",
      "allowed_statuses": ["INITIALIZED", "FAILED", "PAUSED"]
    }
  }
}
```

**驗證點:**
- [ ] 回傳 409 Conflict 狀態碼
- [ ] 錯誤訊息說明當前狀態和允許的狀態
- [ ] 專案狀態未改變
- [ ] 未建立新的 Celery 任務

---

#### 測試 9: 取得生成結果

**目的:** 驗證可以取得已完成專案的結果

**前置條件:**
- 資料庫中存在專案(id: `project-123`, status: `COMPLETED`)
- `youtube_video_id` = "abc123"
- 本地檔案存在: `/projects/project-123/final_video.mp4`, `/projects/project-123/thumbnail.jpg`

**輸入:**
```http
GET /api/v1/projects/project-123/result
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "youtube_url": "https://youtube.com/watch?v=abc123",
    "youtube_video_id": "abc123",
    "status": "published",
    "title": "影片標題",
    "description": "影片描述",
    "tags": ["標籤1", "標籤2"],
    "local_files": {
      "video": "/projects/project-123/final_video.mp4",
      "thumbnail": "/projects/project-123/thumbnail.jpg"
    }
  }
}
```

**驗證點:**
- [ ] 回傳 200 OK 狀態碼
- [ ] YouTube URL 格式正確
- [ ] 本地檔案路徑正確
- [ ] 包含完整的 metadata(title, description, tags)

---

#### 測試 10: 刪除專案與檔案

**目的:** 驗證刪除專案同時清理檔案

**前置條件:**
- 資料庫中存在專案(id: `project-123`)
- 本地檔案存在: `/projects/project-123/` 目錄

**輸入:**
```http
DELETE /api/v1/projects/project-123?delete_files=true
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "message": "專案已刪除"
}
```

**驗證點:**
- [ ] 回傳 200 OK 狀態碼
- [ ] 資料庫中 project 記錄已刪除
- [ ] 關聯的 assets 記錄已刪除(cascade)
- [ ] 本地檔案目錄 `/projects/project-123/` 已刪除
- [ ] 若 `delete_files=false`,檔案保留但資料庫記錄刪除

---

### 整合測試 (2 個端到端流程)

#### 整合測試 1: 完整的專案建立到生成流程

**目的:** 驗證從建立專案到開始生成的完整流程

**流程:**
1. POST /api/v1/projects → 建立專案 → 取得 project_id
2. PUT /api/v1/projects/:id/configuration → 更新視覺配置
3. PUT /api/v1/projects/:id/prompt-model → 更新 Prompt 與模型
4. PUT /api/v1/projects/:id/youtube-settings → 更新 YouTube 設定
5. GET /api/v1/projects/:id → 驗證所有配置正確
6. POST /api/v1/projects/:id/generate → 開始生成
7. 驗證專案狀態變更為 `SCRIPT_GENERATING`

**驗證點:**
- [ ] 整個流程無錯誤
- [ ] 每個步驟都成功
- [ ] 資料正確儲存且可讀取
- [ ] 狀態轉換正確

---

#### 整合測試 2: 專案列表的分頁與篩選

**目的:** 驗證列表 API 在多筆資料下的正確性

**前置條件:**
建立 25 個專案:
- 10 個 COMPLETED
- 10 個 INITIALIZED
- 5 個 FAILED

**流程:**
1. GET /api/v1/projects?limit=10&offset=0 → 取得第一頁
2. 驗證回傳 10 筆,total=25
3. GET /api/v1/projects?limit=10&offset=10 → 取得第二頁
4. 驗證回傳 10 筆,total=25
5. GET /api/v1/projects?status=completed → 取得已完成專案
6. 驗證回傳 10 筆
7. GET /api/v1/projects?sort_by=created_at&order=asc → 測試排序
8. 驗證第一筆是最早建立的

**驗證點:**
- [ ] 分頁正確
- [ ] 篩選正確
- [ ] 排序正確
- [ ] total 數量正確

---

## 實作規格

### 需要建立/修改的檔案

#### 1. API 路由: `backend/app/api/v1/projects.py`

**職責:** 定義 12 個 API 端點,處理 HTTP 請求/回應

**依賴:**
- FastAPI (APIRouter, Depends, HTTPException, status, Query, Path)
- Pydantic schemas (ProjectCreate, ProjectUpdate, ProjectResponse, etc.)
- ProjectService (業務邏輯)
- SQLAlchemy Session

**程式碼骨架:**

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectConfigurationUpdate,
    PromptModelUpdate,
    YouTubeSettingsUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectListQuery,
    GenerateResponse,
    ResultResponse,
)
from app.services.project_service import ProjectService
from app.core.database import get_db

router = APIRouter(prefix="/projects", tags=["projects"])

# ===== 1. 專案 CRUD =====

@router.get("", response_model=ProjectListResponse)
async def list_projects(
    limit: int = Query(20, ge=1, le=100, description="每頁筆數"),
    offset: int = Query(0, ge=0, description="偏移量"),
    sort_by: str = Query("updated_at", regex="^(created_at|updated_at|name)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    status: Optional[str] = Query(None, description="狀態篩選"),
    db: Session = Depends(get_db),
):
    """
    列出所有專案

    支援功能:
    - 分頁 (limit, offset)
    - 排序 (sort_by, order)
    - 篩選 (status)
    """
    service = ProjectService(db)
    query_params = ProjectListQuery(
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        order=order,
        status=status,
    )
    return await service.list_projects(query_params)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
):
    """
    建立新專案

    驗證:
    - 文字長度 500-10000 字
    - Prompt 範本存在
    - Gemini 模型有效
    """
    service = ProjectService(db)
    return await service.create_project(data)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """取得單一專案詳細資訊"""
    service = ProjectService(db)
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "PROJECT_NOT_FOUND",
                "message": f"找不到專案 '{project_id}'",
            },
        )
    return project


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID = Path(..., description="專案 ID"),
    delete_files: bool = Query(True, description="是否刪除本地檔案"),
    db: Session = Depends(get_db),
):
    """
    刪除專案及相關檔案

    - 刪除資料庫記錄 (projects, assets)
    - 可選刪除本地檔案
    """
    service = ProjectService(db)
    await service.delete_project(project_id, delete_files=delete_files)
    return {"success": True, "message": "專案已刪除"}


# ===== 2. 配置與設定 =====

@router.put("/{project_id}/configuration")
async def update_configuration(
    project_id: UUID = Path(..., description="專案 ID"),
    data: ProjectConfigurationUpdate = ...,
    db: Session = Depends(get_db),
):
    """更新專案的視覺化配置"""
    service = ProjectService(db)
    await service.update_configuration(project_id, data)
    return {"success": True, "message": "配置已更新"}


@router.put("/{project_id}/prompt-model")
async def update_prompt_model(
    project_id: UUID = Path(..., description="專案 ID"),
    data: PromptModelUpdate = ...,
    db: Session = Depends(get_db),
):
    """更新 Prompt 範本與 Gemini 模型"""
    service = ProjectService(db)
    await service.update_prompt_model(project_id, data)
    return {"success": True, "message": "Prompt 與模型設定已更新"}


@router.put("/{project_id}/youtube-settings")
async def update_youtube_settings(
    project_id: UUID = Path(..., description="專案 ID"),
    data: YouTubeSettingsUpdate = ...,
    db: Session = Depends(get_db),
):
    """更新 YouTube 上傳設定"""
    service = ProjectService(db)
    await service.update_youtube_settings(project_id, data)
    return {"success": True, "message": "YouTube 設定已更新"}


# ===== 3. 生成控制 =====

@router.post("/{project_id}/generate", response_model=GenerateResponse)
async def start_generation(
    project_id: UUID = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """
    開始生成影片

    狀態檢查:
    - 只有 INITIALIZED, FAILED, PAUSED 狀態可開始
    - 其他狀態回傳 409 Conflict
    """
    service = ProjectService(db)
    return await service.start_generation(project_id)


@router.post("/{project_id}/cancel")
async def cancel_generation(
    project_id: UUID = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """取消生成"""
    service = ProjectService(db)
    await service.cancel_generation(project_id)
    return {"success": True, "message": "已取消生成"}


@router.post("/{project_id}/pause")
async def pause_generation(
    project_id: UUID = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """暫停生成"""
    service = ProjectService(db)
    await service.pause_generation(project_id)
    return {"success": True, "message": "已暫停生成"}


@router.post("/{project_id}/resume")
async def resume_generation(
    project_id: UUID = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """恢復生成(斷點續傳)"""
    service = ProjectService(db)
    return await service.resume_generation(project_id)


# ===== 4. 結果查詢 =====

@router.get("/{project_id}/result", response_model=ResultResponse)
async def get_result(
    project_id: UUID = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """取得生成結果 (YouTube URL, 本地檔案)"""
    service = ProjectService(db)
    return await service.get_result(project_id)
```

**要點:**
- 使用 FastAPI 的依賴注入 (Depends)
- 所有端點都有 docstring (會出現在 OpenAPI 文檔)
- 使用 Path, Query 參數驗證
- 統一錯誤處理 (HTTPException)
- 回應使用 Pydantic schemas (自動驗證與序列化)

---

#### 2. 業務邏輯: `backend/app/services/project_service.py`

**職責:** 實作所有專案管理的業務邏輯

**依賴:**
- SQLAlchemy models (Project, Asset, PromptTemplate)
- SQLAlchemy Session
- Pydantic schemas
- 檔案系統操作 (os, shutil)
- (Task-014 後) Celery tasks

**程式碼骨架:**

```python
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from uuid import UUID
from typing import List, Optional
import os
import shutil
from datetime import datetime

from app.models.project import Project, ProjectStatus
from app.models.asset import Asset
from app.models.prompt_template import PromptTemplate
from app.schemas.project import (
    ProjectCreate,
    ProjectConfigurationUpdate,
    PromptModelUpdate,
    YouTubeSettingsUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectListQuery,
    GenerateResponse,
    ResultResponse,
)
from app.core.exceptions import (
    ProjectNotFoundException,
    ValidationException,
    InvalidStatusException,
)
# from app.tasks.video_generation import start_video_generation_task  # Task-014 後啟用


class ProjectService:
    """專案管理服務"""

    def __init__(self, db: Session):
        self.db = db

    async def create_project(self, data: ProjectCreate) -> ProjectResponse:
        """
        建立新專案

        驗證:
        1. 文字長度 500-10000 字
        2. Prompt 範本存在
        3. Gemini 模型有效
        """
        # 1. 驗證文字長度
        content_length = len(data.content)
        if content_length < 500 or content_length > 10000:
            raise ValidationException(
                message="文字長度必須在 500-10000 字之間",
                details={
                    "current_length": content_length,
                    "required_range": "500-10000",
                },
            )

        # 2. 驗證 Prompt 範本存在
        prompt_template = self.db.query(PromptTemplate).filter(
            PromptTemplate.id == data.prompt_template_id
        ).first()
        if not prompt_template:
            raise ValidationException(
                message=f"找不到 Prompt 範本 '{data.prompt_template_id}'"
            )

        # 3. 驗證 Gemini 模型
        valid_models = ["gemini-1.5-pro", "gemini-1.5-flash"]
        if data.gemini_model not in valid_models:
            raise ValidationException(
                message=f"無效的 Gemini 模型,有效值: {', '.join(valid_models)}"
            )

        # 4. 建立專案記錄
        project = Project(
            name=data.name,
            content=data.content,
            status=ProjectStatus.INITIALIZED,
            prompt_template_id=data.prompt_template_id,
            gemini_model=data.gemini_model,
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)

        # 5. 建立專案目錄
        project_dir = f"/projects/{project.id}"
        os.makedirs(project_dir, exist_ok=True)

        return ProjectResponse.from_orm(project)

    async def list_projects(self, query: ProjectListQuery) -> ProjectListResponse:
        """
        列出專案

        支援:
        - 分頁 (limit, offset)
        - 排序 (sort_by, order)
        - 篩選 (status)
        """
        # 基礎查詢
        db_query = self.db.query(Project)

        # 狀態篩選
        if query.status and query.status != "all":
            db_query = db_query.filter(Project.status == query.status.upper())

        # 總數
        total = db_query.count()

        # 排序
        sort_column = getattr(Project, query.sort_by)
        if query.order == "desc":
            db_query = db_query.order_by(desc(sort_column))
        else:
            db_query = db_query.order_by(asc(sort_column))

        # 分頁
        projects = db_query.limit(query.limit).offset(query.offset).all()

        return ProjectListResponse(
            success=True,
            data={
                "projects": [ProjectResponse.from_orm(p) for p in projects],
                "total": total,
                "limit": query.limit,
                "offset": query.offset,
            },
        )

    async def get_project(self, project_id: UUID) -> Optional[ProjectResponse]:
        """取得單一專案"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)
        return ProjectResponse.from_orm(project)

    async def update_configuration(
        self, project_id: UUID, data: ProjectConfigurationUpdate
    ) -> None:
        """更新視覺配置"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        project.configuration = data.dict()
        project.updated_at = datetime.utcnow()
        self.db.commit()

    async def update_prompt_model(
        self, project_id: UUID, data: PromptModelUpdate
    ) -> None:
        """更新 Prompt 與模型"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        # 驗證 Prompt 範本存在
        prompt_template = self.db.query(PromptTemplate).filter(
            PromptTemplate.id == data.prompt_template_id
        ).first()
        if not prompt_template:
            raise ValidationException(
                message=f"找不到 Prompt 範本 '{data.prompt_template_id}'"
            )

        project.prompt_template_id = data.prompt_template_id
        project.gemini_model = data.gemini_model
        project.updated_at = datetime.utcnow()
        self.db.commit()

    async def update_youtube_settings(
        self, project_id: UUID, data: YouTubeSettingsUpdate
    ) -> None:
        """更新 YouTube 設定"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        project.youtube_settings = data.dict()
        project.updated_at = datetime.utcnow()
        self.db.commit()

    async def start_generation(self, project_id: UUID) -> GenerateResponse:
        """
        開始生成影片

        狀態檢查:
        - 允許: INITIALIZED, FAILED, PAUSED
        - 不允許: 其他狀態 (SCRIPT_GENERATING, COMPLETED, etc.)
        """
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        # 檢查狀態
        allowed_statuses = [
            ProjectStatus.INITIALIZED,
            ProjectStatus.FAILED,
            ProjectStatus.PAUSED,
        ]
        if project.status not in allowed_statuses:
            raise InvalidStatusException(
                current_status=project.status,
                allowed_statuses=[s.value for s in allowed_statuses],
                message=f"專案目前狀態為 '{project.status.value}',無法開始生成",
            )

        # 更新狀態
        project.status = ProjectStatus.SCRIPT_GENERATING
        project.updated_at = datetime.utcnow()
        self.db.commit()

        # TODO (Task-014): 啟動 Celery 任務
        # task = start_video_generation_task.delay(str(project_id))
        # task_id = task.id
        task_id = "mock-task-id"  # 暫時使用 mock

        return GenerateResponse(
            success=True,
            data={
                "task_id": task_id,
                "status": project.status.value,
                "estimated_time": 1500,  # 25 分鐘
            },
        )

    async def cancel_generation(self, project_id: UUID) -> None:
        """取消生成"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        # TODO (Task-014): 取消 Celery 任務

        project.status = ProjectStatus.FAILED
        project.updated_at = datetime.utcnow()
        self.db.commit()

    async def pause_generation(self, project_id: UUID) -> None:
        """暫停生成"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        # TODO (Task-014): 暫停 Celery 任務

        project.status = ProjectStatus.PAUSED
        project.updated_at = datetime.utcnow()
        self.db.commit()

    async def resume_generation(self, project_id: UUID) -> GenerateResponse:
        """恢復生成(斷點續傳)"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        if project.status != ProjectStatus.PAUSED:
            raise InvalidStatusException(
                current_status=project.status,
                allowed_statuses=["PAUSED"],
                message="只有暫停的專案可以恢復生成",
            )

        # TODO (Task-014): 恢復 Celery 任務

        # 根據之前的狀態恢復
        # 這裡簡化處理,實際需要讀取 project_state.json
        project.status = ProjectStatus.SCRIPT_GENERATING
        project.updated_at = datetime.utcnow()
        self.db.commit()

        task_id = "mock-resume-task-id"

        return GenerateResponse(
            success=True,
            data={
                "task_id": task_id,
                "status": project.status.value,
                "estimated_time": 1000,  # 剩餘時間估計
            },
        )

    async def get_result(self, project_id: UUID) -> ResultResponse:
        """取得生成結果"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        if project.status != ProjectStatus.COMPLETED:
            raise InvalidStatusException(
                current_status=project.status,
                allowed_statuses=["COMPLETED"],
                message="只有已完成的專案可以查看結果",
            )

        # 取得檔案路徑
        project_dir = f"/projects/{project_id}"
        video_path = f"{project_dir}/final_video.mp4"
        thumbnail_path = f"{project_dir}/thumbnail.jpg"

        # 構建 YouTube URL
        youtube_url = None
        if project.youtube_video_id:
            youtube_url = f"https://youtube.com/watch?v={project.youtube_video_id}"

        return ResultResponse(
            success=True,
            data={
                "youtube_url": youtube_url,
                "youtube_video_id": project.youtube_video_id,
                "status": "published" if youtube_url else "local_only",
                "title": project.youtube_settings.get("title") if project.youtube_settings else None,
                "description": project.youtube_settings.get("description") if project.youtube_settings else None,
                "tags": project.youtube_settings.get("tags", []) if project.youtube_settings else [],
                "local_files": {
                    "video": video_path if os.path.exists(video_path) else None,
                    "thumbnail": thumbnail_path if os.path.exists(thumbnail_path) else None,
                },
            },
        )

    async def delete_project(self, project_id: UUID, delete_files: bool = True) -> None:
        """刪除專案"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        # 刪除檔案
        if delete_files:
            project_dir = f"/projects/{project_id}"
            if os.path.exists(project_dir):
                shutil.rmtree(project_dir)

        # 刪除資料庫記錄 (cascade 會自動刪除 assets)
        self.db.delete(project)
        self.db.commit()
```

**要點:**
- 所有方法都有清楚的 docstring
- 統一錯誤處理 (自訂 Exception 類別)
- 狀態機制 (只有特定狀態可執行特定操作)
- 資料驗證 (文字長度、模型名稱等)
- 檔案系統操作 (建立/刪除目錄)

---

#### 3. Pydantic Schemas: `backend/app/schemas/project.py`

**職責:** 定義請求/回應的資料結構

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


# ===== Enums =====

class ProjectStatus(str, Enum):
    INITIALIZED = "INITIALIZED"
    SCRIPT_GENERATING = "SCRIPT_GENERATING"
    SCRIPT_GENERATED = "SCRIPT_GENERATED"
    ASSETS_GENERATING = "ASSETS_GENERATING"
    ASSETS_GENERATED = "ASSETS_GENERATED"
    RENDERING = "RENDERING"
    RENDERED = "RENDERED"
    THUMBNAIL_GENERATING = "THUMBNAIL_GENERATING"
    THUMBNAIL_GENERATED = "THUMBNAIL_GENERATED"
    UPLOADING = "UPLOADING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PAUSED = "PAUSED"


# ===== Request Schemas =====

class ProjectCreate(BaseModel):
    """建立專案請求"""
    name: str = Field(..., min_length=1, max_length=200, description="專案名稱")
    content: str = Field(..., min_length=500, max_length=10000, description="文字內容")
    prompt_template_id: UUID = Field(..., description="Prompt 範本 ID")
    gemini_model: str = Field(
        "gemini-1.5-flash",
        regex="^(gemini-1.5-pro|gemini-1.5-flash)$",
        description="Gemini 模型",
    )

    @validator("content")
    def validate_content_length(cls, v):
        length = len(v)
        if length < 500 or length > 10000:
            raise ValueError(f"文字長度必須在 500-10000 字之間,當前: {length}")
        return v


class ProjectConfigurationUpdate(BaseModel):
    """更新視覺配置請求"""
    subtitle: Optional[Dict[str, Any]] = None
    logo: Optional[Dict[str, Any]] = None
    overlays: Optional[List[Dict[str, Any]]] = None
    segment_overrides: Optional[Dict[str, Any]] = None


class PromptModelUpdate(BaseModel):
    """更新 Prompt 與模型請求"""
    prompt_template_id: UUID
    gemini_model: str = Field(
        ..., regex="^(gemini-1.5-pro|gemini-1.5-flash)$"
    )


class YouTubeSettingsUpdate(BaseModel):
    """更新 YouTube 設定請求"""
    title: str = Field(..., max_length=100)
    description: str = Field(..., max_length=5000)
    tags: List[str] = Field(default_factory=list, max_items=500)
    privacy: str = Field("public", regex="^(public|unlisted|private)$")
    publish_type: str = Field("immediate", regex="^(immediate|scheduled)$")
    scheduled_time: Optional[datetime] = None
    ai_content_flag: bool = True


class ProjectListQuery(BaseModel):
    """列表查詢參數"""
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
    sort_by: str = Field("updated_at", regex="^(created_at|updated_at|name)$")
    order: str = Field("desc", regex="^(asc|desc)$")
    status: Optional[str] = None


# ===== Response Schemas =====

class ProjectResponse(BaseModel):
    """專案回應"""
    id: UUID
    name: str
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    content: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    prompt_template_id: Optional[UUID] = None
    gemini_model: Optional[str] = None
    youtube_settings: Optional[Dict[str, Any]] = None
    youtube_video_id: Optional[str] = None
    script: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True
        from_attributes = True


class ProjectListResponse(BaseModel):
    """專案列表回應"""
    success: bool = True
    data: Dict[str, Any]  # {projects: [...], total: int, limit: int, offset: int}


class GenerateResponse(BaseModel):
    """開始生成回應"""
    success: bool = True
    data: Dict[str, Any]  # {task_id: str, status: str, estimated_time: int}


class ResultResponse(BaseModel):
    """結果回應"""
    success: bool = True
    data: Dict[str, Any]  # {youtube_url, youtube_video_id, status, title, description, tags, local_files}
```

---

#### 4. 自訂異常: `backend/app/core/exceptions.py`

**職責:** 定義專案特定的錯誤類型

```python
from fastapi import HTTPException, status
from uuid import UUID


class ProjectNotFoundException(HTTPException):
    """專案不存在"""

    def __init__(self, project_id: UUID):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "PROJECT_NOT_FOUND",
                "message": f"找不到專案 '{project_id}'",
            },
        )


class ValidationException(HTTPException):
    """驗證錯誤"""

    def __init__(self, message: str, details: dict = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "VALIDATION_ERROR",
                "message": message,
                "details": details or {},
            },
        )


class InvalidStatusException(HTTPException):
    """狀態錯誤"""

    def __init__(self, current_status: str, allowed_statuses: list, message: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "INVALID_PROJECT_STATUS",
                "message": message,
                "details": {
                    "current_status": current_status,
                    "allowed_statuses": allowed_statuses,
                },
            },
        )
```

---

#### 5. 測試檔案: `backend/tests/api/test_projects.py`

**職責:** API 端點測試

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from app.main import app
from app.models.project import Project, ProjectStatus
from app.models.prompt_template import PromptTemplate

client = TestClient(app)


@pytest.fixture
def test_prompt_template(db: Session):
    """建立測試用 Prompt 範本"""
    template = PromptTemplate(
        id=uuid4(),
        name="測試範本",
        content="測試 Prompt 內容",
        is_default=True,
    )
    db.add(template)
    db.commit()
    return template


def test_create_project_success(test_prompt_template):
    """測試 1: 成功建立專案"""
    response = client.post(
        "/api/v1/projects",
        json={
            "name": "測試專案",
            "content": "a" * 500,  # 500 字
            "prompt_template_id": str(test_prompt_template.id),
            "gemini_model": "gemini-1.5-flash",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "測試專案"
    assert data["data"]["status"] == "INITIALIZED"
    assert "id" in data["data"]


def test_create_project_content_too_short(test_prompt_template):
    """測試 2: 文字太短"""
    response = client.post(
        "/api/v1/projects",
        json={
            "name": "測試專案",
            "content": "a" * 100,  # 只有 100 字
            "prompt_template_id": str(test_prompt_template.id),
            "gemini_model": "gemini-1.5-flash",
        },
    )

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert "VALIDATION_ERROR" in data["error"]["code"]


def test_list_projects(db: Session, test_prompt_template):
    """測試 3: 列出專案"""
    # 建立測試專案
    for i in range(3):
        project = Project(
            name=f"Project {i}",
            content="a" * 500,
            status=ProjectStatus.INITIALIZED,
            prompt_template_id=test_prompt_template.id,
            gemini_model="gemini-1.5-flash",
        )
        db.add(project)
    db.commit()

    response = client.get("/api/v1/projects?limit=10&offset=0")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["projects"]) == 3
    assert data["data"]["total"] == 3


# ... 其他測試 (測試 4-10)
```

---

#### 6. 測試檔案: `backend/tests/services/test_project_service.py`

**職責:** 業務邏輯測試

```python
import pytest
from sqlalchemy.orm import Session
from uuid import uuid4

from app.services.project_service import ProjectService
from app.schemas.project import ProjectCreate
from app.models.prompt_template import PromptTemplate
from app.core.exceptions import ValidationException, ProjectNotFoundException


@pytest.fixture
def service(db: Session):
    return ProjectService(db)


@pytest.fixture
def test_prompt_template(db: Session):
    template = PromptTemplate(
        id=uuid4(),
        name="測試範本",
        content="測試內容",
        is_default=True,
    )
    db.add(template)
    db.commit()
    return template


async def test_create_project_success(service, test_prompt_template):
    """測試建立專案成功"""
    data = ProjectCreate(
        name="測試專案",
        content="a" * 500,
        prompt_template_id=test_prompt_template.id,
        gemini_model="gemini-1.5-flash",
    )

    result = await service.create_project(data)

    assert result.name == "測試專案"
    assert result.status == "INITIALIZED"


async def test_create_project_invalid_length(service, test_prompt_template):
    """測試文字長度驗證"""
    data = ProjectCreate(
        name="測試專案",
        content="a" * 100,  # 太短
        prompt_template_id=test_prompt_template.id,
        gemini_model="gemini-1.5-flash",
    )

    with pytest.raises(ValidationException) as exc_info:
        await service.create_project(data)

    assert "文字長度" in str(exc_info.value.detail["message"])


# ... 其他測試
```

---

### API 端點詳細規格

請參考 `tech-specs/backend/api-projects.md` 中的完整規格,這裡列出重點:

#### 狀態碼規範
- `200 OK` - 成功 (GET, PUT)
- `201 Created` - 成功建立 (POST create)
- `400 Bad Request` - 驗證失敗
- `404 Not Found` - 資源不存在
- `409 Conflict` - 狀態衝突
- `500 Internal Server Error` - 伺服器錯誤

#### 錯誤回應格式
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

## 開發指引

### TDD 開發流程 (Step-by-Step)

#### 第 1 步: 環境準備 (15 分鐘)

1. **確認前置任務完成:**
   ```bash
   # 確認資料庫 models 存在
   ls backend/app/models/project.py
   ls backend/app/models/asset.py
   ls backend/app/models/prompt_template.py

   # 確認 API 基礎架構存在
   ls backend/app/main.py
   ls backend/app/core/database.py
   ```

2. **閱讀相關 spec:**
   - `tech-specs/backend/api-projects.md` (API 規格)
   - `tech-specs/backend/database.md` (資料模型)
   - `tech-specs/backend/business-logic.md` (業務邏輯)

3. **確認測試環境可運行:**
   ```bash
   cd backend
   pytest --version
   ```

---

#### 第 2 步: 建立檔案結構 (10 分鐘)

```bash
# 建立必要的檔案
touch backend/app/api/v1/projects.py
touch backend/app/services/project_service.py
touch backend/app/schemas/project.py
touch backend/app/core/exceptions.py
touch backend/tests/api/test_projects.py
touch backend/tests/services/test_project_service.py
```

---

#### 第 3 步: 撰寫 Pydantic Schemas (30 分鐘)

**為什麼先寫 schemas?** 因為它們定義了 API 的介面,是測試和實作的基礎。

1. 在 `backend/app/schemas/project.py` 中定義:
   - `ProjectCreate` (建立專案請求)
   - `ProjectResponse` (專案回應)
   - `ProjectListQuery` (列表查詢參數)
   - `ProjectListResponse` (列表回應)
   - 其他 update schemas

2. 加入驗證邏輯:
   - 文字長度: 500-10000 字
   - Gemini 模型: 只允許 pro 或 flash
   - 等等

3. 執行 schema 驗證測試:
   ```python
   # 快速測試 schema
   from app.schemas.project import ProjectCreate

   # 測試正常情況
   data = ProjectCreate(
       name="Test",
       content="a" * 500,
       prompt_template_id="...",
       gemini_model="gemini-1.5-flash"
   )
   # 測試異常情況
   try:
       bad_data = ProjectCreate(
           name="Test",
           content="short",  # 太短
           ...
       )
   except ValidationError:
       print("驗證成功!")
   ```

---

#### 第 4 步: 撰寫第一個測試 - 建立專案 (20 分鐘)

在 `backend/tests/api/test_projects.py`:

```python
def test_create_project_success(test_prompt_template):
    """測試 1: 成功建立專案"""
    response = client.post(
        "/api/v1/projects",
        json={
            "name": "測試專案",
            "content": "a" * 500,
            "prompt_template_id": str(test_prompt_template.id),
            "gemini_model": "gemini-1.5-flash",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "INITIALIZED"
```

**執行測試 (預期失敗):**
```bash
pytest tests/api/test_projects.py::test_create_project_success -v
```

---

#### 第 5 步: 實作 ProjectService.create_project() (45 分鐘)

1. 在 `backend/app/services/project_service.py` 實作 `create_project()` 方法
2. 實作驗證邏輯:
   - 文字長度
   - Prompt 範本存在
   - Gemini 模型有效
3. 建立 Project 記錄
4. 建立專案目錄

**執行測試 (應通過):**
```bash
pytest tests/api/test_projects.py::test_create_project_success -v
```

---

#### 第 6 步: 實作 API Router 端點 (30 分鐘)

在 `backend/app/api/v1/projects.py`:

```python
@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    service = ProjectService(db)
    return await service.create_project(data)
```

註冊 router 到 `app/main.py`:

```python
from app.api.v1 import projects

app.include_router(projects.router, prefix="/api/v1")
```

**執行測試 (應通過):**
```bash
pytest tests/api/test_projects.py::test_create_project_success -v
```

---

#### 第 7 步: 撰寫錯誤處理測試 (20 分鐘)

```python
def test_create_project_content_too_short(test_prompt_template):
    """測試 2: 文字太短"""
    response = client.post(
        "/api/v1/projects",
        json={
            "name": "測試專案",
            "content": "a" * 100,
            "prompt_template_id": str(test_prompt_template.id),
            "gemini_model": "gemini-1.5-flash",
        },
    )

    assert response.status_code == 400
    assert "VALIDATION_ERROR" in response.json()["error"]["code"]
```

---

#### 第 8 步: 實作錯誤處理 (30 分鐘)

1. 在 `backend/app/core/exceptions.py` 定義自訂異常
2. 在 `ProjectService` 中拋出異常
3. 確保 FastAPI 正確處理異常

**執行測試:**
```bash
pytest tests/api/test_projects.py::test_create_project_content_too_short -v
```

---

#### 第 9-20 步: 實作其他端點 (6-8 小時)

重複以下流程,每個端點:

1. **撰寫測試** (15-20 分鐘)
   - 正常情況
   - 錯誤情況

2. **實作 Service 方法** (30-45 分鐘)
   - 業務邏輯
   - 驗證
   - 錯誤處理

3. **實作 Router 端點** (15 分鐘)

4. **執行測試** → 確保通過

**建議順序:**
1. ✅ POST /projects (建立) - 已完成
2. ✅ GET /projects (列表)
3. ✅ GET /projects/:id (單一)
4. ✅ PUT /projects/:id/configuration (更新配置)
5. ✅ PUT /projects/:id/prompt-model
6. ✅ PUT /projects/:id/youtube-settings
7. ✅ POST /projects/:id/generate (開始生成)
8. ✅ GET /projects/:id/result
9. ✅ DELETE /projects/:id
10. ✅ POST /projects/:id/cancel
11. ✅ POST /projects/:id/pause
12. ✅ POST /projects/:id/resume

---

#### 第 21 步: 整合測試 (1 小時)

撰寫端到端測試:

```python
async def test_full_project_flow():
    """整合測試 1: 完整流程"""
    # 1. 建立專案
    response = client.post("/api/v1/projects", json={...})
    project_id = response.json()["data"]["id"]

    # 2. 更新配置
    client.put(f"/api/v1/projects/{project_id}/configuration", json={...})

    # 3. 更新 Prompt
    client.put(f"/api/v1/projects/{project_id}/prompt-model", json={...})

    # 4. 更新 YouTube
    client.put(f"/api/v1/projects/{project_id}/youtube-settings", json={...})

    # 5. 驗證
    response = client.get(f"/api/v1/projects/{project_id}")
    assert response.json()["data"]["configuration"] is not None

    # 6. 開始生成
    response = client.post(f"/api/v1/projects/{project_id}/generate")
    assert response.status_code == 200
```

---

#### 第 22 步: 重構與優化 (30 分鐘)

1. **檢查程式碼重複:**
   - 提取共用的驗證邏輯
   - 提取共用的錯誤處理

2. **改善錯誤訊息:**
   - 確保所有錯誤訊息清楚易懂
   - 包含足夠的 details

3. **再次執行所有測試:**
   ```bash
   pytest tests/api/test_projects.py -v
   pytest tests/services/test_project_service.py -v
   ```

---

#### 第 23 步: 文件與檢查 (30 分鐘)

1. **檢查 OpenAPI 文檔:**
   ```bash
   # 啟動開發伺服器
   uvicorn app.main:app --reload

   # 訪問 http://localhost:8000/docs
   # 確認所有端點都正確顯示
   ```

2. **檢查測試覆蓋率:**
   ```bash
   pytest --cov=app.api.v1.projects --cov=app.services.project_service --cov-report=html
   # 目標: > 85%
   ```

3. **執行 linter:**
   ```bash
   ruff check backend/app/api/v1/projects.py
   ruff check backend/app/services/project_service.py
   ruff format backend/
   ```

---

### 注意事項

#### 安全性
- ⚠️ **檔案路徑驗證:** 刪除專案時確保不會刪除非專案目錄
- ⚠️ **UUID 驗證:** 確保 project_id 是有效的 UUID
- ⚠️ **SQL Injection:** 使用 SQLAlchemy ORM,避免拼接 SQL

#### 效能
- 💡 **分頁查詢:** 使用 limit/offset,避免一次載入所有專案
- 💡 **索引:** 確保 status, created_at, updated_at 欄位有索引
- 💡 **N+1 查詢:** 使用 `joinedload` 預載入關聯資料(如需要)

#### 測試
- ✅ 使用 pytest fixtures 建立測試資料
- ✅ 每個測試前清空測試資料庫
- ✅ 測試應該可以獨立執行(不依賴順序)

#### 與其他模組整合
- 🔗 **Task-014 (Celery):** `start_generation()` 會呼叫 Celery 任務
- 🔗 **Task-016 (WebSocket):** WebSocket 端點會使用 Project 狀態
- 🔗 **Task-024 (前端進度頁面):** 前端會呼叫這些 API

---

## 完成檢查清單

### 功能完整性
- [ ] 12 個 API 端點全部實作完成
- [ ] ProjectService 12 個方法全部實作
- [ ] 所有 Pydantic schemas 定義完成 (7 個)
- [ ] 自訂異常類別定義完成 (3 個)

### CRUD 操作
- [ ] POST /api/v1/projects - 建立專案
- [ ] GET /api/v1/projects - 列出專案(分頁、篩選、排序)
- [ ] GET /api/v1/projects/:id - 取得單一專案
- [ ] DELETE /api/v1/projects/:id - 刪除專案

### 配置管理
- [ ] PUT /api/v1/projects/:id/configuration - 更新視覺配置
- [ ] PUT /api/v1/projects/:id/prompt-model - 更新 Prompt 與模型
- [ ] PUT /api/v1/projects/:id/youtube-settings - 更新 YouTube 設定

### 生成控制
- [ ] POST /api/v1/projects/:id/generate - 開始生成
- [ ] POST /api/v1/projects/:id/cancel - 取消生成
- [ ] POST /api/v1/projects/:id/pause - 暫停生成
- [ ] POST /api/v1/projects/:id/resume - 恢復生成

### 結果查詢
- [ ] GET /api/v1/projects/:id/result - 取得生成結果

### 測試
- [ ] 10 個單元測試通過
- [ ] 2 個整合測試通過
- [ ] 測試覆蓋率 > 85%
- [ ] 測試可獨立執行

### 驗證
- [ ] 文字長度驗證 (500-10000 字)
- [ ] Prompt 範本存在驗證
- [ ] Gemini 模型驗證
- [ ] 專案狀態驗證 (狀態機)
- [ ] UUID 格式驗證

### 錯誤處理（參考 `error-codes.md`）
- [ ] 404 Not Found (專案不存在)
- [ ] 400 Bad Request (驗證失敗)
- [ ] 409 Conflict (狀態衝突)
- [ ] 500 Internal Server Error (伺服器錯誤)
- [ ] 所有錯誤回應包含完整錯誤資訊：
  - `error.code`：錯誤碼（如 `VALIDATION_ERROR`）
  - `error.message`：人類可讀的錯誤訊息
  - `error.is_retryable`：是否可重試
  - `error.details`：額外錯誤詳情
  - `error.trace_id`：追蹤 ID（從 context variable 取得）
  - `error.timestamp`：錯誤發生時間（ISO 8601 格式）
- [ ] 所有錯誤都記錄結構化日誌（使用 `StructuredLogger`）
- [ ] Project 失敗時更新 `error_info` 欄位

### 程式碼品質
- [ ] Ruff check 無錯誤: `ruff check backend/`
- [ ] 程式碼已格式化: `ruff format backend/`
- [ ] 所有函數有 docstring
- [ ] 所有端點有 OpenAPI 註解

### 文件
- [ ] OpenAPI 文檔自動生成正確 (http://localhost:8000/docs)
- [ ] 所有端點都有描述
- [ ] 所有參數都有說明
- [ ] 回應範例正確

### 整合
- [ ] 在本地環境手動測試所有端點
- [ ] 使用 Postman/curl 測試 API
- [ ] 檢查資料庫記錄正確建立/更新/刪除
- [ ] 檢查檔案系統操作正確(建立/刪除目錄)

### Spec 同步
- [ ] 如果實作與 spec 有差異,已更新 `tech-specs/backend/api-projects.md`
- [ ] 如果有新的依賴套件,已更新 `requirements.txt`

---

## 預估時間分配

| 步驟 | 內容 | 時間 |
|------|------|------|
| 1 | 環境準備與閱讀 spec | 15 分鐘 |
| 2 | 建立檔案結構 | 10 分鐘 |
| 3 | 撰寫 Pydantic Schemas | 30 分鐘 |
| 4-8 | 實作第一個端點 (建立專案) | 2 小時 |
| 9-20 | 實作其他 11 個端點 | 7 小時 |
| 21 | 整合測試 | 1 小時 |
| 22 | 重構與優化 | 30 分鐘 |
| 23 | 文件與檢查 | 30 分鐘 |

**總計: 約 11.5 小時** (預留 0.5 小時 buffer = 12 小時)

---

## 參考資源

### FastAPI 官方文檔
- [Path Parameters and Numeric Validations](https://fastapi.tiangolo.com/tutorial/path-params-numeric-validations/)
- [Query Parameters and String Validations](https://fastapi.tiangolo.com/tutorial/query-params-str-validations/)
- [Pydantic Models](https://fastapi.tiangolo.com/tutorial/body/)
- [Response Model](https://fastapi.tiangolo.com/tutorial/response-model/)

### SQLAlchemy 文檔
- [ORM Querying Guide](https://docs.sqlalchemy.org/en/20/orm/queryguide/)
- [Ordering](https://docs.sqlalchemy.org/en/20/tutorial/data_select.html#order-by)

### 專案內部文件
- `tech-specs/backend/api-projects.md` - Projects API 完整規格
- `tech-specs/backend/database.md` - 資料模型設計
- `tech-specs/backend/business-logic.md` - 業務邏輯說明
- `product-design/flows.md` - 使用者流程

---

**準備好了嗎?** 開始使用 TDD 方式實作這 12 個 API 端點吧! 🚀

記住:
1. ✅ **先寫測試,再寫實作**
2. ✅ **一次只專注一個端點**
3. ✅ **每個端點完成後執行測試**
4. ✅ **保持測試覆蓋率 > 85%**
