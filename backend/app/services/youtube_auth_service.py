from datetime import datetime, timedelta
import json
import os
from pathlib import Path

import requests
from cryptography.fernet import Fernet
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.youtube_account import YouTubeAccount


class YouTubeAuthService:
    """YouTube OAuth 授權服務"""

    # OAuth 配置
    # 使用完整的 YouTube 權限（包含讀取頻道資訊和上傳影片）
    SCOPES = ["https://www.googleapis.com/auth/youtube"]

    def __init__(self) -> None:
        """
        初始化 YouTube 授權服務

        優先讀取 client_secrets.json，若不存在則使用環境變數
        """
        self.client_config = self._load_client_config()

        # 初始化加密器（用於加密 Token）
        self.cipher = Fernet(settings.ENCRYPTION_KEY.encode())

    def _load_client_config(self) -> dict:
        """
        載入 Google OAuth 客戶端設定

        優先順序：
        1. client_secrets.json 檔案（從 Google Cloud Console 下載）
        2. 環境變數（GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET）

        Returns:
            dict: 客戶端設定

        Raises:
            FileNotFoundError: 找不到設定檔且環境變數未設定
        """
        # 嘗試讀取 client_secrets.json
        secrets_file = Path(settings.GOOGLE_CLIENT_SECRETS_FILE)

        if secrets_file.exists():
            try:
                with open(secrets_file, 'r', encoding='utf-8') as f:
                    client_secrets = json.load(f)

                # Google 下載的格式可能是 "web" 或 "installed"
                if "web" in client_secrets:
                    config = client_secrets["web"]
                elif "installed" in client_secrets:
                    config = client_secrets["installed"]
                else:
                    raise ValueError("client_secrets.json 格式錯誤")

                # 確保 redirect_uris 包含我們的 callback URL
                redirect_uris = config.get("redirect_uris", [])
                if settings.GOOGLE_REDIRECT_URI not in redirect_uris:
                    redirect_uris.append(settings.GOOGLE_REDIRECT_URI)

                return {
                    "web": {
                        "client_id": config["client_id"],
                        "client_secret": config["client_secret"],
                        "redirect_uris": redirect_uris,
                        "auth_uri": config.get("auth_uri", "https://accounts.google.com/o/oauth2/auth"),
                        "token_uri": config.get("token_uri", "https://oauth2.googleapis.com/token"),
                    }
                }
            except Exception as e:
                print(f"警告：讀取 client_secrets.json 失敗: {e}")
                print("將使用環境變數設定")

        # 使用環境變數
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise FileNotFoundError(
                f"找不到 {secrets_file} 且環境變數 GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET 未設定\n"
                "請：\n"
                "1. 從 Google Cloud Console 下載 client_secrets.json 並放在 backend/ 目錄\n"
                "   或\n"
                "2. 在 .env 檔案中設定 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET"
            )

        return {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }

    def get_authorization_url(self) -> str:
        """
        生成 Google OAuth 授權 URL

        Returns:
            str: OAuth 授權 URL
        """
        flow = Flow.from_client_config(
            self.client_config,
            scopes=self.SCOPES,
            redirect_uri=settings.GOOGLE_REDIRECT_URI,
        )

        auth_url, _ = flow.authorization_url(
            access_type="offline",  # 取得 refresh token
            prompt="consent",  # 強制顯示授權畫面
        )

        return auth_url

    async def handle_oauth_callback(self, code: str, db: Session) -> dict:
        """
        處理 OAuth callback，交換 Token 並儲存

        Args:
            code: OAuth authorization code
            db: 資料庫 session

        Returns:
            dict: 頻道資訊

        Raises:
            ValueError: Token 交換失敗
            Exception: 頻道已連結
        """
        # 1. 使用 authorization code 交換 access token
        flow = Flow.from_client_config(
            self.client_config, scopes=self.SCOPES, redirect_uri=settings.GOOGLE_REDIRECT_URI
        )

        try:
            flow.fetch_token(code=code)
        except Exception as e:
            raise ValueError(f"OAuth 授權碼交換失敗:{str(e)}")

        credentials = flow.credentials

        # 2. 使用 access token 取得頻道資訊
        youtube = build("youtube", "v3", credentials=credentials)

        try:
            channels_response = youtube.channels().list(part="snippet,statistics", mine=True).execute()
        except Exception as e:
            raise ValueError(f"取得 YouTube 頻道資訊失敗:{str(e)}")

        if not channels_response.get("items"):
            raise ValueError("找不到 YouTube 頻道")

        channel = channels_response["items"][0]
        channel_id = channel["id"]
        channel_name = channel["snippet"]["title"]
        subscriber_count = int(channel["statistics"].get("subscriberCount", 0))
        # 取得頻道縮圖 (優先使用高解析度)
        thumbnails = channel["snippet"].get("thumbnails", {})
        thumbnail_url = (
            thumbnails.get("high", {}).get("url")
            or thumbnails.get("default", {}).get("url")
            or ""
        )

        # 3. 檢查頻道是否已連結
        existing = db.query(YouTubeAccount).filter(YouTubeAccount.channel_id == channel_id).first()

        if existing:
            raise Exception("Channel already linked")

        # 4. 加密並儲存 Token
        encrypted_access_token = self._encrypt_token(credentials.token)
        encrypted_refresh_token = self._encrypt_token(credentials.refresh_token)

        # 5. 計算過期時間
        if credentials.expiry:
            token_expires_at = credentials.expiry
        else:
            # 預設 1 小時後過期
            token_expires_at = datetime.utcnow() + timedelta(seconds=3600)

        # 6. 建立 YouTubeAccount 記錄
        account = YouTubeAccount(
            channel_id=channel_id,
            channel_name=channel_name,
            thumbnail_url=thumbnail_url,
            subscriber_count=subscriber_count,
            access_token=encrypted_access_token,
            refresh_token=encrypted_refresh_token,
            token_expires_at=token_expires_at,
            is_authorized=True,
            authorized_at=datetime.utcnow(),
        )

        db.add(account)
        db.commit()
        db.refresh(account)

        # 7. 回傳頻道資訊（不包含 token）
        return {
            "id": str(account.id),
            "channel_name": account.channel_name,
            "channel_id": account.channel_id,
            "thumbnail_url": account.thumbnail_url,
            "subscriber_count": account.subscriber_count,
            "is_authorized": account.is_authorized,
            "authorized_at": account.authorized_at.isoformat(),
        }

    def list_accounts(self, db: Session) -> list[dict]:
        """
        列出所有已連結的 YouTube 帳號

        Args:
            db: 資料庫 session

        Returns:
            List[dict]: 帳號列表
        """
        accounts = db.query(YouTubeAccount).order_by(YouTubeAccount.authorized_at.desc()).all()

        return [
            {
                "id": str(account.id),
                "channel_name": account.channel_name,
                "channel_id": account.channel_id,
                "thumbnail_url": account.thumbnail_url,
                "subscriber_count": account.subscriber_count,
                "is_authorized": account.is_authorized,
                "authorized_at": account.authorized_at.isoformat(),
            }
            for account in accounts
        ]

    def delete_account(self, account_id: str, db: Session) -> bool:
        """
        刪除 YouTube 帳號授權

        Args:
            account_id: 帳號 ID
            db: 資料庫 session

        Returns:
            bool: 是否成功刪除
        """
        account = db.query(YouTubeAccount).filter(YouTubeAccount.id == account_id).first()

        if not account:
            return False

        db.delete(account)
        db.commit()

        return True

    def get_valid_credentials(self, account_id: str, db: Session) -> Credentials:
        """
        取得有效的 OAuth credentials（自動更新 token 如果過期）

        Args:
            account_id: YouTube 帳號 ID
            db: 資料庫 session

        Returns:
            google.oauth2.credentials.Credentials: 有效的 credentials

        Raises:
            ValueError: 帳號不存在
        """
        account = db.query(YouTubeAccount).filter(YouTubeAccount.id == account_id).first()

        if not account:
            raise ValueError("YouTube 帳號不存在")

        # 解密 token
        access_token = self._decrypt_token(account.access_token)
        refresh_token = self._decrypt_token(account.refresh_token)

        # 檢查 token 是否過期
        if datetime.utcnow() >= account.token_expires_at:
            # Token 已過期，使用 refresh token 更新
            access_token, expires_in = self._refresh_access_token(refresh_token)

            # 更新資料庫
            account.access_token = self._encrypt_token(access_token)
            account.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            db.commit()

        # 建立 credentials 物件
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri=self.client_config["web"]["token_uri"],
            client_id=self.client_config["web"]["client_id"],
            client_secret=self.client_config["web"]["client_secret"],
            scopes=self.SCOPES,
        )

        return credentials

    def _encrypt_token(self, token: str) -> str:
        """加密 token"""
        return self.cipher.encrypt(token.encode()).decode()

    def _decrypt_token(self, encrypted_token: str) -> str:
        """解密 token"""
        return self.cipher.decrypt(encrypted_token.encode()).decode()

    def _refresh_access_token(self, refresh_token: str) -> tuple[str, int]:
        """
        使用 refresh token 取得新的 access token

        Args:
            refresh_token: Refresh token

        Returns:
            tuple: (新的 access token, 過期秒數)
        """
        response = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )

        if response.status_code != 200:
            raise ValueError(f"Token 更新失敗:{response.text}")

        data = response.json()
        return data["access_token"], data["expires_in"]
