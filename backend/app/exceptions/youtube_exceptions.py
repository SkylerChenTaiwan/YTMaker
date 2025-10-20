"""YouTube 相關的自訂例外"""


class YouTubeAPIError(Exception):
    """YouTube API 基礎錯誤"""

    pass


class YouTubeQuotaExceededError(YouTubeAPIError):
    """YouTube API 配額用盡"""

    pass


class YouTubeAuthError(YouTubeAPIError):
    """YouTube OAuth 認證錯誤"""

    pass


class YouTubeUploadError(YouTubeAPIError):
    """影片上傳錯誤"""

    pass
