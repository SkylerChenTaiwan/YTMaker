"""
Batch Service - 批次任務業務邏輯層
"""
from typing import Optional
from uuid import uuid4

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.batch_task import BatchTask, BatchTaskStatus
from app.models.project import Project, ProjectStatus
from app.schemas.batch import BatchTaskCreate


class BatchService:
    """批次任務服務"""

    def __init__(self, db: Session):
        self.db = db

    async def create_batch_task(self, data: BatchTaskCreate) -> dict:
        """
        建立批次任務

        1. 驗證 projects 列表不為空（已在 schema 驗證）
        2. 驗證每個專案的 content 長度（已在 schema 驗證）
        3. 建立 BatchTask 記錄
        4. 為每個專案建立 Project 記錄
        5. 回傳批次任務資訊
        """

        # 建立 BatchTask
        batch_task = BatchTask(
            id=str(uuid4()),
            name=data.name,
            total_projects=len(data.projects),
            completed_projects=0,
            failed_projects=0,
            status=BatchTaskStatus.QUEUED,
        )
        self.db.add(batch_task)

        # 建立每個 Project
        for project_data in data.projects:
            project = Project(
                id=str(uuid4()),
                name=project_data.name,
                content=project_data.content,
                status=ProjectStatus.INITIALIZED,
                configuration_id=data.configuration_id,  # 繼承批次的配置
                prompt_template_id=data.prompt_template_id,  # 繼承批次的 Prompt
                gemini_model=data.gemini_model,  # 繼承批次的模型
                youtube_settings=data.youtube_settings,  # 繼承批次的 YouTube 設定
                batch_task_id=batch_task.id,  # 關聯到批次任務
            )
            self.db.add(project)

        # 提交到資料庫
        self.db.commit()
        self.db.refresh(batch_task)

        return {
            "batch_id": batch_task.id,
            "total_projects": batch_task.total_projects,
            "status": batch_task.status.value,
            "created_at": batch_task.created_at,
        }

    async def list_batch_tasks(self) -> list[dict]:
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
                "status": batch.status.value,
                "created_at": batch.created_at,
            }
            for batch in batches
        ]

    async def get_batch_task(self, batch_id: str) -> Optional[dict]:
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
        completed = sum(1 for p in projects if p.status == ProjectStatus.COMPLETED)
        failed = sum(1 for p in projects if p.status == ProjectStatus.FAILED)

        # 更新批次任務的統計數字（如果有變化）
        if batch_task.completed_projects != completed or batch_task.failed_projects != failed:
            batch_task.completed_projects = completed
            batch_task.failed_projects = failed

            # 更新批次狀態
            if completed + failed == batch_task.total_projects:
                batch_task.status = BatchTaskStatus.COMPLETED
            elif completed > 0 or failed > 0:
                if batch_task.status != BatchTaskStatus.PAUSED:
                    batch_task.status = BatchTaskStatus.RUNNING

            self.db.commit()
            self.db.refresh(batch_task)

        return {
            "id": batch_task.id,
            "name": batch_task.name,
            "total_projects": batch_task.total_projects,
            "completed_projects": batch_task.completed_projects,
            "failed_projects": batch_task.failed_projects,
            "status": batch_task.status.value,
            "created_at": batch_task.created_at,
            "projects": [
                {
                    "id": project.id,
                    "name": project.name,
                    "status": project.status.value,
                    "progress": self._calculate_project_progress(project),
                    "youtube_url": (
                        f"https://youtube.com/watch?v={project.youtube_video_id}"
                        if project.youtube_video_id
                        else None
                    ),
                    "error_message": project.error_message,
                }
                for project in projects
            ],
        }

    async def pause_batch_task(self, batch_id: str) -> bool:
        """暫停批次任務"""
        batch_task = self.db.query(BatchTask).filter(BatchTask.id == batch_id).first()

        if not batch_task:
            return False

        batch_task.status = BatchTaskStatus.PAUSED
        self.db.commit()

        return True

    async def resume_batch_task(self, batch_id: str) -> bool:
        """恢復批次任務"""
        batch_task = self.db.query(BatchTask).filter(BatchTask.id == batch_id).first()

        if not batch_task:
            return False

        # 恢復為 RUNNING 狀態（如果還有未完成的專案）
        if batch_task.completed_projects + batch_task.failed_projects < batch_task.total_projects:
            batch_task.status = BatchTaskStatus.RUNNING
        else:
            batch_task.status = BatchTaskStatus.COMPLETED

        self.db.commit()

        return True

    def _calculate_project_progress(self, project: Project) -> int:
        """
        計算專案進度百分比（0-100）

        根據專案狀態估算進度
        """
        progress_map = {
            ProjectStatus.INITIALIZED: 0,
            ProjectStatus.SCRIPT_GENERATING: 10,
            ProjectStatus.SCRIPT_GENERATED: 20,
            ProjectStatus.ASSETS_GENERATING: 40,
            ProjectStatus.ASSETS_GENERATED: 60,
            ProjectStatus.RENDERING: 75,
            ProjectStatus.RENDERED: 85,
            ProjectStatus.THUMBNAIL_GENERATING: 90,
            ProjectStatus.THUMBNAIL_GENERATED: 95,
            ProjectStatus.UPLOADING: 98,
            ProjectStatus.COMPLETED: 100,
            ProjectStatus.FAILED: 50,  # 失敗時假設進度為 50%
            ProjectStatus.PAUSED: 0,  # 暫停時進度為 0%
        }

        return progress_map.get(project.status, 0)
