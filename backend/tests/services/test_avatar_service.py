import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.avatar_service import AvatarGenerationService
from app.integrations.did_client import QuotaExceededError, DIDAPIError
from app.models.asset import AssetType


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


# 測試 9: 完整虛擬主播生成流程(成功)
@pytest.mark.asyncio
async def test_full_avatar_generation_success(mock_db_session):
    """
    驗證完整的虛擬主播生成流程 - 成功案例
    這是最重要的測試,覆蓋 generate_avatar_video 的主流程
    """
    # Arrange
    with patch("app.services.avatar_service.settings") as mock_settings:
        mock_settings.DID_API_KEY = "test_key"
        mock_settings.STORAGE_PATH = "/tmp/test_storage"

        service = AvatarGenerationService(db=mock_db_session)

        project_id = 123
        audio_path = "/path/to/audio.mp3"
        segment_type = "intro"

        # Mock 所有依賴
        with patch.object(service, "_get_audio_duration", return_value=15.0):
            with patch.object(service, "_get_video_duration", return_value=15.2):
                with patch.object(service.storage, "upload_temporary", new_callable=AsyncMock) as mock_upload:
                    with patch.object(service.storage, "delete_temporary", new_callable=AsyncMock) as mock_delete:
                        with patch.object(service.storage, "save_asset", return_value="/fake/path/avatar_intro.mp4"):
                            # Mock DIDClient
                            service.did_client.can_generate_avatar = AsyncMock(return_value=True)
                            service.did_client.create_talk = AsyncMock(return_value="talk_abc123")
                            service.did_client.get_talk_status = AsyncMock(return_value={
                                "status": "done",
                                "result_url": "https://example.com/video.mp4",
                                "duration": 15.2
                            })
                            service.did_client.download_video = AsyncMock(return_value=b"fake_video_data")

                            mock_upload.return_value = "https://example.com/audio.mp3"

                            # Act
                            asset = await service.generate_avatar_video(
                                project_id=project_id,
                                audio_file_path=audio_path,
                                segment_type=segment_type
                            )

                            # Assert
                            # 驗證調用順序
                            service.did_client.can_generate_avatar.assert_called_once_with(estimated_duration=15)
                            mock_upload.assert_called_once_with(audio_path)
                            service.did_client.create_talk.assert_called_once()
                            service.did_client.get_talk_status.assert_called_once_with("talk_abc123")
                            service.did_client.download_video.assert_called_once()
                            mock_delete.assert_called_once()

                            # 驗證 Asset
                            assert asset.project_id == project_id
                            assert asset.type == AssetType.AVATAR_INTRO
                            assert asset.file_path == "/fake/path/avatar_intro.mp4"
                            assert asset.extra_info["duration"] == 15.2
                            assert asset.extra_info["talk_id"] == "talk_abc123"
                            assert asset.extra_info["validation"]["is_valid"] is True

                            # 驗證資料庫操作
                            mock_db_session.add.assert_called_once_with(asset)
                            mock_db_session.commit.assert_called_once()
                            mock_db_session.refresh.assert_called_once_with(asset)


# 測試: API Key 未配置時拋出異常
def test_init_without_api_key(mock_db_session):
    """
    驗證當 D-ID API Key 未配置時,初始化拋出 ValueError
    """
    with patch("app.services.avatar_service.settings") as mock_settings:
        mock_settings.DID_API_KEY = ""  # 空字串

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            AvatarGenerationService(db=mock_db_session)

        assert "not configured" in str(exc_info.value).lower()


# 測試: 時長驗證失敗但仍接受(warning log)
@pytest.mark.asyncio
async def test_duration_validation_warning(mock_db_session):
    """
    驗證當影片時長誤差 >= 5% 時,記錄 warning 但仍接受
    """
    with patch("app.services.avatar_service.settings") as mock_settings:
        mock_settings.DID_API_KEY = "test_key"
        mock_settings.STORAGE_PATH = "/tmp/test_storage"

        service = AvatarGenerationService(db=mock_db_session)

        project_id = 123
        audio_path = "/path/to/audio.mp3"
        segment_type = "intro"

        # Mock 所有依賴
        with patch.object(service, "_get_audio_duration", return_value=15.0):
            with patch.object(service, "_get_video_duration", return_value=20.0):  # 誤差 33%
                with patch.object(service.storage, "upload_temporary", new_callable=AsyncMock) as mock_upload:
                    with patch.object(service.storage, "delete_temporary", new_callable=AsyncMock):
                        with patch.object(service.storage, "save_asset", return_value="/fake/path/avatar_intro.mp4"):
                            # Mock DIDClient
                            service.did_client.can_generate_avatar = AsyncMock(return_value=True)
                            service.did_client.create_talk = AsyncMock(return_value="talk_abc123")
                            service.did_client.get_talk_status = AsyncMock(return_value={
                                "status": "done",
                                "result_url": "https://example.com/video.mp4",
                                "duration": 20.0
                            })
                            service.did_client.download_video = AsyncMock(return_value=b"fake_video_data")
                            mock_upload.return_value = "https://example.com/audio.mp3"

                            # Act
                            with patch("app.services.avatar_service.logger") as mock_logger:
                                asset = await service.generate_avatar_video(
                                    project_id=project_id,
                                    audio_file_path=audio_path,
                                    segment_type=segment_type
                                )

                                # Assert - 驗證記錄了 warning
                                mock_logger.warning.assert_called_once()
                                warning_call = mock_logger.warning.call_args[0][0]
                                assert "duration mismatch" in warning_call.lower()

                                # 驗證 Asset 仍然被建立
                                assert asset.extra_info["validation"]["is_valid"] is False
                                assert asset.extra_info["validation"]["error_rate"] > 0.05
