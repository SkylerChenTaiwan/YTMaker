from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException, ValidationException
from app.models.system_settings import SystemSettings
from app.security.keychain import KeychainManager


class SystemService:
    def __init__(self, db: Session):
        self.db = db
        self.keychain = KeychainManager()

    async def check_init_status(self) -> dict[str, Any]:
        """
        檢查系統初始化狀態

        Returns:
            初始化狀態資訊
        """
        # 檢查各 API Key 是否已設定
        gemini_configured = self.keychain.get_api_key("gemini") is not None
        stability_configured = self.keychain.get_api_key("stability_ai") is not None
        did_configured = self.keychain.get_api_key("did") is not None

        # 檢查 YouTube 連結狀態
        youtube_setting = self.db.query(SystemSettings).filter(
            SystemSettings.key == "youtube_connected"
        ).first()
        youtube_connected = youtube_setting.value == "true" if youtube_setting else False

        # 判斷是否完成初始化（所有 API Keys 都已設定）
        is_initialized = all([
            gemini_configured,
            stability_configured,
            did_configured
        ])

        return {
            "is_initialized": is_initialized,
            "api_keys_configured": {
                "gemini": gemini_configured,
                "stability_ai": stability_configured,
                "did": did_configured
            },
            "youtube_connected": youtube_connected
        }

    async def save_api_key(self, provider: str, api_key: str):
        """
        儲存 API Key 到 Keychain

        Args:
            provider: 服務提供者（gemini, stability_ai, did）
            api_key: API Key 字串

        Raises:
            HTTPException: 如果儲存失敗
        """
        # 驗證 provider
        valid_providers = ["gemini", "stability_ai", "did"]
        if provider not in valid_providers:
            raise ValidationException(
                message=f"無效的服務提供者：{provider}",
                details={"provider": provider}
            )

        # 驗證 API Key 長度
        if len(api_key) < 10:
            raise ValidationException(
                message="API Key 長度必須至少 10 個字元",
                details={"field": "api_key"}
            )

        # 儲存到 Keychain
        try:
            self.keychain.save_api_key(provider, api_key)
        except Exception as e:
            raise AppException(
                message=f"儲存 API Key 失敗：{str(e)}",
                error_code="KEYCHAIN_ERROR",
                status_code=500
            ) from e

    async def test_api_key(self, provider: str) -> dict[str, Any]:
        """
        測試 API Key 是否有效

        Args:
            provider: 服務提供者

        Returns:
            測試結果 {"is_valid": bool, "message": str}

        Raises:
            HTTPException: 如果 API Key 不存在
        """
        # 從 Keychain 讀取 API Key
        api_key = self.keychain.get_api_key(provider)
        if not api_key:
            raise NotFoundException(
                message=f"尚未設定 {self._get_provider_name(provider)} 的 API Key"
            )

        # 根據 provider 測試連線
        # TODO: 實作各 API 的測試連線邏輯
        # 這裡先返回基本實作，後續會在整合 API clients 時完成
        try:
            # 暫時返回成功，實際測試邏輯會在整合時加入
            return {
                "is_valid": True,
                "message": "連線成功"
            }
        except Exception as e:
            return {
                "is_valid": False,
                "message": f"連線失敗：{str(e)}"
            }

    async def get_quota_status(self) -> dict[str, Any]:
        """
        查詢 API 配額狀態

        Returns:
            配額資訊
        """
        # 查詢 D-ID 本月使用量
        did_usage_setting = self.db.query(SystemSettings).filter(
            SystemSettings.key == "did_monthly_usage"
        ).first()
        did_used = int(did_usage_setting.value) if did_usage_setting else 0

        # 查詢 YouTube 今日使用量
        youtube_usage_setting = self.db.query(SystemSettings).filter(
            SystemSettings.key == "youtube_daily_usage"
        ).first()
        youtube_used = int(youtube_usage_setting.value) if youtube_usage_setting else 0

        # 計算重置日期
        now = datetime.utcnow()
        did_reset_date = (now.replace(day=1) + timedelta(days=32)).replace(day=1)  # 下個月 1 號
        youtube_reset_date = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)  # 明天 00:00

        return {
            "did": {
                "total": 90,
                "used": did_used,
                "remaining": 90 - did_used,
                "unit": "minutes",
                "reset_date": did_reset_date.isoformat() + "Z"
            },
            "youtube": {
                "total": 10000,
                "used": youtube_used,
                "remaining": 10000 - youtube_used,
                "unit": "units",
                "reset_date": youtube_reset_date.isoformat() + "Z"
            }
        }

    def _get_provider_name(self, provider: str) -> str:
        """取得服務提供者的顯示名稱"""
        names = {
            "gemini": "Gemini",
            "stability_ai": "Stability AI",
            "did": "D-ID"
        }
        return names.get(provider, provider)
