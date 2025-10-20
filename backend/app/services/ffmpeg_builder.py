"""FFmpeg command builder for video rendering"""

from pathlib import Path
from typing import Dict, List, Optional


class FFmpegCommandBuilder:
    """
    FFmpeg 指令生成器

    負責生成複雜的 FFmpeg 指令，包含：
    - Ken Burns 效果
    - 字幕燒錄
    - 疊加元素
    - 編碼參數
    """

    def __init__(self):
        self.inputs: List[str] = []
        self.video_filters: List[str] = []
        self.complex_filters: List[str] = []
        self.options: Dict[str, str] = {}
        self.output: Optional[str] = None

    def add_input(self, input_path: str) -> "FFmpegCommandBuilder":
        """添加輸入檔案"""
        self.inputs.append(input_path)
        return self

    def add_ken_burns_effect(
        self, effect_type: str, duration: float, fps: int = 30
    ) -> "FFmpegCommandBuilder":
        """
        添加 Ken Burns 效果

        Args:
            effect_type: 效果類型（zoom_in, zoom_out, pan_left, pan_right）
            duration: 片段時長（秒）
            fps: 幀率
        """
        frames = int(duration * fps)

        # 根據效果類型生成 zoompan filter
        if effect_type == "zoom_in":
            # 從 1.0 放大到 1.2
            filter_str = f"scale=1920:1080,zoompan=z='1+0.2*on/{frames}':d={frames}:s=1920x1080:fps={fps}"

        elif effect_type == "zoom_out":
            # 從 1.2 縮小到 1.0
            filter_str = f"scale=1920:1080,zoompan=z='1.2-0.2*on/{frames}':d={frames}:s=1920x1080:fps={fps}"

        elif effect_type == "pan_right":
            # 從左向右平移
            filter_str = f"scale=2304:1080,zoompan=z='1.0':x='iw/2-(iw/zoom/2)-{384}*on/{frames}':d={frames}:s=1920x1080:fps={fps}"

        elif effect_type == "pan_left":
            # 從右向左平移
            filter_str = f"scale=2304:1080,zoompan=z='1.0':x='iw/2-(iw/zoom/2)+{384}*on/{frames}':d={frames}:s=1920x1080:fps={fps}"

        else:
            # 預設：靜態（無效果）
            filter_str = "scale=1920:1080"

        self.video_filters.append(filter_str)
        return self

    def add_subtitle(self, text: str, config: dict) -> "FFmpegCommandBuilder":
        """
        添加字幕

        Args:
            text: 字幕文字
            config: 字幕配置（font_family, font_size, position, border, shadow, etc.）
        """
        # 清理文字（escape 特殊字元）
        text = text.replace("'", "'\\''")  # 處理單引號
        text = text.replace(":", "\\:")  # 處理冒號

        # 基本參數
        font_family = config.get("font_family", "Noto Sans TC")
        font_size = config.get("font_size", 48)
        font_color = config.get("font_color", "#FFFFFF")

        # 字型路徑（macOS）
        font_path = f"/Users/skyler/Library/Fonts/{font_family.replace(' ', '')}-Regular.otf"

        # 位置計算
        position = config.get("position", {})
        x = self._calculate_x_position(position)
        y = self._calculate_y_position(position)

        # 開始構建 drawtext filter
        filter_parts = [
            f"text='{text}'",
            f"fontfile={font_path}",
            f"fontsize={font_size}",
            f"fontcolor={font_color}",
            f"x={x}",
            f"y={y}",
        ]

        # 邊框
        if config.get("border", {}).get("enabled"):
            border = config["border"]
            filter_parts.append(f"borderw={border.get('width', 2)}")
            filter_parts.append(f"bordercolor={border.get('color', '#000000')}")

        # 陰影
        if config.get("shadow", {}).get("enabled"):
            shadow = config["shadow"]
            filter_parts.append(f"shadowx={shadow.get('offset_x', 2)}")
            filter_parts.append(f"shadowy={shadow.get('offset_y', 2)}")
            filter_parts.append(f"shadowcolor={shadow.get('color', '#000000')}")

        # 背景框
        if config.get("background", {}).get("enabled"):
            bg = config["background"]
            opacity = bg.get("opacity", 0.7)
            padding = bg.get("padding", 10)

            filter_parts.append("box=1")
            filter_parts.append(f"boxcolor={bg.get('color', '#000000')}@{opacity}")
            filter_parts.append(f"boxborderw={padding}")

        filter_str = f"drawtext={':'.join(filter_parts)}"
        self.video_filters.append(filter_str)
        return self

    def add_overlay(self, overlay_config: dict) -> "FFmpegCommandBuilder":
        """
        添加疊加元素（Logo, 圖片, 文字）

        Args:
            overlay_config: 疊加配置
        """
        overlay_type = overlay_config.get("type")

        if overlay_type == "image":
            # 圖片疊加（Logo）
            image_path = overlay_config["image_path"]
            width = overlay_config.get("width", 150)
            opacity = overlay_config.get("opacity", 1.0)
            position = overlay_config.get("position", {})

            # 計算位置
            x = self._calculate_overlay_x(position, width)
            y = self._calculate_overlay_y(position, width)

            # 添加 overlay input
            self.add_input(image_path)

            # Complex filter: scale logo -> set opacity -> overlay
            input_index = len(self.inputs) - 1
            filter_str = (
                f"[{input_index}:v]scale={width}:-1,format=rgba,"
                f"colorchannelmixer=aa={opacity}[logo];"
                f"[0:v][logo]overlay={x}:{y}"
            )
            self.complex_filters.append(filter_str)

        elif overlay_type == "text":
            # 文字疊加（類似 subtitle，但可能是標題或特殊文字）
            self.add_subtitle(text=overlay_config["text"], config=overlay_config)

        return self

    def add_title_overlay(self, text: str, config: dict) -> "FFmpegCommandBuilder":
        """添加標題文字（用於封面）"""
        return self.add_subtitle(text, config)

    def add_video_filter(self, filter_str: str) -> "FFmpegCommandBuilder":
        """添加自訂 video filter"""
        self.video_filters.append(filter_str)
        return self

    def set_video_codec(self, codec: str) -> "FFmpegCommandBuilder":
        """設定影片編碼器"""
        self.options["-c:v"] = codec
        return self

    def set_audio_codec(self, codec: str) -> "FFmpegCommandBuilder":
        """設定音訊編碼器"""
        self.options["-c:a"] = codec
        return self

    def set_audio_bitrate(self, bitrate: str) -> "FFmpegCommandBuilder":
        """設定音訊位元率"""
        self.options["-b:a"] = bitrate
        return self

    def set_output_resolution(self, resolution: str) -> "FFmpegCommandBuilder":
        """設定輸出解析度"""
        self.options["-s"] = resolution
        return self

    def set_framerate(self, fps: int) -> "FFmpegCommandBuilder":
        """設定幀率"""
        self.options["-r"] = str(fps)
        return self

    def set_shortest_stream(self) -> "FFmpegCommandBuilder":
        """設定以最短串流為準（用於音訊同步）"""
        self.options["-shortest"] = ""
        return self

    def add_option(self, key: str, value: str) -> "FFmpegCommandBuilder":
        """添加自訂選項"""
        self.options[key] = value
        return self

    def set_output(self, output_path: str) -> "FFmpegCommandBuilder":
        """設定輸出路徑"""
        self.output = output_path
        self.options["-y"] = ""  # 覆蓋輸出檔案
        return self

    def build(self) -> List[str]:
        """生成最終的 FFmpeg 指令"""
        command = ["ffmpeg"]

        # 添加所有輸入
        for input_path in self.inputs:
            command.extend(["-i", input_path])

        # 添加 complex filter（如果有）
        if self.complex_filters:
            filter_chain = ";".join(self.complex_filters)
            command.extend(["-filter_complex", filter_chain])

        # 添加 video filter（如果有，且沒有 complex filter）
        elif self.video_filters:
            filter_chain = ",".join(self.video_filters)
            command.extend(["-vf", filter_chain])

        # 添加其他選項
        for key, value in self.options.items():
            if value:
                command.extend([key, value])
            else:
                command.append(key)

        # 添加輸出
        if self.output:
            command.append(self.output)

        return command

    # === 私有輔助方法 ===

    def _calculate_x_position(self, position: dict) -> str:
        """計算 X 座標（用於字幕）"""
        x_type = position.get("x", "center")

        if x_type == "center":
            return "(w-text_w)/2"
        elif x_type == "left":
            padding = position.get("padding_left", 50)
            return str(padding)
        elif x_type == "right":
            padding = position.get("padding_right", 50)
            return f"w-text_w-{padding}"
        else:
            # 數值（直接使用）
            return str(x_type)

    def _calculate_y_position(self, position: dict) -> str:
        """計算 Y 座標（用於字幕）"""
        y_type = position.get("y", "bottom")

        if y_type == "center":
            return "(h-text_h)/2"
        elif y_type == "top":
            padding = position.get("padding_top", 50)
            return str(padding)
        elif y_type == "bottom":
            padding = position.get("padding_bottom", 100)
            return f"h-text_h-{padding}"
        else:
            # 數值（直接使用）
            return str(y_type)

    def _calculate_overlay_x(self, position: dict, width: int) -> str:
        """計算 overlay X 座標（用於 Logo）"""
        x_type = position.get("x", "right")

        if x_type == "center":
            return f"(W-{width})/2"
        elif x_type == "left":
            padding = position.get("padding_left", 50)
            return str(padding)
        elif x_type == "right":
            padding = position.get("padding_right", 50)
            return f"W-{width}-{padding}"
        else:
            return str(x_type)

    def _calculate_overlay_y(self, position: dict, height: int) -> str:
        """計算 overlay Y 座標（用於 Logo）"""
        y_type = position.get("y", "top")

        if y_type == "center":
            return f"(H-{height})/2"
        elif y_type == "top":
            padding = position.get("padding_top", 50)
            return str(padding)
        elif y_type == "bottom":
            padding = position.get("padding_bottom", 50)
            return f"H-{height}-{padding}"
        else:
            return str(y_type)
