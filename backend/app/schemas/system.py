"""
System API schemas - request/response models for system management.
"""

from typing import Literal

from pydantic import BaseModel, Field


class APIKeyRequest(BaseModel):
    """儲存 API Key 的請求"""

    provider: Literal["gemini", "stability_ai", "did"] = Field(
        ..., description="服務提供者"
    )
    api_key: str = Field(..., min_length=10, description="API Key（至少 10 字元）")


class APIKeyTestRequest(BaseModel):
    """測試 API Key 的請求"""

    provider: Literal["gemini", "stability_ai", "did"] = Field(
        ..., description="服務提供者"
    )


class APIKeyTestResult(BaseModel):
    """API Key 測試結果"""

    is_valid: bool = Field(..., description="是否有效")
    message: str = Field(..., description="測試結果訊息")


class InitStatusData(BaseModel):
    """初始化狀態資料"""

    is_initialized: bool = Field(..., description="是否完成初始化")
    api_keys_configured: dict[str, bool] = Field(..., description="各 API Key 的設定狀態")
    youtube_connected: bool = Field(..., description="YouTube 是否已連結")


class InitStatusResponse(BaseModel):
    """初始化狀態回應"""

    success: bool = Field(default=True, description="是否成功")
    data: InitStatusData = Field(..., description="初始化狀態資料")


class QuotaInfo(BaseModel):
    """配額資訊"""

    total: int = Field(..., description="總配額")
    used: int = Field(..., description="已使用配額")
    remaining: int = Field(..., description="剩餘配額")
    unit: str = Field(..., description="配額單位")
    reset_date: str = Field(..., description="重置日期（ISO 8601 格式）")


class QuotaData(BaseModel):
    """配額資料"""

    did: QuotaInfo = Field(..., description="D-ID 配額")
    youtube: QuotaInfo = Field(..., description="YouTube 配額")


class QuotaResponse(BaseModel):
    """配額狀態回應"""

    success: bool = Field(default=True, description="是否成功")
    data: QuotaData = Field(..., description="配額資料")
