from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.youtube import (
    AuthCallbackRequest,
    AuthUrlResponse,
    YouTubeAccountListResponse,
    YouTubeAccountResponse,
)
from app.services.youtube_auth_service import YouTubeAuthService

router = APIRouter(prefix="/youtube", tags=["youtube"])


def get_youtube_service() -> YouTubeAuthService:
    """依賴注入：取得 YouTube 授權服務實例"""
    return YouTubeAuthService()


@router.get("/auth")
async def start_auth(
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
) -> RedirectResponse:
    """
    啟動 YouTube OAuth 授權流程
    直接重新導向到 Google OAuth 頁面

    Returns:
        RedirectResponse: 重新導向到 Google OAuth 授權頁面
    """
    auth_url = youtube_service.get_authorization_url()
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def oauth_callback(
    code: str,
    db: Session = Depends(get_db),
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
) -> HTMLResponse:
    """
    處理 Google OAuth callback
    儲存 token 後關閉視窗並通知 opener

    Args:
        code: Google OAuth 授權碼
        db: 資料庫 session
        youtube_service: YouTube 授權服務

    Returns:
        HTMLResponse: HTML 頁面，會通知 opener 並自動關閉視窗
    """
    try:
        account = await youtube_service.handle_oauth_callback(code, db)

        # 回傳 HTML 頁面，通知 opener 並關閉視窗
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>授權成功</title>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }}
                .container {{
                    text-align: center;
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                }}
                h1 {{
                    color: #4CAF50;
                    margin-bottom: 10px;
                }}
                p {{
                    color: #666;
                    margin: 10px 0;
                }}
                .channel {{
                    margin: 20px 0;
                    padding: 15px;
                    background: #f5f5f5;
                    border-radius: 5px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✓ 授權成功！</h1>
                <div class="channel">
                    <p><strong>{account['channel_name']}</strong></p>
                    <p style="font-size: 0.9em; color: #888;">頻道 ID: {account['channel_id']}</p>
                </div>
                <p>視窗將在 2 秒後自動關閉...</p>
            </div>
            <script>
                if (window.opener) {{
                    // 使用 opener 的 origin 以確保 postMessage 可以被接收
                    const targetOrigin = window.opener.location.origin;
                    window.opener.postMessage({{
                        type: 'youtube-auth-success',
                        channel_name: '{account['channel_name']}',
                        channel_id: '{account['channel_id']}',
                        thumbnail_url: '{account.get('thumbnail_url', '')}'
                    }}, targetOrigin);
                }}
                setTimeout(() => {{
                    window.close();
                }}, 2000);
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)

    except ValueError as e:
        # OAuth 授權碼交換失敗或取得頻道資訊失敗
        error_msg = str(e)

        # 提供更友善的錯誤訊息和解決建議
        suggestions = ""
        if "YouTube 頻道資訊失敗" in error_msg or "找不到 YouTube 頻道" in error_msg:
            suggestions = """
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: left;">
                <strong>可能的原因：</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>YouTube Data API v3 未在 Google Cloud Console 啟用</li>
                    <li>此 Google 帳號沒有建立 YouTube 頻道</li>
                </ul>
                <strong>解決方法：</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>請前往 Google Cloud Console 啟用 YouTube Data API v3</li>
                    <li>或使用已建立 YouTube 頻道的 Google 帳號登入</li>
                </ul>
            </div>
            """

        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>授權失敗</title>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    background: #f5f5f5;
                    padding: 20px;
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                    max-width: 600px;
                }}
                h1 {{
                    color: #f44336;
                    text-align: center;
                }}
                .error {{
                    background: #ffebee;
                    padding: 15px;
                    border-radius: 5px;
                    color: #c62828;
                    margin: 20px 0;
                    word-wrap: break-word;
                }}
                button {{
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    display: block;
                    margin-left: auto;
                    margin-right: auto;
                }}
                button:hover {{
                    background: #1976D2;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✗ 授權失敗</h1>
                <div class="error">{error_msg}</div>
                {suggestions}
                <button onclick="window.close()">關閉視窗</button>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=400)

    except Exception as e:
        # 其他錯誤（例如頻道已連結）
        error_message = "此 YouTube 頻道已經連結" if "already linked" in str(e).lower() else str(e)
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>授權失敗</title>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: #f5f5f5;
                }}
                .container {{
                    text-align: center;
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                }}
                h1 {{
                    color: #ff9800;
                }}
                button {{
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                }}
                button:hover {{
                    background: #1976D2;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>⚠ {error_message}</h1>
                <button onclick="window.close()">關閉視窗</button>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=409 if "already linked" in str(e).lower() else 500)


@router.get("/auth-url", response_model=AuthUrlResponse)
async def get_auth_url(
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
) -> AuthUrlResponse:
    """
    取得 Google OAuth 授權 URL

    Returns:
        AuthUrlResponse: 包含 auth_url 的回應
    """
    auth_url = youtube_service.get_authorization_url()
    return AuthUrlResponse(success=True, data={"auth_url": auth_url})


@router.post(
    "/auth-callback", response_model=YouTubeAccountResponse, status_code=status.HTTP_201_CREATED
)
async def handle_auth_callback(
    request: AuthCallbackRequest,
    db: Session = Depends(get_db),
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
) -> YouTubeAccountResponse:
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
        return YouTubeAccountResponse(success=True, data=account)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "OAUTH_EXCHANGE_FAILED", "message": str(e)},
        )
    except Exception as e:
        if "already linked" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "CHANNEL_ALREADY_LINKED", "message": "此 YouTube 頻道已經連結"},
            )
        raise


@router.get("/accounts", response_model=YouTubeAccountListResponse)
async def list_accounts(
    db: Session = Depends(get_db),
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
) -> YouTubeAccountListResponse:
    """
    取得所有已連結的 YouTube 帳號

    Returns:
        YouTubeAccountListResponse: 帳號列表
    """
    accounts = youtube_service.list_accounts(db)
    return YouTubeAccountListResponse(success=True, data={"accounts": accounts})


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: str,
    db: Session = Depends(get_db),
    youtube_service: YouTubeAuthService = Depends(get_youtube_service),
) -> dict:
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
