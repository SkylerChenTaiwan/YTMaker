"""Redis 連線管理"""
import redis
import redis.asyncio as aioredis

from app.core.config import settings

redis_client = None
async_redis_client = None


def get_redis():
    """取得同步 Redis client"""
    global redis_client
    if redis_client is None:
        redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True,
        )
    return redis_client


def get_async_redis():
    """取得異步 Redis client (用於 WebSocket)"""
    global async_redis_client
    if async_redis_client is None:
        async_redis_client = aioredis.from_url(
            f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
            encoding="utf-8",
            decode_responses=True,
        )
    return async_redis_client
