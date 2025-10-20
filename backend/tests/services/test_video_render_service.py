"""Tests for video render service"""

import shutil
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.exceptions import FFmpegNotFoundError, InsufficientDiskSpaceError
from app.services.ffmpeg_builder import FFmpegCommandBuilder
from app.services.video_render_service import VideoRenderService


class TestFFmpegCommandBuilder:
    """測試 FFmpegCommandBuilder"""

    def test_basic_command_build(self):
        """測試基本的指令生成"""
        builder = FFmpegCommandBuilder()
        builder.add_input("input.mp4")
        builder.set_video_codec("libx264")
        builder.set_output("output.mp4")

        command = builder.build()

        assert "ffmpeg" in command
        assert "-i" in command
        assert "input.mp4" in command
        assert "-c:v" in command
        assert "libx264" in command
        assert "output.mp4" in command

    def test_ken_burns_zoom_in(self):
        """測試 Ken Burns zoom_in 效果"""
        builder = FFmpegCommandBuilder()
        builder.add_input("image.png")
        builder.add_ken_burns_effect("zoom_in", duration=10.0)
        builder.set_output("output.mp4")

        command = builder.build()
        command_str = " ".join(command)

        assert "-vf" in command
        assert "zoompan" in command_str
        assert "scale=1920:1080" in command_str

    def test_ken_burns_zoom_out(self):
        """測試 Ken Burns zoom_out 效果"""
        builder = FFmpegCommandBuilder()
        builder.add_input("image.png")
        builder.add_ken_burns_effect("zoom_out", duration=10.0)
        builder.set_output("output.mp4")

        command = builder.build()
        command_str = " ".join(command)

        assert "zoompan" in command_str
        assert "1.2-0.2*on" in command_str

    def test_subtitle_basic(self):
        """測試基本字幕"""
        builder = FFmpegCommandBuilder()
        builder.add_input("video.mp4")
        builder.add_subtitle(
            "測試字幕",
            config={
                "font_family": "Noto Sans TC",
                "font_size": 48,
                "font_color": "#FFFFFF",
                "position": {"x": "center", "y": "bottom", "padding_bottom": 100},
            },
        )
        builder.set_output("output.mp4")

        command = builder.build()
        command_str = " ".join(command)

        assert "drawtext" in command_str
        assert "fontsize=48" in command_str

    def test_multiple_filters(self):
        """測試多個 filter 組合"""
        builder = FFmpegCommandBuilder()
        builder.add_input("image.png")
        builder.add_video_filter("scale=1920:1080")
        builder.add_subtitle("測試", config={"font_size": 48})
        builder.set_output("output.mp4")

        command = builder.build()
        command_str = " ".join(command)

        assert "-vf" in command
        assert "scale=1920:1080" in command_str
        assert "drawtext" in command_str


class TestVideoRenderService:
    """測試 VideoRenderService"""

    @pytest.fixture
    def temp_project_dir(self, tmp_path):
        """建立臨時專案目錄"""
        project_id = "test-project-001"
        project_dir = tmp_path / "projects" / project_id
        project_dir.mkdir(parents=True, exist_ok=True)
        return project_dir

    def test_init_creates_directories(self, tmp_path):
        """測試初始化時建立目錄"""
        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")

            service = VideoRenderService(project_id=project_id)

            assert service.temp_dir.exists()
            assert service.output_dir.exists()

    def test_ffmpeg_not_found(self, tmp_path):
        """測試 FFmpeg 不存在時拋出異常"""
        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")

            with patch("subprocess.run") as mock_run:
                mock_run.side_effect = FileNotFoundError()

                with pytest.raises(FFmpegNotFoundError):
                    VideoRenderService(project_id=project_id)

    def test_insufficient_disk_space(self, tmp_path):
        """測試磁碟空間不足時拋出異常"""
        from collections import namedtuple

        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")

            with patch("shutil.disk_usage") as mock_disk:
                # 模擬只剩 100MB 空間 (建立 named tuple)
                DiskUsage = namedtuple("usage", ["total", "used", "free"])
                mock_disk.return_value = DiskUsage(1000_000_000, 900_000_000, 100_000_000)

                with pytest.raises(InsufficientDiskSpaceError):
                    VideoRenderService(project_id=project_id)

    def test_merge_config(self, tmp_path):
        """測試配置合併"""
        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")

            service = VideoRenderService(project_id=project_id)

            global_config = {
                "subtitle": {"font_size": 48, "font_color": "#FFFFFF"},
                "overlays": [],
            }

            segment_config = {"subtitle": {"font_size": 64}}

            merged = service._merge_config(global_config, segment_config)

            assert merged["subtitle"]["font_size"] == 64
            assert merged["subtitle"]["font_color"] == "#FFFFFF"

    def test_cleanup_temp_files(self, tmp_path):
        """測試清理臨時檔案"""
        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")

            service = VideoRenderService(project_id=project_id)

            # 建立一些臨時檔案
            (service.temp_dir / "test.mp4").touch()

            assert service.temp_dir.exists()

            service.cleanup_temp_files()

            assert not service.temp_dir.exists()


class TestVideoRenderIntegration:
    """整合測試（需要真實的 FFmpeg）"""

    @pytest.mark.integration
    def test_ffmpeg_installed(self):
        """測試 FFmpeg 是否已安裝（整合測試）"""
        import subprocess

        try:
            result = subprocess.run(
                ["ffmpeg", "-version"],
                capture_output=True,
                text=True,
                check=True,
            )
            assert "ffmpeg version" in result.stdout
        except FileNotFoundError:
            pytest.skip("FFmpeg not installed")
