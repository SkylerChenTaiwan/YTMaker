from datetime import datetime
from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    """成功回應格式"""

    success: bool = Field(default=True, description="是否成功")
    data: T = Field(..., description="回應資料")

    class Config:
        json_schema_extra = {"example": {"success": True, "data": {"message": "操作成功"}}}


class ErrorDetail(BaseModel):
    """錯誤詳細資訊"""

    code: str = Field(..., description="錯誤碼")
    message: str = Field(..., description="錯誤訊息")
    details: Optional[dict[str, Any]] = Field(default=None, description="額外詳細資訊")


class ErrorResponse(BaseModel):
    """錯誤回應格式"""

    success: bool = Field(default=False, description="是否成功")
    error: ErrorDetail = Field(..., description="錯誤資訊")
    timestamp: datetime = Field(..., description="錯誤發生時間")
    path: str = Field(..., description="請求路徑")

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "請求的資源不存在",
                    "details": {"resource_id": "123"},
                },
                "timestamp": "2025-10-19T10:30:00Z",
                "path": "/api/v1/projects/123",
            }
        }


class HealthStatus(BaseModel):
    """健康檢查狀態"""

    status: str = Field(..., description="健康狀態")
    timestamp: datetime = Field(..., description="檢查時間")


class ServiceStatus(BaseModel):
    """服務狀態"""

    status: str = Field(..., description="服務狀態 (connected/disconnected)")
    latency_ms: Optional[int] = Field(default=None, description="延遲(毫秒)")
    error: Optional[str] = Field(default=None, description="錯誤訊息")


class DetailedHealthStatus(BaseModel):
    """詳細健康檢查狀態"""

    status: str = Field(..., description="整體健康狀態")
    services: dict[str, ServiceStatus] = Field(..., description="各服務狀態")
    timestamp: datetime = Field(..., description="檢查時間")


class MessageResponse(BaseModel):
    """簡單訊息回應"""

    success: bool = Field(default=True, description="是否成功")
    message: str = Field(..., description="訊息內容")

    class Config:
        json_schema_extra = {"example": {"success": True, "message": "操作成功"}}
