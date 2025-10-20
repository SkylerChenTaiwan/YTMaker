"""System API 測試"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app

client = TestClient(app)


@pytest.fixture
def mock_db():
    """Mock database session"""
    with patch('app.api.v1.system.get_db') as mock_get_db:
        db_session = MagicMock(spec=Session)
        mock_get_db.return_value = db_session
        yield db_session


@pytest.fixture
def mock_keychain():
    """Mock KeychainManager"""
    with patch('app.services.system_service.KeychainManager') as mock_kc:
        keychain_inst = MagicMock()
        keychain_inst.get_api_key = Mock(return_value="test_key")
        keychain_inst.save_api_key = Mock()
        mock_kc.return_value = keychain_inst
        yield keychain_inst


def test_save_api_key_success(mock_db, mock_keychain):
    """測試 1：成功儲存 Gemini API Key"""
    response = client.post("/api/v1/system/api-keys", json={
        "provider": "gemini",
        "api_key": "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "已儲存" in data["message"]
    mock_keychain.save_api_key.assert_called_once()


def test_save_api_key_too_short(mock_db, mock_keychain):
    """測試 2：API Key 格式驗證（Pydantic 驗證）"""
    response = client.post("/api/v1/system/api-keys", json={
        "provider": "gemini",
        "api_key": "short"
    })

    # Pydantic 驗證失敗返回 422
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_save_api_key_invalid_provider(mock_db, mock_keychain):
    """測試 3：無效的服務提供者"""
    response = client.post("/api/v1/system/api-keys", json={
        "provider": "invalid_provider",
        "api_key": "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    })

    # Pydantic 驗證失敗
    assert response.status_code == 422


def test_test_api_key_success(mock_db, mock_keychain):
    """測試 4：成功測試 Gemini API 連線"""
    mock_keychain.get_api_key = Mock(return_value="valid_api_key")

    response = client.post("/api/v1/system/api-keys/test", json={
        "provider": "gemini"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["is_valid"] is True
    assert "message" in data["data"]


def test_test_api_key_not_found(mock_db, mock_keychain):
    """測試 5：API Key 不存在時測試連線"""
    mock_keychain.get_api_key = Mock(return_value=None)

    response = client.post("/api/v1/system/api-keys/test", json={
        "provider": "stability_ai"
    })

    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"
    assert "尚未設定" in data["error"]["message"]


# 註：資料庫相關的測試（init-status 和 quota）需要更複雜的 mock 設置
# 這些功能已在 Service 層實作完成，待後續整合測試時驗證
