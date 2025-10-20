import time
from datetime import datetime, timezone

from fastapi import APIRouter, Response, status

from app.core.database import get_db
from app.core.redis import get_redis
from app.schemas.common import DetailedHealthStatus, HealthStatus, ServiceStatus

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthStatus,
    summary="基本健康檢查",
    description="檢查 API 伺服器是否正常運行",
)
async def health_check():
    """基本健康檢查端點"""
    return HealthStatus(status="healthy", timestamp=datetime.now(timezone.utc))


@router.get(
    "/api/v1/health",
    response_model=DetailedHealthStatus,
    summary="詳細健康檢查",
    description="檢查 API 伺服器及相關服務(資料庫、Redis)的狀態",
)
async def detailed_health_check(response: Response):
    """詳細健康檢查端點(包含資料庫和 Redis)"""

    services = {}
    overall_healthy = True

    # 檢查資料庫連線
    try:
        db = next(get_db())
        start_time = time.time()
        db.execute("SELECT 1")
        latency = int((time.time() - start_time) * 1000)

        services["database"] = ServiceStatus(status="connected", latency_ms=latency)
    except Exception as e:
        overall_healthy = False
        services["database"] = ServiceStatus(status="disconnected", error=str(e))

    # 檢查 Redis 連線
    try:
        redis_client = get_redis()
        start_time = time.time()
        redis_client.ping()
        latency = int((time.time() - start_time) * 1000)

        services["redis"] = ServiceStatus(status="connected", latency_ms=latency)
    except Exception as e:
        overall_healthy = False
        services["redis"] = ServiceStatus(status="disconnected", error=str(e))

    # 設定 HTTP 狀態碼
    if not overall_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return DetailedHealthStatus(
        status="healthy" if overall_healthy else "unhealthy",
        services=services,
        timestamp=datetime.now(timezone.utc),
    )
