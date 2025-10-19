# 背景任務 (Celery)

> **關聯文件:** [service-video-generation.md](./service-video-generation.md), [integrations.md](./integrations.md)

---

## 1. 任務佇列架構

### Celery 配置

**訊息代理:** Redis

**結果後端:** Redis

**並發模式:** Prefork (多進程)

---

## 2. 任務定義

### 2.1 腳本生成任務

```python
# app/tasks/script_tasks.py
from app.core.celery_app import celery_app
from app.services.gemini_service import GeminiService

@celery_app.task(bind=True, max_retries=3)
def generate_script(self, project_id: str):
    """生成腳本任務

    Args:
        project_id: 專案 ID

    Returns:
        Script ID
    """
    try:
        # 取得專案
        project = db.query(Project).filter(Project.id == project_id).first()

        # 更新狀態
        project.status = "script_generating"
        db.commit()

        # 調用 Gemini API 生成腳本
        gemini_service = GeminiService()
        script_data = gemini_service.generate_script(
            content=project.content,
            prompt_template_id=project.prompt_template_id
        )

        # 儲存腳本
        script = Script(
            project_id=project_id,
            script_data=script_data
        )
        db.add(script)
        db.commit()

        # 更新進度
        ProgressManager.update_progress(project_id, "script_generating", 100)

        return script.id

    except Exception as exc:
        # 重試
        raise self.retry(exc=exc, countdown=60)
```

---

### 2.2 素材生成任務

#### 語音合成

```python
# app/tasks/asset_tasks.py
@celery_app.task(bind=True, max_retries=3)
def generate_audio(self, project_id: str):
    """生成語音任務"""
    try:
        # 取得腳本
        script = get_script_by_project_id(project_id)

        # 使用 Google TTS 生成語音
        tts_service = TTSService()
        audio_path = tts_service.generate_audio(script.script_data)

        # 儲存素材記錄
        asset = Asset(
            project_id=project_id,
            asset_type="audio",
            file_path=audio_path
        )
        db.add(asset)
        db.commit()

        # 更新進度
        ProgressManager.update_progress(project_id, "audio_generating", 100)

    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
```

#### 圖片生成 (批次)

```python
@celery_app.task(bind=True, max_retries=3)
def generate_images(self, project_id: str):
    """批次生成圖片任務"""
    try:
        script = get_script_by_project_id(project_id)

        # 提取圖片 prompts
        image_prompts = extract_image_prompts(script.script_data)

        stability_service = StabilityAIService()

        # 批次生成圖片 (並行)
        for i, prompt in enumerate(image_prompts):
            # 生成單張圖片
            image_path = stability_service.generate_image(prompt)

            # 儲存素材
            asset = Asset(
                project_id=project_id,
                asset_type="image",
                file_path=image_path
            )
            db.add(asset)

            # 更新進度
            progress = int((i + 1) / len(image_prompts) * 100)
            ProgressManager.update_progress(project_id, "images_generating", progress)

        db.commit()

    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
```

---

### 2.3 影片渲染任務

```python
# app/tasks/render_tasks.py
@celery_app.task(bind=True, max_retries=2, time_limit=3600)
def render_video(self, project_id: str):
    """渲染影片任務

    Args:
        project_id: 專案 ID

    Returns:
        Video file path
    """
    try:
        # 更新狀態
        update_project_status(project_id, "rendering")

        # 取得所有素材
        assets = get_project_assets(project_id)

        # 使用 FFmpeg 渲染影片
        render_service = VideoRenderService()
        video_path = render_service.render(
            audio_path=assets['audio'],
            images=assets['images'],
            script=get_script_by_project_id(project_id),
            config=get_visual_config(project_id)
        )

        # 儲存素材
        asset = Asset(
            project_id=project_id,
            asset_type="video",
            file_path=video_path
        )
        db.add(asset)
        db.commit()

        # 更新進度
        ProgressManager.update_progress(project_id, "rendering", 100)

        return video_path

    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)
```

---

### 2.4 YouTube 上傳任務

```python
# app/tasks/upload_tasks.py
@celery_app.task(bind=True, max_retries=3)
def upload_to_youtube(self, project_id: str):
    """上傳到 YouTube 任務"""
    try:
        # 更新狀態
        update_project_status(project_id, "uploading")

        # 取得影片檔案
        video = get_video_asset(project_id)

        # 取得 YouTube 設定
        project = get_project(project_id)
        youtube_settings = project.youtube_settings

        # 上傳到 YouTube
        youtube_service = YouTubeService()
        video_id = youtube_service.upload_video(
            video_path=video.file_path,
            title=youtube_settings['title'],
            description=youtube_settings['description'],
            tags=youtube_settings['tags'],
            privacy=youtube_settings['privacy']
        )

        # 更新專案
        project.youtube_video_id = video_id
        project.status = "completed"
        project.progress = 100
        db.commit()

        # 更新進度
        ProgressManager.update_progress(project_id, "uploading", 100)

        return video_id

    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)
```

---

## 3. 任務監控

### 使用 Flower

**啟動 Flower:**
```bash
celery -A app.core.celery_app flower --port=5555
```

**訪問:** `http://localhost:5555`

**功能:**
- 查看任務狀態
- 查看 Worker 狀態
- 重試失敗任務
- 終止任務

---

## 4. 錯誤處理與重試

### 重試策略

```python
@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # 60 秒後重試
    autoretry_for=(Exception,),
    retry_backoff=True,  # 指數退避
    retry_backoff_max=600,  # 最大 10 分鐘
    retry_jitter=True  # 加入隨機延遲
)
def generate_image_with_retry(self, prompt: str):
    ...
```

---

## 總結

### 任務列表
- `generate_script` - 腳本生成
- `generate_audio` - 語音合成
- `generate_images` - 圖片生成 (批次)
- `generate_avatars` - 虛擬主播生成
- `render_video` - 影片渲染
- `upload_to_youtube` - YouTube 上傳

### 特性
- ✅ 非同步任務處理
- ✅ 自動重試機制
- ✅ 並行處理加速
- ✅ Flower 監控界面

---

**下一步:** 詳見 [integrations.md](./integrations.md)
