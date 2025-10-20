from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.base import Base
from app.models.youtube_account import YouTubeAccount
from app.services.youtube_auth_service import YouTubeAuthService

# 測試資料庫設定
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """建立測試資料庫 session"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def youtube_service():
    """建立 YouTubeAuthService 實例"""
    with patch("app.services.youtube_auth_service.settings") as mock_settings:
        mock_settings.GOOGLE_CLIENT_ID = "test-client-id"
        mock_settings.GOOGLE_CLIENT_SECRET = "test-client-secret"
        mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:3000/oauth/callback"
        mock_settings.ENCRYPTION_KEY = Fernet.generate_key().decode()
        yield YouTubeAuthService()


def test_get_authorization_url(youtube_service):
    """測試生成授權 URL"""
    auth_url = youtube_service.get_authorization_url()

    assert "accounts.google.com" in auth_url
    assert "scope" in auth_url
    assert "access_type=offline" in auth_url
    assert "prompt=consent" in auth_url


@patch("app.services.youtube_auth_service.requests.post")
def test_refresh_access_token(mock_post, youtube_service):
    """測試 7：Token 自動更新機制"""
    # Mock requests.post 回應
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"access_token": "new-access-token", "expires_in": 3600}
    mock_post.return_value = mock_response

    new_token, expires_in = youtube_service._refresh_access_token("mock-refresh-token")

    assert new_token == "new-access-token"
    assert expires_in == 3600

    # 驗證 API 呼叫參數
    mock_post.assert_called_once()
    call_args = mock_post.call_args
    assert call_args[0][0] == "https://oauth2.googleapis.com/token"
    assert call_args[1]["data"]["grant_type"] == "refresh_token"
    assert call_args[1]["data"]["refresh_token"] == "mock-refresh-token"


@patch("app.services.youtube_auth_service.requests.post")
def test_get_valid_credentials_with_expired_token(mock_post, youtube_service, db_session):
    """測試 Token 過期時自動更新"""
    # 建立一個 token 已過期的帳號
    test_id = uuid4()
    cipher = youtube_service.cipher

    account = YouTubeAccount(
        id=test_id,
        channel_id="UC_test",
        channel_name="測試頻道",
        subscriber_count=1000,
        access_token=cipher.encrypt(b"old-access-token").decode(),
        refresh_token=cipher.encrypt(b"old-refresh-token").decode(),
        token_expires_at=datetime.utcnow() - timedelta(hours=1),  # 已過期
        is_authorized=True,
        authorized_at=datetime.utcnow(),
    )
    db_session.add(account)
    db_session.commit()

    # Mock refresh token API 回應
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"access_token": "new-access-token", "expires_in": 3600}
    mock_post.return_value = mock_response

    # 取得有效 credentials
    credentials = youtube_service.get_valid_credentials(str(test_id), db_session)

    # 驗證 credentials
    assert credentials.token == "new-access-token"
    assert credentials.refresh_token == "old-refresh-token"

    # 驗證資料庫已更新
    db_session.refresh(account)
    new_access_token = cipher.decrypt(account.access_token.encode()).decode()
    assert new_access_token == "new-access-token"
    assert account.token_expires_at > datetime.utcnow()


def test_get_valid_credentials_with_valid_token(youtube_service, db_session):
    """測試 Token 未過期時直接使用"""
    test_id = uuid4()
    cipher = youtube_service.cipher

    account = YouTubeAccount(
        id=test_id,
        channel_id="UC_test",
        channel_name="測試頻道",
        subscriber_count=1000,
        access_token=cipher.encrypt(b"valid-access-token").decode(),
        refresh_token=cipher.encrypt(b"valid-refresh-token").decode(),
        token_expires_at=datetime.utcnow() + timedelta(hours=1),  # 未過期
        is_authorized=True,
        authorized_at=datetime.utcnow(),
    )
    db_session.add(account)
    db_session.commit()

    # 取得有效 credentials
    credentials = youtube_service.get_valid_credentials(str(test_id), db_session)

    # 驗證 credentials
    assert credentials.token == "valid-access-token"
    assert credentials.refresh_token == "valid-refresh-token"


def test_get_valid_credentials_account_not_found(youtube_service, db_session):
    """測試帳號不存在時拋出異常"""
    non_existent_id = uuid4()

    with pytest.raises(ValueError, match="YouTube 帳號不存在"):
        youtube_service.get_valid_credentials(str(non_existent_id), db_session)


def test_encrypt_decrypt_token(youtube_service):
    """測試 Token 加密解密"""
    original_token = "test-token-123"

    # 加密
    encrypted = youtube_service._encrypt_token(original_token)
    assert encrypted != original_token

    # 解密
    decrypted = youtube_service._decrypt_token(encrypted)
    assert decrypted == original_token
