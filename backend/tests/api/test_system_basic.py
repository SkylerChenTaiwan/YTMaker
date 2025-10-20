"""基礎 System API 測試 - 不依賴資料庫"""
from unittest.mock import MagicMock, Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Mock all dependencies before importing app
with patch('app.services.system_service.KeychainManager') as mock_kc, \
     patch('app.core.database.get_db') as mock_get_db:

    # Setup KeychainManager mock
    keychain_inst = MagicMock()
    keychain_inst.get_api_key = Mock(return_value="test_key")
    keychain_inst.save_api_key = Mock()
    mock_kc.return_value = keychain_inst

    # Setup DB mock
    db_inst = MagicMock(spec=Session)
    mock_get_db.return_value = db_inst

    from app.main import app

    client = TestClient(app)


def test_save_api_key_success():
    """測試 1：成功儲存 Gemini API Key"""
    response = client.post("/api/v1/system/api-keys", json={
        "provider": "gemini",
        "api_key": "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "已儲存" in data["message"]


def test_save_api_key_too_short():
    """測試 2：API Key 格式驗證"""
    response = client.post("/api/v1/system/api-keys", json={
        "provider": "gemini",
        "api_key": "short"
    })

    # Pydantic 驗證失敗返回 422
    assert response.status_code == 422


def test_test_api_key_success():
    """測試 3：成功測試 Gemini API 連線"""
    with patch('app.services.system_service.KeychainManager') as mock_kc:
        keychain_inst = MagicMock()
        keychain_inst.get_api_key = Mock(return_value="valid_api_key")
        mock_kc.return_value = keychain_inst

        response = client.post("/api/v1/system/api-keys/test", json={
            "provider": "gemini"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_valid"] is True


def test_test_api_key_not_found():
    """測試 4：API Key 不存在時測試連線"""
    with patch('app.services.system_service.KeychainManager') as mock_kc:
        keychain_inst = MagicMock()
        keychain_inst.get_api_key = Mock(return_value=None)
        mock_kc.return_value = keychain_inst

        response = client.post("/api/v1/system/api-keys/test", json={
            "provider": "stability_ai"
        })

        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "NOT_FOUND"
