import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.avatar_service import AvatarGenerationService
from app.integrations.did_client import QuotaExceededError, DIDAPIError


@pytest.fixture
def mock_db_session():
    """Mock database session"""
    return MagicMock()


@pytest.fixture
def mock_did_client():
    """Mock DIDClient"""
    return MagicMock()


@pytest.fixture
def avatar_service(mock_db_session, mock_did_client):
    """創建測試用 AvatarGenerationService 實例"""
    with patch("app.services.avatar_service.settings") as mock_settings:
        mock_settings.DID_API_KEY = "test_key"
        mock_settings.STORAGE_PATH = "/tmp/test_storage"

        service = AvatarGenerationService(db=mock_db_session)
        service.did_client = mock_did_client  # 注入 mock client
        return service


# 測試 4: 影片時長驗證通過
def test_validate_duration_success(avatar_service):
    """
    驗證生成的虛擬主播影片時長與音訊時長匹配(誤差 < 5%)
    """
    # Arrange
    video_duration = 15.3  # 秒
    audio_duration = 15.0  # 秒

    # Act
    result = avatar_service.validate_duration(video_duration, audio_duration)

    # Assert
    assert result["is_valid"] is True
    assert result["error_rate"] < 0.05  # 誤差小於 5%
    assert result["video_duration"] == 15.3
    assert result["audio_duration"] == 15.0


# 測試 5: 影片時長驗證失敗
def test_validate_duration_failure(avatar_service):
    """
    驗證當影片時長誤差過大時(>= 5%),驗證失敗
    """
    # Arrange
    video_duration = 20.0  # 秒
    audio_duration = 15.0  # 秒

    # Act
    result = avatar_service.validate_duration(video_duration, audio_duration)

    # Assert
    assert result["is_valid"] is False
    assert result["error_rate"] > 0.05  # 誤差大於 5%
    assert result["error_rate"] == pytest.approx(0.333, rel=0.01)


# 測試 8: 配額不足時拋出異常(嚴格模式)
@pytest.mark.asyncio
async def test_quota_exceeded_raises_error(avatar_service, mock_did_client):
    """
    驗證當虛擬主播生成因配額不足失敗時,拋出 QuotaExceededError 異常
    採用嚴格模式,不使用 fallback
    """
    # Arrange
    project_id = 123
    audio_path = "/path/to/audio.mp3"
    segment_type = "intro"

    # Mock DIDClient 拋出 QuotaExceededError
    mock_did_client.can_generate_avatar = AsyncMock(
        side_effect=QuotaExceededError("D-ID quota insufficient")
    )

    # Act & Assert
    with pytest.raises(QuotaExceededError) as exc_info:
        await avatar_service.generate_avatar_video(
            project_id=project_id,
            audio_file_path=audio_path,
            segment_type=segment_type
        )

    assert "quota insufficient" in str(exc_info.value).lower()


# 測試: API 錯誤時拋出異常(嚴格模式)
@pytest.mark.asyncio
async def test_api_error_raises_error(avatar_service, mock_did_client):
    """
    驗證當 D-ID API 調用失敗時,拋出 DIDAPIError 異常
    採用嚴格模式,不使用 fallback
    """
    # Arrange
    project_id = 123
    audio_path = "/path/to/audio.mp3"
    segment_type = "intro"

    # Mock DIDClient 拋出 DIDAPIError
    mock_did_client.can_generate_avatar = AsyncMock(return_value=True)
    mock_did_client.create_talk = AsyncMock(
        side_effect=DIDAPIError("D-ID API error")
    )

    # Mock storage
    with patch.object(avatar_service.storage, "upload_temporary", new_callable=AsyncMock) as mock_upload:
        mock_upload.return_value = "https://example.com/audio.mp3"

        with patch.object(avatar_service, "_get_audio_duration", return_value=15.0):
            # Act & Assert
            with pytest.raises(DIDAPIError) as exc_info:
                await avatar_service.generate_avatar_video(
                    project_id=project_id,
                    audio_file_path=audio_path,
                    segment_type=segment_type
                )

            assert "api error" in str(exc_info.value).lower()
