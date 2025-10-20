"""Exception classes"""

from .youtube_exceptions import (
    YouTubeAPIError,
    YouTubeAuthError,
    YouTubeQuotaExceededError,
    YouTubeUploadError,
)

__all__ = [
    "YouTubeAPIError",
    "YouTubeAuthError",
    "YouTubeQuotaExceededError",
    "YouTubeUploadError",
]
