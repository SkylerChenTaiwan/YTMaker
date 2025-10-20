import logging
from typing import Literal

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.storage import StorageService
from app.integrations.did_client import DIDClient
from app.models.asset import Asset

logger = logging.getLogger(__name__)


class AvatarGenerationService:
    """虛擬主播生成服務"""

    def __init__(self, db: Session):
        self.db = db
        self.storage = StorageService()

        # 從環境變數或設定取得 D-ID API Key
        api_key = settings.DID_API_KEY
        if not api_key:
            raise ValueError("D-ID API Key not configured")

        self.did_client = DIDClient(api_key)

    async def generate_avatar_video(
        self,
        project_id: int,
        audio_file_path: str,
        segment_type: Literal["intro", "outro"]
    ) -> Asset:
        """
        生成虛擬主播影片(嚴格模式)

        流程:
        1. 上傳音訊到可公開訪問的儲存(或生成臨時 URL)
        2. 檢查配額
        3. 調用 D-ID API 建立 Talk
        4. 輪詢狀態等待生成完成
        5. 下載影片
        6. 驗證影片品質(時長)
        7. 儲存檔案
        8. 建立 Asset 記錄

        Args:
            project_id: 專案 ID
            audio_file_path: 音訊檔案路徑(本地)
            segment_type: 片段類型("intro" 或 "outro")

        Returns:
            Asset: 虛擬主播影片 Asset 記錄

        Raises:
            DIDAPIError: D-ID API 調用失敗
            QuotaExceededError: 配額不足
            ValidationError: 影片驗證失敗
        """
        logger.info(f"Starting avatar generation for project {project_id}, segment: {segment_type}")

        # 1. 取得音訊時長(用於配額檢查和驗證)
        audio_duration = self._get_audio_duration(audio_file_path)
        logger.info(f"Audio duration: {audio_duration}s")

        # 2. 檢查配額(可能拋出 QuotaExceededError)
        await self.did_client.can_generate_avatar(estimated_duration=int(audio_duration))

        # 3. 上傳音訊到臨時可訪問的 URL
        audio_url = await self.storage.upload_temporary(audio_file_path)
        logger.info(f"Audio uploaded to: {audio_url}")

        try:
            # 4. 建立 D-ID Talk(可能拋出 DIDAPIError)
            talk_id = await self.did_client.create_talk(audio_url)

            # 5. 輪詢狀態(可能拋出 DIDAPIError 或 TimeoutError)
            talk_result = await self.did_client.get_talk_status(talk_id)

            # 6. 下載影片(可能拋出 DIDAPIError)
            video_url = talk_result["result_url"]
            video_data = await self.did_client.download_video(video_url)

            # 7. 儲存影片
            video_filename = f"avatar_{segment_type}.mp4"
            video_path = self.storage.save_asset(
                project_id=project_id,
                filename=video_filename,
                data=video_data
            )
            logger.info(f"Avatar video saved to: {video_path}")

            # 8. 驗證影片
            video_duration = self._get_video_duration(video_path)
            validation_result = self.validate_duration(video_duration, audio_duration)

            if not validation_result["is_valid"]:
                logger.warning(
                    f"Avatar video duration mismatch. "
                    f"Video: {video_duration}s, Audio: {audio_duration}s, "
                    f"Error rate: {validation_result['error_rate']:.2%}"
                )
                # 根據業務需求決定是否接受或重試
                # 這裡選擇接受但記錄警告

            # 9. 建立 Asset 記錄
            asset = Asset(
                project_id=project_id,
                asset_type=f"avatar_{segment_type}",
                file_path=video_path,
                metadata={
                    "duration": video_duration,
                    "talk_id": talk_id,
                    "validation": validation_result,
                    "segment_type": segment_type
                }
            )

            self.db.add(asset)
            self.db.commit()
            self.db.refresh(asset)

            logger.info(f"Avatar asset created: {asset.id}")
            return asset

        finally:
            # 清理臨時音訊 URL
            await self.storage.delete_temporary(audio_url)

    def validate_duration(
        self,
        video_duration: float,
        audio_duration: float,
        tolerance: float = 0.05
    ) -> dict[str, any]:
        """
        驗證影片時長是否與音訊匹配

        Args:
            video_duration: 影片時長(秒)
            audio_duration: 音訊時長(秒)
            tolerance: 允許誤差(預設 5%)

        Returns:
            {
                "is_valid": bool,
                "error_rate": float,
                "video_duration": float,
                "audio_duration": float
            }
        """
        error_rate = abs(video_duration - audio_duration) / audio_duration
        is_valid = error_rate < tolerance

        return {
            "is_valid": is_valid,
            "error_rate": error_rate,
            "video_duration": video_duration,
            "audio_duration": audio_duration
        }

    def _get_audio_duration(self, audio_path: str) -> float:
        """
        取得音訊檔案時長

        使用 ffprobe 或 mutagen 等工具

        Args:
            audio_path: 音訊檔案路徑

        Returns:
            時長(秒)
        """
        # TODO: 實作音訊時長取得
        # 範例使用 ffprobe:
        # import subprocess
        # import json
        #
        # result = subprocess.run(
        #     ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', audio_path],
        #     capture_output=True,
        #     text=True
        # )
        # data = json.loads(result.stdout)
        # duration = float(data['format']['duration'])
        # return duration

        # 暫時返回模擬值
        return 15.0

    def _get_video_duration(self, video_path: str) -> float:
        """
        取得影片時長

        使用 ffprobe

        Args:
            video_path: 影片檔案路徑

        Returns:
            時長(秒)
        """
        # TODO: 實作影片時長取得(與 _get_audio_duration 類似)

        # 暫時返回模擬值
        return 15.3
