"""
System API - endpoints for system management.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.system import (
    APIKeyRequest,
    APIKeyTestRequest,
    APIKeyTestResult,
    InitStatusResponse,
    QuotaResponse,
)
from app.services.system_service import SystemService

router = APIRouter(prefix="/system", tags=["system"])


def get_system_service(db: Session = Depends(get_db)) -> SystemService:
    """Get System Service instance"""
    return SystemService(db)


@router.get("/init-status", response_model=InitStatusResponse)
async def get_init_status(
    system_service: SystemService = Depends(get_system_service),
):
    """
    檢查系統初始化狀態

    回傳：
    - is_initialized: 是否完成初始化（所有 API Keys 已設定）
    - api_keys_configured: 各 API Key 的設定狀態
    - youtube_connected: YouTube 是否已連結
    """
    data = await system_service.check_init_status()
    return {"success": True, "data": data}


@router.post("/api-keys", status_code=status.HTTP_200_OK)
async def save_api_key(
    request: APIKeyRequest,
    system_service: SystemService = Depends(get_system_service),
):
    """
    儲存 API Key 到 Keychain

    參數：
    - provider: 服務提供者（gemini, stability_ai, did）
    - api_key: API Key 字串（最少 10 字元）
    """
    await system_service.save_api_key(request.provider, request.api_key)
    return {"success": True, "message": "API Key 已儲存"}


@router.post("/api-keys/test")
async def test_api_key(
    request: APIKeyTestRequest,
    system_service: SystemService = Depends(get_system_service),
):
    """
    測試 API Key 是否有效

    參數：
    - provider: 服務提供者

    回傳：
    - is_valid: 是否有效
    - message: 測試結果訊息
    """
    result = await system_service.test_api_key(request.provider)
    return {"success": True, "data": result}


@router.get("/quota", response_model=QuotaResponse)
async def get_quota(
    system_service: SystemService = Depends(get_system_service),
):
    """
    查詢 API 配額狀態

    回傳：
    - did: D-ID 配額（90 分鐘/月）
    - youtube: YouTube 配額（10,000 units/日）
    """
    data = await system_service.get_quota_status()
    return {"success": True, "data": data}
