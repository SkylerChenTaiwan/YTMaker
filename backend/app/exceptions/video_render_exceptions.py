"""Video rendering related exceptions"""

from typing import Optional


class VideoRenderError(Exception):
    """影片渲染錯誤基類"""

    def __init__(self, message: str, ffmpeg_stderr: Optional[str] = None):
        super().__init__(message)
        self.ffmpeg_stderr = ffmpeg_stderr


class FFmpegNotFoundError(Exception):
    """FFmpeg 未安裝錯誤"""

    pass


class InsufficientDiskSpaceError(Exception):
    """磁碟空間不足錯誤"""

    pass
