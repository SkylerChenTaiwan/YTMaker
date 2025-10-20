"""測試 VideoUploadService"""

import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest
from googleapiclient.errors import HttpError

from app.exceptions import YouTubeQuotaExceededError, YouTubeUploadError
from app.models.project import Project
from app.models.youtube_account import YouTubeAccount
from app.services.upload_service import VideoUploadService


@pytest.fixture
def mock_db_session():
    """模擬資料庫 session"""
    session = Mock()
    return session


class TestVideoUploadService:
    """VideoUploadService 測試套件"""

    @pytest.mark.asyncio
    async def test_upload_to_youtube_success(self, mock_db_session):
        """測試完整上傳流程成功"""
        # Mock YouTube 帳號
        mock_account = Mock(spec=YouTubeAccount)
        mock_account.id = 1
        mock_account.access_token = "valid_token"
        mock_account.refresh_token = "refresh_token"
        mock_account.token_uri = "https://oauth2.googleapis.com/token"
        mock_account.client_id = "client_id"
        mock_account.client_secret = "client_secret"
        mock_account.scopes = "https://www.googleapis.com/auth/youtube.upload"
        mock_account.expires_at = datetime.now()

        # Mock Project
        mock_project = Mock(spec=Project)
        mock_project.id = 1

        # 設定 db query 返回值
        mock_db_session.query().filter().first.side_effect = [
            mock_account,  # 第一次查詢返回 YouTubeAccount
            mock_project,  # 第二次查詢返回 Project
        ]

        # Mock QuotaService
        with patch("app.services.upload_service.QuotaService") as MockQuotaService:
            mock_quota_service = AsyncMock()
            mock_quota_service.check_quota.return_value = True
            MockQuotaService.return_value = mock_quota_service

            # Mock YouTubeClient
            with patch("app.services.upload_service.YouTubeClient") as MockYouTubeClient:
                mock_client = MockYouTubeClient.return_value
                mock_client.upload_video = AsyncMock(return_value="test_video_id")
                mock_client.upload_thumbnail = AsyncMock(
                    return_value="https://i.ytimg.com/vi/test_video_id/maxresdefault.jpg"
                )

                # 執行測試
                service = VideoUploadService(mock_db_session)
                result = await service.upload_to_youtube(
                    project_id=1,
                    video_path="/path/to/video.mp4",
                    youtube_account_id=1,
                    metadata={
                        "title": "Test Video",
                        "description": "Test Description",
                        "tags": ["test"],
                        "privacy_status": "public",
                        "thumbnail_path": "/path/to/thumbnail.jpg",
                    },
                )

                # 驗證
                assert result["video_id"] == "test_video_id"
                assert result["url"] == "https://www.youtube.com/watch?v=test_video_id"
                assert result["status"] == "uploaded"
                assert result["privacy_status"] == "public"
                assert "maxresdefault.jpg" in result["thumbnail_url"]

                # 驗證配額記錄被調用
                assert mock_quota_service.record_usage.call_count == 2  # 影片 + 封面
                assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_upload_to_youtube_quota_exceeded(self, mock_db_session):
        """測試 10: YouTube 配額超限處理

        驗證當配額用盡時，系統正確拋出錯誤且不重試
        """
        # Mock YouTube 帳號
        mock_account = Mock(spec=YouTubeAccount)
        mock_account.id = 1
        mock_account.access_token = "valid_token"
        mock_account.refresh_token = "refresh_token"
        mock_account.token_uri = "https://oauth2.googleapis.com/token"
        mock_account.client_id = "client_id"
        mock_account.client_secret = "client_secret"
        mock_account.scopes = "https://www.googleapis.com/auth/youtube.upload"
        mock_account.expires_at = datetime.now()

        mock_db_session.query().filter().first.return_value = mock_account

        # Mock QuotaService 顯示配額充足（但實際 API 會失敗）
        with patch("app.services.upload_service.QuotaService") as MockQuotaService:
            mock_quota_service = AsyncMock()
            mock_quota_service.check_quota.return_value = True
            MockQuotaService.return_value = mock_quota_service

            # Mock YouTubeClient.upload_video() 拋出 HttpError 403 quotaExceeded
            with patch("app.services.upload_service.YouTubeClient") as MockYouTubeClient:
                mock_client = MockYouTubeClient.return_value

                # 建立 403 Quota Exceeded 錯誤
                mock_response = MagicMock()
                mock_response.status = 403

                error_content = json.dumps(
                    {
                        "error": {
                            "errors": [
                                {
                                    "domain": "youtube.quota",
                                    "reason": "quotaExceeded",
                                    "message": "The request cannot be completed because you have exceeded your quota.",
                                }
                            ],
                            "code": 403,
                            "message": "The request cannot be completed because you have exceeded your quota.",
                        }
                    }
                ).encode("utf-8")

                http_error = HttpError(resp=mock_response, content=error_content)
                mock_client.upload_video = AsyncMock(side_effect=http_error)

                # 執行測試 - 應拋出 YouTubeQuotaExceededError
                service = VideoUploadService(mock_db_session)

                with pytest.raises(YouTubeQuotaExceededError) as exc_info:
                    await service.upload_to_youtube(
                        project_id=1,
                        video_path="/path/to/video.mp4",
                        youtube_account_id=1,
                        metadata={
                            "title": "Test Video",
                            "description": "Test Description",
                            "tags": ["test"],
                            "privacy_status": "public",
                        },
                    )

                # 驗證錯誤訊息
                assert "quota exceeded" in str(exc_info.value).lower()
                assert "10,000 units" in str(exc_info.value)

                # 驗證只調用一次（不重試）
                assert mock_client.upload_video.call_count == 1

    @pytest.mark.asyncio
    async def test_upload_to_youtube_ai_content_annotation(self, mock_db_session):
        """測試 AI 內容標註自動加入"""
        # Mock YouTube 帳號
        mock_account = Mock(spec=YouTubeAccount)
        mock_account.id = 1
        mock_account.access_token = "valid_token"
        mock_account.refresh_token = "refresh_token"
        mock_account.token_uri = "https://oauth2.googleapis.com/token"
        mock_account.client_id = "client_id"
        mock_account.client_secret = "client_secret"
        mock_account.scopes = "https://www.googleapis.com/auth/youtube.upload"
        mock_account.expires_at = datetime.now()

        mock_db_session.query().filter().first.return_value = mock_account

        # Mock QuotaService
        with patch("app.services.upload_service.QuotaService") as MockQuotaService:
            mock_quota_service = AsyncMock()
            mock_quota_service.check_quota.return_value = True
            MockQuotaService.return_value = mock_quota_service

            # Mock YouTubeClient
            with patch("app.services.upload_service.YouTubeClient") as MockYouTubeClient:
                mock_client = MockYouTubeClient.return_value
                mock_client.upload_video = AsyncMock(return_value="test_video_id")

                # 執行測試
                service = VideoUploadService(mock_db_session)
                await service.upload_to_youtube(
                    project_id=1,
                    video_path="/path/to/video.mp4",
                    youtube_account_id=1,
                    metadata={
                        "title": "Test Video",
                        "description": "Original description without AI annotation",
                        "tags": ["test"],
                        "privacy_status": "public",
                    },
                )

                # 驗證 upload_video 被調用時，description 包含 AI 標註
                call_kwargs = mock_client.upload_video.call_args[1]
                assert "⚠️ 此影片由 AI 自動生成" in call_kwargs["description"]

    @pytest.mark.asyncio
    async def test_upload_to_youtube_account_not_found(self, mock_db_session):
        """測試 YouTube 帳號不存在時拋出錯誤"""
        # 查詢不到帳號
        mock_db_session.query().filter().first.return_value = None

        # 執行測試
        service = VideoUploadService(mock_db_session)

        with pytest.raises(ValueError) as exc_info:
            await service.upload_to_youtube(
                project_id=1,
                video_path="/path/to/video.mp4",
                youtube_account_id=999,
                metadata={
                    "title": "Test Video",
                    "description": "Test",
                    "tags": ["test"],
                    "privacy_status": "public",
                },
            )

        assert "YouTube account not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_upload_to_youtube_general_error(self, mock_db_session):
        """測試一般上傳錯誤處理"""
        # Mock YouTube 帳號
        mock_account = Mock(spec=YouTubeAccount)
        mock_account.id = 1
        mock_account.access_token = "valid_token"
        mock_account.refresh_token = "refresh_token"
        mock_account.token_uri = "https://oauth2.googleapis.com/token"
        mock_account.client_id = "client_id"
        mock_account.client_secret = "client_secret"
        mock_account.scopes = "https://www.googleapis.com/auth/youtube.upload"
        mock_account.expires_at = datetime.now()

        mock_db_session.query().filter().first.return_value = mock_account

        # Mock QuotaService
        with patch("app.services.upload_service.QuotaService") as MockQuotaService:
            mock_quota_service = AsyncMock()
            mock_quota_service.check_quota.return_value = True
            MockQuotaService.return_value = mock_quota_service

            # Mock YouTubeClient 拋出一般錯誤
            with patch("app.services.upload_service.YouTubeClient") as MockYouTubeClient:
                mock_client = MockYouTubeClient.return_value
                mock_client.upload_video = AsyncMock(side_effect=Exception("Network error"))

                # 執行測試
                service = VideoUploadService(mock_db_session)

                with pytest.raises(YouTubeUploadError) as exc_info:
                    await service.upload_to_youtube(
                        project_id=1,
                        video_path="/path/to/video.mp4",
                        youtube_account_id=1,
                        metadata={
                            "title": "Test Video",
                            "description": "Test",
                            "tags": ["test"],
                            "privacy_status": "public",
                        },
                    )

                assert "Failed to upload video" in str(exc_info.value)
