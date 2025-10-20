import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


def test_list_gemini_models_success(client):
    """測試：成功列出 Gemini 模型"""
    mock_models = [
        {
            "name": "models/gemini-2.5-flash",
            "display_name": "Gemini 2.5 Flash",
            "description": "Fast model",
            "supported_generation_methods": ["generateContent"],
        },
        {
            "name": "models/gemini-2.5-pro",
            "display_name": "Gemini 2.5 Pro",
            "description": "High quality model",
            "supported_generation_methods": ["generateContent"],
        },
    ]

    # Mock Keychain 和 GeminiClient
    with patch("app.api.v1.gemini.KeychainManager") as mock_keychain_class:
        with patch("app.api.v1.gemini.GeminiClient.list_models") as mock_list:
            # Mock Keychain.get_api_key() 回傳測試 API Key
            mock_keychain = mock_keychain_class.return_value
            mock_keychain.get_api_key.return_value = "test-api-key"

            # Mock list_models() 回傳模型列表
            mock_list.return_value = mock_models

            # 調用 API
            response = client.get("/api/v1/gemini/models")

            # 驗證
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "models" in data["data"]
            assert len(data["data"]["models"]) == 2
            assert data["data"]["models"][0]["name"] == "models/gemini-2.5-flash"
            assert data["data"]["models"][1]["name"] == "models/gemini-2.5-pro"


def test_list_gemini_models_no_api_key(client):
    """測試：未設定 API Key 時回傳錯誤"""
    # Mock Keychain.get_api_key() 回傳 None
    with patch("app.api.v1.gemini.KeychainManager") as mock_keychain_class:
        mock_keychain = mock_keychain_class.return_value
        mock_keychain.get_api_key.return_value = None

        # 調用 API
        response = client.get("/api/v1/gemini/models")

        # 驗證
        assert response.status_code == 400
        data = response.json()
        assert "Gemini API Key 尚未配置" in data["detail"]


def test_list_gemini_models_api_error(client):
    """測試：Gemini API 錯誤時回傳 500"""
    # Mock Keychain 和 GeminiClient
    with patch("app.api.v1.gemini.KeychainManager") as mock_keychain_class:
        with patch("app.api.v1.gemini.GeminiClient.list_models") as mock_list:
            from app.integrations.gemini_client import GeminiAPIError

            # Mock Keychain.get_api_key() 回傳測試 API Key
            mock_keychain = mock_keychain_class.return_value
            mock_keychain.get_api_key.return_value = "invalid-key"

            # Mock list_models() 拋出錯誤
            mock_list.side_effect = GeminiAPIError("API 錯誤")

            # 調用 API
            response = client.get("/api/v1/gemini/models")

            # 驗證
            assert response.status_code == 500
            data = response.json()
            assert "API 錯誤" in data["detail"]
