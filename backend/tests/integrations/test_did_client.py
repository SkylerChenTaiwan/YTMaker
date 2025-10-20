import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.integrations.did_client import (
    DIDClient,
    DIDAPIError,
    QuotaExceededError
)


@pytest.fixture
def did_client():
    """創建測試用 DIDClient 實例"""
    return DIDClient(api_key="test_api_key")


@pytest.fixture
def mock_httpx_client():
    """Mock httpx.AsyncClient"""
    with patch("app.integrations.did_client.httpx.AsyncClient") as mock:
        yield mock


# 測試 1: 成功建立 D-ID Talk
@pytest.mark.asyncio
async def test_create_talk_success(did_client, mock_httpx_client):
    """
    驗證可以成功調用 D-ID API 建立虛擬主播生成任務
    """
    # Arrange
    audio_url = "https://example.com/test_audio.mp3"
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "id": "talk_abc123",
        "status": "created"
    }
    mock_response.raise_for_status = MagicMock()

    mock_client_instance = MagicMock()
    mock_client_instance.post = AsyncMock(return_value=mock_response)
    mock_httpx_client.return_value.__aenter__.return_value = mock_client_instance

    # Act
    talk_id = await did_client.create_talk(audio_url)

    # Assert
    assert talk_id == "talk_abc123"
    mock_client_instance.post.assert_called_once()

    # 檢查調用參數
    call_args = mock_client_instance.post.call_args
    assert "https://api.d-id.com/talks" in str(call_args)
    assert call_args[1]["headers"]["Authorization"] == "Basic test_api_key"
    assert "audio_url" in str(call_args[1]["json"])


# 測試 2: 輪詢 Talk 狀態直到完成
@pytest.mark.asyncio
async def test_poll_talk_status_until_done(did_client, mock_httpx_client):
    """
    驗證可以正確輪詢 D-ID Talk 狀態,並在完成時返回影片 URL
    """
    # Arrange
    talk_id = "talk_abc123"

    # 模擬狀態變化: created → started → done
    mock_responses = [
        MagicMock(json=lambda: {"id": talk_id, "status": "created"}, raise_for_status=MagicMock()),
        MagicMock(json=lambda: {"id": talk_id, "status": "started"}, raise_for_status=MagicMock()),
        MagicMock(json=lambda: {
            "id": talk_id,
            "status": "done",
            "result_url": "https://example.com/video.mp4",
            "duration": 15.2
        }, raise_for_status=MagicMock())
    ]

    mock_client_instance = MagicMock()
    mock_client_instance.get = AsyncMock(side_effect=mock_responses)
    mock_httpx_client.return_value.__aenter__.return_value = mock_client_instance

    # Mock asyncio.sleep to speed up test
    with patch("asyncio.sleep", new_callable=AsyncMock):
        # Act
        result = await did_client.get_talk_status(talk_id, poll_interval=0)

    # Assert
    assert result["status"] == "done"
    assert result["result_url"] == "https://example.com/video.mp4"
    assert result["duration"] == 15.2
    assert mock_client_instance.get.call_count == 3


# 測試 3: Talk 生成失敗處理
@pytest.mark.asyncio
async def test_talk_generation_error(did_client, mock_httpx_client):
    """
    驗證當 D-ID API 返回錯誤狀態時,能正確處理並拋出異常
    """
    # Arrange
    talk_id = "talk_abc123"

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "id": talk_id,
        "status": "error",
        "error": {"message": "Audio file is too long"}
    }
    mock_response.raise_for_status = MagicMock()

    mock_client_instance = MagicMock()
    mock_client_instance.get = AsyncMock(return_value=mock_response)
    mock_httpx_client.return_value.__aenter__.return_value = mock_client_instance

    # Act & Assert
    with pytest.raises(DIDAPIError) as exc_info:
        await did_client.get_talk_status(talk_id)

    assert "Audio file is too long" in str(exc_info.value)


# 測試 6: D-ID 配額檢查
@pytest.mark.asyncio
async def test_check_quota(did_client, mock_httpx_client):
    """
    驗證可以查詢 D-ID API 配額使用情況
    """
    # Arrange
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "used": 2700,  # 45 分鐘(秒)
        "total": 5400  # 90 分鐘(秒)
    }
    mock_response.raise_for_status = MagicMock()

    mock_client_instance = MagicMock()
    mock_client_instance.get = AsyncMock(return_value=mock_response)
    mock_httpx_client.return_value.__aenter__.return_value = mock_client_instance

    # Act
    quota = await did_client.check_quota()

    # Assert
    assert quota["used_minutes"] == 45
    assert quota["total_minutes"] == 90
    assert quota["remaining_minutes"] == 45
    assert quota["percentage_used"] == 50


# 測試 7: 配額不足時拒絕生成
@pytest.mark.asyncio
async def test_quota_exceeded():
    """
    驗證當 D-ID 配額不足時,拒絕生成虛擬主播並拋出異常
    """
    # Arrange
    with patch("app.integrations.did_client.httpx.AsyncClient") as mock_httpx:
        did_client = DIDClient(api_key="test_api_key")

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "used": 5370,  # 89.5 分鐘 (89.5 * 60 = 5370)
            "total": 5400  # 90 分鐘
        }
        mock_response.raise_for_status = MagicMock()

        mock_client_instance = MagicMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_httpx.return_value.__aenter__.return_value = mock_client_instance

        # Act & Assert - 剩餘 30 秒,但需要 60 秒
        with pytest.raises(QuotaExceededError) as exc_info:
            await did_client.can_generate_avatar(estimated_duration=60)

        assert "quota insufficient" in str(exc_info.value).lower()


# 測試 4: 下載影片
@pytest.mark.asyncio
async def test_download_video(did_client, mock_httpx_client):
    """
    驗證可以成功下載生成的影片
    """
    # Arrange
    video_url = "https://example.com/video.mp4"
    video_data = b"fake_video_data"

    mock_response = MagicMock()
    mock_response.content = video_data
    mock_response.raise_for_status = MagicMock()

    mock_client_instance = MagicMock()
    mock_client_instance.get = AsyncMock(return_value=mock_response)
    mock_httpx_client.return_value.__aenter__.return_value = mock_client_instance

    # Act
    result = await did_client.download_video(video_url)

    # Assert
    assert result == video_data
    mock_client_instance.get.assert_called_once()
