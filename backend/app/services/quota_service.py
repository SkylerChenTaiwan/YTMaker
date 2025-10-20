"""配額管理服務"""

import logging
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.models.quota_usage import QuotaUsage

logger = logging.getLogger(__name__)


class QuotaService:
    """
    API 配額管理服務

    追蹤各 API 的配額使用情況
    """

    # YouTube API 配額限制
    YOUTUBE_DAILY_QUOTA = 10000
    YOUTUBE_UPLOAD_COST = 1600
    YOUTUBE_THUMBNAIL_COST = 50

    def __init__(self, db: Session):
        self.db = db

    async def check_quota(self, service: str, cost: int) -> bool:
        """
        檢查配額是否足夠

        Args:
            service: 服務名稱（"youtube", "gemini", etc.）
            cost: 本次操作消耗的配額

        Returns:
            bool: 配額是否足夠
        """
        today = date.today()

        usage = (
            self.db.query(QuotaUsage)
            .filter(QuotaUsage.service == service, QuotaUsage.date == today)
            .first()
        )

        if not usage:
            # 今日尚未使用，配額充足
            return True

        if service == "youtube":
            remaining = self.YOUTUBE_DAILY_QUOTA - usage.used_units
            return remaining >= cost

        return True

    async def record_usage(self, service: str, cost: int) -> None:
        """
        記錄配額使用

        Args:
            service: 服務名稱
            cost: 消耗的配額
        """
        today = date.today()

        usage = (
            self.db.query(QuotaUsage)
            .filter(QuotaUsage.service == service, QuotaUsage.date == today)
            .first()
        )

        if usage:
            usage.used_units += cost
        else:
            usage = QuotaUsage(service=service, date=today, used_units=cost)
            self.db.add(usage)

        self.db.commit()

        logger.info(f"{service} quota used: {cost} units (total today: {usage.used_units})")

    async def get_quota_usage(self, service: str, query_date: date) -> dict[str, Any]:
        """
        查詢配額使用情況

        Args:
            service: 服務名稱
            query_date: 查詢日期

        Returns:
            配額使用資訊
        """
        usage = (
            self.db.query(QuotaUsage)
            .filter(QuotaUsage.service == service, QuotaUsage.date == query_date)
            .first()
        )

        if service == "youtube":
            used_units = usage.used_units if usage else 0
            remaining_units = self.YOUTUBE_DAILY_QUOTA - used_units
            uploads_today = used_units // (self.YOUTUBE_UPLOAD_COST + self.YOUTUBE_THUMBNAIL_COST)

            return {
                "service": service,
                "date": query_date.isoformat(),
                "total_quota": self.YOUTUBE_DAILY_QUOTA,
                "used_units": used_units,
                "remaining_units": remaining_units,
                "uploads_today": uploads_today,
                "can_upload": remaining_units
                >= (self.YOUTUBE_UPLOAD_COST + self.YOUTUBE_THUMBNAIL_COST),
            }

        return {}
