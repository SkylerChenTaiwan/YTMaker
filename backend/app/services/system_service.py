"""
System Service - business logic for system management.
"""

from datetime import datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.system_settings import SystemSettings
from app.security.keychain import KeychainManager


class SystemService:
    """系統管理業務邏輯"""

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
        youtube_setting = (
            self.db.query(SystemSettings)
            .filter(SystemSettings.key == "youtube_connected")
            .first()
        )
        youtube_connected = (
            youtube_setting.value == "true" if youtube_setting else False
        )

        # 判斷是否完成初始化（所有 API Keys 都已設定）
        is_initialized = all(
            [gemini_configured, stability_configured, did_configured]
        )

        return {
            "is_initialized": is_initialized,
            "api_keys_configured": {
                "gemini": gemini_configured,
                "stability_ai": stability_configured,
                "did": did_configured,
            },
            "youtube_connected": youtube_connected,
        }

    async def save_api_key(self, provider: str, api_key: str) -> None:
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_PROVIDER",
                    "message": f"無效的服務提供者：{provider}",
                },
            )

        # Pydantic 已經驗證了長度,這裡不需要再驗證

        # 儲存到 Keychain
        try:
            self.keychain.save_api_key(provider, api_key)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": "KEYCHAIN_ERROR",
                    "message": f"儲存 API Key 失敗：{str(e)}",
                },
            )

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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "API_KEY_NOT_FOUND",
                    "message": f"尚未設定 {self._get_provider_name(provider)} 的 API Key",
                },
            )

        # 根據 provider 測試連線
        try:
            # TODO: 實作實際的 API 測試邏輯
            # if provider == "gemini":
            #     client = GeminiClient(api_key)
            #     await client.test_connection()
            # elif provider == "stability_ai":
            #     client = StabilityClient(api_key)
            #     await client.test_connection()
            # elif provider == "did":
            #     client = DIDClient(api_key)
            #     await client.test_connection()

            return {"is_valid": True, "message": "連線成功"}
        except Exception as e:
            return {"is_valid": False, "message": f"連線失敗：{str(e)}"}

    async def get_quota_status(self) -> dict[str, Any]:
        """
        查詢 API 配額狀態

        Returns:
            配額資訊
        """
        # 查詢 D-ID 本月使用量
        did_usage_setting = (
            self.db.query(SystemSettings)
            .filter(SystemSettings.key == "did_monthly_usage")
            .first()
        )
        did_used = int(did_usage_setting.value) if did_usage_setting else 0

        # 查詢 YouTube 今日使用量
        youtube_usage_setting = (
            self.db.query(SystemSettings)
            .filter(SystemSettings.key == "youtube_daily_usage")
            .first()
        )
        youtube_used = int(youtube_usage_setting.value) if youtube_usage_setting else 0

        # 計算重置日期
        now = datetime.utcnow()
        # 下個月 1 號
        did_reset_date = (now.replace(day=1) + timedelta(days=32)).replace(day=1)
        # 明天 00:00
        youtube_reset_date = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        return {
            "did": {
                "total": 90,
                "used": did_used,
                "remaining": 90 - did_used,
                "unit": "minutes",
                "reset_date": did_reset_date.isoformat() + "Z",
            },
            "youtube": {
                "total": 10000,
                "used": youtube_used,
                "remaining": 10000 - youtube_used,
                "unit": "units",
                "reset_date": youtube_reset_date.isoformat() + "Z",
            },
        }

    def _get_provider_name(self, provider: str) -> str:
        """取得服務提供者的顯示名稱"""
        names = {"gemini": "Gemini", "stability_ai": "Stability AI", "did": "D-ID"}
        return names.get(provider, provider)
