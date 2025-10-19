# Task-011: 影片渲染服務 (FFmpeg)

> **建立日期:** 2025-01-19
> **狀態:** ⏳ 未開始
> **預計時間:** 12 小時
> **優先級:** P0

---

## 關聯文件

- **技術規格:** `tech-specs/backend/service-video-generation.md`
- **產品設計:** `product-design/overview.md#影片渲染流程`
- **視覺規格:** `tech-specs/backend/api-configurations.md#字幕配置`

### 相關任務
- **前置任務:** Task-007 (Stability AI 整合), Task-008 (D-ID 整合)
- **前置任務:** Task-010 (Celery 任務系統)
- **並行任務:** Task-012 (WebSocket 進度推送)

---

## 任務目標

使用 FFmpeg 實作影片渲染服務，包含圖片/影片合成、字幕燒錄、Ken Burns 效果、Logo 疊加、音訊混音。

---

## 實作規格

### FFmpeg 安裝

**系統需求:**
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg

# 驗證安裝
ffmpeg -version
```

---

### Video Renderer

**檔案:** `app/services/video_renderer.py`

```python
import subprocess
import os
import logging
from typing import List, Dict, Optional
from app.models.project import Project
from app.models.asset import Asset, AssetType
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class VideoRenderer:
    """FFmpeg 影片渲染服務"""

    def __init__(self, db: Session):
        self.db = db
        self.output_width = 1920
        self.output_height = 1080
        self.fps = 30

    def render_project(self, project_id: str) -> str:
        """
        渲染專案影片

        Args:
            project_id: 專案 ID

        Returns:
            output_path: 渲染完成的影片路徑
        """
        # 取得專案
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project {project_id} not found")

        # 取得素材
        images = self._get_assets_by_type(project_id, AssetType.IMAGE)
        avatars = self._get_assets_by_type(project_id, AssetType.AVATAR)
        audio = self._get_assets_by_type(project_id, AssetType.AUDIO)

        # 取得腳本
        script_data = project.script.script_data

        # 建立輸出目錄
        output_dir = f"/projects/{project_id}"
        os.makedirs(output_dir, exist_ok=True)

        # 渲染各段落
        segment_videos = []

        for i, segment in enumerate(script_data["segments"]):
            logger.info(f"Rendering segment {i+1}/{len(script_data['segments'])}")

            segment_path = self._render_segment(
                project_id=project_id,
                segment_index=i,
                segment_data=segment,
                image_asset=images[i] if i < len(images) else None,
                avatar_asset=avatars[i] if i < len(avatars) else None,
                audio_asset=audio[i] if i < len(audio) else None,
                configuration=project.configuration
            )

            segment_videos.append(segment_path)

        # 合併所有段落
        output_path = f"{output_dir}/output.mp4"
        self._concatenate_videos(segment_videos, output_path)

        logger.info(f"Video rendered successfully: {output_path}")

        return output_path

    def _render_segment(
        self,
        project_id: str,
        segment_index: int,
        segment_data: dict,
        image_asset: Optional[Asset],
        avatar_asset: Optional[Asset],
        audio_asset: Optional[Asset],
        configuration: dict
    ) -> str:
        """
        渲染單一段落

        Args:
            project_id: 專案 ID
            segment_index: 段落索引
            segment_data: 段落數據
            image_asset: 圖片素材
            avatar_asset: 虛擬主播素材
            audio_asset: 語音素材
            configuration: 視覺配置

        Returns:
            segment_path: 段落影片路徑
        """
        duration = segment_data.get("duration", 10)
        narration = segment_data.get("narration", "")

        # 決定使用圖片還是虛擬主播
        if avatar_asset:
            # 使用虛擬主播影片
            input_path = avatar_asset.file_path
            has_ken_burns = False
        elif image_asset:
            # 使用圖片 + Ken Burns 效果
            input_path = image_asset.file_path
            has_ken_burns = True
        else:
            raise ValueError(f"No visual asset for segment {segment_index}")

        # 輸出路徑
        output_path = f"/projects/{project_id}/segments/segment_{segment_index:02d}.mp4"
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # 建立 FFmpeg 指令
        if has_ken_burns:
            # 圖片 + Ken Burns 效果
            self._render_image_with_ken_burns(
                image_path=input_path,
                output_path=output_path,
                duration=duration,
                subtitle=narration,
                configuration=configuration
            )
        else:
            # 虛擬主播影片
            self._render_avatar_with_subtitles(
                video_path=input_path,
                output_path=output_path,
                subtitle=narration,
                configuration=configuration
            )

        return output_path

    def _render_image_with_ken_burns(
        self,
        image_path: str,
        output_path: str,
        duration: int,
        subtitle: str,
        configuration: dict
    ):
        """
        渲染圖片 + Ken Burns 效果 + 字幕

        Args:
            image_path: 圖片路徑
            output_path: 輸出路徑
            duration: 時長（秒）
            subtitle: 字幕文字
            configuration: 視覺配置
        """
        # Ken Burns 效果參數
        zoom_factor = 1.2

        # 建立 filter_complex
        filters = []

        # 1. Ken Burns 效果（縮放 + 平移）
        filters.append(
            f"zoompan=z='min(zoom+0.0015,{zoom_factor})':d={duration*self.fps}:s={self.output_width}x{self.output_height}:fps={self.fps}"
        )

        # 2. 字幕（使用 drawtext）
        if subtitle:
            subtitle_config = configuration.get("subtitle", {})

            font_family = subtitle_config.get("font_family", "Arial")
            font_size = subtitle_config.get("font_size", 48)
            font_color = subtitle_config.get("font_color", "#FFFFFF")

            # 計算字幕位置（底部居中）
            x_pos = "(w-text_w)/2"
            y_pos = "h-th-100"

            filters.append(
                f"drawtext=text='{self._escape_text(subtitle)}':fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize={font_size}:fontcolor={font_color}:x={x_pos}:y={y_pos}:box=1:boxcolor=black@0.5:boxborderw=10"
            )

        # 3. Logo 疊加（如果有）
        logo_config = configuration.get("logo")
        if logo_config and logo_config.get("file_path"):
            # TODO: 實作 logo 疊加
            pass

        # 組合 filter
        filter_complex = ",".join(filters)

        # 建立 FFmpeg 指令
        cmd = [
            "ffmpeg",
            "-loop", "1",
            "-i", image_path,
            "-vf", filter_complex,
            "-t", str(duration),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-r", str(self.fps),
            "-y",
            output_path
        ]

        logger.info(f"Running FFmpeg: {' '.join(cmd)}")

        # 執行
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr}")
            raise Exception(f"FFmpeg failed: {result.stderr}")

    def _render_avatar_with_subtitles(
        self,
        video_path: str,
        output_path: str,
        subtitle: str,
        configuration: dict
    ):
        """
        渲染虛擬主播影片 + 字幕

        Args:
            video_path: 虛擬主播影片路徑
            output_path: 輸出路徑
            subtitle: 字幕文字
            configuration: 視覺配置
        """
        if not subtitle:
            # 沒有字幕，直接複製
            subprocess.run(["cp", video_path, output_path])
            return

        # 字幕配置
        subtitle_config = configuration.get("subtitle", {})

        font_family = subtitle_config.get("font_family", "Arial")
        font_size = subtitle_config.get("font_size", 48)
        font_color = subtitle_config.get("font_color", "#FFFFFF")

        x_pos = "(w-text_w)/2"
        y_pos = "h-th-100"

        # 建立 FFmpeg 指令
        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-vf", f"drawtext=text='{self._escape_text(subtitle)}':fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:fontsize={font_size}:fontcolor={font_color}:x={x_pos}:y={y_pos}:box=1:boxcolor=black@0.5:boxborderw=10",
            "-c:v", "libx264",
            "-c:a", "copy",
            "-y",
            output_path
        ]

        logger.info(f"Running FFmpeg: {' '.join(cmd)}")

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr}")
            raise Exception(f"FFmpeg failed: {result.stderr}")

    def _concatenate_videos(self, video_paths: List[str], output_path: str):
        """
        合併多個影片

        Args:
            video_paths: 影片路徑列表
            output_path: 輸出路徑
        """
        # 建立 concat 列表檔案
        concat_file = f"/tmp/concat_{os.urandom(8).hex()}.txt"

        with open(concat_file, "w") as f:
            for path in video_paths:
                f.write(f"file '{path}'\n")

        # FFmpeg concat
        cmd = [
            "ffmpeg",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file,
            "-c", "copy",
            "-y",
            output_path
        ]

        logger.info(f"Concatenating {len(video_paths)} videos")

        result = subprocess.run(cmd, capture_output=True, text=True)

        # 清理臨時檔案
        os.remove(concat_file)

        if result.returncode != 0:
            logger.error(f"FFmpeg concat error: {result.stderr}")
            raise Exception(f"FFmpeg concat failed: {result.stderr}")

    def _get_assets_by_type(self, project_id: str, asset_type: AssetType) -> List[Asset]:
        """取得指定類型的素材"""
        return self.db.query(Asset).filter(
            Asset.project_id == project_id,
            Asset.asset_type == asset_type
        ).order_by(Asset.created_at).all()

    @staticmethod
    def _escape_text(text: str) -> str:
        """
        轉義 FFmpeg drawtext 的特殊字元

        Args:
            text: 原始文字

        Returns:
            轉義後的文字
        """
        # FFmpeg drawtext 需要轉義的字元
        text = text.replace("\\", "\\\\")
        text = text.replace("'", "\\'")
        text = text.replace(":", "\\:")

        return text
```

---

### 縮圖生成

**檔案:** `app/services/thumbnail_generator.py`

```python
import subprocess
import logging

logger = logging.getLogger(__name__)

class ThumbnailGenerator:
    """縮圖生成器"""

    @staticmethod
    def generate_from_video(video_path: str, output_path: str, timestamp: str = "00:00:01"):
        """
        從影片提取縮圖

        Args:
            video_path: 影片路徑
            output_path: 輸出路徑
            timestamp: 截圖時間點
        """
        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-ss", timestamp,
            "-vframes", "1",
            "-vf", "scale=1280:720",
            "-y",
            output_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"Thumbnail generation failed: {result.stderr}")
            raise Exception(f"Failed to generate thumbnail: {result.stderr}")

        logger.info(f"Generated thumbnail: {output_path}")
```

---

## 完成檢查清單

- [ ] VideoRenderer 類別實作
- [ ] Ken Burns 效果實作
- [ ] 字幕燒錄實作
- [ ] Logo 疊加實作
- [ ] 影片合併實作
- [ ] 縮圖生成實作
- [ ] 錯誤處理
- [ ] 測試通過

---

## 時間分配

- **VideoRenderer 核心:** 4 小時
- **Ken Burns 效果:** 2 小時
- **字幕渲染:** 2 小時
- **影片合併:** 2 小時
- **測試與優化:** 2 小時

**總計:** 12 小時
