# Task-009: YouTube API 整合 (上傳與授權)

> **建立日期:** 2025-01-19
> **狀態:** ⏳ 未開始
> **預計時間:** 8 小時
> **優先級:** P0

---

## 關聯文件

- **整合規格:** `tech-specs/backend/integrations.md#YouTube Data API`
- **產品設計:** `product-design/overview.md#YouTube 上傳功能`
- **安全規格:** `tech-specs/backend/security.md#OAuth 2.0`

### 相關任務
- **並行任務:** Task-006, 007, 008
- **後續任務:** Task-013 (API Keys 管理會使用此整合)

---

## 任務目標

整合 YouTube Data API v3，實作 OAuth 2.0 授權流程、影片上傳、Metadata 設定、排程發布功能。

---

## 實作規格

### YouTube Client

**檔案:** `app/integrations/youtube_client.py`

```python
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
import json
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class YouTubeClient:
    """YouTube Data API v3 客戶端"""

    SCOPES = [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly"
    ]

    def __init__(self, credentials_data: dict):
        """
        初始化 YouTube 客戶端

        Args:
            credentials_data: OAuth 憑證 JSON
                {
                    "token": "access_token",
                    "refresh_token": "refresh_token",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "client_id": "...",
                    "client_secret": "...",
                    "scopes": ["..."]
                }
        """
        self.credentials = Credentials(**credentials_data)

        # 檢查憑證是否過期
        if self.credentials.expired and self.credentials.refresh_token:
            logger.info("Refreshing YouTube credentials...")
            self.credentials.refresh(Request())

        # 建立 YouTube API 客戶端
        self.youtube = build("youtube", "v3", credentials=self.credentials)

    @staticmethod
    def get_authorization_url(client_secrets_file: str) -> tuple[str, InstalledAppFlow]:
        """
        取得 OAuth 授權 URL

        Args:
            client_secrets_file: client_secret.json 檔案路徑

        Returns:
            (authorization_url, flow)
        """
        flow = InstalledAppFlow.from_client_secrets_file(
            client_secrets_file,
            scopes=YouTubeClient.SCOPES
        )

        # 使用本地伺服器模式
        flow.redirect_uri = "http://localhost:8080/api/v1/auth/youtube/callback"

        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )

        return authorization_url, flow

    @staticmethod
    def exchange_code_for_credentials(flow: InstalledAppFlow, authorization_code: str) -> dict:
        """
        交換授權碼為憑證

        Args:
            flow: OAuth flow 物件
            authorization_code: 授權碼

        Returns:
            憑證 JSON
        """
        flow.fetch_token(code=authorization_code)

        credentials = flow.credentials

        return {
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": credentials.scopes
        }

    def upload_video(
        self,
        video_path: str,
        title: str,
        description: str,
        tags: list[str],
        category_id: str = "22",  # People & Blogs
        privacy_status: str = "public",
        publish_at: Optional[datetime] = None
    ) -> str:
        """
        上傳影片到 YouTube

        Args:
            video_path: 影片檔案路徑
            title: 影片標題 (最多 100 字元)
            description: 影片描述 (最多 5000 字元)
            tags: 標籤列表 (最多 15 個，每個最多 30 字元)
            category_id: 影片類別 ID
            privacy_status: 隱私設定 (public, private, unlisted)
            publish_at: 排程發布時間 (ISO 8601 格式)

        Returns:
            YouTube 影片 ID
        """
        # 驗證參數
        if len(title) > 100:
            raise ValueError("Title must not exceed 100 characters")
        if len(description) > 5000:
            raise ValueError("Description must not exceed 5000 characters")
        if len(tags) > 15:
            raise ValueError("Maximum 15 tags allowed")

        # 建立 request body
        body = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags,
                "categoryId": category_id
            },
            "status": {
                "privacyStatus": privacy_status
            }
        }

        # 排程發布
        if publish_at:
            body["status"]["publishAt"] = publish_at.isoformat()

        # 建立 media upload
        media = MediaFileUpload(
            video_path,
            chunksize=10 * 1024 * 1024,  # 10 MB chunks
            resumable=True,
            mimetype="video/mp4"
        )

        logger.info(f"Starting upload: {title}")

        # 執行上傳
        request = self.youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media
        )

        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                progress = int(status.progress() * 100)
                logger.info(f"Upload progress: {progress}%")

        video_id = response["id"]
        logger.info(f"Upload completed. Video ID: {video_id}")

        return video_id

    def get_video_details(self, video_id: str) -> dict:
        """
        取得影片詳細資訊

        Args:
            video_id: YouTube 影片 ID

        Returns:
            影片資訊
        """
        request = self.youtube.videos().list(
            part="snippet,status,contentDetails,statistics",
            id=video_id
        )

        response = request.execute()

        if not response.get("items"):
            raise ValueError(f"Video {video_id} not found")

        return response["items"][0]

    def get_channel_info(self) -> dict:
        """
        取得頻道資訊

        Returns:
            {
                "id": "channel_id",
                "title": "頻道名稱",
                "description": "頻道描述",
                "subscriber_count": 1000,
                "video_count": 50
            }
        """
        request = self.youtube.channels().list(
            part="snippet,statistics",
            mine=True
        )

        response = request.execute()

        if not response.get("items"):
            raise ValueError("No channel found for this account")

        channel = response["items"][0]

        return {
            "id": channel["id"],
            "title": channel["snippet"]["title"],
            "description": channel["snippet"]["description"],
            "subscriber_count": int(channel["statistics"]["subscriberCount"]),
            "video_count": int(channel["statistics"]["videoCount"])
        }

    def get_upload_quota(self) -> dict:
        """
        取得上傳配額資訊

        Returns:
            配額資訊（簡化版，實際需要透過 Quota API）
        """
        # YouTube Data API v3 配額限制：
        # - 每日配額：10,000 單位
        # - 影片上傳：約 1600 單位
        # - 簡單查詢：1 單位

        return {
            "daily_limit": 10000,
            "upload_cost": 1600,
            "max_uploads_per_day": 6
        }
```

---

### YouTube Service

**檔案:** `app/services/youtube_service.py`

```python
from app.integrations.youtube_client import YouTubeClient
from app.models.project import Project
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

class YouTubeService:
    def __init__(self, db: Session):
        self.db = db

    def upload_project_video(
        self,
        project_id: str,
        video_path: str,
        credentials_data: dict
    ) -> str:
        """
        上傳專案影片到 YouTube

        Args:
            project_id: 專案 ID
            video_path: 影片檔案路徑
            credentials_data: YouTube OAuth 憑證

        Returns:
            YouTube 影片 ID
        """
        # 取得專案
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project {project_id} not found")

        # 取得 YouTube 設定
        youtube_settings = project.youtube_settings

        # 建立 YouTube 客戶端
        client = YouTubeClient(credentials_data)

        # 上傳影片
        video_id = client.upload_video(
            video_path=video_path,
            title=youtube_settings["title"],
            description=youtube_settings["description"],
            tags=youtube_settings.get("tags", []),
            privacy_status=youtube_settings.get("privacy", "public"),
            publish_at=youtube_settings.get("scheduled_time")
        )

        # 更新專案
        project.youtube_url = f"https://www.youtube.com/watch?v={video_id}"
        project.youtube_video_id = video_id
        self.db.commit()

        logger.info(f"Uploaded video to YouTube: {video_id}")

        return video_id
```

---

### OAuth Callback 端點

**檔案:** `app/api/v1/endpoints/auth.py`

```python
from fastapi import APIRouter, Query, HTTPException
from app.integrations.youtube_client import YouTubeClient
from app.schemas.response import SuccessResponse

router = APIRouter()

# 儲存 OAuth flow（實際應該用 Redis）
oauth_flows = {}

@router.get("/youtube/authorize")
async def youtube_authorize():
    """啟動 YouTube OAuth 授權流程"""
    authorization_url, flow = YouTubeClient.get_authorization_url(
        "client_secret.json"
    )

    # 儲存 flow（用 state 作為 key）
    oauth_flows[flow.state] = flow

    return SuccessResponse(data={
        "authorization_url": authorization_url
    })

@router.get("/youtube/callback")
async def youtube_callback(
    code: str = Query(...),
    state: str = Query(...)
):
    """YouTube OAuth callback"""
    # 取得 flow
    flow = oauth_flows.get(state)
    if not flow:
        raise HTTPException(status_code=400, detail="Invalid state")

    # 交換憑證
    credentials = YouTubeClient.exchange_code_for_credentials(flow, code)

    # 清理 flow
    del oauth_flows[state]

    return SuccessResponse(data={
        "message": "Authorization successful",
        "credentials": credentials
    })
```

---

## 完成檢查清單

- [ ] YouTube Client 實作
- [ ] OAuth 授權流程實作
- [ ] 影片上傳邏輯
- [ ] Metadata 設定
- [ ] 排程發布功能
- [ ] 配額監控
- [ ] 錯誤處理與重試
- [ ] 測試通過

---

## 時間分配

- **YouTube Client:** 3 小時
- **OAuth 流程:** 2 小時
- **上傳邏輯:** 2 小時
- **測試:** 1 小時

**總計:** 8 小時
