"""Video rendering service using FFmpeg"""

import logging
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional

from app.core.config import settings
from app.exceptions import FFmpegNotFoundError, InsufficientDiskSpaceError, VideoRenderError
from app.services.ffmpeg_builder import FFmpegCommandBuilder

logger = logging.getLogger(__name__)


class VideoRenderService:
    """
    影片渲染服務

    負責：
    1. 影片片段生成（圖片 + 音訊 + 效果）
    2. 字幕燒錄
    3. Ken Burns 效果
    4. 疊加元素渲染
    5. 影片合併
    6. 封面生成
    """

    def __init__(self, project_id: str):
        """
        初始化影片渲染服務

        Args:
            project_id: 專案 ID
        """
        self.project_id = project_id
        self.project_dir = Path(settings.PROJECTS_DIR) / project_id
        self.assets_dir = self.project_dir / "assets"
        self.temp_dir = self.project_dir / "temp"
        self.output_dir = self.project_dir / "output"

        # 確保目錄存在
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # 檢查 FFmpeg
        self._check_ffmpeg()

        # 檢查磁碟空間
        self._check_disk_space()

    def _check_ffmpeg(self) -> None:
        """檢查 FFmpeg 是否安裝"""
        try:
            result = subprocess.run(
                ["ffmpeg", "-version"],
                capture_output=True,
                text=True,
                check=True,
            )
            logger.info(f"FFmpeg version: {result.stdout.splitlines()[0]}")
        except FileNotFoundError:
            raise FFmpegNotFoundError(
                "FFmpeg not found. Please install FFmpeg:\n"
                "  macOS: brew install ffmpeg\n"
                "  Linux: apt install ffmpeg\n"
                "  Windows: Download from https://ffmpeg.org/download.html"
            )

    def _check_disk_space(self, required_gb: float = 1.0) -> None:
        """
        檢查磁碟空間是否足夠

        Args:
            required_gb: 需要的空間（GB）
        """
        stat = shutil.disk_usage(self.project_dir)
        available_gb = stat.free / (1024**3)

        if available_gb < required_gb:
            raise InsufficientDiskSpaceError(
                f"Insufficient disk space. Required: {required_gb}GB, "
                f"Available: {available_gb:.2f}GB"
            )

    def render_segment(
        self,
        segment_index: int,
        image_path: str,
        audio_path: str,
        segment_config: dict,
        global_config: dict,
    ) -> str:
        """
        渲染單個影片片段

        Args:
            segment_index: 段落索引（從 1 開始）
            image_path: 圖片路徑
            audio_path: 音訊路徑
            segment_config: 段落配置（包含 duration, ken_burns_effect, subtitle 等）
            global_config: 全局配置（字幕樣式、Logo 等）

        Returns:
            生成的影片片段路徑
        """
        output_path = str(self.temp_dir / f"segment_{segment_index:02d}.mp4")

        # 合併全局配置與段落配置
        merged_config = self._merge_config(global_config, segment_config)

        # 使用 FFmpegCommandBuilder 生成指令
        builder = FFmpegCommandBuilder()

        # Step 1: 添加輸入
        builder.add_input(image_path)
        builder.add_input(audio_path)

        # Step 2: 添加 Ken Burns 效果（如果有）
        if merged_config.get("ken_burns_effect"):
            builder.add_ken_burns_effect(
                effect_type=merged_config["ken_burns_effect"]["type"],
                duration=segment_config["duration"],
            )
        else:
            # 無效果，只 scale
            builder.add_video_filter("scale=1920:1080")

        # Step 3: 添加字幕（如果有）
        if merged_config.get("subtitle") and merged_config["subtitle"].get("enabled"):
            builder.add_subtitle(
                text=segment_config.get("text", ""), config=merged_config["subtitle"]
            )

        # Step 4: 添加疊加元素（Logo, 文字等）
        for overlay in merged_config.get("overlays", []):
            if overlay.get("enabled", True):
                builder.add_overlay(overlay)

        # Step 5: 設定編碼參數
        builder.set_video_codec(settings.VIDEO_CODEC)
        builder.set_audio_codec(settings.AUDIO_CODEC)
        builder.set_audio_bitrate(settings.AUDIO_BITRATE)
        builder.set_output_resolution(settings.VIDEO_RESOLUTION)
        builder.set_framerate(settings.VIDEO_FPS)

        # Step 6: 設定音訊時長（以音訊為準）
        builder.set_shortest_stream()

        # Step 7: 設定輸出
        builder.set_output(output_path)

        # Step 8: 生成並執行指令
        command = builder.build()
        self._execute_ffmpeg(command)

        logger.info(f"Segment {segment_index} rendered: {output_path}")
        return output_path

    def merge_video(
        self,
        intro_video: Optional[str],
        segment_videos: List[str],
        outro_video: Optional[str],
        output_path: str,
    ) -> str:
        """
        合併所有影片片段

        Args:
            intro_video: 虛擬主播開場影片路徑（可選）
            segment_videos: 所有段落影片路徑列表
            outro_video: 虛擬主播結尾影片路徑（可選）
            output_path: 輸出路徑

        Returns:
            最終影片路徑
        """
        # 準備 concat list
        concat_list = self.temp_dir / "concat_list.txt"

        with open(concat_list, "w", encoding="utf-8") as f:
            # 開場
            if intro_video and Path(intro_video).exists():
                f.write(f"file '{Path(intro_video).absolute()}'\n")

            # 段落
            for video_path in segment_videos:
                f.write(f"file '{Path(video_path).absolute()}'\n")

            # 結尾
            if outro_video and Path(outro_video).exists():
                f.write(f"file '{Path(outro_video).absolute()}'\n")

        # 使用 concat demuxer 合併
        command = [
            "ffmpeg",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list),
            "-c",
            "copy",  # 直接複製，不重新編碼（快速）
            "-y",  # 覆蓋輸出檔案
            output_path,
        ]

        self._execute_ffmpeg(command)

        logger.info(f"Video merged: {output_path}")
        return output_path

    def generate_thumbnail(
        self, base_image: str, title: str, config: dict, output_path: str
    ) -> str:
        """
        生成封面圖片

        Args:
            base_image: 基底圖片路徑（第一張圖片）
            title: 影片標題
            config: 配置（標題樣式、Logo 等）
            output_path: 輸出路徑

        Returns:
            封面圖片路徑
        """
        builder = FFmpegCommandBuilder()

        # Step 1: 添加基底圖片
        builder.add_input(base_image)

        # Step 2: Scale to YouTube thumbnail size (1280x720)
        builder.add_video_filter("scale=1280:720")

        # Step 3: 添加標題文字
        if config.get("title_style"):
            builder.add_title_overlay(text=title, config=config["title_style"])

        # Step 4: 添加 Logo（如果有）
        if config.get("logo") and config["logo"].get("enabled"):
            builder.add_overlay(config["logo"])

        # Step 5: 只輸出一幀
        builder.add_option("-frames:v", "1")

        # Step 6: 設定輸出
        builder.set_output(output_path)

        # Step 7: 執行
        command = builder.build()
        self._execute_ffmpeg(command)

        logger.info(f"Thumbnail generated: {output_path}")
        return output_path

    def _merge_config(self, global_config: dict, segment_config: dict) -> dict:
        """
        合併全局配置與段落配置（段落配置優先）
        """
        merged = global_config.copy()

        # 段落級覆寫
        if "subtitle" in segment_config:
            merged["subtitle"] = {
                **merged.get("subtitle", {}),
                **segment_config["subtitle"],
            }

        if "overlays" in segment_config:
            merged["overlays"] = segment_config["overlays"]

        if "ken_burns_effect" in segment_config:
            merged["ken_burns_effect"] = segment_config["ken_burns_effect"]

        return merged

    def _execute_ffmpeg(self, command: List[str]) -> None:
        """
        執行 FFmpeg 指令

        Raises:
            VideoRenderError: 執行失敗時拋出
        """
        logger.debug(f"Executing FFmpeg command: {' '.join(command)}")

        try:
            result = subprocess.run(command, capture_output=True, text=True, check=True)

            # FFmpeg 的輸出在 stderr（不是錯誤）
            if result.stderr:
                logger.debug(
                    f"FFmpeg output: {result.stderr[-500:]}"
                )  # 只記錄最後 500 字

        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg command failed: {e.stderr}")
            raise VideoRenderError(
                f"Video rendering failed: {e.stderr[-200:]}", ffmpeg_stderr=e.stderr
            )

    def cleanup_temp_files(self) -> None:
        """清理臨時檔案"""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
            logger.info(f"Cleaned up temp files: {self.temp_dir}")
