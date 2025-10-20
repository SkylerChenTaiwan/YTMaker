import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta


def test_get_auth_url_success(client):
    """測試 1：成功取得 OAuth 授權 URL"""
    response = client.get("/api/v1/youtube/auth-url")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "auth_url" in data["data"]

    auth_url = data["data"]["auth_url"]
    assert "accounts.google.com/o/oauth2" in auth_url
    assert "youtube.upload" in auth_url
    assert "access_type=offline" in auth_url
    assert "prompt=consent" in auth_url


@patch("app.services.youtube_auth_service.build")
@patch("app.services.youtube_auth_service.Flow")
def test_auth_callback_success(mock_flow, mock_build, client, db_session):
    """測試 2：成功處理 OAuth Callback"""
    # Mock Flow
    mock_flow_instance = MagicMock()
    mock_credentials = MagicMock()
    mock_credentials.token = "mock-access-token"
    mock_credentials.refresh_token = "mock-refresh-token"
    mock_credentials.expiry = datetime.utcnow() + timedelta(seconds=3600)
    mock_flow_instance.credentials = mock_credentials
    mock_flow.from_client_config.return_value = mock_flow_instance

    # Mock YouTube API
    mock_youtube = MagicMock()
    mock_channels_list = MagicMock()
    mock_channels_list.execute.return_value = {
        "items": [
            {
                "id": "UC_mock_channel_id",
                "snippet": {"title": "測試頻道"},
                "statistics": {"subscriberCount": "1000"},
            }
        ]
    }
    mock_youtube.channels.return_value.list.return_value = mock_channels_list
    mock_build.return_value = mock_youtube

    response = client.post("/api/v1/youtube/auth-callback", json={"code": "mock-authorization-code"})

    if response.status_code != 201:
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["channel_name"] == "測試頻道"
    assert data["data"]["channel_id"] == "UC_mock_channel_id"
    assert data["data"]["subscriber_count"] == 1000
    assert data["data"]["is_authorized"] is True

    # 驗證 API 呼叫
    mock_flow.from_client_config.assert_called_once()
    mock_flow_instance.fetch_token.assert_called_once_with(code="mock-authorization-code")
    mock_build.assert_called_once_with("youtube", "v3", credentials=mock_credentials)


@patch("app.services.youtube_auth_service.Flow")
def test_auth_callback_invalid_code(mock_flow, client):
    """測試 3a：無效的 Authorization Code"""
    mock_flow_instance = MagicMock()
    mock_flow_instance.fetch_token.side_effect = Exception("invalid_grant")
    mock_flow.from_client_config.return_value = mock_flow_instance

    response = client.post("/api/v1/youtube/auth-callback", json={"code": "invalid-code"})

    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "OAUTH_EXCHANGE_FAILED"
    assert "invalid_grant" in data["detail"]["message"]


@patch("app.services.youtube_auth_service.build")
@patch("app.services.youtube_auth_service.Flow")
def test_auth_callback_duplicate_channel(mock_flow, mock_build, client, db_session):
    """測試 3b：重複連結相同頻道"""
    # 先建立一個帳號
    from app.models.youtube_account import YouTubeAccount

    existing_account = YouTubeAccount(
        channel_id="UC_existing",
        channel_name="現有頻道",
        subscriber_count=5000,
        access_token="encrypted_token",
        refresh_token="encrypted_refresh",
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        is_authorized=True,
        authorized_at=datetime.utcnow(),
    )
    db_session.add(existing_account)
    db_session.commit()

    # Mock Flow
    mock_flow_instance = MagicMock()
    mock_credentials = MagicMock()
    mock_credentials.token = "mock-access-token"
    mock_credentials.refresh_token = "mock-refresh-token"
    mock_credentials.expiry = datetime.utcnow() + timedelta(seconds=3600)
    mock_flow_instance.credentials = mock_credentials
    mock_flow.from_client_config.return_value = mock_flow_instance

    # Mock YouTube API 回傳相同的 channel_id
    mock_youtube = MagicMock()
    mock_channels_list = MagicMock()
    mock_channels_list.execute.return_value = {
        "items": [
            {
                "id": "UC_existing",
                "snippet": {"title": "現有頻道"},
                "statistics": {"subscriberCount": "5000"},
            }
        ]
    }
    mock_youtube.channels.return_value.list.return_value = mock_channels_list
    mock_build.return_value = mock_youtube

    response = client.post("/api/v1/youtube/auth-callback", json={"code": "mock-code-for-existing-channel"})

    assert response.status_code == 409
    data = response.json()
    assert data["detail"]["code"] == "CHANNEL_ALREADY_LINKED"


def test_list_accounts_success(client, db_session):
    """測試 4：列出所有已連結帳號"""
    # 建立 2 個測試帳號
    from app.models.youtube_account import YouTubeAccount

    account1 = YouTubeAccount(
        channel_id="UC_channel_a",
        channel_name="頻道 A",
        subscriber_count=1000,
        access_token="encrypted_token_a",
        refresh_token="encrypted_refresh_a",
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        is_authorized=True,
        authorized_at=datetime.utcnow(),
    )

    account2 = YouTubeAccount(
        channel_id="UC_channel_b",
        channel_name="頻道 B",
        subscriber_count=5000,
        access_token="encrypted_token_b",
        refresh_token="encrypted_refresh_b",
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        is_authorized=True,
        authorized_at=datetime.utcnow() + timedelta(hours=1),
    )

    db_session.add(account1)
    db_session.add(account2)
    db_session.commit()

    response = client.get("/api/v1/youtube/accounts")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "accounts" in data["data"]
    assert len(data["data"]["accounts"]) == 2

    # 確認按 authorized_at 降序排列（最新的在前）
    accounts = data["data"]["accounts"]
    assert accounts[0]["channel_name"] == "頻道 B"
    assert accounts[1]["channel_name"] == "頻道 A"

    # 確認不包含 token
    assert "access_token" not in accounts[0]
    assert "refresh_token" not in accounts[0]


def test_list_accounts_empty(client):
    """測試 4a：無任何連結帳號"""
    response = client.get("/api/v1/youtube/accounts")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["accounts"] == []


def test_delete_account_success(client, db_session):
    """測試 5：移除 YouTube 授權"""
    # 建立測試帳號
    from app.models.youtube_account import YouTubeAccount

    account = YouTubeAccount(
        channel_id="UC_to_delete",
        channel_name="待刪除頻道",
        subscriber_count=1000,
        access_token="encrypted_token",
        refresh_token="encrypted_refresh",
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        is_authorized=True,
        authorized_at=datetime.utcnow(),
    )
    db_session.add(account)
    db_session.commit()
    account_id = str(account.id)

    response = client.delete(f"/api/v1/youtube/accounts/{account_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "授權已移除"

    # 確認資料庫中已刪除
    deleted_account = db_session.query(YouTubeAccount).filter(YouTubeAccount.id == account_id).first()
    assert deleted_account is None


def test_delete_account_not_found(client):
    """測試 5a：移除不存在的帳號"""
    response = client.delete("/api/v1/youtube/accounts/non-existent-uuid")

    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "ACCOUNT_NOT_FOUND"
