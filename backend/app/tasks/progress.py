"""Redis Pub/Sub 進度通知模組"""

import json
from datetime import datetime
from enum import Enum

import redis

from app.core.config import settings

# Redis 客戶端
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True,
)


class ProgressStage(str, Enum):
    """進度階段"""

    SCRIPT_GENERATION = "script_generation"
    ASSET_GENERATION = "asset_generation"
    VIDEO_RENDERING = "video_rendering"
    THUMBNAIL_GENERATION = "thumbnail_generation"
    YOUTUBE_UPLOAD = "youtube_upload"
    ERROR = "error"


def publish_progress(
    project_id: int,
    stage: ProgressStage,
    progress: int,
    message: str,
    error: str | None = None,
    data: dict | None = None,
):
    """
    發布進度更新到 Redis Pub/Sub

    Args:
        project_id: 專案 ID
        stage: 進度階段
        progress: 進度百分比（0-100）
        message: 進度訊息
        error: 錯誤訊息（如果有）
        data: 額外資料
    """
    channel = f"progress:{project_id}"

    payload = {
        "project_id": project_id,
        "stage": stage.value,
        "progress": progress,
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
    }

    if error:
        payload["error"] = error

    if data:
        payload["data"] = data

    redis_client.publish(channel, json.dumps(payload))


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
