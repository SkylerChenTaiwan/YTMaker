# Task-009: Batch API 實作

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 6 小時
> **優先級：** P1 (重要)

---

## 關聯文件

### 產品設計
- **使用者流程：** `product-design/flows.md#Flow-5-批次處理多個影片` (批次處理)
- **使用者流程：** `product-design/flows.md#Flow-6-斷點續傳與錯誤恢復` (恢復功能)

### 技術規格
- **API 規格：** `tech-specs/backend/api-batch.md` (批次 API 設計)
- **API 設計規範：** `tech-specs/backend/api-design.md` (RESTful 規範)
- **資料庫設計：** `tech-specs/backend/database.md#2.1.6-BatchTask` (batch_tasks 資料表)
- **專案管理 API：** `tech-specs/backend/api-projects.md` (專案 API，batch 需整合)

### 相關任務
- **前置任務:** Task-002 ✅ (資料庫 Schema), Task-003 ✅ (API 基礎架構)
- **後續任務:** Task-014 (Celery 批次任務背景處理), Task-028 (批次處理頁面)
- **並行任務:** Task-004~008 (可並行開發，無檔案衝突)

---

## 任務目標

### 簡述
實作批次任務管理 API，支援批次建立多個專案、進度查詢、暫停/恢復/取消批次任務。提供完整的批次處理生命週期管理。

### 成功標準
- [ ] 5 個 API 端點全部實作並測試通過
- [ ] BatchService 業務邏輯完整（建立批次、更新進度、狀態管理）
- [ ] 批次任務與專案的關聯關係正確
- [ ] 支援批次狀態查詢與進度統計
- [ ] 單元測試覆蓋率 > 80%
- [ ] 所有錯誤情境都有適當處理
- [ ] API 文檔已更新（Swagger）

---

## 測試要求

### 單元測試

#### 測試 1：成功建立批次任務

**目的：** 驗證可以成功建立批次任務並建立多個專案

**輸入：**
```json
POST /api/v1/batch
{
  "name": "測試批次任務",
  "projects": [
    {
      "name": "專案 1",
      "content": "這是第一個專案的文字內容，至少需要 500 字以上才能符合要求。" + "...（補足到 500 字）"
    },
    {
      "name": "專案 2",
      "content": "這是第二個專案的文字內容，至少需要 500 字以上才能符合要求。" + "...（補足到 500 字）"
    }
  ],
  "configuration_id": "valid-uuid",
  "prompt_template_id": "valid-uuid",
  "gemini_model": "gemini-1.5-flash",
  "youtube_settings": {
    "privacy": "public",
    "publish_type": "immediate",
    "ai_content_flag": true
  }
}
```

**預期輸出：**
```json
Status: 201 Created
{
  "success": true,
  "data": {
    "batch_id": "uuid-v4",
    "total_projects": 2,
    "status": "QUEUED",
    "created_at": "2025-10-19T10:00:00Z"
  }
}
```

**驗證點：**
- [ ] 回傳 201 狀態碼
- [ ] 資料庫中新增了 batch_task 記錄
- [ ] `total_projects` 為 2
- [ ] `completed_projects` 初始為 0
- [ ] `failed_projects` 初始為 0
- [ ] `status` 為 "QUEUED"
- [ ] 資料庫中新增了 2 個 project 記錄
- [ ] 每個 project 的配置、prompt、模型設定都正確繼承自批次設定
- [ ] 每個 project 的狀態為 "INITIALIZED"

---

#### 測試 2：取得批次任務列表

**目的：** 驗證可以正確列出所有批次任務

**前置條件：**
資料庫中存在 3 個批次任務：
- batch_1: QUEUED, 10 個專案
- batch_2: RUNNING, 5 個專案（2 完成，1 失敗）
- batch_3: COMPLETED, 3 個專案（全部完成）

**輸入：**
```http
GET /api/v1/batch
```

**預期輸出：**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "batches": [
      {
        "id": "batch_3_uuid",
        "name": "批次任務 3",
        "total_projects": 3,
        "completed_projects": 3,
        "failed_projects": 0,
        "status": "COMPLETED",
        "created_at": "2025-10-19T12:00:00Z"
      },
      {
        "id": "batch_2_uuid",
        "name": "批次任務 2",
        "total_projects": 5,
        "completed_projects": 2,
        "failed_projects": 1,
        "status": "RUNNING",
        "created_at": "2025-10-19T11:00:00Z"
      },
      {
        "id": "batch_1_uuid",
        "name": "批次任務 1",
        "total_projects": 10,
        "completed_projects": 0,
        "failed_projects": 0,
        "status": "QUEUED",
        "created_at": "2025-10-19T10:00:00Z"
      }
    ]
  }
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] 回傳所有批次任務
- [ ] 按 `created_at` 降序排列（最新的在前）
- [ ] 每個批次的統計資訊正確（total, completed, failed）
- [ ] 狀態顯示正確

---

#### 測試 3：取得批次任務詳情（含專案列表）

**目的：** 驗證可以取得批次任務的詳細資訊和其包含的所有專案

**前置條件：**
資料庫中存在 batch_id 為 "batch-123" 的批次任務：
- 名稱：「測試批次」
- 總專案數：3
- 專案 1：COMPLETED（已上傳 YouTube）
- 專案 2：FAILED（圖片生成失敗）
- 專案 3：RENDERING（渲染中）

**輸入：**
```http
GET /api/v1/batch/batch-123
```

**預期輸出：**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "id": "batch-123",
    "name": "測試批次",
    "total_projects": 3,
    "completed_projects": 1,
    "failed_projects": 1,
    "status": "RUNNING",
    "created_at": "2025-10-19T10:00:00Z",
    "projects": [
      {
        "id": "project-1",
        "name": "專案 1",
        "status": "COMPLETED",
        "progress": 100,
        "youtube_url": "https://youtube.com/watch?v=abc123"
      },
      {
        "id": "project-2",
        "name": "專案 2",
        "status": "FAILED",
        "progress": 45,
        "error_message": "圖片生成失敗：Stability AI API 超時"
      },
      {
        "id": "project-3",
        "name": "專案 3",
        "status": "RENDERING",
        "progress": 75,
        "error_message": null
      }
    ]
  }
}
```

**驗證點：**
- [ ] 回傳 200 狀態碼
- [ ] 批次任務基本資訊正確
- [ ] `completed_projects` 計數正確（1 個）
- [ ] `failed_projects` 計數正確（1 個）
- [ ] 批次狀態為 "RUNNING"（因為還有專案在執行）
- [ ] 專案列表包含所有 3 個專案
- [ ] 每個專案的狀態、進度、錯誤訊息正確顯示
- [ ] 已完成的專案有 YouTube URL
- [ ] 失敗的專案有錯誤訊息

---

#### 測試 4：批次任務不存在時回傳錯誤

**目的：** 驗證查詢不存在的批次任務時回傳 404

**輸入：**
```http
GET /api/v1/batch/non-existent-batch-id
```

**預期輸出：**
```json
Status: 404 Not Found
{
  "success": false,
  "error": {
    "code": "BATCH_NOT_FOUND",
    "message": "批次任務不存在"
  }
}
```

**驗證點：**
- [ ] 回傳 404 狀態碼
- [ ] 錯誤碼為 "BATCH_NOT_FOUND"
- [ ] 錯誤訊息清楚

---

#### 測試 5：建立批次任務時專案列表為空

**目的：** 驗證輸入驗證 - 批次任務必須至少包含一個專案

**輸入：**
```json
POST /api/v1/batch
{
  "name": "空批次任務",
  "projects": [],
  "gemini_model": "gemini-1.5-flash"
}
```

**預期輸出：**
```json
Status: 400 Bad Request
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "批次任務必須至少包含一個專案",
    "field": "projects"
  }
}
```

**驗證點：**
- [ ] 回傳 400 狀態碼
- [ ] 錯誤碼為 "INVALID_INPUT"
- [ ] 錯誤訊息指出問題
- [ ] `field` 欄位指出是 "projects" 參數有問題
- [ ] 未建立任何批次任務或專案記錄

---

#### 測試 6：建立批次任務時專案內容長度不符

**目的：** 驗證批次建立時每個專案的內容都要符合長度要求（500-10000字）

**輸入：**
```json
POST /api/v1/batch
{
  "name": "測試批次",
  "projects": [
    {
      "name": "專案 1",
      "content": "太短了"
    }
  ],
  "gemini_model": "gemini-1.5-flash"
}
```

**預期輸出：**
```json
Status: 400 Bad Request
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "專案 '專案 1' 的文字內容必須在 500-10000 字之間（當前：4 字）",
    "field": "projects[0].content"
  }
}
```

**驗證點：**
- [ ] 回傳 400 狀態碼
- [ ] 錯誤訊息清楚指出哪個專案有問題
- [ ] 顯示當前字數
- [ ] 未建立批次任務

---

### 整合測試

#### 測試 7：批次任務生命週期完整流程

**目的：** 驗證批次任務從建立到完成的完整生命週期

**流程：**

1. **建立批次任務（2 個專案）**
   ```
   POST /api/v1/batch
   → 回傳 batch_id
   → 狀態為 QUEUED
   ```

2. **查詢批次任務詳情**
   ```
   GET /api/v1/batch/:id
   → 確認 2 個專案都是 INITIALIZED 狀態
   → completed = 0, failed = 0
   ```

3. **模擬專案 1 完成**
   ```
   更新資料庫：project_1.status = COMPLETED
   ```

4. **再次查詢批次任務**
   ```
   GET /api/v1/batch/:id
   → completed = 1, failed = 0
   → 批次狀態仍為 RUNNING
   ```

5. **模擬專案 2 失敗**
   ```
   更新資料庫：project_2.status = FAILED
   ```

6. **最後查詢批次任務**
   ```
   GET /api/v1/batch/:id
   → completed = 1, failed = 1
   → 批次狀態為 COMPLETED（所有專案都結束了）
   ```

**驗證點：**
- [ ] 整個流程無錯誤
- [ ] 批次統計數字隨著專案狀態更新而更新
- [ ] 批次狀態會根據專案狀態自動更新
- [ ] 查詢 API 回傳的資料一致

---

## 實作規格

### 需要建立/修改的檔案

#### 1. API Router: `backend/app/api/v1/batch.py`

**職責：** 處理批次任務相關的 HTTP 請求

**程式碼骨架：**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.schemas.batch import (
    BatchTaskCreate,
    BatchTaskResponse,
    BatchTaskDetailResponse,
)
from app.services.batch_service import BatchService

router = APIRouter(prefix="/batch", tags=["batch"])


@router.post("", response_model=BatchTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_batch_task(
    data: BatchTaskCreate,
    db: Session = Depends(get_db)
):
    """
    建立批次任務

    - **name**: 批次任務名稱
    - **projects**: 專案列表（至少 1 個）
    - **configuration_id**: 視覺配置 ID（選填）
    - **prompt_template_id**: Prompt 範本 ID（選填）
    - **gemini_model**: Gemini 模型名稱
    - **youtube_settings**: YouTube 設定（選填）
    """
    batch_service = BatchService(db)
    batch_task = await batch_service.create_batch_task(data)
    return batch_task


@router.get("", response_model=List[BatchTaskResponse])
async def list_batch_tasks(
    db: Session = Depends(get_db)
):
    """
    取得所有批次任務列表

    按建立時間降序排列
    """
    batch_service = BatchService(db)
    batches = await batch_service.list_batch_tasks()
    return batches


@router.get("/{batch_id}", response_model=BatchTaskDetailResponse)
async def get_batch_task(
    batch_id: str,
    db: Session = Depends(get_db)
):
    """
    取得批次任務詳情

    包含所有專案的狀態和進度
    """
    batch_service = BatchService(db)
    batch_task = await batch_service.get_batch_task(batch_id)

    if not batch_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "BATCH_NOT_FOUND",
                "message": "批次任務不存在"
            }
        )

    return batch_task


@router.post("/{batch_id}/pause", status_code=status.HTTP_200_OK)
async def pause_batch_task(
    batch_id: str,
    db: Session = Depends(get_db)
):
    """
    暫停批次任務

    停止處理新的專案，但不影響正在執行的專案
    """
    batch_service = BatchService(db)
    result = await batch_service.pause_batch_task(batch_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "BATCH_NOT_FOUND",
                "message": "批次任務不存在"
            }
        )

    return {"success": True, "message": "批次任務已暫停"}


@router.post("/{batch_id}/resume", status_code=status.HTTP_200_OK)
async def resume_batch_task(
    batch_id: str,
    db: Session = Depends(get_db)
):
    """
    恢復批次任務

    繼續處理剩餘的專案
    """
    batch_service = BatchService(db)
    result = await batch_service.resume_batch_task(batch_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "BATCH_NOT_FOUND",
                "message": "批次任務不存在"
            }
        )

    return {"success": True, "message": "批次任務已恢復"}
```

---

#### 2. Service Layer: `backend/app/services/batch_service.py`

**職責：** 批次任務業務邏輯

**程式碼骨架：**

```python
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from uuid import uuid4

from app.models.batch_task import BatchTask
from app.models.project import Project
from app.schemas.batch import BatchTaskCreate, BatchTaskResponse, BatchTaskDetailResponse
from fastapi import HTTPException, status


class BatchService:
    def __init__(self, db: Session):
        self.db = db

    async def create_batch_task(self, data: BatchTaskCreate) -> BatchTaskResponse:
        """
        建立批次任務

        1. 驗證 projects 列表不為空
        2. 驗證每個專案的 content 長度（500-10000 字）
        3. 建立 BatchTask 記錄
        4. 為每個專案建立 Project 記錄
        5. 回傳批次任務資訊
        """
        # 1. 驗證專案列表
        if not data.projects or len(data.projects) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_INPUT",
                    "message": "批次任務必須至少包含一個專案",
                    "field": "projects"
                }
            )

        # 2. 驗證每個專案的內容長度
        for idx, project_data in enumerate(data.projects):
            content_length = len(project_data.content)
            if content_length < 500 or content_length > 10000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "INVALID_INPUT",
                        "message": f"專案 '{project_data.name}' 的文字內容必須在 500-10000 字之間（當前：{content_length} 字）",
                        "field": f"projects[{idx}].content"
                    }
                )

        # 3. 建立 BatchTask
        batch_task = BatchTask(
            id=str(uuid4()),
            name=data.name,
            total_projects=len(data.projects),
            completed_projects=0,
            failed_projects=0,
            status="QUEUED"
        )
        self.db.add(batch_task)

        # 4. 建立每個 Project
        for project_data in data.projects:
            project = Project(
                id=str(uuid4()),
                name=project_data.name,
                content=project_data.content,
                status="INITIALIZED",
                configuration=data.configuration_id,  # 繼承批次的配置
                prompt_template_id=data.prompt_template_id,  # 繼承批次的 Prompt
                gemini_model=data.gemini_model,  # 繼承批次的模型
                youtube_settings=data.youtube_settings,  # 繼承批次的 YouTube 設定
                batch_task_id=batch_task.id  # 關聯到批次任務
            )
            self.db.add(project)

        # 5. 提交到資料庫
        self.db.commit()
        self.db.refresh(batch_task)

        return BatchTaskResponse(
            batch_id=batch_task.id,
            total_projects=batch_task.total_projects,
            status=batch_task.status,
            created_at=batch_task.created_at
        )

    async def list_batch_tasks(self) -> List[BatchTaskResponse]:
        """
        列出所有批次任務

        按建立時間降序排列
        """
        batches = self.db.query(BatchTask).order_by(desc(BatchTask.created_at)).all()

        return [
            {
                "id": batch.id,
                "name": batch.name,
                "total_projects": batch.total_projects,
                "completed_projects": batch.completed_projects,
                "failed_projects": batch.failed_projects,
                "status": batch.status,
                "created_at": batch.created_at
            }
            for batch in batches
        ]

    async def get_batch_task(self, batch_id: str) -> Optional[BatchTaskDetailResponse]:
        """
        取得批次任務詳情

        包含所有專案的狀態
        """
        batch_task = self.db.query(BatchTask).filter(BatchTask.id == batch_id).first()

        if not batch_task:
            return None

        # 查詢該批次的所有專案
        projects = self.db.query(Project).filter(Project.batch_task_id == batch_id).all()

        # 計算進度統計（實時計算，而非使用快取值）
        completed = sum(1 for p in projects if p.status == "COMPLETED")
        failed = sum(1 for p in projects if p.status == "FAILED")

        # 更新批次任務的統計數字（如果有變化）
        if batch_task.completed_projects != completed or batch_task.failed_projects != failed:
            batch_task.completed_projects = completed
            batch_task.failed_projects = failed

            # 更新批次狀態
            if completed + failed == batch_task.total_projects:
                batch_task.status = "COMPLETED"
            elif completed > 0 or failed > 0:
                batch_task.status = "RUNNING"

            self.db.commit()
            self.db.refresh(batch_task)

        return {
            "id": batch_task.id,
            "name": batch_task.name,
            "total_projects": batch_task.total_projects,
            "completed_projects": batch_task.completed_projects,
            "failed_projects": batch_task.failed_projects,
            "status": batch_task.status,
            "created_at": batch_task.created_at,
            "projects": [
                {
                    "id": project.id,
                    "name": project.name,
                    "status": project.status,
                    "progress": self._calculate_project_progress(project),
                    "youtube_url": project.youtube_url,
                    "error_message": project.error_message
                }
                for project in projects
            ]
        }

    async def pause_batch_task(self, batch_id: str) -> bool:
        """
        暫停批次任務
        """
        batch_task = self.db.query(BatchTask).filter(BatchTask.id == batch_id).first()

        if not batch_task:
            return False

        batch_task.status = "PAUSED"
        self.db.commit()

        return True

    async def resume_batch_task(self, batch_id: str) -> bool:
        """
        恢復批次任務
        """
        batch_task = self.db.query(BatchTask).filter(BatchTask.id == batch_id).first()

        if not batch_task:
            return False

        # 恢復為 RUNNING 狀態（如果還有未完成的專案）
        if batch_task.completed_projects + batch_task.failed_projects < batch_task.total_projects:
            batch_task.status = "RUNNING"
        else:
            batch_task.status = "COMPLETED"

        self.db.commit()

        return True

    def _calculate_project_progress(self, project: Project) -> int:
        """
        計算專案進度百分比（0-100）

        根據專案狀態估算進度：
        - INITIALIZED: 0%
        - SCRIPT_GENERATING: 10%
        - SCRIPT_GENERATED: 20%
        - ASSETS_GENERATING: 40%
        - ASSETS_GENERATED: 60%
        - RENDERING: 75%
        - RENDERED: 85%
        - THUMBNAIL_GENERATING: 90%
        - THUMBNAIL_GENERATED: 95%
        - UPLOADING: 98%
        - COMPLETED: 100%
        - FAILED: 保持失敗時的進度
        """
        progress_map = {
            "INITIALIZED": 0,
            "SCRIPT_GENERATING": 10,
            "SCRIPT_GENERATED": 20,
            "ASSETS_GENERATING": 40,
            "ASSETS_GENERATED": 60,
            "RENDERING": 75,
            "RENDERED": 85,
            "THUMBNAIL_GENERATING": 90,
            "THUMBNAIL_GENERATED": 95,
            "UPLOADING": 98,
            "COMPLETED": 100,
            "FAILED": 50,  # 失敗時假設進度為 50%
        }

        return progress_map.get(project.status, 0)
```

---

#### 3. Pydantic Schemas: `backend/app/schemas/batch.py`

**職責：** Request/Response 資料驗證

**程式碼骨架：**

```python
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime


class ProjectInBatch(BaseModel):
    """批次中的單一專案"""
    name: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=500, max_length=10000)


class BatchTaskCreate(BaseModel):
    """建立批次任務的請求"""
    name: str = Field(..., min_length=1, max_length=200)
    projects: List[ProjectInBatch] = Field(..., min_items=1)
    configuration_id: Optional[str] = None
    prompt_template_id: Optional[str] = None
    gemini_model: str = Field(default="gemini-1.5-flash")
    youtube_settings: Optional[Dict[str, Any]] = None

    @validator('gemini_model')
    def validate_gemini_model(cls, v):
        valid_models = ["gemini-1.5-pro", "gemini-1.5-flash"]
        if v not in valid_models:
            raise ValueError(f"Gemini 模型必須是 {valid_models} 之一")
        return v


class BatchTaskResponse(BaseModel):
    """批次任務基本回應"""
    batch_id: str
    total_projects: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class BatchTaskListItem(BaseModel):
    """批次任務列表項目"""
    id: str
    name: str
    total_projects: int
    completed_projects: int
    failed_projects: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectInBatchDetail(BaseModel):
    """批次詳情中的專案資訊"""
    id: str
    name: str
    status: str
    progress: int  # 0-100
    youtube_url: Optional[str] = None
    error_message: Optional[str] = None


class BatchTaskDetailResponse(BaseModel):
    """批次任務詳細回應"""
    id: str
    name: str
    total_projects: int
    completed_projects: int
    failed_projects: int
    status: str
    created_at: datetime
    projects: List[ProjectInBatchDetail]

    class Config:
        from_attributes = True
```

---

#### 4. 資料模型更新: `backend/app/models/batch_task.py`

**職責：** BatchTask SQLAlchemy 模型

**程式碼骨架：**

```python
from sqlalchemy import Column, String, Integer, DateTime, Enum
from sqlalchemy.sql import func
from app.db.base_class import Base
import enum


class BatchStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class BatchTask(Base):
    __tablename__ = "batch_tasks"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    total_projects = Column(Integer, nullable=False)
    completed_projects = Column(Integer, default=0)
    failed_projects = Column(Integer, default=0)
    status = Column(Enum(BatchStatus), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
```

---

#### 5. 更新 Project 模型: `backend/app/models/project.py`

**職責：** 在 Project 模型中新增 `batch_task_id` 和 `error_message` 欄位

**需要新增的欄位：**

```python
from sqlalchemy import Column, String, ForeignKey

class Project(Base):
    # ... 現有欄位 ...

    # 新增欄位
    batch_task_id = Column(String(36), ForeignKey("batch_tasks.id"), nullable=True, index=True)
    error_message = Column(String(500), nullable=True)  # 儲存錯誤訊息
```

---

#### 6. 測試檔案: `backend/tests/api/test_batch.py`

**職責：** API 測試

**程式碼骨架：**

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import get_db
from app.models.batch_task import BatchTask
from app.models.project import Project

client = TestClient(app)


def test_create_batch_task_success():
    """測試 1：成功建立批次任務"""
    response = client.post("/api/v1/batch", json={
        "name": "測試批次任務",
        "projects": [
            {
                "name": "專案 1",
                "content": "這是測試內容" + "x" * 500  # 補足到 500 字
            },
            {
                "name": "專案 2",
                "content": "這是測試內容" + "y" * 500
            }
        ],
        "gemini_model": "gemini-1.5-flash"
    })

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_projects"] == 2
    assert data["data"]["status"] == "QUEUED"
    assert "batch_id" in data["data"]


def test_list_batch_tasks():
    """測試 2：取得批次任務列表"""
    # 先建立幾個批次任務
    # ...

    response = client.get("/api/v1/batch")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "batches" in data["data"]
    assert isinstance(data["data"]["batches"], list)


def test_get_batch_task_detail():
    """測試 3：取得批次任務詳情"""
    # 先建立一個批次任務
    create_response = client.post("/api/v1/batch", json={
        "name": "測試批次",
        "projects": [
            {"name": "專案 1", "content": "x" * 500}
        ],
        "gemini_model": "gemini-1.5-flash"
    })
    batch_id = create_response.json()["data"]["batch_id"]

    # 查詢詳情
    response = client.get(f"/api/v1/batch/{batch_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == batch_id
    assert "projects" in data["data"]
    assert len(data["data"]["projects"]) == 1


def test_get_batch_task_not_found():
    """測試 4：批次任務不存在"""
    response = client.get("/api/v1/batch/non-existent-id")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "BATCH_NOT_FOUND"


def test_create_batch_task_empty_projects():
    """測試 5：專案列表為空"""
    response = client.post("/api/v1/batch", json={
        "name": "空批次",
        "projects": [],
        "gemini_model": "gemini-1.5-flash"
    })

    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_INPUT"
    assert "至少包含一個專案" in data["error"]["message"]


def test_create_batch_task_content_too_short():
    """測試 6：專案內容太短"""
    response = client.post("/api/v1/batch", json={
        "name": "測試批次",
        "projects": [
            {"name": "專案 1", "content": "太短了"}
        ],
        "gemini_model": "gemini-1.5-flash"
    })

    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_INPUT"
    assert "500-10000 字" in data["error"]["message"]


def test_batch_lifecycle():
    """測試 7：批次任務生命週期"""
    # 1. 建立批次
    create_response = client.post("/api/v1/batch", json={
        "name": "生命週期測試",
        "projects": [
            {"name": "專案 1", "content": "x" * 500},
            {"name": "專案 2", "content": "y" * 500}
        ],
        "gemini_model": "gemini-1.5-flash"
    })
    batch_id = create_response.json()["data"]["batch_id"]

    # 2. 查詢初始狀態
    response = client.get(f"/api/v1/batch/{batch_id}")
    assert response.json()["data"]["completed_projects"] == 0

    # 3. 模擬專案完成（直接操作資料庫）
    # ...

    # 4. 再次查詢
    response = client.get(f"/api/v1/batch/{batch_id}")
    # ... 驗證統計數字更新
```

---

### API 端點規格

#### 1. POST /api/v1/batch

**請求：**
```json
{
  "name": "批次任務名稱",
  "projects": [
    {
      "name": "專案名稱",
      "content": "文字內容（500-10000字）"
    }
  ],
  "configuration_id": "uuid (選填)",
  "prompt_template_id": "uuid (選填)",
  "gemini_model": "gemini-1.5-flash",
  "youtube_settings": { ... }
}
```

**回應：**
- **201 Created** - 批次任務已建立
- **400 Bad Request** - 輸入驗證失敗

---

#### 2. GET /api/v1/batch

**回應：**
- **200 OK** - 批次任務列表

---

#### 3. GET /api/v1/batch/:id

**回應：**
- **200 OK** - 批次任務詳情
- **404 Not Found** - 批次任務不存在

---

#### 4. POST /api/v1/batch/:id/pause

**回應：**
- **200 OK** - 批次任務已暫停
- **404 Not Found** - 批次任務不存在

---

#### 5. POST /api/v1/batch/:id/resume

**回應：**
- **200 OK** - 批次任務已恢復
- **404 Not Found** - 批次任務不存在

---

### 資料流程

```
建立批次任務流程：
Client → POST /api/v1/batch
  → BatchService.create_batch_task()
    → 驗證 projects 列表不為空
    → 驗證每個專案的 content 長度（500-10000字）
    → 建立 BatchTask 記錄（status=QUEUED）
    → 為每個專案建立 Project 記錄（status=INITIALIZED, batch_task_id=batch_id）
    → 回傳 batch_id 和基本資訊

查詢批次詳情流程：
Client → GET /api/v1/batch/:id
  → BatchService.get_batch_task()
    → 查詢 BatchTask
    → 查詢該批次的所有 Project
    → 實時計算 completed/failed 數量
    → 更新 BatchTask 統計（如有變化）
    → 更新 BatchTask 狀態（QUEUED → RUNNING → COMPLETED）
    → 計算每個專案的進度百分比
    → 回傳完整資訊
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）
1. 確認 Task-002（資料庫）和 Task-003（API 基礎）已完成
2. 確認測試環境可運行：`pytest`
3. 閱讀 `tech-specs/backend/api-batch.md`

#### 第 2 步：建立資料模型（30 分鐘）
1. 建立 `backend/app/models/batch_task.py`
2. 更新 `backend/app/models/project.py`（新增 `batch_task_id` 和 `error_message`）
3. 建立 Alembic migration 腳本
4. 執行 migration：`alembic upgrade head`
5. 驗證資料表建立成功

#### 第 3 步：建立 Pydantic Schemas（20 分鐘）
1. 建立 `backend/app/schemas/batch.py`
2. 定義所有 request/response schemas
3. 加入欄位驗證（content 長度、model 選擇等）

#### 第 4 步：撰寫第一個測試（20 分鐘）
1. 建立 `tests/api/test_batch.py`
2. 撰寫「測試 1：成功建立批次任務」
3. 執行測試 → 失敗（預期，因為還沒實作）

#### 第 5 步：實作 BatchService（60 分鐘）
1. 建立 `backend/app/services/batch_service.py`
2. 實作 `create_batch_task()` 方法
   - 驗證邏輯
   - 建立 BatchTask
   - 建立多個 Project
   - 錯誤處理
3. 執行測試 1 → 通過 ✅

#### 第 6 步：實作 API Router（30 分鐘）
1. 建立 `backend/app/api/v1/batch.py`
2. 實作 POST /api/v1/batch 端點
3. 在 `app/main.py` 註冊 router
4. 執行測試 1 → 通過 ✅

#### 第 7 步：實作列表與詳情 API（40 分鐘）
1. 撰寫「測試 2：取得批次列表」
2. 撰寫「測試 3：取得批次詳情」
3. 實作 `list_batch_tasks()` 方法
4. 實作 `get_batch_task()` 方法
5. 實作 GET /api/v1/batch 和 GET /api/v1/batch/:id 端點
6. 執行測試 2, 3 → 通過 ✅

#### 第 8 步：實作錯誤處理測試（30 分鐘）
1. 撰寫「測試 4：批次任務不存在」
2. 撰寫「測試 5：專案列表為空」
3. 撰寫「測試 6：專案內容太短」
4. 加入錯誤處理邏輯
5. 執行測試 4, 5, 6 → 通過 ✅

#### 第 9 步：實作暫停/恢復功能（20 分鐘）
1. 實作 `pause_batch_task()` 方法
2. 實作 `resume_batch_task()` 方法
3. 實作 POST /api/v1/batch/:id/pause 端點
4. 實作 POST /api/v1/batch/:id/resume 端點
5. 撰寫測試並執行

#### 第 10 步：整合測試（30 分鐘）
1. 撰寫「測試 7：批次任務生命週期」
2. 模擬完整的批次處理流程
3. 驗證統計數字會自動更新
4. 執行測試 7 → 通過 ✅

#### 第 11 步：重構與優化（20 分鐘）
1. 檢查程式碼重複
2. 提取共用邏輯
3. 改善錯誤訊息
4. 再次執行所有測試

#### 第 12 步：文件與檢查（20 分鐘）
1. 更新 Swagger 文檔註釋（docstrings）
2. 檢查測試覆蓋率：`pytest --cov=app/services/batch_service --cov=app/api/v1/batch`
3. 執行 linter：`ruff check .`
4. 格式化程式碼：`ruff format .`

---

### 注意事項

#### 批次與專案的關聯
- ⚠️ **批次任務建立時，所有專案都繼承批次的設定**（配置、Prompt、模型、YouTube 設定）
- ⚠️ 每個專案都要設定 `batch_task_id` 外鍵
- ⚠️ 批次的統計數字（completed, failed）要實時計算，不能只依賴快取值

#### 狀態管理
- 💡 批次狀態會根據專案狀態自動更新：
  - 所有專案都是 INITIALIZED → QUEUED
  - 有專案開始執行 → RUNNING
  - 所有專案都結束（COMPLETED 或 FAILED）→ COMPLETED
  - 手動暫停 → PAUSED
- 💡 專案進度是估算值（根據狀態），不是精確值

#### 測試
- ✅ 測試要涵蓋所有錯誤情境（空列表、內容太短、批次不存在）
- ✅ 測試批次統計數字的實時更新邏輯
- ✅ 測試要獨立執行（每個測試前清空資料庫）

#### 與其他模組整合
- 🔗 Task-014（Celery 背景任務）會實際執行批次中的專案
- 🔗 Task-028（批次處理頁面）會呼叫這些 API 顯示進度

---

### 完成檢查清單

#### 功能完整性
- [ ] POST /api/v1/batch 可正常運作（建立批次任務）
- [ ] GET /api/v1/batch 可正常運作（列出批次任務）
- [ ] GET /api/v1/batch/:id 可正常運作（取得批次詳情）
- [ ] POST /api/v1/batch/:id/pause 可正常運作（暫停批次）
- [ ] POST /api/v1/batch/:id/resume 可正常運作（恢復批次）
- [ ] 批次建立時會自動建立所有專案記錄
- [ ] 批次統計數字會實時更新（completed, failed）
- [ ] 批次狀態會根據專案狀態自動更新

#### 測試
- [ ] 測試 1：成功建立批次任務 ✅
- [ ] 測試 2：取得批次列表 ✅
- [ ] 測試 3：取得批次詳情 ✅
- [ ] 測試 4：批次任務不存在 ✅
- [ ] 測試 5：專案列表為空 ✅
- [ ] 測試 6：專案內容太短 ✅
- [ ] 測試 7：批次任務生命週期 ✅
- [ ] 測試覆蓋率 > 80%
- [ ] 所有測試可獨立執行

#### 程式碼品質
- [ ] Ruff check 無錯誤：`ruff check .`
- [ ] 程式碼已格式化：`ruff format .`
- [ ] 無 type 錯誤（如使用 mypy）
- [ ] 所有函數都有 docstring

#### 文件
- [ ] API 文檔已更新（Swagger/OpenAPI docstrings）
- [ ] 所有端點都有清楚的說明
- [ ] Request/Response 範例完整

#### 整合
- [ ] 在本地環境手動測試建立批次流程
- [ ] 使用 Postman/curl 測試所有 API
- [ ] 檢查資料庫記錄正確建立（BatchTask + Project）
- [ ] 驗證批次統計數字會隨專案狀態更新

#### 資料庫
- [ ] Alembic migration 腳本已建立
- [ ] Migration 可正常執行（upgrade 和 downgrade）
- [ ] batch_tasks 資料表正確建立
- [ ] projects 資料表新增了 batch_task_id 外鍵

#### Spec 同步
- [ ] 如果實作與 spec 有差異，已更新 `tech-specs/backend/api-batch.md`
- [ ] 如果有新的依賴套件，已更新 `requirements.txt`

---

## 預估時間分配

- 環境準備與資料模型：40 分鐘
- Schemas 建立：20 分鐘
- 撰寫測試：70 分鐘
- 實作 Service 與 API：150 分鐘
- 錯誤處理與測試：50 分鐘
- 重構優化：20 分鐘
- 文件檢查：30 分鐘

**總計：約 6 小時**

---

## 參考資源

### FastAPI 官方文檔
- [路由與端點](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Pydantic 驗證](https://fastapi.tiangolo.com/tutorial/body/)
- [依賴注入](https://fastapi.tiangolo.com/tutorial/dependencies/)

### SQLAlchemy 文檔
- [關聯關係](https://docs.sqlalchemy.org/en/20/orm/relationships.html)
- [查詢](https://docs.sqlalchemy.org/en/20/orm/queryguide/)

### 專案內部文件
- `tech-specs/backend/api-batch.md` - 批次 API 設計
- `tech-specs/backend/api-design.md` - API 設計規範
- `tech-specs/backend/database.md` - 資料模型設計

---

**準備好了嗎？** 開始使用 TDD 方式實作 Batch API！🚀
