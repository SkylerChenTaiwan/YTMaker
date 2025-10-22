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


def test_save_api_key_with_camelcase_should_fail(mock_db, mock_keychain):
    """測試：前端錯誤傳送 camelCase (apiKey) 時應該回傳 422

    這個測試確保前後端 API 格式不一致時會被捕捉。
    這是 Issue-007 的根本問題：前端傳送 apiKey，後端期待 api_key。
    """
    response = client.post("/api/v1/system/api-keys", json={
        "provider": "gemini",
        "apiKey": "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"  # ❌ 錯誤：使用 camelCase
    })

    # Pydantic 驗證失敗，因為缺少必要欄位 api_key
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    # 驗證錯誤訊息包含缺少 api_key 的資訊
    assert any("api_key" in str(error) for error in data["detail"])


def test_save_api_key_with_snake_case_should_succeed(mock_db, mock_keychain):
    """測試：使用正確的 snake_case (api_key) 格式應該成功

    確保正確的格式能夠通過驗證。
    """
    response = client.post("/api/v1/system/api-keys", json={
        "provider": "gemini",
        "api_key": "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"  # ✅ 正確：使用 snake_case
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    mock_keychain.save_api_key.assert_called_once()


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

    # Mock Gemini API 呼叫
    with patch('app.integrations.gemini_client.GeminiClient.list_models') as mock_list_models:
        mock_list_models.return_value = ['gemini-pro', 'gemini-pro-vision']  # 模擬成功回應

        response = client.post("/api/v1/system/api-keys/test", json={
            "provider": "gemini",
            "api_key": "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"  # ✅ 正確格式
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_valid"] is True
        assert "message" in data["data"]


def test_test_api_key_with_camelcase_should_fail(mock_db, mock_keychain):
    """測試：測試 API Key 時傳送 camelCase (apiKey) 應該回傳 422

    確保前端格式錯誤時會被 Pydantic 驗證捕捉。
    """
    response = client.post("/api/v1/system/api-keys/test", json={
        "provider": "gemini",
        "apiKey": "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"  # ❌ 錯誤：使用 camelCase
    })

    # Pydantic 驗證失敗
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_test_api_key_not_found(mock_db, mock_keychain):
    """測試 5：提供 API Key 進行測試（不依賴 keychain）

    注意：test API endpoint 期待前端傳入 api_key，
    不是從 keychain 讀取，所以這個測試應該測試無效的 API Key。
    """
    # Mock Gemini API 呼叫失敗
    with patch('app.integrations.gemini_client.GeminiClient.list_models') as mock_list_models:
        mock_list_models.side_effect = Exception("Invalid API Key")

        response = client.post("/api/v1/system/api-keys/test", json={
            "provider": "gemini",
            "api_key": "invalid-key-123456"  # 無效的 API Key
        })

        assert response.status_code == 200  # API 正常回應
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_valid"] is False  # 但驗證失敗
        assert "連線失敗" in data["data"]["message"]


# 註：資料庫相關的測試（init-status 和 quota）需要更複雜的 mock 設置
# 這些功能已在 Service 層實作完成，待後續整合測試時驗證
