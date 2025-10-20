from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.youtube import (
    AuthUrlResponse,
    AuthCallbackRequest,
    YouTubeAccountResponse,
    YouTubeAccountListResponse,
    AuthUrlData,
    YouTubeAccountData,
    YouTubeAccountListData,
)
from app.services.youtube_auth_service import YouTubeAuthService
from app.core.database import get_db

router = APIRouter(prefix="/youtube", tags=["youtube"])


def get_youtube_service():
    """依賴注入：取得 YouTubeAuthService 實例"""
    return YouTubeAuthService()


@router.get("/auth-url", response_model=AuthUrlResponse)
async def get_auth_url(
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
):
    """
    取得 Google OAuth 授權 URL

    Returns:
        AuthUrlResponse: 包含 auth_url 的回應
    """
    auth_url = youtube_service.get_authorization_url()
    return AuthUrlResponse(success=True, data=AuthUrlData(auth_url=auth_url))


@router.post(
    "/auth-callback",
    response_model=YouTubeAccountResponse,
    status_code=status.HTTP_201_CREATED,
)
async def handle_auth_callback(
    request: AuthCallbackRequest,
    db: Session = Depends(get_db),
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
):
    """
    處理 OAuth callback，儲存授權 Token

    Args:
        request: 包含 authorization code 的請求
        db: 資料庫 session
        youtube_service: YouTube 授權服務

    Returns:
        YouTubeAccountResponse: 已連結的頻道資訊

    Raises:
        HTTPException 400: OAuth 授權碼交換失敗
        HTTPException 409: 頻道已經連結
    """
    try:
        account = await youtube_service.handle_oauth_callback(request.code, db)
        return YouTubeAccountResponse(
            success=True, data=YouTubeAccountData(**account)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "OAUTH_EXCHANGE_FAILED", "message": str(e)},
        )
    except Exception as e:
        if "already linked" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "CHANNEL_ALREADY_LINKED",
                    "message": "此 YouTube 頻道已經連結",
                },
            )
        raise


@router.get("/accounts", response_model=YouTubeAccountListResponse)
async def list_accounts(
    db: Session = Depends(get_db),
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
):
    """
    取得所有已連結的 YouTube 帳號

    Returns:
        YouTubeAccountListResponse: 帳號列表
    """
    accounts = youtube_service.list_accounts(db)
    return YouTubeAccountListResponse(
        success=True,
        data=YouTubeAccountListData(
            accounts=[YouTubeAccountData(**acc) for acc in accounts]
        ),
    )


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: str,
    db: Session = Depends(get_db),
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
):
    """
    移除 YouTube 授權

    Args:
        account_id: YouTube 帳號 ID

    Returns:
        成功訊息

    Raises:
        HTTPException 404: 帳號不存在
    """
    success = youtube_service.delete_account(account_id, db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ACCOUNT_NOT_FOUND", "message": "找不到指定的 YouTube 帳號"},
        )

    return {"success": True, "message": "授權已移除"}
