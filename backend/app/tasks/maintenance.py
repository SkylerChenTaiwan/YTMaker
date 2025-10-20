"""維護任務 - 配額同步等定期任務"""

import json
import logging

from app.celery_app import celery_app
from app.tasks.progress import redis_client

logger = logging.getLogger(__name__)


@celery_app.task
def sync_quotas():
    """
    同步 API 配額資訊

    定期調用第三方 API 取得配額使用情況
    """
    logger.info("Starting quota sync")

    try:
        # 同步 D-ID 配額
        from app.integrations.did_client import DIDClient

        did_client = DIDClient()
        did_quota = did_client.get_quota()

        redis_client.setex(
            "quota:did",
            3600,  # 1 小時過期
            json.dumps(did_quota),
        )

        logger.info(f"D-ID quota synced: {did_quota}")

        # 檢查配額警告（< 10%）
        if did_quota.get("remaining", 0) / did_quota.get("total", 1) < 0.1:
            logger.warning(
                f"D-ID quota low: {did_quota.get('remaining')}/{did_quota.get('total')}"
            )
            # TODO: 發送通知

    except Exception as e:
        logger.error(f"Failed to sync D-ID quota: {str(e)}")

    try:
        # 同步 YouTube 配額
        from app.integrations.youtube_client import YouTubeClient

        youtube_client = YouTubeClient()
        youtube_quota = youtube_client.get_quota()

        redis_client.setex("quota:youtube", 3600, json.dumps(youtube_quota))

        logger.info(f"YouTube quota synced: {youtube_quota}")

        if youtube_quota.get("used", 0) / youtube_quota.get("total", 1) > 0.9:
            logger.warning(
                f"YouTube quota low: {youtube_quota.get('used')}/{youtube_quota.get('total')}"
            )

    except Exception as e:
        logger.error(f"Failed to sync YouTube quota: {str(e)}")

    logger.info("Quota sync completed")
