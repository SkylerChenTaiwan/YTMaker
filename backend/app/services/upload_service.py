"""影片上傳業務邏輯服務"""

import json
import logging
from typing import Any

from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session

from app.exceptions import (
    YouTubeQuotaExceededError,
    YouTubeUploadError,
)
from app.integrations.youtube_client import YouTubeClient
from app.models.project import Project
from app.models.youtube_account import YouTubeAccount
from app.services.quota_service import QuotaService

logger = logging.getLogger(__name__)


class VideoUploadService:
    """
    影片上傳業務邏輯服務

    協調影片上傳的完整流程：
    1. 檢查配額
    2. 刷新 access token（如需要）
    3. 上傳影片
    4. 設定 metadata
    5. 上傳封面
    6. 標註 AI 內容
    7. 設定排程（如有）
    8. 更新專案狀態
    """

    def __init__(self, db: Session):
        self.db = db
        self.quota_service = QuotaService(db)

    async def upload_to_youtube(
        self,
        project_id: int,
        video_path: str,
        youtube_account_id: int,
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """
        完整的 YouTube 上傳流程

        Args:
            project_id: 專案 ID
            video_path: 影片檔案路徑
            youtube_account_id: YouTube 帳號 ID
            metadata: 影片 metadata
                {
                    "title": str,
                    "description": str,
                    "tags": List[str],
                    "privacy_status": str,
                    "publish_at": Optional[datetime],
                    "thumbnail_path": Optional[str]
                }

        Returns:
            上傳結果
                {
                    "video_id": str,
                    "url": str,
                    "status": str,
                    "privacy_status": str,
                    "publish_at": Optional[datetime]
                }

        Raises:
            YouTubeQuotaExceededError: 配額不足
            YouTubeUploadError: YouTube API 錯誤
        """
        logger.info(f"Starting YouTube upload for project {project_id}")

        # Step 1: 檢查配額
        if not await self.quota_service.check_quota("youtube", cost=1650):
            raise YouTubeQuotaExceededError(
                "YouTube API quota exceeded. Daily limit: 10,000 units. "
                "Video upload costs 1,600 units + thumbnail upload costs 50 units."
            )

        # Step 2: 取得 YouTube 帳號與憑證
        youtube_account = (
            self.db.query(YouTubeAccount).filter(YouTubeAccount.id == youtube_account_id).first()
        )

        if not youtube_account:
            raise ValueError(f"YouTube account not found: {youtube_account_id}")

        credentials = {
            "access_token": youtube_account.access_token,
            "refresh_token": youtube_account.refresh_token,
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": youtube_account.client_id,
            "client_secret": youtube_account.client_secret,
            "scopes": youtube_account.scopes.split(","),
            "expires_at": youtube_account.expires_at,
        }

        # Step 3: 初始化 YouTube 客戶端
        youtube_client = YouTubeClient(credentials, self.db)

        # Step 4: 準備 metadata（加入 AI 內容標註）
        description = metadata["description"]
        if "⚠️ 此影片由 AI 自動生成" not in description:
            description += "\n\n⚠️ 此影片由 AI 自動生成"

        # Step 5: 上傳影片
        try:
            video_id = await youtube_client.upload_video(
                video_path=video_path,
                title=metadata["title"],
                description=description,
                tags=metadata["tags"],
                privacy_status=metadata.get("privacy_status", "public"),
                category_id=metadata.get("category_id", "22"),
                publish_at=metadata.get("publish_at"),
                made_for_kids=False,
            )

            # 記錄配額使用
            await self.quota_service.record_usage("youtube", cost=1600)

        except HttpError as e:
            # 檢查是否為配額超限錯誤
            if e.resp.status == 403:
                try:
                    error_content = json.loads(e.content.decode("utf-8"))
                    error_reason = (
                        error_content.get("error", {}).get("errors", [{}])[0].get("reason", "")
                    )

                    if error_reason == "quotaExceeded":
                        logger.error(f"YouTube API quota exceeded for project {project_id}")
                        raise YouTubeQuotaExceededError(
                            "YouTube API quota exceeded. Daily limit: 10,000 units. "
                            "Please try again tomorrow after quota resets (Pacific Time midnight)."
                        )
                except (json.JSONDecodeError, KeyError):
                    pass  # 如果無法解析，繼續拋出一般錯誤

            # 其他錯誤
            logger.error(f"YouTube upload failed: {str(e)}")
            raise YouTubeUploadError(f"Failed to upload video: {str(e)}") from e

        except Exception as e:
            logger.error(f"Video upload failed: {str(e)}")
            raise YouTubeUploadError(f"Failed to upload video: {str(e)}") from e

        # Step 6: 上傳封面（如果提供）
        thumbnail_url = None
        if metadata.get("thumbnail_path"):
            try:
                thumbnail_url = await youtube_client.upload_thumbnail(
                    video_id=video_id, thumbnail_path=metadata["thumbnail_path"]
                )

                # 記錄配額使用
                await self.quota_service.record_usage("youtube", cost=50)

            except Exception as e:
                logger.warning(f"Thumbnail upload failed (non-critical): {str(e)}")
                # 封面上傳失敗不影響整體流程

        # Step 7: 更新專案狀態
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.youtube_video_id = video_id
            project.youtube_video_url = f"https://www.youtube.com/watch?v={video_id}"
            project.status = "completed"
            self.db.commit()

        logger.info(f"Video uploaded successfully: {video_id}")

        return {
            "video_id": video_id,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "status": "uploaded",
            "privacy_status": metadata.get("privacy_status", "public"),
            "publish_at": metadata.get("publish_at"),
            "thumbnail_url": thumbnail_url,
        }
