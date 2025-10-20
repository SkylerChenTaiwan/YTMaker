from unittest.mock import MagicMock, Mock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# 在 app import 前設置 mock
mock_keychain_patcher = patch('app.services.system_service.KeychainManager')
mock_keychain = mock_keychain_patcher.start()

from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_mocks():
    """自動設置所有必要的 mocks"""
    # Mock KeychainManager
    keychain_instance = MagicMock()
    keychain_instance.get_api_key = Mock(return_value="test_key")
    keychain_instance.save_api_key = Mock()
    mock_keychain.return_value = keychain_instance

    # Mock database queries
    with patch('app.api.v1.system.get_db') as mock_db_func:
        db_session = MagicMock(spec=Session)
        mock_db_func.return_value = db_session

        # 設置預設的查詢行為
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.first.return_value = None
        mock_query.filter.return_value = mock_filter
        db_session.query.return_value = mock_query

        yield {
            'keychain': keychain_instance,
            'db': db_session
        }


def teardown_module(module):
    """清理 mock"""
    mock_keychain_patcher.stop()


def test_save_api_key_success(setup_mocks):
    """測試 1：成功儲存 Gemini API Key"""
    response = client.post("/api/v1/system/api-keys", json={
        "provider": "gemini",
        "api_key": "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "已儲存" in data["message"]


def test_save_api_key_too_short(setup_mocks):
    """測試 2：API Key 格式驗證 (Pydantic 驗證返回 422)"""
    response = client.post("/api/v1/system/api-keys", json={
        "provider": "gemini",
        "api_key": "short"
    })

    # Pydantic 驗證失敗返回 422
    assert response.status_code == 422
    data = response.json()
    # FastAPI 的 Pydantic 驗證錯誤格式
    assert "detail" in data


def test_test_api_key_success(setup_mocks):
    """測試 3：成功測試 Gemini API 連線"""
    setup_mocks['keychain'].get_api_key = Mock(return_value="valid_api_key")

    response = client.post("/api/v1/system/api-keys/test", json={
        "provider": "gemini"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["is_valid"] is True


def test_test_api_key_not_found(setup_mocks):
    """測試 4：API Key 不存在時測試連線"""
    setup_mocks['keychain'].get_api_key = Mock(return_value=None)

    response = client.post("/api/v1/system/api-keys/test", json={
        "provider": "stability_ai"
    })

    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"


def test_get_init_status_initialized(setup_mocks):
    """測試 5：檢查系統初始化狀態（已初始化）"""
    # 模擬所有 API Keys 都已設定
    setup_mocks['keychain'].get_api_key = Mock(side_effect=lambda provider: f"{provider}_key")

    # 模擬 YouTube 連結狀態
    mock_setting = Mock()
    mock_setting.value = "true"
    setup_mocks['db'].query.return_value.filter.return_value.first.return_value = mock_setting

    response = client.get("/api/v1/system/init-status")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["is_initialized"] is True
    assert data["data"]["api_keys_configured"]["gemini"] is True
    assert data["data"]["api_keys_configured"]["stability_ai"] is True
    assert data["data"]["api_keys_configured"]["did"] is True


def test_get_init_status_partial(setup_mocks):
    """測試 6：檢查系統初始化狀態（部分初始化）"""
    # 只有 gemini 已設定
    def mock_get_key(provider):
        return "gemini_key" if provider == "gemini" else None

    setup_mocks['keychain'].get_api_key = Mock(side_effect=mock_get_key)

    # 模擬 YouTube 未連結
    setup_mocks['db'].query.return_value.filter.return_value.first.return_value = None

    response = client.get("/api/v1/system/init-status")

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["is_initialized"] is False
    assert data["data"]["api_keys_configured"]["gemini"] is True
    assert data["data"]["api_keys_configured"]["stability_ai"] is False
    assert data["data"]["api_keys_configured"]["did"] is False
    assert data["data"]["youtube_connected"] is False


def test_get_quota(setup_mocks):
    """測試 7：查詢 API 配額狀態"""
    # 模擬 D-ID 使用量
    did_setting = Mock()
    did_setting.value = "30"

    # 模擬 YouTube 使用量
    youtube_setting = Mock()
    youtube_setting.value = "2000"

    # 設置 query mock 的行為
    def query_side_effect(*args):
        mock_query = Mock()
        mock_filter = Mock()

        def filter_side_effect(*filter_args):
            # 根據查詢條件返回不同的結果
            if "did_monthly_usage" in str(filter_args):
                mock_filter.first.return_value = did_setting
            elif "youtube_daily_usage" in str(filter_args):
                mock_filter.first.return_value = youtube_setting
            else:
                mock_filter.first.return_value = None
            return mock_filter

        mock_query.filter = filter_side_effect
        return mock_query

    setup_mocks['db'].query.side_effect = query_side_effect

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
