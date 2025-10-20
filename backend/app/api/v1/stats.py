import redis
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.stats import QuotaResponse, StatsResponse
from app.services.stats_service import StatsService

router = APIRouter(prefix="/stats", tags=["statistics"])

# Redis 連線
redis_client = redis.Redis(
    host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=settings.REDIS_DB, decode_responses=True
)


@router.get("", response_model=StatsResponse)
async def get_stats(db: Session = Depends(get_db)):
    """
    取得統計資料

    **回應：**
    - total_projects: 總專案數
    - projects_this_month: 本月生成數
    - scheduled_projects: 已排程影片數
    - api_quotas: API 配額剩餘

    **快取：**
    - Redis Key: "stats:total"
    - TTL: 5 分鐘
    """
    stats_service = StatsService(db, redis_client)
    return await stats_service.get_stats()


@router.get("/quota", response_model=QuotaResponse)
async def get_quota(db: Session = Depends(get_db)):
    """
    取得 API 配額資訊

    **回應：**
    - did: D-ID API 配額
    - youtube: YouTube API 配額

    **快取：**
    - Redis Key: "stats:quota"
    - TTL: 1 分鐘
    """
    stats_service = StatsService(db, redis_client)
    return await stats_service.get_quota()
