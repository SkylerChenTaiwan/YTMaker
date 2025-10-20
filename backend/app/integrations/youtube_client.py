"""YouTube Data API v3 客戶端"""

import logging
import time
from datetime import datetime
from typing import Any, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

logger = logging.getLogger(__name__)


class YouTubeClient:
    """
    YouTube Data API v3 客戶端

    處理所有與 YouTube API 的互動，包含：
    - OAuth 2.0 認證與 token 管理
    - 影片上傳（支援 resumable upload）
    - 封面上傳
    - 頻道資訊查詢
    - 配額追蹤
    """

    def __init__(self, credentials: dict[str, Any], db_session):
        """
        初始化 YouTube 客戶端

        Args:
            credentials: OAuth 2.0 憑證字典
                {
                    "access_token": str,
                    "refresh_token": str,
                    "token_uri": str,
                    "client_id": str,
                    "client_secret": str,
                    "scopes": List[str],
                    "expires_at": datetime
                }
            db_session: SQLAlchemy session（用於更新 token）
        """
        self.credentials_dict = credentials
        self.db_session = db_session
        self.youtube = None
        self._initialize_client()

    def _initialize_client(self) -> None:
        """
        初始化 YouTube API 客戶端

        自動檢查並刷新 expired token
        """
        creds = self.get_credentials()
        self.youtube = build("youtube", "v3", credentials=creds)

    def get_credentials(self) -> Credentials:
        """
        取得有效的 OAuth 2.0 憑證

        如果 access token 已過期，自動使用 refresh token 更新

        Returns:
            google.oauth2.credentials.Credentials 物件

        Raises:
            Exception: Token 刷新失敗
        """
        creds = Credentials(
            token=self.credentials_dict["access_token"],
            refresh_token=self.credentials_dict["refresh_token"],
            token_uri=self.credentials_dict["token_uri"],
            client_id=self.credentials_dict["client_id"],
            client_secret=self.credentials_dict["client_secret"],
            scopes=self.credentials_dict["scopes"],
        )

        # 檢查是否過期
        if creds.expired and creds.refresh_token:
            logger.info("Access token expired, refreshing...")

            try:
                creds.refresh(Request())

                # 更新資料庫中的 token
                self._update_credentials_in_db(
                    {
                        "access_token": creds.token,
                        "refresh_token": creds.refresh_token,
                        "expires_at": creds.expiry,
                    }
                )

                logger.info("Access token refreshed successfully")
            except Exception as e:
                logger.error(f"Failed to refresh token: {str(e)}")
                raise

        return creds

    def _update_credentials_in_db(self, new_credentials: dict[str, Any]) -> None:
        """
        更新資料庫中的 OAuth credentials

        Args:
            new_credentials: 新的憑證資料
        """
        # TODO: 實作資料庫更新邏輯
        # 這部分需要與 YouTubeAccount model 整合
        logger.info("Credentials updated (DB update not yet implemented)")
        pass

    async def upload_video(
        self,
        video_path: str,
        title: str,
        description: str,
        tags: list[str],
        privacy_status: str = "public",
        category_id: str = "22",
        publish_at: Optional[datetime] = None,
        made_for_kids: bool = False,
    ) -> str:
        """
        上傳影片到 YouTube

        使用 Resumable Upload 支援斷點續傳

        Args:
            video_path: 影片檔案路徑
            title: 影片標題
            description: 影片描述
            tags: 標籤列表
            privacy_status: 隱私狀態 ("public", "private", "unlisted")
            category_id: 影片分類 ID（預設 "22" = People & Blogs）
            publish_at: 排程發布時間（ISO 8601 格式）
            made_for_kids: 是否為兒童內容

        Returns:
            video_id: YouTube 影片 ID

        Raises:
            HttpError: YouTube API 錯誤
            FileNotFoundError: 影片檔案不存在
        """
        # 建立影片資源
        body = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags,
                "categoryId": category_id,
            },
            "status": {
                "privacyStatus": privacy_status,
                "selfDeclaredMadeForKids": made_for_kids,
            },
        }

        # 排程發布
        if publish_at:
            body["status"]["publishAt"] = publish_at.isoformat()

        # 使用 Resumable Upload
        media = MediaFileUpload(
            video_path,
            chunksize=1024 * 1024,  # 1MB chunks
            resumable=True,
            mimetype="video/mp4",
        )

        request = self.youtube.videos().insert(part="snippet,status", body=body, media_body=media)

        # 執行上傳（支援斷點續傳）
        response = None
        retry_count = 0
        max_retries = 3

        while response is None:
            try:
                status, response = request.next_chunk()

                if status:
                    progress = int(status.progress() * 100)
                    logger.info(f"Upload progress: {progress}%")
                    # TODO: 更新進度到資料庫或 Redis

            except HttpError as e:
                if e.resp.status in [500, 502, 503, 504]:
                    # 可重試的伺服器錯誤
                    if retry_count < max_retries:
                        retry_count += 1
                        delay = 2**retry_count  # 指數退避: 2, 4, 8 秒
                        logger.warning(
                            f"Server error {e.resp.status}, retrying in {delay}s... "
                            f"(attempt {retry_count}/{max_retries})"
                        )
                        time.sleep(delay)
                    else:
                        logger.error(f"Max retries reached, upload failed: {str(e)}")
                        raise
                elif e.resp.status == 401:
                    # Token 過期，刷新後重試
                    logger.warning("Token expired during upload, refreshing...")
                    self.get_credentials()
                    self._initialize_client()
                    # 重新建立 request（使用新的 credentials）
                    request = self.youtube.videos().insert(
                        part="snippet,status", body=body, media_body=media
                    )
                    # 不增加 retry_count，因為這是 auth 問題
                else:
                    # 不可重試的錯誤（403, 400 等）
                    raise

        video_id = response["id"]
        logger.info(f"Video uploaded successfully: {video_id}")

        return video_id

    async def upload_thumbnail(self, video_id: str, thumbnail_path: str) -> str:
        """
        上傳影片封面

        Args:
            video_id: YouTube 影片 ID
            thumbnail_path: 封面圖片路徑

        Returns:
            thumbnail_url: 封面圖片 URL

        Raises:
            HttpError: YouTube API 錯誤
            FileNotFoundError: 封面檔案不存在
        """
        media = MediaFileUpload(thumbnail_path, mimetype="image/jpeg", resumable=True)

        response = self.youtube.thumbnails().set(videoId=video_id, media_body=media).execute()

        # 提取封面 URL（maxresdefault 品質）
        thumbnail_url = response["items"][0]["maxres"]["url"]

        logger.info(f"Thumbnail uploaded for video {video_id}")

        return thumbnail_url

    async def get_channel_info(self, channel_id: str) -> dict[str, Any]:
        """
        取得頻道資訊

        Args:
            channel_id: YouTube 頻道 ID

        Returns:
            頻道資訊字典
        """
        response = self.youtube.channels().list(part="snippet,statistics", id=channel_id).execute()

        if not response["items"]:
            raise ValueError(f"Channel not found: {channel_id}")

        channel = response["items"][0]

        return {
            "id": channel["id"],
            "title": channel["snippet"]["title"],
            "description": channel["snippet"]["description"],
            "thumbnail_url": channel["snippet"]["thumbnails"]["default"]["url"],
            "subscriber_count": int(channel["statistics"]["subscriberCount"]),
            "video_count": int(channel["statistics"]["videoCount"]),
            "view_count": int(channel["statistics"]["viewCount"]),
        }

    async def delete_video(self, video_id: str) -> None:
        """
        刪除影片（用於測試清理）

        Args:
            video_id: YouTube 影片 ID
        """
        self.youtube.videos().delete(id=video_id).execute()
        logger.info(f"Video deleted: {video_id}")
