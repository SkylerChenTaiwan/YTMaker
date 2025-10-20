from pydantic import BaseModel, Field

# ===== Request Schemas =====


class AuthCallbackRequest(BaseModel):
    """OAuth callback 請求"""

    code: str = Field(..., description="OAuth authorization code")


# ===== Response Schemas =====


class AuthUrlData(BaseModel):
    """授權 URL 資料"""

    auth_url: str


class AuthUrlResponse(BaseModel):
    """授權 URL 回應"""

    success: bool = True
    data: AuthUrlData


class YouTubeAccountData(BaseModel):
    """YouTube 帳號資料"""

    id: str
    channel_name: str
    channel_id: str
    subscriber_count: int
    is_authorized: bool
    authorized_at: str  # ISO 8601 格式


class YouTubeAccountResponse(BaseModel):
    """YouTube 帳號回應"""

    success: bool = True
    data: YouTubeAccountData


class YouTubeAccountListData(BaseModel):
    """YouTube 帳號列表資料"""

    accounts: list[YouTubeAccountData]


class YouTubeAccountListResponse(BaseModel):
    """YouTube 帳號列表回應"""

    success: bool = True
    data: YouTubeAccountListData
