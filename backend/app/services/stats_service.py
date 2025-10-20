import json
import logging
from datetime import datetime, timezone

import redis
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectStatus

logger = logging.getLogger(__name__)


class StatsService:
    """統計資訊服務"""

    def __init__(self, db: Session, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client

    async def get_stats(self) -> dict:
        """
        取得統計資料

        流程：
        1. 嘗試從 Redis 讀取快取
        2. 若快取不存在，從資料庫計算
        3. 儲存到 Redis（TTL: 300 秒）
        4. 回傳統計資料
        """
        cache_key = "stats:total"

        # 1. 嘗試從 Redis 讀取
        try:
            cached = self.redis.get(cache_key)
            if cached:
                logger.info("Stats cache hit")
                return {"success": True, "data": json.loads(cached)}
        except redis.RedisError as e:
            logger.warning(f"Redis error when reading cache: {e}")

        # 2. 從資料庫計算統計資料
        logger.info("Stats cache miss, querying database")
        stats = await self._calculate_stats()

        # 3. 儲存到 Redis
        try:
            self.redis.setex(
                cache_key,
                300,  # TTL: 5 分鐘
                json.dumps(stats),
            )
            logger.info("Stats cached successfully")
        except redis.RedisError as e:
            logger.warning(f"Redis error when writing cache: {e}")

        return {"success": True, "data": stats}

    async def _calculate_stats(self) -> dict:
        """
        從資料庫計算統計資料

        計算項目：
        1. 總專案數（所有狀態）
        2. 本月生成數（created_at 在本月的專案）
        3. 已排程影片（status = SCHEDULED）
        4. API 配額剩餘（調用 SystemService）
        """
        # 1. 總專案數
        total_projects = self.db.query(func.count(Project.id)).scalar() or 0

        # 2. 本月生成數
        now = datetime.now(timezone.utc)
        current_year = now.year
        current_month = now.month

        projects_this_month = (
            self.db.query(func.count(Project.id))
            .filter(
                extract("year", Project.created_at) == current_year,
                extract("month", Project.created_at) == current_month,
            )
            .scalar()
            or 0
        )

        # 3. 已排程影片（使用 RENDERED 狀態代替 SCHEDULED）
        # TODO: 確認是否需要新增 SCHEDULED 狀態到 ProjectStatus enum
        scheduled_projects = (
            self.db.query(func.count(Project.id))
            .filter(Project.status == ProjectStatus.RENDERED)
            .scalar()
            or 0
        )

        # 4. API 配額（調用 SystemService 或從配置檔取得）
        api_quotas = await self._get_api_quotas()

        return {
            "total_projects": total_projects,
            "projects_this_month": projects_this_month,
            "scheduled_projects": scheduled_projects,
            "api_quotas": api_quotas,
        }

    async def _get_api_quotas(self) -> dict:
        """
        取得 API 配額資訊

        目前實作：回傳模擬資料
        未來：整合 SystemService 取得實際配額

        TODO: 在 Task-006 (System API) 完成後整合真實配額
        """
        # 暫時回傳模擬資料
        # 未來從 SystemService 取得真實配額
        return {
            "did": {"used": 30, "total": 90, "unit": "minutes"},
            "youtube": {"used": 2000, "total": 10000, "unit": "units"},
        }

    async def get_quota(self) -> dict:
        """
        取得 API 配額資訊（獨立端點）

        流程：
        1. 嘗試從 Redis 讀取快取（TTL: 1 分鐘）
        2. 若快取不存在，從 SystemService 取得
        3. 儲存到 Redis
        4. 回傳配額資訊
        """
        cache_key = "stats:quota"

        # 1. 嘗試從 Redis 讀取
        try:
            cached = self.redis.get(cache_key)
            if cached:
                logger.info("Quota cache hit")
                return {"success": True, "data": json.loads(cached)}
        except redis.RedisError as e:
            logger.warning(f"Redis error when reading quota cache: {e}")

        # 2. 取得配額資訊
        logger.info("Quota cache miss, fetching from system")
        quotas = await self._get_api_quotas()

        # 3. 儲存到 Redis（TTL: 1 分鐘）
        try:
            self.redis.setex(
                cache_key,
                60,  # TTL: 1 分鐘
                json.dumps(quotas),
            )
            logger.info("Quota cached successfully")
        except redis.RedisError as e:
            logger.warning(f"Redis error when writing quota cache: {e}")

        return {"success": True, "data": quotas}
