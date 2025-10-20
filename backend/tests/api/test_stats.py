"""
Tests for Stats API.
"""
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

import pytest

from app.models.project import Project, ProjectStatus


@pytest.fixture
def mock_redis():
    """模擬 Redis 客戶端"""
    mock = Mock()
    mock.get.return_value = None  # 預設無快取
    mock.setex.return_value = True
    return mock


def test_get_stats_success_no_cache(client, db_session):
    """測試 1：成功取得統計資料（無快取）"""
    db = db_session
    # 準備測試資料
    now = datetime.now(timezone.utc)

    # 50 個專案（各種狀態）
    # 40 個 COMPLETED, 10 個 INITIALIZED (模擬 scheduled)
    for i in range(50):
        status = ProjectStatus.COMPLETED if i < 40 else ProjectStatus.INITIALIZED
        # 前 10 個在本月創建
        if i < 10:
            created_at = now - timedelta(days=i)
        # 其他在上個月或更早
        else:
            created_at = now - timedelta(days=35 + i)

        project = Project(
            name=f"Test Project {i}",
            content="Test content " * 100,
            status=status,
            gemini_model="gemini-1.5-pro",
            created_at=created_at
        )
        db.add(project)
    db.commit()

    # 調用 API (需要 Mock Redis)
    with patch('app.core.redis.get_redis') as mock_get_redis:
        mock_redis = Mock()
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        mock_get_redis.return_value = mock_redis

        response = client.get("/api/v1/stats")

    # 驗證
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_projects"] == 50
    assert data["data"]["projects_this_month"] == 10
    assert data["data"]["scheduled_projects"] == 10  # INITIALIZED 作為 scheduled
    assert "api_quotas" in data["data"]
    assert "did" in data["data"]["api_quotas"]
    assert "youtube" in data["data"]["api_quotas"]


def test_get_stats_with_cache(client, db_session, mock_redis):
    """測試 2：從 Redis 快取取得統計資料"""
    db = db_session
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

    # 調用 API
    with patch('app.core.redis.get_redis', return_value=mock_redis):
        response = client.get("/api/v1/stats")

    # 驗證
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_projects"] == 50
    assert data["data"]["projects_this_month"] == 10

    # 確認從快取讀取
    mock_redis.get.assert_called_once_with("stats:total")


def test_get_stats_redis_failure(client, db_session):
    """測試 3：Redis 連線失敗時降級到資料庫查詢"""
    db = db_session
    # 準備測試資料
    for i in range(50):
        project = Project(
            name=f"Test Project {i}",
            content="Test content " * 100,
            status=ProjectStatus.COMPLETED,
            gemini_model="gemini-1.5-pro"
        )
        db.add(project)
    db.commit()

    # 模擬 Redis 錯誤
    with patch('app.core.redis.get_redis') as mock_get_redis:
        import redis
        mock_redis = Mock()
        mock_redis.get.side_effect = redis.RedisError("Connection failed")
        mock_redis.setex.side_effect = redis.RedisError("Connection failed")
        mock_get_redis.return_value = mock_redis

        response = client.get("/api/v1/stats")

    # 驗證：應該成功回應（從資料庫查詢）
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_projects"] == 50


def test_projects_this_month_calculation(client, db_session):
    """測試 4：本月專案數正確計算"""
    db = db_session
    now = datetime.now(timezone.utc)

    # 上個月的專案（5 個）
    last_month = now - timedelta(days=35)
    for i in range(5):
        project = Project(
            name=f"Last Month Project {i}",
            content="Test content " * 100,
            gemini_model="gemini-1.5-pro",
            created_at=last_month
        )
        db.add(project)

    # 本月的專案（10 個）
    for i in range(10):
        project = Project(
            name=f"This Month Project {i}",
            content="Test content " * 100,
            gemini_model="gemini-1.5-pro",
            created_at=now - timedelta(days=i % 25)  # 確保在本月內
        )
        db.add(project)

    # 今天的專案（3 個）
    for i in range(3):
        project = Project(
            name=f"Today Project {i}",
            content="Test content " * 100,
            gemini_model="gemini-1.5-pro",
            created_at=now
        )
        db.add(project)

    db.commit()

    # 調用 API
    with patch('app.core.redis.get_redis') as mock_get_redis:
        mock_redis = Mock()
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        mock_get_redis.return_value = mock_redis

        response = client.get("/api/v1/stats")

    # 驗證
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total_projects"] == 18  # 5 + 10 + 3
    assert data["data"]["projects_this_month"] == 13  # 10 + 3 (不含上個月的 5 個)


def test_get_quota(client, db_session):
    """測試 5：取得 API 配額資訊"""
    db = db_session
    # 調用 API
    with patch('app.core.redis.get_redis') as mock_get_redis:
        mock_redis = Mock()
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        mock_get_redis.return_value = mock_redis

        response = client.get("/api/v1/stats/quota")

    # 驗證
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "did" in data["data"]
    assert "youtube" in data["data"]
    assert data["data"]["did"]["used"] >= 0
    assert data["data"]["did"]["total"] >= 0
    assert data["data"]["did"]["unit"] == "minutes"
    assert data["data"]["youtube"]["used"] >= 0
    assert data["data"]["youtube"]["total"] >= 0
    assert data["data"]["youtube"]["unit"] == "units"


def test_cache_lifecycle(client, db_session):
    """測試 6：完整快取生命週期測試"""
    db = db_session
    # 準備測試資料
    for i in range(10):
        project = Project(
            name=f"Test Project {i}",
            content="Test content " * 100,
            status=ProjectStatus.COMPLETED,
            gemini_model="gemini-1.5-pro"
        )
        db.add(project)
    db.commit()

    # 第一次調用 - 應該查詢資料庫並快取
    with patch('app.core.redis.get_redis') as mock_get_redis:
        mock_redis = Mock()
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        mock_get_redis.return_value = mock_redis

        response1 = client.get("/api/v1/stats")

        # 驗證快取寫入
        assert mock_redis.setex.called
        call_args = mock_redis.setex.call_args
        assert call_args[0][0] == "stats:total"  # cache key
        assert call_args[0][1] == 300  # TTL: 5 分鐘

    # 第二次調用 - 應該從快取讀取
    cached_data = {
        "total_projects": 10,
        "projects_this_month": 5,
        "scheduled_projects": 2,
        "api_quotas": {
            "did": {"used": 30, "total": 90, "unit": "minutes"},
            "youtube": {"used": 2000, "total": 10000, "unit": "units"}
        }
    }

    with patch('app.core.redis.get_redis') as mock_get_redis:
        mock_redis = Mock()
        mock_redis.get.return_value = json.dumps(cached_data)
        mock_get_redis.return_value = mock_redis

        response2 = client.get("/api/v1/stats")

        # 驗證從快取讀取
        mock_redis.get.assert_called_with("stats:total")
        assert response2.json()["data"]["total_projects"] == 10
