# Task-015: 影片渲染服務(FFmpeg)

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 16 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **核心功能：** `product-design/overview.md#核心功能-5-動態視覺效果`
  - Ken Burns 效果（縮放、平移）
  - 多種運鏡模式（zoom_in、zoom_out、pan_left、pan_right）
- **核心功能：** `product-design/overview.md#核心功能-6-字幕系統`
  - 可配置樣式（大小、顏色、位置）
  - 支援邊框、陰影、背景框
  - 燒錄到影片中
- **核心功能：** `product-design/overview.md#核心功能-7-疊加元素系統`
  - 文字疊加、圖片疊加、形狀疊加
- **核心功能：** `product-design/overview.md#核心功能-8-封面自動生成`
  - 基於第一張圖片
  - 符合 YouTube 規範（1280×720）

### 技術規格
- **業務邏輯：** `tech-specs/backend/business-logic.md#3.3-影片渲染邏輯`
  - 完整的 FFmpeg 處理流程
  - 編碼參數規格
- **業務邏輯：** `tech-specs/backend/business-logic.md#3.4-封面生成邏輯`
- **資料模型：** `tech-specs/backend/database.md#2.1.1-Project`
  - `configuration` 欄位（視覺化配置 JSON）
  - `script` 欄位（腳本 JSON）

### 相關任務
- **前置任務:** Task-011 ✅ (Stability AI 圖片生成), Task-012 ✅ (D-ID 虛擬主播)
- **後續任務:** Task-014 (Celery 背景任務 - 會呼叫此服務)
- **整合任務:** Task-022 (前端視覺化配置頁面)

---

## 任務目標

### 簡述
使用 FFmpeg 實作完整的影片渲染服務，包含影片合成、字幕燒錄、Ken Burns 效果、疊加元素渲染、虛擬主播整合、封面生成，並確保跨平台相容性。

### 成功標準
- [x] VideoRenderService 類別完整實作
- [x] FFmpeg 指令生成器完成（支援所有效果）
- [x] 字幕渲染完成（支援所有配置選項）
- [x] Ken Burns 效果完成（4 種運鏡模式）
- [x] 疊加元素渲染完成（文字、Logo、形狀）
- [x] 虛擬主播片段整合完成（開場、結尾）
- [x] 封面生成服務完成
- [x] 音訊同步驗證（誤差 < 0.5 秒）
- [x] 跨平台相容性測試通過（macOS, Linux, Windows）
- [x] 編碼效率優化（30fps, H.264, AAC）
- [x] 單元測試覆蓋率 > 85%

### 詳細目標
1. **影片合成：** 合併開場（虛擬主播）+ 內容段落（圖片 + 效果 + 字幕）+ 結尾（虛擬主播）
2. **字幕系統：** 精確燒錄字幕，支援全局配置與段落級覆寫
3. **動態效果：** Ken Burns 效果（4 種運鏡模式）
4. **疊加元素：** 支援 Logo、文字、形狀疊加
5. **封面生成：** 基於第一張圖片生成符合 YouTube 規範的封面
6. **錯誤處理：** 完整的錯誤處理與回退機制
7. **效能優化：** 確保渲染時間合理（5 分鐘影片 < 10 分鐘渲染時間）

---

## 測試要求

### 單元測試

#### 測試 1：基本影片片段生成（單張圖片 + 音訊）

**目的：** 驗證最基本的影片片段生成功能

**輸入：**
```python
segment_config = {
    "image_path": "/path/to/image_01.png",
    "audio_path": "/path/to/audio_segment_01.mp3",
    "duration": 15.0,  # 秒
    "ken_burns_effect": None,  # 無效果
    "subtitle": None,  # 無字幕
    "overlays": []  # 無疊加元素
}
```

**預期輸出：**
- 生成 `segment_01.mp4` 檔案
- 影片時長 = 15.0 秒（誤差 < 0.1 秒）
- 解析度 = 1920x1080
- 幀率 = 30fps
- 音訊編碼 = AAC, 192kbps
- 影片編碼 = H.264

**驗證點：**
- [ ] 檔案成功生成
- [ ] 影片時長正確
- [ ] 解析度、幀率、編碼格式正確
- [ ] 音訊正確嵌入
- [ ] 可使用 VLC/QuickTime 正常播放

---

#### 測試 2：Ken Burns 效果（zoom_in）

**目的：** 驗證 Ken Burns zoom_in 效果正確生成

**輸入：**
```python
segment_config = {
    "image_path": "/path/to/image_02.png",
    "audio_path": "/path/to/audio_segment_02.mp3",
    "duration": 10.0,
    "ken_burns_effect": {
        "type": "zoom_in",
        "start_scale": 1.0,  # 初始縮放
        "end_scale": 1.2     # 結束縮放（放大 20%）
    },
    "subtitle": None,
    "overlays": []
}
```

**預期輸出：**
- 影片具有平滑的 zoom_in 效果
- 從原始大小逐漸放大到 120%
- 效果持續整個片段時長

**FFmpeg 指令應包含：**
```bash
-vf "scale=1920:1080,zoompan=z='1+0.02*on/30':d=25*10:s=1920x1080:fps=30"
```

**驗證點：**
- [ ] FFmpeg 指令包含正確的 zoompan filter
- [ ] 影片具有明顯的 zoom_in 效果
- [ ] 效果平滑無跳躍
- [ ] 時長與音訊同步

---

#### 測試 3：字幕燒錄（基本樣式）

**目的：** 驗證字幕正確燒錄到影片中

**輸入：**
```python
segment_config = {
    "image_path": "/path/to/image_03.png",
    "audio_path": "/path/to/audio_segment_03.mp3",
    "duration": 12.0,
    "ken_burns_effect": None,
    "subtitle": {
        "text": "這是測試字幕文字",
        "font_family": "Noto Sans TC",
        "font_size": 48,
        "font_color": "#FFFFFF",
        "position": {
            "x": "center",
            "y": "bottom",
            "padding_bottom": 100
        },
        "border": {
            "enabled": True,
            "color": "#000000",
            "width": 2
        },
        "shadow": {
            "enabled": True,
            "color": "#000000",
            "offset_x": 2,
            "offset_y": 2
        },
        "background": {
            "enabled": False
        }
    },
    "overlays": []
}
```

**預期輸出：**
- 字幕出現在影片底部中央
- 字體大小 48px，白色
- 具有 2px 黑色邊框
- 具有陰影效果

**FFmpeg 指令應包含：**
```bash
-vf "drawtext=text='這是測試字幕文字':fontfile=/path/to/font.ttf:\
fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-100-text_h:\
borderw=2:bordercolor=black:shadowx=2:shadowy=2:shadowcolor=black"
```

**驗證點：**
- [ ] 字幕正確顯示
- [ ] 字體、顏色、大小正確
- [ ] 位置正確（底部中央）
- [ ] 邊框與陰影正確
- [ ] 中文字型正確渲染（無方塊亂碼）

---

#### 測試 4：疊加 Logo（右上角）

**目的：** 驗證 Logo 疊加功能

**輸入：**
```python
segment_config = {
    "image_path": "/path/to/image_04.png",
    "audio_path": "/path/to/audio_segment_04.mp3",
    "duration": 8.0,
    "ken_burns_effect": None,
    "subtitle": None,
    "overlays": [
        {
            "type": "image",
            "image_path": "/path/to/logo.png",
            "position": {
                "x": "right",
                "y": "top",
                "padding_right": 50,
                "padding_top": 50
            },
            "width": 150,  # Logo 寬度
            "opacity": 0.8  # 80% 不透明度
        }
    ]
}
```

**預期輸出：**
- Logo 出現在影片右上角
- 大小 150px 寬度（保持比例）
- 80% 不透明度
- 距離邊緣 50px

**FFmpeg 指令應包含：**
```bash
-i logo.png -filter_complex "[1:v]scale=150:-1,format=rgba,\
colorchannelmixer=aa=0.8[logo];[0:v][logo]overlay=W-150-50:50"
```

**驗證點：**
- [ ] Logo 正確疊加
- [ ] 位置正確（右上角）
- [ ] 大小正確
- [ ] 不透明度正確
- [ ] 不影響底層影片品質

---

#### 測試 5：完整影片合併（開場 + 段落 + 結尾）

**目的：** 驗證完整影片合併功能（包含虛擬主播）

**輸入：**
```python
render_config = {
    "intro_video": "/path/to/intro_avatar.mp4",  # 虛擬主播開場（10 秒）
    "segments": [
        {
            "segment_path": "/path/to/segment_01.mp4",  # 15 秒
        },
        {
            "segment_path": "/path/to/segment_02.mp4",  # 12 秒
        },
        {
            "segment_path": "/path/to/segment_03.mp4",  # 10 秒
        }
    ],
    "outro_video": "/path/to/outro_avatar.mp4",  # 虛擬主播結尾（10 秒）
    "output_path": "/path/to/final_video.mp4"
}
```

**預期輸出：**
- 完整影片 = 開場(10s) + 段落1(15s) + 段落2(12s) + 段落3(10s) + 結尾(10s)
- 總時長 = 57 秒
- 所有片段平滑轉場（無黑屏、無跳躍）
- 音訊連續無斷層

**FFmpeg 指令應使用 concat demuxer：**
```bash
# concat_list.txt:
# file 'intro_avatar.mp4'
# file 'segment_01.mp4'
# file 'segment_02.mp4'
# file 'segment_03.mp4'
# file 'outro_avatar.mp4'

ffmpeg -f concat -safe 0 -i concat_list.txt -c copy final_video.mp4
```

**驗證點：**
- [ ] 影片成功合併
- [ ] 總時長正確（57 秒 ± 0.5 秒）
- [ ] 轉場平滑無閃爍
- [ ] 音訊同步正確
- [ ] 無黑屏或空白畫面
- [ ] 影片可正常播放

---

#### 測試 6：封面生成（基於第一張圖片 + 標題）

**目的：** 驗證封面生成功能

**輸入：**
```python
thumbnail_config = {
    "base_image": "/path/to/image_01.png",  # 第一張圖片
    "title": "這是影片標題",
    "title_style": {
        "font_family": "Noto Sans TC",
        "font_size": 72,
        "font_color": "#FFFFFF",
        "position": {
            "x": "center",
            "y": "center"
        },
        "border": {
            "enabled": True,
            "color": "#FF5733",
            "width": 3
        },
        "background_box": {
            "enabled": True,
            "color": "#000000",
            "opacity": 0.7,
            "padding": 20
        }
    },
    "logo": {
        "enabled": True,
        "image_path": "/path/to/logo.png",
        "position": {
            "x": "right",
            "y": "bottom",
            "padding_right": 30,
            "padding_bottom": 30
        },
        "width": 120
    },
    "output_path": "/path/to/thumbnail.jpg"
}
```

**預期輸出：**
- 封面圖片尺寸 = 1280x720 (YouTube 規範)
- 格式 = JPEG
- 標題文字清晰可讀
- Logo 正確疊加

**FFmpeg 指令應包含：**
```bash
ffmpeg -i image_01.png -vf "scale=1280:720,\
drawtext=text='這是影片標題':fontfile=font.ttf:fontsize=72:\
fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:borderw=3:\
bordercolor=#FF5733:box=1:boxcolor=black@0.7:boxborderw=20" \
-i logo.png -filter_complex "[0:v][1:v]overlay=W-120-30:H-120-30" \
-frames:v 1 thumbnail.jpg
```

**驗證點：**
- [ ] 封面尺寸 = 1280x720
- [ ] 格式 = JPEG
- [ ] 標題文字正確顯示（中文無亂碼）
- [ ] 標題位置、顏色、邊框正確
- [ ] Logo 正確疊加
- [ ] 圖片品質良好（無明顯壓縮失真）
- [ ] 檔案大小 < 2MB（YouTube 限制）

---

### 整合測試

#### 測試 7：完整端到端影片生成流程

**目的：** 驗證從素材到成品的完整流程

**前置條件：**
- Task-011 已生成 15 張圖片（image_01.png ~ image_15.png）
- Task-012 已生成虛擬主播影片（intro_avatar.mp4, outro_avatar.mp4）
- 語音合成已完成（audio.mp3，180 秒）

**輸入：**
```python
project_data = {
    "project_id": "test-project-001",
    "script": {
        "intro": {
            "text": "歡迎收看本期影片",
            "duration": 10
        },
        "segments": [
            {
                "index": 1,
                "text": "這是第一段內容...",
                "duration": 12,
                "image_description": "beautiful sunset landscape"
            },
            # ... 共 15 個段落
        ],
        "outro": {
            "text": "感謝觀看，下次見",
            "duration": 10
        },
        "total_duration": 180
    },
    "configuration": {
        "subtitle": {
            "enabled": True,
            "font_family": "Noto Sans TC",
            "font_size": 48,
            "font_color": "#FFFFFF",
            "position": "bottom",
            # ... 完整配置
        },
        "logo": {
            "enabled": True,
            "image_path": "/path/to/logo.png",
            "position": "top-right",
            "width": 150
        },
        "ken_burns_effects": [
            "zoom_in", "zoom_out", "pan_right", "pan_left"  # 循環使用
        ]
    },
    "youtube_settings": {
        "title": "測試影片標題",
        "description": "測試影片描述",
        "tags": ["測試", "AI", "自動生成"]
    }
}
```

**執行流程：**
```python
service = VideoRenderService(project_id="test-project-001")

# Step 1: 生成所有影片片段（15 個）
for i, segment in enumerate(project_data["script"]["segments"]):
    service.render_segment(
        segment_index=i+1,
        image_path=f"/path/to/image_{i+1:02d}.png",
        audio_path=f"/path/to/audio_segment_{i+1:02d}.mp3",
        segment_config=segment,
        global_config=project_data["configuration"]
    )

# Step 2: 合併所有片段
service.merge_video(
    intro_video="/path/to/intro_avatar.mp4",
    segment_videos=[f"/path/to/segment_{i:02d}.mp4" for i in range(1, 16)],
    outro_video="/path/to/outro_avatar.mp4",
    output_path="/path/to/final_video.mp4"
)

# Step 3: 生成封面
service.generate_thumbnail(
    base_image="/path/to/image_01.png",
    title=project_data["youtube_settings"]["title"],
    config=project_data["configuration"],
    output_path="/path/to/thumbnail.jpg"
)
```

**預期輸出：**
- `final_video.mp4` - 完整影片（180 秒）
- `thumbnail.jpg` - 封面圖片（1280x720）
- 所有中間素材（segment_01.mp4 ~ segment_15.mp4）

**驗證點：**
- [ ] 影片總時長 = 180 秒（誤差 < 1 秒）
- [ ] 所有段落按順序正確合併
- [ ] 字幕在所有段落正確顯示
- [ ] Logo 在所有段落正確顯示
- [ ] Ken Burns 效果按配置循環應用
- [ ] 虛擬主播開場和結尾正確嵌入
- [ ] 音訊同步準確（無延遲或提前）
- [ ] 封面正確生成
- [ ] 影片品質良好（無明顯壓縮失真）
- [ ] 可正常上傳到 YouTube

---

### 跨平台測試

#### 測試 8：macOS 平台相容性

**目的：** 驗證在 macOS 上 FFmpeg 正常運作

**環境：**
- macOS 14+ (Sonoma)
- FFmpeg 安裝方式：`brew install ffmpeg`

**驗證點：**
- [ ] FFmpeg 可執行檔路徑正確偵測（`which ffmpeg`）
- [ ] 所有編碼器可用（libx264, aac）
- [ ] 字型路徑正確（`/System/Library/Fonts/`, `~/Library/Fonts/`）
- [ ] 中文字幕正確渲染（Noto Sans TC 或系統字型）
- [ ] 測試 1-7 全部通過

---

#### 測試 9：Linux 平台相容性

**目的：** 驗證在 Linux 上 FFmpeg 正常運作

**環境：**
- Ubuntu 22.04 LTS
- FFmpeg 安裝方式：`apt install ffmpeg`

**驗證點：**
- [ ] FFmpeg 可執行檔路徑正確偵測（`/usr/bin/ffmpeg`）
- [ ] 所有編碼器可用
- [ ] 字型路徑正確（`/usr/share/fonts/`, `~/.fonts/`）
- [ ] 中文字幕正確渲染
- [ ] 測試 1-7 全部通過

---

#### 測試 10：Windows 平台相容性

**目的：** 驗證在 Windows 上 FFmpeg 正常運作

**環境：**
- Windows 11
- FFmpeg：預先打包或提示用戶安裝

**驗證點：**
- [ ] FFmpeg 可執行檔路徑正確偵測（`ffmpeg.exe`）
- [ ] Windows 路徑格式正確處理（`C:\Users\...`）
- [ ] 所有編碼器可用
- [ ] 字型路徑正確（`C:\Windows\Fonts\`）
- [ ] 中文字幕正確渲染
- [ ] 測試 1-7 全部通過

---

### 錯誤處理測試

#### 測試 11：FFmpeg 不存在時的錯誤處理

**目的：** 驗證 FFmpeg 未安裝時的錯誤處理

**模擬情境：**
- 系統未安裝 FFmpeg
- 或 FFmpeg 路徑錯誤

**預期行為：**
```python
try:
    service = VideoRenderService()
except FFmpegNotFoundError as e:
    assert "FFmpeg not found" in str(e)
    assert "Please install FFmpeg" in str(e)
```

**驗證點：**
- [ ] 拋出 `FFmpegNotFoundError`
- [ ] 錯誤訊息包含安裝指引
- [ ] 提供各平台安裝連結

---

#### 測試 12：影片編碼失敗時的錯誤處理

**目的：** 驗證編碼失敗時的錯誤處理

**模擬情境：**
- 磁碟空間不足
- 編碼器缺失
- 檔案權限問題

**預期行為：**
```python
try:
    service.render_segment(...)
except VideoRenderError as e:
    # 錯誤應包含 FFmpeg 的 stderr 輸出
    assert "encoding failed" in str(e).lower()
    # 應記錄完整錯誤日誌
    assert e.ffmpeg_stderr is not None
```

**驗證點：**
- [ ] 拋出 `VideoRenderError`
- [ ] 包含 FFmpeg 錯誤輸出
- [ ] 清理臨時檔案（不留殘留）
- [ ] 錯誤訊息易於理解

---

## 實作規格

### 需要建立/修改的檔案

#### 1. 主服務類別：`backend/app/services/video_render_service.py`

**職責：** 影片渲染服務的核心邏輯

**類別結構：**

```python
from pathlib import Path
from typing import Dict, List, Optional
import subprocess
import json
import logging

from app.core.config import settings
from app.services.ffmpeg_builder import FFmpegCommandBuilder
from app.models.project import Project
from app.exceptions import VideoRenderError, FFmpegNotFoundError

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

    def _check_ffmpeg(self) -> None:
        """檢查 FFmpeg 是否安裝"""
        try:
            result = subprocess.run(
                ["ffmpeg", "-version"],
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"FFmpeg version: {result.stdout.splitlines()[0]}")
        except FileNotFoundError:
            raise FFmpegNotFoundError(
                "FFmpeg not found. Please install FFmpeg:\n"
                "  macOS: brew install ffmpeg\n"
                "  Linux: apt install ffmpeg\n"
                "  Windows: Download from https://ffmpeg.org/download.html"
            )

    def render_segment(
        self,
        segment_index: int,
        image_path: str,
        audio_path: str,
        segment_config: Dict,
        global_config: Dict
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
                duration=segment_config["duration"]
            )
        else:
            # 無效果，只 scale
            builder.add_video_filter("scale=1920:1080")

        # Step 3: 添加字幕（如果有）
        if merged_config.get("subtitle") and merged_config["subtitle"].get("enabled"):
            builder.add_subtitle(
                text=segment_config["text"],
                config=merged_config["subtitle"]
            )

        # Step 4: 添加疊加元素（Logo, 文字等）
        for overlay in merged_config.get("overlays", []):
            if overlay.get("enabled", True):
                builder.add_overlay(overlay)

        # Step 5: 設定編碼參數
        builder.set_video_codec("libx264")
        builder.set_audio_codec("aac")
        builder.set_audio_bitrate("192k")
        builder.set_output_resolution("1920x1080")
        builder.set_framerate(30)

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
        output_path: str
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
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list),
            "-c", "copy",  # 直接複製，不重新編碼（快速）
            "-y",  # 覆蓋輸出檔案
            output_path
        ]

        self._execute_ffmpeg(command)

        logger.info(f"Video merged: {output_path}")
        return output_path

    def generate_thumbnail(
        self,
        base_image: str,
        title: str,
        config: Dict,
        output_path: str
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
            builder.add_title_overlay(
                text=title,
                config=config["title_style"]
            )

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

    def _merge_config(self, global_config: Dict, segment_config: Dict) -> Dict:
        """
        合併全局配置與段落配置（段落配置優先）
        """
        merged = global_config.copy()

        # 段落級覆寫
        if "subtitle" in segment_config:
            merged["subtitle"] = {**merged.get("subtitle", {}), **segment_config["subtitle"]}

        if "overlays" in segment_config:
            merged["overlays"] = segment_config["overlays"]

        return merged

    def _execute_ffmpeg(self, command: List[str]) -> None:
        """
        執行 FFmpeg 指令

        Raises:
            VideoRenderError: 執行失敗時拋出
        """
        logger.debug(f"Executing FFmpeg command: {' '.join(command)}")

        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=True
            )

            # FFmpeg 的輸出在 stderr（不是錯誤）
            if result.stderr:
                logger.debug(f"FFmpeg output: {result.stderr[-500:]}")  # 只記錄最後 500 字

        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg command failed: {e.stderr}")
            raise VideoRenderError(
                f"Video rendering failed: {e.stderr[-200:]}",
                ffmpeg_stderr=e.stderr
            )

    def cleanup_temp_files(self) -> None:
        """清理臨時檔案"""
        if self.temp_dir.exists():
            import shutil
            shutil.rmtree(self.temp_dir)
            logger.info(f"Cleaned up temp files: {self.temp_dir}")
```

---

#### 2. FFmpeg 指令生成器：`backend/app/services/ffmpeg_builder.py`

**職責：** 生成複雜的 FFmpeg 指令

**類別結構：**

```python
from typing import List, Dict, Optional
from pathlib import Path


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

    def add_input(self, input_path: str) -> 'FFmpegCommandBuilder':
        """添加輸入檔案"""
        self.inputs.append(input_path)
        return self

    def add_ken_burns_effect(
        self,
        effect_type: str,
        duration: float,
        fps: int = 30
    ) -> 'FFmpegCommandBuilder':
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

    def add_subtitle(
        self,
        text: str,
        config: Dict
    ) -> 'FFmpegCommandBuilder':
        """
        添加字幕

        Args:
            text: 字幕文字
            config: 字幕配置（font_family, font_size, position, border, shadow, etc.）
        """
        # 清理文字（escape 特殊字元）
        text = text.replace("'", "'\\''")  # 處理單引號
        text = text.replace(":", "\\:")    # 處理冒號

        # 基本參數
        font_family = config.get("font_family", "Noto Sans TC")
        font_size = config.get("font_size", 48)
        font_color = config.get("font_color", "#FFFFFF")

        # 位置計算
        position = config.get("position", {})
        x = self._calculate_x_position(position)
        y = self._calculate_y_position(position)

        # 開始構建 drawtext filter
        filter_parts = [
            f"text='{text}'",
            f"fontfile=/path/to/fonts/{font_family}.ttf",  # TODO: 實際字型路徑
            f"fontsize={font_size}",
            f"fontcolor={font_color}",
            f"x={x}",
            f"y={y}"
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
            color = bg.get("color", "#000000")
            padding = bg.get("padding", 10)

            # 轉換 opacity 為 alpha (0-255)
            alpha_hex = f"{int(opacity * 255):02X}"
            filter_parts.append(f"box=1")
            filter_parts.append(f"boxcolor={color}@{opacity}")
            filter_parts.append(f"boxborderw={padding}")

        filter_str = f"drawtext={':'.join(filter_parts)}"
        self.video_filters.append(filter_str)
        return self

    def add_overlay(self, overlay_config: Dict) -> 'FFmpegCommandBuilder':
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
            self.add_subtitle(
                text=overlay_config["text"],
                config=overlay_config
            )

        return self

    def add_title_overlay(self, text: str, config: Dict) -> 'FFmpegCommandBuilder':
        """添加標題文字（用於封面）"""
        return self.add_subtitle(text, config)

    def add_video_filter(self, filter_str: str) -> 'FFmpegCommandBuilder':
        """添加自訂 video filter"""
        self.video_filters.append(filter_str)
        return self

    def set_video_codec(self, codec: str) -> 'FFmpegCommandBuilder':
        """設定影片編碼器"""
        self.options["-c:v"] = codec
        return self

    def set_audio_codec(self, codec: str) -> 'FFmpegCommandBuilder':
        """設定音訊編碼器"""
        self.options["-c:a"] = codec
        return self

    def set_audio_bitrate(self, bitrate: str) -> 'FFmpegCommandBuilder':
        """設定音訊位元率"""
        self.options["-b:a"] = bitrate
        return self

    def set_output_resolution(self, resolution: str) -> 'FFmpegCommandBuilder':
        """設定輸出解析度"""
        self.options["-s"] = resolution
        return self

    def set_framerate(self, fps: int) -> 'FFmpegCommandBuilder':
        """設定幀率"""
        self.options["-r"] = str(fps)
        return self

    def set_shortest_stream(self) -> 'FFmpegCommandBuilder':
        """設定以最短串流為準（用於音訊同步）"""
        self.options["-shortest"] = ""
        return self

    def add_option(self, key: str, value: str) -> 'FFmpegCommandBuilder':
        """添加自訂選項"""
        self.options[key] = value
        return self

    def set_output(self, output_path: str) -> 'FFmpegCommandBuilder':
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

    def _calculate_x_position(self, position: Dict) -> str:
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

    def _calculate_y_position(self, position: Dict) -> str:
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

    def _calculate_overlay_x(self, position: Dict, width: int) -> str:
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

    def _calculate_overlay_y(self, position: Dict, height: int) -> str:
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
```

---

#### 3. 自訂例外：`backend/app/exceptions.py`

**職責：** 定義影片渲染相關的例外

```python
class VideoRenderError(Exception):
    """影片渲染錯誤"""

    def __init__(self, message: str, ffmpeg_stderr: str = None):
        super().__init__(message)
        self.ffmpeg_stderr = ffmpeg_stderr


class FFmpegNotFoundError(Exception):
    """FFmpeg 未安裝錯誤"""
    pass
```

---

#### 4. 測試檔案：`backend/tests/services/test_video_render_service.py`

**職責：** 單元測試

```python
import pytest
from pathlib import Path
from app.services.video_render_service import VideoRenderService
from app.exceptions import FFmpegNotFoundError, VideoRenderError


@pytest.fixture
def sample_project_id():
    return "test-project-001"


@pytest.fixture
def video_service(sample_project_id):
    return VideoRenderService(project_id=sample_project_id)


@pytest.fixture
def sample_assets(tmp_path):
    """生成測試用的假素材"""
    # TODO: 使用 FFmpeg 生成測試用的圖片和音訊
    return {
        "image": str(tmp_path / "test_image.png"),
        "audio": str(tmp_path / "test_audio.mp3")
    }


def test_ffmpeg_exists(video_service):
    """測試 FFmpeg 是否安裝"""
    # 應該不拋出異常
    assert video_service is not None


def test_render_segment_basic(video_service, sample_assets):
    """測試 1：基本片段生成"""
    output = video_service.render_segment(
        segment_index=1,
        image_path=sample_assets["image"],
        audio_path=sample_assets["audio"],
        segment_config={
            "duration": 15.0,
            "text": "測試字幕",
            "ken_burns_effect": None,
            "subtitle": None
        },
        global_config={}
    )

    assert Path(output).exists()
    # TODO: 驗證影片時長、解析度等


def test_render_segment_with_ken_burns(video_service, sample_assets):
    """測試 2：Ken Burns 效果"""
    # TODO: 實作測試


def test_render_segment_with_subtitle(video_service, sample_assets):
    """測試 3：字幕燒錄"""
    # TODO: 實作測試


# ... 更多測試
```

---

#### 5. 配置檔案更新：`backend/app/core/config.py`

**新增配置項目：**

```python
class Settings(BaseSettings):
    # ... 現有配置

    # FFmpeg 配置
    FFMPEG_PATH: str = "ffmpeg"  # FFmpeg 執行檔路徑（預設使用 PATH）
    FONT_DIR: str = "/usr/share/fonts"  # 字型目錄（依平台不同）

    # 影片渲染配置
    VIDEO_RESOLUTION: str = "1920x1080"
    VIDEO_FPS: int = 30
    VIDEO_CODEC: str = "libx264"
    AUDIO_CODEC: str = "aac"
    AUDIO_BITRATE: str = "192k"

    # 專案目錄
    PROJECTS_DIR: str = "./projects"
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（30 分鐘）

1. **安裝 FFmpeg：**
   ```bash
   # macOS
   brew install ffmpeg

   # Linux
   sudo apt install ffmpeg

   # Windows
   # 下載並安裝：https://ffmpeg.org/download.html
   ```

2. **驗證安裝：**
   ```bash
   ffmpeg -version
   ```

3. **安裝字型（用於中文字幕）：**
   ```bash
   # macOS/Linux
   # 下載 Noto Sans TC：
   # https://fonts.google.com/noto/specimen/Noto+Sans+TC
   ```

4. **閱讀規格：**
   - `tech-specs/backend/business-logic.md#3.3-影片渲染邏輯`
   - FFmpeg 文檔：https://ffmpeg.org/ffmpeg-filters.html

---

#### 第 2 步：撰寫第一個測試（30 分鐘）

1. 建立 `tests/services/test_video_render_service.py`
2. 撰寫「測試 1：基本影片片段生成」
3. 準備測試素材（小尺寸圖片、短音訊）
4. 執行測試 → 失敗（預期）

---

#### 第 3 步：實作 FFmpegCommandBuilder（2 小時）

1. 建立 `app/services/ffmpeg_builder.py`
2. 實作基本的指令生成邏輯
3. 實作 `add_input()`, `set_video_codec()`, `build()` 方法
4. 撰寫 builder 的單元測試
5. 測試通過 ✅

---

#### 第 4 步：實作基本片段生成（2 小時）

1. 建立 `app/services/video_render_service.py`
2. 實作 `__init__()` 和 `_check_ffmpeg()`
3. 實作 `render_segment()` 基本功能（無效果、無字幕）
4. 實作 `_execute_ffmpeg()`
5. 執行測試 1 → 通過 ✅

---

#### 第 5 步：實作 Ken Burns 效果（2 小時）

1. 在 `FFmpegCommandBuilder` 中實作 `add_ken_burns_effect()`
2. 支援 4 種運鏡模式：zoom_in, zoom_out, pan_left, pan_right
3. 撰寫「測試 2：Ken Burns 效果」
4. 執行測試 2 → 通過 ✅

---

#### 第 6 步：實作字幕燒錄（3 小時）

1. 在 `FFmpegCommandBuilder` 中實作 `add_subtitle()`
2. 支援字型、顏色、大小、位置
3. 支援邊框、陰影、背景框
4. 處理中文字型路徑（跨平台）
5. 撰寫「測試 3：字幕燒錄」
6. 執行測試 3 → 通過 ✅

---

#### 第 7 步：實作疊加元素（2 小時）

1. 在 `FFmpegCommandBuilder` 中實作 `add_overlay()`
2. 支援圖片疊加（Logo）
3. 支援位置、大小、不透明度
4. 撰寫「測試 4：疊加 Logo」
5. 執行測試 4 → 通過 ✅

---

#### 第 8 步：實作影片合併（1.5 小時）

1. 在 `VideoRenderService` 中實作 `merge_video()`
2. 使用 FFmpeg concat demuxer
3. 撰寫「測試 5：完整影片合併」
4. 執行測試 5 → 通過 ✅

---

#### 第 9 步：實作封面生成（1.5 小時）

1. 在 `VideoRenderService` 中實作 `generate_thumbnail()`
2. 在 `FFmpegCommandBuilder` 中實作 `add_title_overlay()`
3. 撰寫「測試 6：封面生成」
4. 執行測試 6 → 通過 ✅

---

#### 第 10 步：整合測試（2 小時）

1. 準備完整測試素材（15 張圖片、音訊檔、虛擬主播影片）
2. 撰寫「測試 7：完整端到端流程」
3. 執行完整流程測試
4. 驗證最終影片品質
5. 測試通過 ✅

---

#### 第 11 步：跨平台測試（2 小時）

1. 在 macOS 上執行所有測試
2. 在 Linux 上執行所有測試（使用 Docker 或 VM）
3. 在 Windows 上執行所有測試（使用 VM）
4. 修正平台相關問題：
   - 路徑格式（Windows 使用 `\`）
   - 字型路徑差異
   - FFmpeg 執行檔名稱（`.exe`）
5. 所有平台測試通過 ✅

---

#### 第 12 步：錯誤處理與邊界測試（1.5 小時）

1. 撰寫「測試 11：FFmpeg 不存在」
2. 撰寫「測試 12：編碼失敗」
3. 實作錯誤處理邏輯
4. 實作臨時檔案清理
5. 所有錯誤處理測試通過 ✅

---

#### 第 13 步：效能優化（1 小時）

1. 測量渲染時間（5 分鐘影片應 < 10 分鐘）
2. 優化 FFmpeg 參數（preset, crf）
3. 考慮並行渲染（多個 segment 同時處理）
4. 記錄效能指標

---

#### 第 14 步：文件與檢查（1 小時）

1. 為所有方法添加 docstring
2. 更新 README（FFmpeg 安裝指引）
3. 檢查測試覆蓋率：`pytest --cov`
4. 執行 linter：`ruff check .`
5. 格式化程式碼：`ruff format .`

---

### 注意事項

#### 安全性

- ⚠️ **命令注入風險：** 確保所有使用者輸入（文字、路徑）都經過清理
- ⚠️ **路徑注入：** 驗證所有檔案路徑都在專案目錄內
- ⚠️ **資源限制：** 限制影片時長和檔案大小，避免消耗過多資源

#### 效能

- 💡 使用 `-c copy` 合併影片時不重新編碼（快速）
- 💡 考慮使用 FFmpeg preset（`-preset fast` 或 `medium`）
- 💡 並行處理多個 segment（使用 asyncio 或 multiprocessing）
- 💡 臨時檔案使用 SSD（如果可能）

#### 跨平台

- 🔧 Windows 路徑使用 `Path` 而非字串拼接
- 🔧 字型路徑需要依平台動態偵測
- 🔧 FFmpeg 執行檔在 Windows 是 `ffmpeg.exe`
- 🔧 測試所有平台的字型渲染（中文）

#### 測試

- ✅ 使用小尺寸素材加速測試（640x360, 5 秒音訊）
- ✅ Mock FFmpeg 輸出用於快速單元測試
- ✅ 整合測試使用真實 FFmpeg
- ✅ 保留測試產生的影片用於人工檢查

#### 與其他模組整合

- 🔗 Task-014（Celery 任務）會呼叫 `VideoRenderService`
- 🔗 Task-011（圖片生成）提供圖片素材
- 🔗 Task-012（虛擬主播）提供開場/結尾影片
- 🔗 Task-022（前端配置頁面）提供配置 JSON

---

### 完成檢查清單

#### 功能完整性
- [ ] VideoRenderService 完整實作
- [ ] FFmpegCommandBuilder 完整實作
- [ ] 基本片段生成功能（圖片 + 音訊）
- [ ] Ken Burns 效果（4 種運鏡模式）
- [ ] 字幕燒錄（所有樣式選項）
- [ ] 疊加元素（Logo, 文字, 形狀）
- [ ] 影片合併（開場 + 段落 + 結尾）
- [ ] 封面生成（符合 YouTube 規範）
- [ ] 音訊同步驗證

#### 測試
- [ ] 測試 1-6（單元測試）全部通過
- [ ] 測試 7（整合測試）通過
- [ ] 測試 8-10（跨平台測試）通過
- [ ] 測試 11-12（錯誤處理）通過
- [ ] 測試覆蓋率 > 85%

#### 跨平台相容性
- [ ] macOS 測試通過
- [ ] Linux 測試通過
- [ ] Windows 測試通過
- [ ] 中文字幕在所有平台正確渲染
- [ ] 路徑處理在所有平台正確

#### 程式碼品質
- [ ] Ruff check 無錯誤：`ruff check .`
- [ ] 程式碼已格式化：`ruff format .`
- [ ] 所有方法都有 docstring
- [ ] 無 TODO 註解未處理
- [ ] 無除錯用的 print 語句

#### 效能
- [ ] 5 分鐘影片渲染時間 < 10 分鐘
- [ ] 記憶體使用合理（< 2GB）
- [ ] 臨時檔案正確清理
- [ ] 無記憶體洩漏

#### 文件
- [ ] README 包含 FFmpeg 安裝指引
- [ ] 所有函數都有完整 docstring
- [ ] 配置範例文件完整
- [ ] API 文檔已生成（如有）

#### 整合
- [ ] 可被 Celery 任務正確呼叫
- [ ] 可處理 Task-011 生成的圖片
- [ ] 可處理 Task-012 生成的虛擬主播影片
- [ ] 配置 JSON 格式與前端一致

#### Spec 同步
- [ ] 如果實作與 spec 有差異，已更新 `tech-specs/backend/business-logic.md`
- [ ] 如果有新的配置選項，已更新 spec

---

## 預估時間分配

- **環境準備：** 30 分鐘
- **測試撰寫：** 2 小時
- **FFmpegCommandBuilder 實作：** 2 小時
- **基本片段生成：** 2 小時
- **Ken Burns 效果：** 2 小時
- **字幕燒錄：** 3 小時
- **疊加元素：** 2 小時
- **影片合併：** 1.5 小時
- **封面生成：** 1.5 小時
- **整合測試：** 2 小時
- **跨平台測試：** 2 小時
- **錯誤處理：** 1.5 小時
- **效能優化：** 1 小時
- **文件與檢查：** 1 小時

**總計：約 23 小時**（預留 buffer，原估 16 小時可能不足）

---

## 參考資源

### FFmpeg 官方文檔
- [FFmpeg Filters Documentation](https://ffmpeg.org/ffmpeg-filters.html)
- [zoompan filter](https://ffmpeg.org/ffmpeg-filters.html#zoompan)
- [drawtext filter](https://ffmpeg.org/ffmpeg-filters.html#drawtext-1)
- [overlay filter](https://ffmpeg.org/ffmpeg-filters.html#overlay-1)
- [concat demuxer](https://ffmpeg.org/ffmpeg-formats.html#concat-1)

### 教學與範例
- [FFmpeg Ken Burns Effect Tutorial](https://trac.ffmpeg.org/wiki/Slideshow)
- [FFmpeg Subtitle Burning](https://trac.ffmpeg.org/wiki/HowToBurnSubtitlesIntoVideo)
- [FFmpeg Watermark/Logo Overlay](https://ottverse.com/ffmpeg-watermark-logo-png-image-overlay/)

### 相關套件文檔
- [Python subprocess](https://docs.python.org/3/library/subprocess.html)
- [Pathlib](https://docs.python.org/3/library/pathlib.html)

### 專案內部文件
- `tech-specs/backend/business-logic.md#3.3-影片渲染邏輯`
- `tech-specs/backend/business-logic.md#3.4-封面生成邏輯`
- `product-design/overview.md#核心功能-5-動態視覺效果`
- `product-design/overview.md#核心功能-6-字幕系統`

### 字型資源
- [Noto Sans TC (Google Fonts)](https://fonts.google.com/noto/specimen/Noto+Sans+TC)
- [思源黑體 (Source Han Sans)](https://github.com/adobe-fonts/source-han-sans)

---

**準備好了嗎？** 這是一個關鍵任務，讓我們使用 TDD 方式逐步實作！🎬🚀
