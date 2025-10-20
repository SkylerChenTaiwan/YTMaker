import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)


class DIDClient:
    """D-ID API 客戶端"""

    BASE_URL = "https://api.d-id.com"

    def __init__(self, api_key: str):
        """
        初始化 D-ID 客戶端

        Args:
            api_key: D-ID API Key
        """
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Basic {api_key}",
            "Content-Type": "application/json"
        }

    async def create_talk(
        self,
        audio_url: str,
        presenter_id: str = "amy-jcwCkr1grs",
        driver_id: str = "uM00QMwJ9x"
    ) -> str:
        """
        建立虛擬主播 Talk

        Args:
            audio_url: 音訊檔案的可訪問 URL
            presenter_id: Presenter 圖片 ID(預設使用 D-ID 內建)
            driver_id: 驅動模型 ID(控制嘴型同步品質)

        Returns:
            talk_id: Talk 任務 ID

        Raises:
            DIDAPIError: API 調用失敗
        """
        url = f"{self.BASE_URL}/talks"

        payload = {
            "source_url": f"https://create-images-results.d-id.com/api_docs/assets/{presenter_id}.jpg",
            "script": {
                "type": "audio",
                "audio_url": audio_url
            },
            "config": {
                "driver_id": driver_id,
                "fluent": True,
                "pad_audio": 0.0
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()

                data = response.json()
                talk_id = data["id"]
                logger.info(f"D-ID Talk created: {talk_id}")

                return talk_id

            except httpx.HTTPStatusError as e:
                error_msg = f"D-ID API error: {e.response.status_code} - {e.response.text}"
                logger.error(error_msg)
                raise DIDAPIError(error_msg) from e
            except Exception as e:
                logger.error(f"Failed to create D-ID talk: {str(e)}")
                raise DIDAPIError(str(e)) from e

    async def get_talk_status(
        self,
        talk_id: str,
        max_wait_time: int = 600,  # 10 分鐘
        poll_interval: int = 5
    ) -> dict:
        """
        輪詢 Talk 狀態直到完成或失敗

        Args:
            talk_id: Talk ID
            max_wait_time: 最大等待時間(秒)
            poll_interval: 輪詢間隔(秒)

        Returns:
            Talk 狀態資訊,包含 result_url

        Raises:
            DIDAPIError: API 調用失敗或生成失敗
            TimeoutError: 超時
        """
        url = f"{self.BASE_URL}/talks/{talk_id}"
        start_time = asyncio.get_event_loop().time()

        async with httpx.AsyncClient() as client:
            while True:
                # 檢查超時
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed > max_wait_time:
                    raise TimeoutError(f"D-ID talk generation timeout after {max_wait_time}s")

                try:
                    response = await client.get(url, headers=self.headers)
                    response.raise_for_status()

                    data = response.json()
                    status = data.get("status")

                    logger.info(f"D-ID Talk {talk_id} status: {status}")

                    if status == "done":
                        return data
                    elif status == "error":
                        error_msg = data.get("error", {}).get("message", "Unknown error")
                        raise DIDAPIError(f"D-ID generation failed: {error_msg}")

                    # 繼續等待(status: created, started)
                    await asyncio.sleep(poll_interval)

                except httpx.HTTPStatusError as e:
                    error_msg = f"D-ID API error: {e.response.status_code}"
                    logger.error(error_msg)
                    raise DIDAPIError(error_msg) from e

    async def download_video(self, video_url: str) -> bytes:
        """
        下載生成的影片

        Args:
            video_url: 影片下載 URL

        Returns:
            影片二進制數據

        Raises:
            DIDAPIError: 下載失敗
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(video_url, timeout=120.0)
                response.raise_for_status()

                logger.info(f"Downloaded D-ID video: {len(response.content)} bytes")
                return response.content

            except Exception as e:
                error_msg = f"Failed to download D-ID video: {str(e)}"
                logger.error(error_msg)
                raise DIDAPIError(error_msg) from e

    async def check_quota(self) -> dict[str, float]:
        """
        查詢 D-ID API 配額使用情況

        Returns:
            {
                "used_minutes": 使用分鐘數,
                "total_minutes": 總配額分鐘數,
                "remaining_minutes": 剩餘分鐘數,
                "percentage_used": 使用百分比
            }

        Note:
            D-ID API 可能沒有公開的配額查詢端點,
            此方法根據實際 API 調整
        """
        url = f"{self.BASE_URL}/credits"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

                data = response.json()
                used_seconds = data["used"]
                total_seconds = data["total"]

                used_minutes = used_seconds / 60
                total_minutes = total_seconds / 60
                remaining_minutes = (total_seconds - used_seconds) / 60
                percentage_used = (used_seconds / total_seconds) * 100

                return {
                    "used_minutes": used_minutes,
                    "total_minutes": total_minutes,
                    "remaining_minutes": remaining_minutes,
                    "percentage_used": percentage_used
                }

            except httpx.HTTPStatusError as e:
                error_msg = f"Failed to check D-ID quota: {e.response.status_code}"
                logger.error(error_msg)
                raise DIDAPIError(error_msg) from e
            except Exception as e:
                logger.error(f"Failed to check D-ID quota: {str(e)}")
                raise DIDAPIError(str(e)) from e

    async def can_generate_avatar(self, estimated_duration: int) -> bool:
        """
        檢查是否有足夠配額生成虛擬主播

        Args:
            estimated_duration: 預估時長(秒)

        Returns:
            是否可以生成

        Raises:
            QuotaExceededError: 配額不足
        """
        quota = await self.check_quota()
        remaining_seconds = quota["remaining_minutes"] * 60

        if remaining_seconds < estimated_duration:
            raise QuotaExceededError(
                f"D-ID quota insufficient. Remaining: {quota['remaining_minutes']:.1f} min, "
                f"Required: {estimated_duration/60:.1f} min"
            )

        return True


class DIDAPIError(Exception):
    """D-ID API 錯誤"""
    pass


class QuotaExceededError(DIDAPIError):
    """D-ID 配額用盡"""
    pass
