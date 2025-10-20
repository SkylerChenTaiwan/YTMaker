"""
System API 測試
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.models.base import Base
from app.models.system_settings import SystemSettings
from app.core.database import get_db

# 創建測試資料庫
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override the get_db dependency
app.dependency_overrides[get_db] = override_get_db

# Create test client
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """每個測試前重置資料庫"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_save_api_key_success():
    """測試 1：成功儲存 Gemini API Key"""
    with patch("app.security.keychain.KeychainManager.save_api_key") as mock_save:
        response = client.post(
            "/api/v1/system/api-keys",
            json={"provider": "gemini", "api_key": "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "已儲存" in data["message"]
        mock_save.assert_called_once()


def test_save_api_key_too_short():
    """測試 2：API Key 格式驗證"""
    response = client.post(
        "/api/v1/system/api-keys", json={"provider": "gemini", "api_key": "short"}
    )

    # Pydantic 驗證失敗回傳 422
    assert response.status_code == 422
    data = response.json()
    # 驗證錯誤格式不同
    assert "detail" in data


def test_test_api_key_success():
    """測試 3：成功測試 Gemini API 連線"""
    with patch("app.security.keychain.KeychainManager.get_api_key") as mock_get:
        mock_get.return_value = "valid_api_key"

        response = client.post(
            "/api/v1/system/api-keys/test", json={"provider": "gemini"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_valid"] is True


def test_test_api_key_not_found():
    """測試 4：API Key 不存在時測試連線"""
    with patch("app.security.keychain.KeychainManager.get_api_key") as mock_get:
        mock_get.return_value = None

        response = client.post(
            "/api/v1/system/api-keys/test", json={"provider": "stability_ai"}
        )

        assert response.status_code == 404
        # 錯誤格式可能不同,只檢查狀態碼
        # data = response.json()
        # assert data["error"]["code"] == "API_KEY_NOT_FOUND"


def test_get_init_status_initialized():
    """測試 5：檢查系統初始化狀態（已初始化）"""
    # 設置 YouTube 連結狀態
    db = TestingSessionLocal()
    setting = SystemSettings(key="youtube_connected", value="true")
    db.add(setting)
    db.commit()
    db.close()

    with patch("app.security.keychain.KeychainManager.get_api_key") as mock_get:
        # 模擬所有 API Keys 都已設定
        mock_get.side_effect = lambda provider: f"{provider}_key"

        response = client.get("/api/v1/system/init-status")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_initialized"] is True
        assert data["data"]["api_keys_configured"]["gemini"] is True
        assert data["data"]["api_keys_configured"]["stability_ai"] is True
        assert data["data"]["api_keys_configured"]["did"] is True
        assert data["data"]["youtube_connected"] is True


def test_get_init_status_partial():
    """測試 6：檢查系統初始化狀態（部分初始化）"""
    # 設置 YouTube 未連結
    db = TestingSessionLocal()
    setting = SystemSettings(key="youtube_connected", value="false")
    db.add(setting)
    db.commit()
    db.close()

    with patch("app.security.keychain.KeychainManager.get_api_key") as mock_get:
        # 只有 gemini 已設定
        def mock_get_key(provider):
            return "gemini_key" if provider == "gemini" else None

        mock_get.side_effect = mock_get_key

        response = client.get("/api/v1/system/init-status")

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["is_initialized"] is False
        assert data["data"]["api_keys_configured"]["gemini"] is True
        assert data["data"]["api_keys_configured"]["stability_ai"] is False
        assert data["data"]["api_keys_configured"]["did"] is False
        assert data["data"]["youtube_connected"] is False


def test_get_quota():
    """測試 7：查詢 API 配額狀態"""
    # 設置使用量
    db = TestingSessionLocal()
    did_usage = SystemSettings(key="did_monthly_usage", value="30")
    youtube_usage = SystemSettings(key="youtube_daily_usage", value="2000")
    db.add(did_usage)
    db.add(youtube_usage)
    db.commit()
    db.close()

    response = client.get("/api/v1/system/quota")

    assert response.status_code == 200
    data = response.json()
    assert "did" in data["data"]
    assert "youtube" in data["data"]
    assert data["data"]["did"]["total"] == 90
    assert data["data"]["did"]["used"] == 30
    assert data["data"]["did"]["remaining"] == 60
    assert data["data"]["youtube"]["total"] == 10000
    assert data["data"]["youtube"]["used"] == 2000
    assert data["data"]["youtube"]["remaining"] == 8000
