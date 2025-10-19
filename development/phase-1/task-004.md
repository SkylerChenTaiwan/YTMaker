# Task-004: 專案管理 API 實作 (12 個端點)

> **建立日期：** 2025-01-19
> **狀態：** ⏳ 未開始
> **預計時間：** 12 小時
> **優先級：** P0

---

## 關聯文件

### 技術規格
- **API 規格:** `tech-specs/backend/api-projects.md` (完整文件)
- **資料庫:** `tech-specs/backend/database.md#3.1 Project`

### 相關任務
- **前置任務:** Task-001 ✅, Task-002 ✅, Task-003 ✅
- **後續任務:** Task-010 (Celery 背景任務)
- **並行任務:** Task-005 (配置管理 API) - 可並行

---

## 任務目標

### 簡述
實作所有 12 個專案管理相關的 API 端點，包含 CRUD、進度查詢、素材管理等功能。

### 成功標準
- [ ] 12 個 API 端點全部實作
- [ ] 所有端點測試通過
- [ ] API 文件完整
- [ ] 符合 `api-projects.md` 規格

---

## 實作規格

### 需要實作的 12 個端點

1. `GET /api/v1/projects` - 列出所有專案
2. `POST /api/v1/projects` - 建立新專案
3. `GET /api/v1/projects/:id` - 取得單一專案
4. `PUT /api/v1/projects/:id` - 更新專案
5. `DELETE /api/v1/projects/:id` - 刪除專案
6. `POST /api/v1/projects/:id/generate` - 開始生成影片
7. `WS /api/v1/projects/:id/progress` - 取得生成進度 (WebSocket)
8. `GET /api/v1/projects/:id/logs` - 取得生成日誌
9. `POST /api/v1/projects/:id/cancel` - 取消生成
10. `POST /api/v1/projects/:id/retry` - 重試失敗的生成
11. `GET /api/v1/projects/:id/assets` - 取得專案素材
12. `DELETE /api/v1/projects/:id/assets/:asset_id` - 刪除單一素材

---

### 檔案結構

```
backend/app/
├── api/v1/endpoints/
│   └── projects.py          # 所有端點定義
├── schemas/
│   └── project.py           # Pydantic schemas
├── services/
│   └── project_service.py   # 業務邏輯
└── models/
    └── project.py           # SQLAlchemy 模型 (Task-002 已完成)
```

---

### 1. Pydantic Schemas

**檔案：** `app/schemas/project.py`

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from app.models.project import ProjectStatus

class YouTubeSettings(BaseModel):
    """YouTube 設定"""
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., max_length=5000)
    tags: List[str] = Field(default_factory=list, max_items=15)
    privacy: str = Field(default="public", regex="^(public|private|unlisted)$")
    publish_type: str = Field(default="immediate", regex="^(immediate|scheduled)$")
    scheduled_time: Optional[datetime] = None

class ProjectCreate(BaseModel):
    """建立專案請求"""
    name: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=500, max_length=10000)
    configuration_id: Optional[str] = None
    prompt_template_id: str
    gemini_model: str = Field(default="gemini-1.5-flash")
    youtube_settings: YouTubeSettings

    @validator('content')
    def validate_content_length(cls, v):
        word_count = len(v)
        if word_count < 500:
            raise ValueError('Content must be at least 500 characters')
        if word_count > 10000:
            raise ValueError('Content must not exceed 10000 characters')
        return v

class ProjectUpdate(BaseModel):
    """更新專案請求"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    youtube_settings: Optional[YouTubeSettings] = None

class ProjectResponse(BaseModel):
    """專案回應"""
    id: str
    name: str
    status: ProjectStatus
    progress: int
    created_at: datetime
    updated_at: datetime
    youtube_url: Optional[str] = None

    class Config:
        from_attributes = True

class ProjectDetail(ProjectResponse):
    """專案詳細資訊"""
    content: str
    word_count: int
    configuration_id: Optional[str]
    prompt_template_id: str
    gemini_model: str
    youtube_settings: dict
    script: Optional[dict] = None
    assets: List[dict] = []
```

---

### 2. Service Layer

**檔案：** `app/services/project_service.py`

```python
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.project import Project, ProjectStatus
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.core.errors import NotFoundError, ValidationError
import uuid
from datetime import datetime

class ProjectService:
    """專案業務邏輯服務"""

    def __init__(self, db: Session):
        self.db = db

    def list_projects(
        self,
        limit: int = 20,
        offset: int = 0,
        status: str = "all",
        sort_by: str = "updated_at",
        sort_order: str = "desc"
    ):
        """列出專案"""
        query = self.db.query(Project)

        # 狀態篩選
        if status != "all":
            if status == "in_progress":
                query = query.filter(
                    Project.status.in_([
                        ProjectStatus.SCRIPT_GENERATING,
                        ProjectStatus.ASSETS_GENERATING,
                        ProjectStatus.RENDERING,
                        ProjectStatus.UPLOADING
                    ])
                )
            elif status in ["completed", "failed"]:
                query = query.filter(Project.status == status)

        # 排序
        order_column = getattr(Project, sort_by, Project.updated_at)
        if sort_order == "desc":
            query = query.order_by(desc(order_column))
        else:
            query = query.order_by(order_column)

        # 分頁
        total = query.count()
        projects = query.offset(offset).limit(limit).all()

        return {
            "data": projects,
            "meta": {
                "total": total,
                "limit": limit,
                "offset": offset
            }
        }

    def create_project(self, project_data: ProjectCreate) -> Project:
        """建立新專案"""
        # 計算字數
        word_count = len(project_data.content)

        # 建立專案
        project = Project(
            id=str(uuid.uuid4()),
            name=project_data.name,
            status=ProjectStatus.INITIALIZED,
            content=project_data.content,
            word_count=word_count,
            configuration_id=project_data.configuration_id,
            prompt_template_id=project_data.prompt_template_id,
            gemini_model=project_data.gemini_model,
            youtube_settings=project_data.youtube_settings.dict(),
            progress=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)

        return project

    def get_project(self, project_id: str) -> Project:
        """取得專案"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise NotFoundError("Project", project_id)
        return project

    def update_project(self, project_id: str, update_data: ProjectUpdate) -> Project:
        """更新專案"""
        project = self.get_project(project_id)

        if update_data.name:
            project.name = update_data.name
        if update_data.youtube_settings:
            project.youtube_settings = update_data.youtube_settings.dict()

        project.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(project)

        return project

    def delete_project(self, project_id: str):
        """刪除專案"""
        project = self.get_project(project_id)
        self.db.delete(project)
        self.db.commit()

    def start_generation(self, project_id: str) -> str:
        """開始生成影片"""
        project = self.get_project(project_id)

        # 檢查狀態
        if project.status not in [ProjectStatus.INITIALIZED, ProjectStatus.FAILED]:
            raise ValidationError(
                f"Cannot start generation. Project status: {project.status}"
            )

        # 更新狀態
        project.status = ProjectStatus.SCRIPT_GENERATING
        project.progress = 0
        project.updated_at = datetime.utcnow()
        self.db.commit()

        # TODO: 啟動 Celery 任務 (Task-010)
        task_id = f"task_{uuid.uuid4()}"

        return task_id
```

---

### 3. API 端點

**檔案：** `app/api/v1/endpoints/projects.py`

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.api.deps import get_db
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectDetail
)
from app.schemas.response import SuccessResponse
from app.services.project_service import ProjectService

router = APIRouter()

@router.get("/projects", response_model=SuccessResponse[list[ProjectResponse]])
async def list_projects(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: str = Query("all"),
    sort_by: str = Query("updated_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db)
):
    """列出所有專案"""
    service = ProjectService(db)
    result = service.list_projects(
        limit=limit,
        offset=offset,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return SuccessResponse(data=result["data"], meta=result["meta"])

@router.post("/projects", response_model=SuccessResponse[ProjectResponse], status_code=201)
async def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db)
):
    """建立新專案"""
    service = ProjectService(db)
    new_project = service.create_project(project)
    return SuccessResponse(data=new_project)

@router.get("/projects/{id}", response_model=SuccessResponse[ProjectDetail])
async def get_project(
    id: str,
    db: Session = Depends(get_db)
):
    """取得單一專案"""
    service = ProjectService(db)
    project = service.get_project(id)
    return SuccessResponse(data=project)

@router.put("/projects/{id}", response_model=SuccessResponse[ProjectResponse])
async def update_project(
    id: str,
    project: ProjectUpdate,
    db: Session = Depends(get_db)
):
    """更新專案"""
    service = ProjectService(db)
    updated_project = service.update_project(id, project)
    return SuccessResponse(data=updated_project)

@router.delete("/projects/{id}")
async def delete_project(
    id: str,
    db: Session = Depends(get_db)
):
    """刪除專案"""
    service = ProjectService(db)
    service.delete_project(id)
    return SuccessResponse(data={"message": "專案已刪除"})

@router.post("/projects/{id}/generate", status_code=202)
async def start_generate(
    id: str,
    db: Session = Depends(get_db)
):
    """開始生成影片"""
    service = ProjectService(db)
    task_id = service.start_generation(id)

    return SuccessResponse(data={
        "task_id": task_id,
        "project_id": id,
        "status": "queued",
        "message": "影片生成任務已啟動"
    })

# TODO: 實作剩餘 6 個端點 (WebSocket, logs, cancel, retry, assets)
# 這些端點會在後續 task 中完成或增強
```

---

### 4. 註冊路由

**檔案：** `app/api/v1/__init__.py`

```python
from fastapi import APIRouter
from app.api.v1.endpoints import projects

api_router = APIRouter()

api_router.include_router(projects.router, tags=["projects"])
```

**更新 `app/main.py`:**
```python
from app.api.v1 import api_router

app.include_router(api_router, prefix="/api/v1")
```

---

## 測試要求

### 整合測試範例

**檔案：** `tests/integration/test_projects_api.py`

```python
def test_create_project(test_client, test_db):
    """測試建立專案"""
    payload = {
        "name": "測試專案",
        "content": "這是測試內容" * 100,  # > 500 字
        "prompt_template_id": "template_id",
        "gemini_model": "gemini-1.5-flash",
        "youtube_settings": {
            "title": "測試影片",
            "description": "描述",
            "tags": ["測試"],
            "privacy": "private"
        }
    }

    response = test_client.post("/api/v1/projects", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "測試專案"
    assert data["data"]["status"] == "initialized"

def test_list_projects(test_client, test_db):
    """測試列出專案"""
    response = test_client.get("/api/v1/projects")

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "meta" in data

def test_get_project_not_found(test_client):
    """測試取得不存在的專案"""
    response = test_client.get("/api/v1/projects/nonexistent")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"
```

---

## 完成檢查清單

### 開發完成
- [ ] 12 個 API 端點實作完成
- [ ] Pydantic schemas 定義完成
- [ ] Service layer 業務邏輯完成
- [ ] 路由註冊完成

### 測試完成
- [ ] 單元測試通過
- [ ] 整合測試通過
- [ ] API 文件可訪問

### Git
- [ ] 在 feature/task-004-projects-api 分支

---

## 時間分配

- **Schemas 定義：** 2 小時
- **Service layer：** 4 小時
- **API 端點：** 4 小時
- **測試：** 2 小時

**總計：** 12 小時
