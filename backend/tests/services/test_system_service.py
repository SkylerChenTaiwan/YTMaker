"""SystemService 單元測試 - 使用真實測試資料庫"""
import pytest
from unittest.mock import Mock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.base import Base
from app.models.system_settings import SystemSettings
from app.services.system_service import SystemService
from app.core.exceptions import ValidationException, NotFoundException

# 測試資料庫設置
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """建立測試資料庫"""
    Base.metadata.create_all(bind=engine)
    session = TestSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def mock_keychain():
    """Mock KeychainManager"""
    with patch('app.services.system_service.KeychainManager') as mock_kc:
        keychain_inst = Mock()
        keychain_inst.get_api_key = Mock(return_value="test_key")
        keychain_inst.save_api_key = Mock()
        mock_kc.return_value = keychain_inst
        yield keychain_inst


@pytest.mark.asyncio
async def test_check_init_status_all_configured(db, mock_keychain):
    """測試：所有 API Keys 都已設定"""
    # Mock 所有 API Keys 都已設定
    mock_keychain.get_api_key = Mock(side_effect=lambda provider: f"{provider}_key")

    # 設定 YouTube 已連結
    youtube_setting = SystemSettings(key="youtube_connected", value="true")
    db.add(youtube_setting)
    db.commit()

    service = SystemService(db)
    result = await service.check_init_status()

    assert result["is_initialized"] is True
    assert result["api_keys_configured"]["gemini"] is True
    assert result["api_keys_configured"]["stability_ai"] is True
    assert result["api_keys_configured"]["did"] is True
    assert result["youtube_connected"] is True


@pytest.mark.asyncio
async def test_check_init_status_partial(db, mock_keychain):
    """測試：部分 API Keys 已設定"""
    # 只有 gemini 已設定
    def mock_get_key(provider):
        return "gemini_key" if provider == "gemini" else None

    mock_keychain.get_api_key = Mock(side_effect=mock_get_key)

    service = SystemService(db)
    result = await service.check_init_status()

    assert result["is_initialized"] is False
    assert result["api_keys_configured"]["gemini"] is True
    assert result["api_keys_configured"]["stability_ai"] is False
    assert result["api_keys_configured"]["did"] is False
    assert result["youtube_connected"] is False


@pytest.mark.asyncio
async def test_check_init_status_no_youtube(db, mock_keychain):
    """測試：所有 API Keys 已設定但 YouTube 未連結"""
    mock_keychain.get_api_key = Mock(side_effect=lambda provider: f"{provider}_key")

    service = SystemService(db)
    result = await service.check_init_status()

    assert result["is_initialized"] is True  # 只要 API Keys 都設定就算初始化
    assert result["youtube_connected"] is False


@pytest.mark.asyncio
async def test_save_api_key_success(db, mock_keychain):
    """測試：成功儲存 API Key"""
    service = SystemService(db)
    await service.save_api_key("gemini", "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")

    mock_keychain.save_api_key.assert_called_once_with("gemini", "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")


@pytest.mark.asyncio
async def test_save_api_key_too_short(db, mock_keychain):
    """測試：API Key 太短"""
    service = SystemService(db)

    with pytest.raises(ValidationException) as exc_info:
        await service.save_api_key("gemini", "short")

    assert "10 個字元" in exc_info.value.message


@pytest.mark.asyncio
async def test_save_api_key_invalid_provider(db, mock_keychain):
    """測試：無效的服務提供者"""
    service = SystemService(db)

    with pytest.raises(ValidationException) as exc_info:
        await service.save_api_key("invalid", "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")

    assert "無效的服務提供者" in exc_info.value.message


@pytest.mark.asyncio
async def test_test_api_key_success(db, mock_keychain):
    """測試：成功測試 API Key 連線"""
    mock_keychain.get_api_key = Mock(return_value="valid_api_key")

    service = SystemService(db)
    result = await service.test_api_key("gemini")

    assert result["is_valid"] is True
    assert result["message"] == "連線成功"


@pytest.mark.asyncio
async def test_test_api_key_not_found(db, mock_keychain):
    """測試：API Key 不存在"""
    mock_keychain.get_api_key = Mock(return_value=None)

    service = SystemService(db)

    with pytest.raises(NotFoundException) as exc_info:
        await service.test_api_key("stability_ai")

    assert "尚未設定" in exc_info.value.message
    assert "Stability AI" in exc_info.value.message


@pytest.mark.asyncio
async def test_get_quota_status_with_usage(db, mock_keychain):
    """測試：查詢配額狀態（有使用記錄）"""
    # 設定 D-ID 使用量
    did_usage = SystemSettings(key="did_monthly_usage", value="30")
    db.add(did_usage)

    # 設定 YouTube 使用量
    youtube_usage = SystemSettings(key="youtube_daily_usage", value="2000")
    db.add(youtube_usage)

    db.commit()

    service = SystemService(db)
    result = await service.get_quota_status()

    # 檢查 D-ID 配額
    assert result["did"]["total"] == 90
    assert result["did"]["used"] == 30
    assert result["did"]["remaining"] == 60
    assert result["did"]["unit"] == "minutes"
    assert "reset_date" in result["did"]

    # 檢查 YouTube 配額
    assert result["youtube"]["total"] == 10000
    assert result["youtube"]["used"] == 2000
    assert result["youtube"]["remaining"] == 8000
    assert result["youtube"]["unit"] == "units"
    assert "reset_date" in result["youtube"]


@pytest.mark.asyncio
async def test_get_quota_status_no_usage(db, mock_keychain):
    """測試：查詢配額狀態（無使用記錄）"""
    service = SystemService(db)
    result = await service.get_quota_status()

    # 沒有使用記錄時應該顯示 0
    assert result["did"]["total"] == 90
    assert result["did"]["used"] == 0
    assert result["did"]["remaining"] == 90

    assert result["youtube"]["total"] == 10000
    assert result["youtube"]["used"] == 0
    assert result["youtube"]["remaining"] == 10000


def test_get_provider_name(db, mock_keychain):
    """測試：取得服務提供者顯示名稱"""
    service = SystemService(db)

    assert service._get_provider_name("gemini") == "Gemini"
    assert service._get_provider_name("stability_ai") == "Stability AI"
    assert service._get_provider_name("did") == "D-ID"
    assert service._get_provider_name("unknown") == "unknown"
