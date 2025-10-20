"""WebSocket 測試共用 fixtures"""
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from app.main import app
from app.core.redis import get_async_redis


@pytest.fixture
def test_client():
    """FastAPI 測試客戶端"""
    return TestClient(app)


@pytest_asyncio.fixture
async def redis_client():
    """異步 Redis 客戶端"""
    client = get_async_redis()
    yield client
    # 清理測試數據
    await client.flushdb()


@pytest.fixture
def test_project_id():
    """測試專案 ID"""
    return "test_project_1"
