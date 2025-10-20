import pytest
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectStatus
from app.services.stats_service import StatsService
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock
import redis
import json


@pytest.fixture
def mock_redis():
    """模擬 Redis 客戶端"""
    mock = Mock(spec=redis.Redis)
    mock.get.return_value = None  # 預設無快取
    mock.setex.return_value = True
    return mock


@pytest.mark.asyncio
async def test_get_stats_success_no_cache(db: Session, mock_redis):
    """測試 1：成功取得統計資料（無快取）"""
    # 準備測試資料 - 50 個專案（各種狀態）
    for i in range(50):
        status = ProjectStatus.COMPLETED if i < 40 else ProjectStatus.RENDERED
        created_at = datetime.now(timezone.utc) - timedelta(days=i)
        project = Project(
            name=f"Test Project {i}",
            content="Test content",
            status=status,
            gemini_model="gemini-pro",
            created_at=created_at
        )
        db.add(project)
    db.commit()

    # 建立 StatsService 並調用
    stats_service = StatsService(db, mock_redis)
    result = await stats_service.get_stats()

    # 驗證
    assert result["success"] is True
    assert result["data"]["total_projects"] == 50
    assert result["data"]["projects_this_month"] >= 0  # 取決於當前月份
    assert result["data"]["scheduled_projects"] == 10  # 10 個 RENDERED 狀態
    assert "api_quotas" in result["data"]
    assert "did" in result["data"]["api_quotas"]
    assert "youtube" in result["data"]["api_quotas"]

    # 驗證 Redis 被調用
    mock_redis.get.assert_called_once_with("stats:total")
    mock_redis.setex.assert_called_once()


@pytest.mark.asyncio
async def test_get_stats_with_cache(db: Session, mock_redis):
    """測試 2：從 Redis 快取取得統計資料"""
    # 設定 Redis 返回快取資料
    cached_data = {
        "total_projects": 50,
        "projects_this_month": 10,
        "scheduled_projects": 3,
        "api_quotas": {
            "did": {"used": 30, "total": 90, "unit": "minutes"},
            "youtube": {"used": 2000, "total": 10000, "unit": "units"}
        }
    }
    mock_redis.get.return_value = json.dumps(cached_data)

    # 建立 StatsService 並調用
    stats_service = StatsService(db, mock_redis)
    result = await stats_service.get_stats()

    # 驗證
    assert result["success"] is True
    assert result["data"]["total_projects"] == 50
    assert result["data"]["projects_this_month"] == 10
    assert result["data"]["scheduled_projects"] == 3

    # 確認從快取讀取
    mock_redis.get.assert_called_once_with("stats:total")
    # 因為使用快取，不應該寫入
    mock_redis.setex.assert_not_called()


@pytest.mark.asyncio
async def test_get_stats_redis_failure(db: Session, mock_redis):
    """測試 3：Redis 連線失敗時降級到資料庫查詢"""
    # 模擬 Redis 錯誤
    mock_redis.get.side_effect = redis.RedisError("Connection failed")

    # 準備測試資料
    for i in range(50):
        project = Project(
            name=f"Test Project {i}",
            content="Test content",
            status=ProjectStatus.COMPLETED,
            gemini_model="gemini-pro"
        )
        db.add(project)
    db.commit()

    # 建立 StatsService 並調用
    stats_service = StatsService(db, mock_redis)
    result = await stats_service.get_stats()

    # 驗證：應該成功回應（從資料庫查詢）
    assert result["success"] is True
    assert result["data"]["total_projects"] == 50


@pytest.mark.asyncio
async def test_projects_this_month_calculation(db: Session, mock_redis):
    """測試 4：本月專案數正確計算"""
    now = datetime.now(timezone.utc)

    # 上個月的專案（5 個）
    last_month = now - timedelta(days=35)
    for i in range(5):
        project = Project(
            name=f"Last Month Project {i}",
            content="Test content",
            gemini_model="gemini-pro",
            created_at=last_month
        )
        db.add(project)

    # 本月的專案（10 個）
    for i in range(10):
        project = Project(
            name=f"This Month Project {i}",
            content="Test content",
            gemini_model="gemini-pro",
            created_at=now - timedelta(days=i)
        )
        db.add(project)

    # 今天的專案（3 個）
    for i in range(3):
        project = Project(
            name=f"Today Project {i}",
            content="Test content",
            gemini_model="gemini-pro",
            created_at=now
        )
        db.add(project)

    db.commit()

    # 建立 StatsService 並調用
    stats_service = StatsService(db, mock_redis)
    result = await stats_service.get_stats()

    # 驗證
    assert result["success"] is True
    assert result["data"]["total_projects"] == 18  # 5 + 10 + 3
    assert result["data"]["projects_this_month"] == 13  # 10 + 3 (不含上個月的 5 個)


@pytest.mark.asyncio
async def test_get_quota(db: Session, mock_redis):
    """測試 5：取得 API 配額資訊"""
    # 建立 StatsService 並調用
    stats_service = StatsService(db, mock_redis)
    result = await stats_service.get_quota()

    # 驗證
    assert result["success"] is True
    assert "did" in result["data"]
    assert "youtube" in result["data"]
    assert result["data"]["did"]["used"] >= 0
    assert result["data"]["did"]["total"] >= 0
    assert result["data"]["did"]["unit"] == "minutes"
    assert result["data"]["youtube"]["used"] >= 0
    assert result["data"]["youtube"]["total"] >= 0
    assert result["data"]["youtube"]["unit"] == "units"
