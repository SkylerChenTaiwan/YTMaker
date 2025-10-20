"""Redis Pub/Sub 進度通知模組（使用新的 ProgressService）"""

import asyncio
from enum import Enum
from typing import Optional

from app.services.progress_service import ProgressService


class ProgressStage(str, Enum):
    """進度階段"""

    SCRIPT_GENERATION = "SCRIPT_GENERATING"
    ASSET_GENERATION = "ASSETS_GENERATING"
    VIDEO_RENDERING = "RENDERING"
    THUMBNAIL_GENERATION = "THUMBNAIL_GENERATING"
    YOUTUBE_UPLOAD = "UPLOADING"
    ERROR = "error"


def _run_async(coro):
    """在同步上下文中運行異步函數（用於 Celery 任務）"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


def publish_progress(
    project_id: int,
    stage: ProgressStage,
    progress: int,
    message: str,
    error: Optional[str] = None,
    data: Optional[dict] = None,
):
    """
    發布進度更新到 Redis Pub/Sub (同步包裝，用於 Celery 任務)

    Args:
        project_id: 專案 ID
        stage: 進度階段
        progress: 進度百分比（0-100）
        message: 進度訊息
        error: 錯誤訊息（如果有）
        data: 額外資料
    """
    if error:
        # 發布錯誤訊息
        _run_async(
            ProgressService.publish_error(
                project_id=str(project_id),
                error_code="CELERY_TASK_ERROR",
                error_message=error,
                stage=stage.value,
                details=data or {},
            )
        )
    else:
        # 發布進度更新
        _run_async(
            ProgressService.publish_progress(
                project_id=str(project_id),
                status=stage.value,
                progress=progress,
                current_stage=message,
                estimated_remaining=data.get("estimated_remaining") if data else None,
            )
        )


def publish_stage_change(
    project_id: int, previous_stage: ProgressStage, current_stage: ProgressStage, progress: int
):
    """發布階段變化（同步包裝）"""
    _run_async(
        ProgressService.publish_stage_change(
            project_id=str(project_id),
            previous_stage=previous_stage.value,
            current_stage=current_stage.value,
            progress=progress,
        )
    )


def publish_log(project_id: int, level: str, message: str):
    """發布日誌訊息（同步包裝）"""
    _run_async(
        ProgressService.publish_log(
            project_id=str(project_id), level=level, message=message
        )
    )


def publish_complete(project_id: int, status: str, youtube_url: Optional[str] = None):
    """發布完成訊息（同步包裝）"""
    _run_async(
        ProgressService.publish_complete(
            project_id=str(project_id), status=status, youtube_url=youtube_url
        )
    )


def subscribe_progress(project_id: int):
    """
    訂閱專案的進度更新

    Args:
        project_id: 專案 ID

    Yields:
        dict: 進度訊息
    """
    pubsub = redis_client.pubsub()
    channel = f"progress:{project_id}"
    pubsub.subscribe(channel)

    try:
        for message in pubsub.listen():
            if message["type"] == "message":
                yield json.loads(message["data"])
    finally:
        pubsub.unsubscribe(channel)
        pubsub.close()
