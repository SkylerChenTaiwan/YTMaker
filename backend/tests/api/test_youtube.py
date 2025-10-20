from datetime import datetime, timedelta
from unittest.mock import MagicMock, Mock, patch
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models.base import Base
from app.models.youtube_account import YouTubeAccount
# 確保導入所有模型類以便 Base.metadata 包含所有表定義
from app.models.asset import Asset
from app.models.batch_task import BatchTask
from app.models.configuration import Configuration
from app.models.project import Project
from app.models.prompt_template import PromptTemplate
from app.models.system_settings import SystemSettings

# 測試資料庫設定 - 使用記憶體資料庫避免檔案衝突
# 使用 StaticPool 確保所有連接共享同一個 database connection
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 生成一個測試用的 Fernet key
TEST_ENCRYPTION_KEY = Fernet.generate_key().decode()

# 在模組載入時就創建所有表格
Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_test_app():
    """在模組層級設置 dependency override"""
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """每個測試前清理並重建資料庫"""
    # 清理所有資料
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()
    yield
    # 測試後清理
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()


@pytest.fixture(scope="function", autouse=True)
def mock_settings():
    """Mock settings for all tests"""
    with patch("app.services.youtube_auth_service.settings") as mock_settings:
        mock_settings.GOOGLE_CLIENT_ID = "test-client-id"
        mock_settings.GOOGLE_CLIENT_SECRET = "test-client-secret"
        mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:3000/oauth/callback"
        mock_settings.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY
        yield mock_settings


@pytest.fixture(scope="function")
def db_session():
    """建立測試資料庫 session"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def client():
    """建立測試客戶端"""
    return TestClient(app)


# ===== 單元測試 =====


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
    mock_credentials = MagicMock()
    mock_credentials.token = "mock-access-token"
    mock_credentials.refresh_token = "mock-refresh-token"
    mock_credentials.expiry = datetime.utcnow() + timedelta(seconds=3600)

    mock_flow_instance = MagicMock()
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

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["channel_name"] == "測試頻道"
    assert data["data"]["channel_id"] == "UC_mock_channel_id"
    assert data["data"]["subscriber_count"] == 1000
    assert data["data"]["is_authorized"] is True

    # 驗證資料庫中有記錄
    account = db_session.query(YouTubeAccount).filter_by(channel_id="UC_mock_channel_id").first()
    assert account is not None
    assert account.channel_name == "測試頻道"


@patch("app.services.youtube_auth_service.Flow")
def test_auth_callback_invalid_code(mock_flow, client):
    """測試 3a：無效的 Authorization Code"""
    # Mock Flow.fetch_token 拋出異常
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
    cipher = Fernet(TEST_ENCRYPTION_KEY.encode())

    # 先建立一個已存在的帳號
    existing_account = YouTubeAccount(
        channel_id="UC_existing",
        channel_name="已存在頻道",
        subscriber_count=500,
        access_token=cipher.encrypt(b"existing-token").decode(),
        refresh_token=cipher.encrypt(b"existing-refresh").decode(),
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        is_authorized=True,
        authorized_at=datetime.utcnow(),
    )
    db_session.add(existing_account)
    db_session.commit()

    # Mock Flow 回傳相同的 channel_id
    mock_credentials = MagicMock()
    mock_credentials.token = "mock-access-token"
    mock_credentials.refresh_token = "mock-refresh-token"
    mock_credentials.expiry = datetime.utcnow() + timedelta(seconds=3600)

    mock_flow_instance = MagicMock()
    mock_flow_instance.credentials = mock_credentials
    mock_flow.from_client_config.return_value = mock_flow_instance

    mock_youtube = MagicMock()
    mock_channels_list = MagicMock()
    mock_channels_list.execute.return_value = {
        "items": [
            {
                "id": "UC_existing",
                "snippet": {"title": "已存在頻道"},
                "statistics": {"subscriberCount": "500"},
            }
        ]
    }
    mock_youtube.channels.return_value.list.return_value = mock_channels_list
    mock_build.return_value = mock_youtube

    response = client.post(
        "/api/v1/youtube/auth-callback", json={"code": "mock-code-for-existing-channel"}
    )

    assert response.status_code == 409
    data = response.json()
    assert data["detail"]["code"] == "CHANNEL_ALREADY_LINKED"


def test_list_accounts_success(client, db_session):
    """測試 4：列出所有已連結帳號"""
    cipher = Fernet(TEST_ENCRYPTION_KEY.encode())

    # 建立 2 個測試帳號
    account1 = YouTubeAccount(
        channel_id="UC_channel_a",
        channel_name="頻道 A",
        subscriber_count=1000,
        access_token=cipher.encrypt(b"token-a").decode(),
        refresh_token=cipher.encrypt(b"refresh-a").decode(),
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        is_authorized=True,
        authorized_at=datetime.utcnow(),
    )
    account2 = YouTubeAccount(
        channel_id="UC_channel_b",
        channel_name="頻道 B",
        subscriber_count=5000,
        access_token=cipher.encrypt(b"token-b").decode(),
        refresh_token=cipher.encrypt(b"refresh-b").decode(),
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
    assert len(data["data"]["accounts"]) == 2

    # 驗證回傳資料不包含 token
    for account in data["data"]["accounts"]:
        assert "access_token" not in account
        assert "refresh_token" not in account

    # 驗證排序（最新的在前）
    assert data["data"]["accounts"][0]["channel_name"] == "頻道 B"
    assert data["data"]["accounts"][1]["channel_name"] == "頻道 A"


def test_list_accounts_empty(client):
    """測試 4a：無任何連結帳號"""
    response = client.get("/api/v1/youtube/accounts")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["accounts"] == []


def test_delete_account_success(client, db_session):
    """測試 5：移除 YouTube 授權"""
    cipher = Fernet(TEST_ENCRYPTION_KEY.encode())

    # 建立一個測試帳號
    test_id = str(uuid4())  # 轉換為字串
    account = YouTubeAccount(
        id=test_id,
        channel_id="UC_to_delete",
        channel_name="要刪除的頻道",
        subscriber_count=100,
        access_token=cipher.encrypt(b"token").decode(),
        refresh_token=cipher.encrypt(b"refresh").decode(),
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        is_authorized=True,
        authorized_at=datetime.utcnow(),
    )
    db_session.add(account)
    db_session.commit()

    response = client.delete(f"/api/v1/youtube/accounts/{test_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "授權已移除"

    # 驗證資料庫中已刪除
    deleted_account = db_session.query(YouTubeAccount).filter_by(id=test_id).first()
    assert deleted_account is None


def test_delete_account_not_found(client):
    """測試 5a：移除不存在的帳號"""
    non_existent_id = str(uuid4())  # 轉換為字串
    response = client.delete(f"/api/v1/youtube/accounts/{non_existent_id}")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"  # 實際返回的錯誤代碼
