"""Tests for video render service"""

import shutil
import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.exceptions import FFmpegNotFoundError, InsufficientDiskSpaceError, VideoRenderError
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

    def test_ken_burns_pan_left(self):
        """測試 Ken Burns pan_left 效果"""
        builder = FFmpegCommandBuilder()
        builder.add_input("image.png")
        builder.add_ken_burns_effect("pan_left", duration=10.0)
        builder.set_output("output.mp4")

        command = builder.build()
        command_str = " ".join(command)

        assert "zoompan" in command_str
        assert "scale=2304:1080" in command_str

    def test_ken_burns_pan_right(self):
        """測試 Ken Burns pan_right 效果"""
        builder = FFmpegCommandBuilder()
        builder.add_input("image.png")
        builder.add_ken_burns_effect("pan_right", duration=10.0)
        builder.set_output("output.mp4")

        command = builder.build()
        command_str = " ".join(command)

        assert "zoompan" in command_str
        assert "scale=2304:1080" in command_str

    def test_subtitle_with_border(self):
        """測試帶邊框的字幕"""
        builder = FFmpegCommandBuilder()
        builder.add_input("video.mp4")
        builder.add_subtitle(
            "測試",
            config={
                "font_size": 48,
                "border": {"enabled": True, "color": "#000000", "width": 2},
            },
        )
        builder.set_output("output.mp4")

        command = builder.build()
        command_str = " ".join(command)

        assert "borderw=2" in command_str
        assert "bordercolor=#000000" in command_str

    def test_subtitle_with_shadow(self):
        """測試帶陰影的字幕"""
        builder = FFmpegCommandBuilder()
        builder.add_input("video.mp4")
        builder.add_subtitle(
            "測試",
            config={
                "font_size": 48,
                "shadow": {"enabled": True, "offset_x": 2, "offset_y": 2},
            },
        )
        builder.set_output("output.mp4")

        command = builder.build()
        command_str = " ".join(command)

        assert "shadowx=2" in command_str
        assert "shadowy=2" in command_str

    def test_subtitle_with_background(self):
        """測試帶背景框的字幕"""
        builder = FFmpegCommandBuilder()
        builder.add_input("video.mp4")
        builder.add_subtitle(
            "測試",
            config={
                "font_size": 48,
                "background": {
                    "enabled": True,
                    "color": "#000000",
                    "opacity": 0.7,
                    "padding": 10,
                },
            },
        )
        builder.set_output("output.mp4")

        command = builder.build()
        command_str = " ".join(command)

        assert "box=1" in command_str
        assert "boxcolor=#000000@0.7" in command_str
        assert "boxborderw=10" in command_str

    def test_overlay_image(self):
        """測試圖片疊加（Logo）"""
        builder = FFmpegCommandBuilder()
        builder.add_input("video.mp4")
        builder.add_overlay(
            {
                "type": "image",
                "image_path": "logo.png",
                "width": 150,
                "opacity": 0.8,
                "position": {"x": "right", "y": "top", "padding_right": 50, "padding_top": 50},
            }
        )
        builder.set_output("output.mp4")

        command = builder.build()
        command_str = " ".join(command)

        assert "-filter_complex" in command
        assert "scale=150:-1" in command_str
        assert "colorchannelmixer=aa=0.8" in command_str
        assert "overlay=" in command_str

    def test_all_setter_methods(self):
        """測試所有 setter 方法"""
        builder = FFmpegCommandBuilder()
        builder.add_input("input.mp4")
        builder.set_video_codec("libx264")
        builder.set_audio_codec("aac")
        builder.set_audio_bitrate("192k")
        builder.set_output_resolution("1920x1080")
        builder.set_framerate(30)
        builder.set_shortest_stream()
        builder.add_option("-preset", "fast")
        builder.set_output("output.mp4")

        command = builder.build()

        assert "-c:v" in command
        assert "libx264" in command
        assert "-c:a" in command
        assert "aac" in command
        assert "-b:a" in command
        assert "192k" in command
        assert "-s" in command
        assert "1920x1080" in command
        assert "-r" in command
        assert "30" in command
        assert "-shortest" in command
        assert "-preset" in command
        assert "fast" in command


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

    def test_render_segment_basic(self, tmp_path):
        """測試基本的 render_segment 功能"""
        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")
            mock_settings.VIDEO_CODEC = "libx264"
            mock_settings.AUDIO_CODEC = "aac"
            mock_settings.AUDIO_BITRATE = "192k"
            mock_settings.VIDEO_RESOLUTION = "1920x1080"
            mock_settings.VIDEO_FPS = 30

            service = VideoRenderService(project_id=project_id)

            with patch.object(service, "_execute_ffmpeg") as mock_execute:
                output = service.render_segment(
                    segment_index=1,
                    image_path="test.png",
                    audio_path="test.mp3",
                    segment_config={"duration": 10.0, "text": "測試字幕"},
                    global_config={},
                )

                assert mock_execute.called
                assert "segment_01.mp4" in output

    def test_render_segment_with_ken_burns(self, tmp_path):
        """測試帶 Ken Burns 效果的 render_segment"""
        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")
            mock_settings.VIDEO_CODEC = "libx264"
            mock_settings.AUDIO_CODEC = "aac"
            mock_settings.AUDIO_BITRATE = "192k"
            mock_settings.VIDEO_RESOLUTION = "1920x1080"
            mock_settings.VIDEO_FPS = 30

            service = VideoRenderService(project_id=project_id)

            with patch.object(service, "_execute_ffmpeg") as mock_execute:
                output = service.render_segment(
                    segment_index=1,
                    image_path="test.png",
                    audio_path="test.mp3",
                    segment_config={
                        "duration": 10.0,
                        "text": "測試",
                        "ken_burns_effect": {"type": "zoom_in"},
                    },
                    global_config={},
                )

                assert mock_execute.called
                # 檢查傳入的指令包含 zoompan
                command = mock_execute.call_args[0][0]
                command_str = " ".join(command)
                assert "zoompan" in command_str

    def test_render_segment_with_subtitle(self, tmp_path):
        """測試帶字幕的 render_segment"""
        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")
            mock_settings.VIDEO_CODEC = "libx264"
            mock_settings.AUDIO_CODEC = "aac"
            mock_settings.AUDIO_BITRATE = "192k"
            mock_settings.VIDEO_RESOLUTION = "1920x1080"
            mock_settings.VIDEO_FPS = 30

            service = VideoRenderService(project_id=project_id)

            with patch.object(service, "_execute_ffmpeg") as mock_execute:
                output = service.render_segment(
                    segment_index=1,
                    image_path="test.png",
                    audio_path="test.mp3",
                    segment_config={"duration": 10.0, "text": "測試字幕"},
                    global_config={
                        "subtitle": {"enabled": True, "font_size": 48, "font_color": "#FFFFFF"}
                    },
                )

                assert mock_execute.called
                command = mock_execute.call_args[0][0]
                command_str = " ".join(command)
                assert "drawtext" in command_str

    def test_merge_video(self, tmp_path):
        """測試 merge_video 功能"""
        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")

            service = VideoRenderService(project_id=project_id)

            # 建立假的影片檔案
            intro = str(tmp_path / "intro.mp4")
            outro = str(tmp_path / "outro.mp4")
            segments = [str(tmp_path / f"segment_{i}.mp4") for i in range(1, 4)]
            for f in [intro, outro] + segments:
                Path(f).touch()

            with patch.object(service, "_execute_ffmpeg") as mock_execute:
                output = service.merge_video(
                    intro_video=intro,
                    segment_videos=segments,
                    outro_video=outro,
                    output_path=str(tmp_path / "final.mp4"),
                )

                assert mock_execute.called
                command = mock_execute.call_args[0][0]
                assert "-f" in command
                assert "concat" in command

    def test_generate_thumbnail(self, tmp_path):
        """測試 generate_thumbnail 功能"""
        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")

            service = VideoRenderService(project_id=project_id)

            with patch.object(service, "_execute_ffmpeg") as mock_execute:
                output = service.generate_thumbnail(
                    base_image="test.png",
                    title="測試標題",
                    config={
                        "title_style": {"font_size": 72, "font_color": "#FFFFFF"}
                    },
                    output_path=str(tmp_path / "thumbnail.jpg"),
                )

                assert mock_execute.called
                command = mock_execute.call_args[0][0]
                command_str = " ".join(command)
                assert "scale=1280:720" in command_str
                assert "-frames:v" in command
                assert "1" in command

    def test_execute_ffmpeg_success(self, tmp_path):
        """測試 _execute_ffmpeg 成功執行"""
        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")

            service = VideoRenderService(project_id=project_id)

            with patch("subprocess.run") as mock_run:
                mock_run.return_value = MagicMock(stderr="FFmpeg output")

                service._execute_ffmpeg(["ffmpeg", "-version"])
                assert mock_run.called

    def test_execute_ffmpeg_failure(self, tmp_path):
        """測試 _execute_ffmpeg 執行失敗"""
        project_id = "test-project-001"

        with patch("app.services.video_render_service.settings") as mock_settings:
            mock_settings.PROJECTS_DIR = str(tmp_path / "projects")

            service = VideoRenderService(project_id=project_id)

            with patch("subprocess.run") as mock_run:
                mock_run.side_effect = subprocess.CalledProcessError(
                    1, "ffmpeg", stderr="Error message"
                )

                with pytest.raises(VideoRenderError) as exc_info:
                    service._execute_ffmpeg(["ffmpeg", "-version"])

                assert "Error message" in str(exc_info.value)


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
