"""Exception classes"""

from .video_render_exceptions import (
    FFmpegNotFoundError,
    InsufficientDiskSpaceError,
    VideoRenderError,
)
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
    "VideoRenderError",
    "FFmpegNotFoundError",
    "InsufficientDiskSpaceError",
]
