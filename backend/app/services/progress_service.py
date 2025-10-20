"""進度發布服務 - 用於 Celery 任務推送進度到 WebSocket"""
import json
import logging
from datetime import datetime
from typing import Optional

from app.core.redis import get_async_redis

logger = logging.getLogger(__name__)


class ProgressService:
    """進度發布服務 - 統一的進度推送介面"""

    @staticmethod
    async def publish_progress(
        project_id: str,
        status: str,
        progress: int,
        current_stage: str,
        estimated_remaining: Optional[int] = None,
    ):
        """
        發布進度更新

        參數:
        - project_id: 專案 ID
        - status: 狀態 (SCRIPT_GENERATING, ASSETS_GENERATING, etc.)
        - progress: 進度百分比 (0-100)
        - current_stage: 當前階段描述
        - estimated_remaining: 預計剩餘時間(秒)
        """
        message = {
            "event": "progress_update",
            "data": {
                "status": status,
                "progress": progress,
                "current_stage": current_stage,
                "estimated_remaining": estimated_remaining,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
        }

        redis = get_async_redis()
        await redis.publish(f"progress:{project_id}", json.dumps(message))

        logger.info(f"[Project {project_id}] Progress: {progress}% - {current_stage}")

    @staticmethod
    async def publish_stage_change(
        project_id: str, previous_stage: str, current_stage: str, progress: int
    ):
        """
        發布階段變化

        參數:
        - project_id: 專案 ID
        - previous_stage: 前一個階段
        - current_stage: 當前階段
        - progress: 當前進度 (0-100)
        """
        message = {
            "event": "stage_change",
            "data": {
                "previous_stage": previous_stage,
                "current_stage": current_stage,
                "progress": progress,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
        }

        redis = get_async_redis()
        await redis.publish(f"progress:{project_id}", json.dumps(message))

        logger.info(f"[Project {project_id}] Stage: {previous_stage} → {current_stage}")

    @staticmethod
    async def publish_log(project_id: str, level: str, message: str):
        """
        發布日誌訊息

        參數:
        - project_id: 專案 ID
        - level: INFO | WARNING | ERROR
        - message: 日誌內容
        """
        log_message = {
            "event": "log",
            "data": {
                "level": level,
                "message": message,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
        }

        redis = get_async_redis()
        await redis.publish(f"progress:{project_id}", json.dumps(log_message))

        logger.log(getattr(logging, level), f"[Project {project_id}] {message}")

    @staticmethod
    async def publish_error(
        project_id: str,
        error_code: str,
        error_message: str,
        stage: str,
        retry_count: int = 0,
        max_retries: int = 3,
        details: Optional[dict] = None,
        solutions: Optional[list] = None,
        trace_id: Optional[str] = None,
    ):
        """
        發布錯誤訊息（格式與 error-codes.md 一致）

        參數:
        - project_id: 專案 ID
        - error_code: 錯誤碼
        - error_message: 錯誤訊息
        - stage: 失敗的階段
        - retry_count: 重試次數
        - max_retries: 最大重試次數
        - details: 額外錯誤詳情
        - solutions: 解決方案列表
        - trace_id: 追蹤 ID
        """
        message = {
            "type": "error",
            "project_id": project_id,
            "error": {
                "code": error_code,
                "message": error_message,
                "stage": stage,
                "is_retryable": retry_count < max_retries,
                "retry_count": retry_count,
                "max_retries": max_retries,
                "details": details or {},
                "solutions": solutions or [],
                "trace_id": trace_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
        }

        redis = get_async_redis()
        await redis.publish(f"progress:{project_id}", json.dumps(message))

        logger.error(
            f"[Project {project_id}] Error: {error_code} - {error_message}",
            extra={"stage": stage, "retry_count": retry_count, "trace_id": trace_id},
        )

    @staticmethod
    async def publish_complete(
        project_id: str, status: str, youtube_url: Optional[str] = None
    ):
        """
        發布完成訊息

        參數:
        - project_id: 專案 ID
        - status: COMPLETED | FAILED
        - youtube_url: YouTube 影片連結 (如有)
        """
        message = {
            "event": "complete",
            "data": {
                "status": status,
                "youtube_url": youtube_url,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
        }

        redis = get_async_redis()
        await redis.publish(f"progress:{project_id}", json.dumps(message))

        logger.info(f"[Project {project_id}] Generation complete: {status}")
