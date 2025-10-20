"""測試 YouTubeClient 類別"""

from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest
from googleapiclient.errors import HttpError

from app.integrations.youtube_client import YouTubeClient


@pytest.fixture
def mock_credentials():
    """模擬 OAuth 憑證"""
    return {
        "access_token": "test_access_token",
        "refresh_token": "test_refresh_token",
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_id": "test_client_id",
        "client_secret": "test_client_secret",
        "scopes": ["https://www.googleapis.com/auth/youtube.upload"],
        "expires_at": datetime.now() + timedelta(hours=1),
    }


@pytest.fixture
def mock_db_session():
    """模擬資料庫 session"""
    return Mock()


class TestYouTubeClient:
    """YouTubeClient 測試套件"""

    def test_token_refresh_when_expired(self, mock_credentials, mock_db_session):
        """測試 1: OAuth Token 自動刷新機制

        驗證當 access token 過期時，系統能自動使用 refresh token 更新
        """
        # 設定 token 已過期
        mock_credentials["expires_at"] = datetime.now() - timedelta(hours=1)

        with patch("app.integrations.youtube_client.Credentials") as MockCreds, patch(
            "app.integrations.youtube_client.build"
        ):
            # 建立模擬的 Credentials 物件
            mock_creds = Mock()
            mock_creds.expired = True
            mock_creds.refresh_token = "test_refresh_token"
            mock_creds.token = "new_access_token"
            mock_creds.expiry = datetime.now() + timedelta(hours=1)
            mock_creds.refresh = Mock()
            mock_creds.valid = True

            MockCreds.return_value = mock_creds

            # 執行測試
            client = YouTubeClient(mock_credentials, mock_db_session)
            creds = client.get_credentials()

            # 驗證
            assert mock_creds.refresh.called, "refresh() 應該被調用"
            assert creds.token == "new_access_token", "應該返回新的 access token"
            assert creds.valid is True, "credentials 應該是有效的"

    def test_token_not_refresh_when_valid(self, mock_credentials, mock_db_session):
        """測試: Token 未過期時不應刷新"""
        # token 未過期
        mock_credentials["expires_at"] = datetime.now() + timedelta(hours=1)

        with patch("app.integrations.youtube_client.Credentials") as MockCreds, patch(
            "app.integrations.youtube_client.build"
        ):
            mock_creds = Mock()
            mock_creds.expired = False
            mock_creds.token = "test_access_token"
            mock_creds.refresh = Mock()

            MockCreds.return_value = mock_creds

            # 執行測試
            client = YouTubeClient(mock_credentials, mock_db_session)
            client.get_credentials()

            # 驗證 refresh 不應該被調用
            assert not mock_creds.refresh.called, "token 未過期時不應該調用 refresh()"

    @pytest.mark.asyncio
    async def test_upload_video_success(self, mock_credentials, mock_db_session):
        """測試 2: 成功上傳影片（立即發布）

        驗證完整的影片上傳流程，包含 metadata 設定和 resumable upload
        """
        with patch("app.integrations.youtube_client.build") as mock_build, patch(
            "app.integrations.youtube_client.Credentials"
        ) as MockCreds, patch("app.integrations.youtube_client.MediaFileUpload") as MockMedia:
            # Mock Credentials
            mock_creds = Mock()
            mock_creds.expired = False
            MockCreds.return_value = mock_creds

            # Mock YouTube API client
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock videos().insert() 請求
            mock_request = Mock()
            mock_youtube.videos().insert.return_value = mock_request

            # Mock next_chunk() 上傳流程
            mock_status = Mock()
            mock_status.progress.return_value = 1.0  # 100% 完成
            mock_request.next_chunk.return_value = (
                mock_status,
                {"id": "test_video_id", "snippet": {"title": "Test Video"}},
            )

            # Mock MediaFileUpload
            MockMedia.return_value = Mock()

            # 執行測試
            client = YouTubeClient(mock_credentials, mock_db_session)
            video_id = await client.upload_video(
                video_path="/path/to/video.mp4",
                title="Test Video",
                description="Test Description",
                tags=["test", "demo"],
                privacy_status="public",
                category_id="22",
                made_for_kids=False,
            )

            # 驗證
            assert video_id == "test_video_id", "應該返回正確的 video_id"
            assert mock_youtube.videos().insert.called, "應該調用 videos().insert()"

            # 驗證 insert() 的參數
            call_kwargs = mock_youtube.videos().insert.call_args[1]
            assert call_kwargs["part"] == "snippet,status"
            assert call_kwargs["body"]["snippet"]["title"] == "Test Video"
            assert call_kwargs["body"]["snippet"]["tags"] == ["test", "demo"]
            assert call_kwargs["body"]["status"]["privacyStatus"] == "public"
            assert call_kwargs["body"]["status"]["selfDeclaredMadeForKids"] is False

    @pytest.mark.asyncio
    async def test_upload_video_scheduled(self, mock_credentials, mock_db_session):
        """測試 3: 成功上傳影片（排程發布）

        驗證排程發布功能，包含 publishAt 時間設定
        """
        publish_time = datetime.now() + timedelta(days=1)

        with patch("app.integrations.youtube_client.build") as mock_build, patch(
            "app.integrations.youtube_client.Credentials"
        ) as MockCreds, patch("app.integrations.youtube_client.MediaFileUpload"):
            # Mock 設定
            mock_creds = Mock()
            mock_creds.expired = False
            MockCreds.return_value = mock_creds

            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            mock_request = Mock()
            mock_youtube.videos().insert.return_value = mock_request

            mock_status = Mock()
            mock_status.progress.return_value = 1.0
            mock_request.next_chunk.return_value = (
                mock_status,
                {"id": "scheduled_video_id"},
            )

            # 執行測試
            client = YouTubeClient(mock_credentials, mock_db_session)
            video_id = await client.upload_video(
                video_path="/path/to/video.mp4",
                title="Scheduled Video",
                description="This will be published later",
                tags=["scheduled"],
                privacy_status="private",  # 排程影片必須先設為 private
                publish_at=publish_time,
            )

            # 驗證
            assert video_id == "scheduled_video_id"

            # 驗證 publishAt 參數
            call_kwargs = mock_youtube.videos().insert.call_args[1]
            assert call_kwargs["body"]["status"]["privacyStatus"] == "private"
            assert "publishAt" in call_kwargs["body"]["status"]
            assert call_kwargs["body"]["status"]["publishAt"] == publish_time.isoformat()

    @pytest.mark.asyncio
    async def test_upload_thumbnail_success(self, mock_credentials, mock_db_session):
        """測試 4: 成功上傳封面

        驗證封面上傳功能
        """
        with patch("app.integrations.youtube_client.build") as mock_build, patch(
            "app.integrations.youtube_client.Credentials"
        ) as MockCreds, patch("app.integrations.youtube_client.MediaFileUpload"):
            # Mock 設定
            mock_creds = Mock()
            mock_creds.expired = False
            MockCreds.return_value = mock_creds

            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock thumbnails().set() 回應
            mock_youtube.thumbnails().set().execute.return_value = {
                "items": [
                    {"maxres": {"url": "https://i.ytimg.com/vi/test_video_id/maxresdefault.jpg"}}
                ]
            }

            # 執行測試
            client = YouTubeClient(mock_credentials, mock_db_session)
            thumbnail_url = await client.upload_thumbnail(
                video_id="test_video_id", thumbnail_path="/path/to/thumbnail.jpg"
            )

            # 驗證
            assert "maxresdefault.jpg" in thumbnail_url
            assert mock_youtube.thumbnails().set.called

    @pytest.mark.asyncio
    async def test_upload_video_401_retry(self, mock_credentials, mock_db_session):
        """測試 5: 處理 401 Unauthorized（Token 過期）

        驗證 token 過期時自動刷新並重試
        """
        with patch("app.integrations.youtube_client.build") as mock_build, patch(
            "app.integrations.youtube_client.Credentials"
        ) as MockCreds, patch("app.integrations.youtube_client.MediaFileUpload"):
            # Mock Credentials - 第一次 expired=True，第二次 expired=False
            mock_creds = Mock()
            mock_creds.refresh_token = "refresh_token"

            # 第一次調用時 expired=True
            mock_creds.expired = True
            mock_creds.refresh = Mock()  # 模擬 refresh 成功
            mock_creds.token = "new_access_token"

            MockCreds.return_value = mock_creds

            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            mock_request = Mock()
            mock_youtube.videos().insert.return_value = mock_request

            # 第一次調用拋出 401 錯誤
            mock_response = Mock()
            mock_response.status = 401
            http_error = HttpError(resp=mock_response, content=b"Unauthorized")

            # 設定 next_chunk 的行為：第一次拋出 401，第二次成功
            call_count = 0

            def next_chunk_side_effect():
                nonlocal call_count
                call_count += 1
                if call_count == 1:
                    raise http_error
                else:
                    mock_status = Mock()
                    mock_status.progress.return_value = 1.0
                    return (mock_status, {"id": "video_after_retry"})

            mock_request.next_chunk.side_effect = next_chunk_side_effect

            # 執行測試 - 應該自動重試並成功
            client = YouTubeClient(mock_credentials, mock_db_session)
            video_id = await client.upload_video(
                video_path="/path/to/video.mp4",
                title="Test Video",
                description="Test",
                tags=["test"],
            )

            # 驗證
            assert video_id == "video_after_retry", "重試後應該成功上傳"
            assert call_count == 2, "應該調用兩次 next_chunk（一次失敗，一次成功）"

    @pytest.mark.asyncio
    async def test_upload_video_500_retry(self, mock_credentials, mock_db_session):
        """測試 7: 處理 500/503 Server Error（伺服器錯誤重試）

        驗證伺服器錯誤的指數退避重試機制
        """
        with patch("app.integrations.youtube_client.build") as mock_build, patch(
            "app.integrations.youtube_client.Credentials"
        ) as MockCreds, patch("app.integrations.youtube_client.MediaFileUpload"), patch(
            "app.integrations.youtube_client.time.sleep"
        ) as mock_sleep:
            # Mock Credentials
            mock_creds = Mock()
            mock_creds.expired = False
            MockCreds.return_value = mock_creds

            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            mock_request = Mock()
            mock_youtube.videos().insert.return_value = mock_request

            # 模擬兩次伺服器錯誤，第三次成功
            mock_response_500 = Mock()
            mock_response_500.status = 500

            mock_response_503 = Mock()
            mock_response_503.status = 503

            call_count = 0

            def next_chunk_side_effect():
                nonlocal call_count
                call_count += 1
                if call_count == 1:
                    raise HttpError(resp=mock_response_500, content=b"Server Error")
                elif call_count == 2:
                    raise HttpError(resp=mock_response_503, content=b"Service Unavailable")
                else:
                    mock_status = Mock()
                    mock_status.progress.return_value = 1.0
                    return (mock_status, {"id": "video_after_retries"})

            mock_request.next_chunk.side_effect = next_chunk_side_effect

            # 執行測試
            client = YouTubeClient(mock_credentials, mock_db_session)
            video_id = await client.upload_video(
                video_path="/path/to/video.mp4",
                title="Test Video",
                description="Test",
                tags=["test"],
            )

            # 驗證
            assert video_id == "video_after_retries", "重試後應該成功"
            assert call_count == 3, "應該重試 2 次後成功"
            assert mock_sleep.call_count == 2, "應該等待 2 次（指數退避）"

    @pytest.mark.asyncio
    async def test_upload_video_403_quota_exceeded(self, mock_credentials, mock_db_session):
        """測試 6: 處理 403 Quota Exceeded（配額用盡）

        驗證配額不足時拋出錯誤且不重試
        """
        with patch("app.integrations.youtube_client.build") as mock_build, patch(
            "app.integrations.youtube_client.Credentials"
        ) as MockCreds, patch("app.integrations.youtube_client.MediaFileUpload"):
            # Mock 設定
            mock_creds = Mock()
            mock_creds.expired = False
            MockCreds.return_value = mock_creds

            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            mock_request = Mock()
            mock_youtube.videos().insert.return_value = mock_request

            # 模擬 403 Quota Exceeded 錯誤
            mock_response = Mock()
            mock_response.status = 403

            http_error = HttpError(
                resp=mock_response,
                content=b'{"error": {"errors": [{"reason": "quotaExceeded"}]}}',
            )

            # next_chunk 拋出配額錯誤
            mock_request.next_chunk.side_effect = http_error

            # 執行測試 - 應該拋出 HttpError 403
            client = YouTubeClient(mock_credentials, mock_db_session)

            with pytest.raises(HttpError) as exc_info:
                await client.upload_video(
                    video_path="/path/to/video.mp4",
                    title="Test Video",
                    description="Test",
                    tags=["test"],
                )

            # 驗證
            assert exc_info.value.resp.status == 403
            # 驗證只調用一次（不重試）
            assert mock_request.next_chunk.call_count == 1

    @pytest.mark.asyncio
    async def test_upload_video_resumable(self, mock_credentials, mock_db_session):
        """測試 8: 斷點續傳機制（Resumable Upload）

        驗證上傳中斷後可從斷點繼續
        """
        with patch("app.integrations.youtube_client.build") as mock_build, patch(
            "app.integrations.youtube_client.Credentials"
        ) as MockCreds, patch("app.integrations.youtube_client.MediaFileUpload"), patch(
            "app.integrations.youtube_client.time.sleep"
        ):
            # Mock 設定
            mock_creds = Mock()
            mock_creds.expired = False
            MockCreds.return_value = mock_creds

            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            mock_request = Mock()
            mock_youtube.videos().insert.return_value = mock_request

            # 模擬上傳過程：
            # 0% → 25% → 503 錯誤 → 50% → 75% → 100% 完成
            call_count = 0
            progress_values = [0.25, 0.5, 0.75, 1.0]
            progress_index = 0

            def next_chunk_side_effect():
                nonlocal call_count, progress_index
                call_count += 1

                if call_count == 2:
                    # 第 2 次調用時模擬網路中斷（503）
                    mock_response = Mock()
                    mock_response.status = 503
                    raise HttpError(resp=mock_response, content=b"Service Unavailable")

                # 其他調用返回進度
                mock_status = Mock()
                if progress_index < len(progress_values):
                    progress = progress_values[progress_index]
                    mock_status.progress.return_value = progress
                    progress_index += 1

                    if progress < 1.0:
                        return (mock_status, None)  # 尚未完成
                    else:
                        return (mock_status, {"id": "video_resumable"})  # 完成

            mock_request.next_chunk.side_effect = next_chunk_side_effect

            # 執行測試
            client = YouTubeClient(mock_credentials, mock_db_session)
            video_id = await client.upload_video(
                video_path="/path/to/video.mp4",
                title="Test Resumable Upload",
                description="Test",
                tags=["test"],
            )

            # 驗證
            assert video_id == "video_resumable", "應該成功完成上傳"
            # 驗證經歷了多次 chunk 調用（包含中斷後重試）
            assert call_count >= 3, "應該有多次 chunk 調用（包含重試）"
