# Task-008: D-ID API 整合 (虛擬主播)

> **建立日期:** 2025-01-19
> **狀態:** ⏳ 未開始
> **預計時間:** 6 小時
> **優先級:** P0

---

## 關聯文件

- **整合規格:** `tech-specs/backend/integrations.md#D-ID API`
- **產品設計:** `product-design/overview.md#虛擬主播功能`

### 相關任務
- **並行任務:** Task-006, 007, 009

---

## 任務目標

整合 D-ID API，實作虛擬主播影片生成功能，包含嘴型同步、時長驗證、輪詢機制。

---

## 實作規格

### D-ID Client

**檔案:** `app/integrations/did_client.py`

```python
import httpx
import asyncio
from typing import Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class DIDClient:
    """D-ID API 客戶端 (虛擬主播)"""

    BASE_URL = "https://api.d-id.com"

    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.DID_API_KEY
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={
                "Authorization": f"Basic {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=300.0  # 5 分鐘超時
        )

    async def create_avatar_video(
        self,
        audio_url: str,
        avatar_image: str = "default",
        webhook_url: Optional[str] = None
    ) -> dict:
        """
        生成虛擬主播影片

        Args:
            audio_url: 語音檔案 URL (必須可公開訪問)
            avatar_image: 虛擬主播圖片 URL 或預設值
            webhook_url: 完成後的 webhook URL

        Returns:
            {
                "id": "talk_id",
                "status": "created",
                "result_url": null  # 完成後才有
            }
        """
        payload = {
            "source_url": avatar_image if avatar_image != "default" else
                "https://d-id-public-bucket.s3.amazonaws.com/alice.jpg",
            "script": {
                "type": "audio",
                "audio_url": audio_url
            },
            "config": {
                "fluent": True,  # 更自然的動作
                "stitch": True   # 無縫銜接
            }
        }

        if webhook_url:
            payload["webhook"] = webhook_url

        try:
            response = await self.client.post("/talks", json=payload)
            response.raise_for_status()

            data = response.json()
            logger.info(f"Created D-ID talk: {data['id']}")

            return data

        except httpx.HTTPStatusError as e:
            logger.error(f"D-ID API error: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Failed to create avatar video: {e.response.text}")

    async def get_talk_status(self, talk_id: str) -> dict:
        """
        查詢虛擬主播生成狀態

        Args:
            talk_id: Talk ID

        Returns:
            {
                "id": "talk_id",
                "status": "done" | "created" | "processing" | "error",
                "result_url": "影片 URL",
                "duration": 10.5
            }
        """
        try:
            response = await self.client.get(f"/talks/{talk_id}")
            response.raise_for_status()

            return response.json()

        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to get talk status: {e.response.status_code}")
            raise

    async def wait_for_completion(
        self,
        talk_id: str,
        max_wait_time: int = 600,  # 10 分鐘
        poll_interval: int = 5
    ) -> str:
        """
        輪詢等待虛擬主播影片完成

        Args:
            talk_id: Talk ID
            max_wait_time: 最大等待時間（秒）
            poll_interval: 輪詢間隔（秒）

        Returns:
            影片下載 URL
        """
        start_time = asyncio.get_event_loop().time()

        while True:
            # 檢查超時
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > max_wait_time:
                raise TimeoutError(f"Talk {talk_id} did not complete in {max_wait_time}s")

            # 查詢狀態
            status_data = await self.get_talk_status(talk_id)
            status = status_data["status"]

            logger.info(f"Talk {talk_id} status: {status}")

            if status == "done":
                result_url = status_data.get("result_url")
                if not result_url:
                    raise Exception("Talk completed but no result_url")

                logger.info(f"Talk {talk_id} completed. Duration: {status_data.get('duration')}s")
                return result_url

            elif status == "error":
                error_message = status_data.get("error", {}).get("description", "Unknown error")
                raise Exception(f"Talk generation failed: {error_message}")

            # 等待後重試
            await asyncio.sleep(poll_interval)

    async def download_video(self, video_url: str, save_path: str):
        """
        下載虛擬主播影片

        Args:
            video_url: 影片 URL
            save_path: 儲存路徑
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(video_url)
            response.raise_for_status()

            with open(save_path, "wb") as f:
                f.write(response.content)

            logger.info(f"Downloaded avatar video to {save_path}")

    async def close(self):
        """關閉 HTTP 客戶端"""
        await self.client.aclose()
```

---

### Avatar Service

**檔案:** `app/services/avatar_service.py`

```python
from app.integrations.did_client import DIDClient
from app.models.asset import Asset, AssetType
from sqlalchemy.orm import Session
import os
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class AvatarService:
    def __init__(self, db: Session):
        self.db = db
        self.client = DIDClient()

    async def generate_avatar_for_segment(
        self,
        project_id: str,
        audio_url: str,
        avatar_image: str = "default"
    ) -> Asset:
        """
        為腳本段落生成虛擬主播影片

        Args:
            project_id: 專案 ID
            audio_url: 語音檔案 URL
            avatar_image: 虛擬主播圖片

        Returns:
            Asset 物件
        """
        # 建立虛擬主播
        talk_data = await self.client.create_avatar_video(
            audio_url=audio_url,
            avatar_image=avatar_image
        )

        talk_id = talk_data["id"]

        # 等待完成
        result_url = await self.client.wait_for_completion(talk_id)

        # 下載影片
        filename = f"avatar_{talk_id}.mp4"
        file_path = f"/projects/{project_id}/avatars/{filename}"
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        await self.client.download_video(result_url, file_path)

        # 建立 Asset 記錄
        asset = Asset(
            id=str(uuid.uuid4()),
            project_id=project_id,
            asset_type=AssetType.AVATAR,
            file_path=file_path,
            metadata={
                "talk_id": talk_id,
                "audio_url": audio_url,
                "avatar_image": avatar_image
            },
            created_at=datetime.utcnow()
        )
        self.db.add(asset)
        self.db.commit()
        self.db.refresh(asset)

        logger.info(f"Created avatar asset: {asset.id}")

        return asset

    async def generate_avatars_batch(
        self,
        project_id: str,
        audio_urls: list[str],
        avatar_image: str = "default"
    ) -> list[Asset]:
        """
        批次生成虛擬主播影片

        Args:
            project_id: 專案 ID
            audio_urls: 語音檔案 URL 列表
            avatar_image: 虛擬主播圖片

        Returns:
            Asset 列表
        """
        assets = []

        for i, audio_url in enumerate(audio_urls):
            try:
                logger.info(f"Generating avatar {i+1}/{len(audio_urls)}")

                asset = await self.generate_avatar_for_segment(
                    project_id=project_id,
                    audio_url=audio_url,
                    avatar_image=avatar_image
                )
                assets.append(asset)

            except Exception as e:
                logger.error(f"Failed to generate avatar {i}: {e}")
                assets.append(None)

        return assets

    async def close(self):
        """關閉資源"""
        await self.client.close()
```

---

## 完成檢查清單

- [ ] D-ID Client 實作
- [ ] 輪詢機制實作
- [ ] 嘴型同步驗證
- [ ] 時長驗證
- [ ] 批次處理實作
- [ ] 錯誤處理與重試
- [ ] 測試通過

---

## 時間分配

- **D-ID Client:** 2 小時
- **Avatar Service:** 2 小時
- **輪詢與驗證邏輯:** 1 小時
- **測試:** 1 小時

**總計:** 6 小時
