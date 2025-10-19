# Task-010: Celery 背景任務系統

> **建立日期:** 2025-01-19
> **狀態:** ⏳ 未開始
> **預計時間:** 10 小時
> **優先級:** P0

---

## 關聯文件

- **技術規格:** `tech-specs/backend/background-jobs.md`
- **服務邏輯:** `tech-specs/backend/service-video-generation.md`
- **產品設計:** `product-design/flows.md#Flow-1`

### 相關任務
- **前置任務:** Task-006, 007, 008, 009 ✅
- **後續任務:** Task-011 (影片渲染會使用此任務系統)
- **後續任務:** Task-012 (WebSocket 進度推送會使用此任務進度)

---

## 任務目標

建立 Celery 背景任務系統，實作 6 個核心任務，定義任務鏈、進度管理、錯誤處理與重試機制。

---

## 實作規格

### Celery 配置

**檔案:** `app/celery_app.py`

```python
from celery import Celery
from app.config import settings

celery_app = Celery(
    "ytmaker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.script_tasks",
        "app.tasks.asset_tasks",
        "app.tasks.render_tasks",
        "app.tasks.upload_tasks"
    ]
)

# Celery 配置
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 分鐘
    task_soft_time_limit=25 * 60,  # 25 分鐘
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50
)

# 任務路由
celery_app.conf.task_routes = {
    "app.tasks.script_tasks.*": {"queue": "scripts"},
    "app.tasks.asset_tasks.*": {"queue": "assets"},
    "app.tasks.render_tasks.*": {"queue": "render"},
    "app.tasks.upload_tasks.*": {"queue": "upload"}
}
```

---

### Task 1: 腳本生成

**檔案:** `app/tasks/script_tasks.py`

```python
from app.celery_app import celery_app
from app.integrations.gemini_client import GeminiClient
from app.models.project import Project
from app.models.script import Script
from app.database import SessionLocal
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def generate_script(self, project_id: str):
    """
    生成影片腳本

    Args:
        project_id: 專案 ID

    Returns:
        script_id: 腳本 ID
    """
    db = SessionLocal()

    try:
        # 取得專案
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project {project_id} not found")

        # 更新狀態
        project.status = "script_generating"
        db.commit()

        # 更新進度 (0%)
        self.update_state(state="PROGRESS", meta={"progress": 0})

        # 呼叫 Gemini API
        client = GeminiClient()

        # 取得 Prompt 範本
        from app.services.prompt_service import PromptService
        prompt_template = PromptService.get_template(project.prompt_template_id, db)

        # 更新進度 (30%)
        self.update_state(state="PROGRESS", meta={"progress": 30})

        # 生成腳本
        script_data = client.generate_script(
            content=project.content,
            prompt_template=prompt_template,
            model_name=project.gemini_model
        )

        # 更新進度 (80%)
        self.update_state(state="PROGRESS", meta={"progress": 80})

        # 儲存腳本
        script = Script(
            id=str(uuid.uuid4()),
            project_id=project_id,
            script_data=script_data,
            created_at=datetime.utcnow()
        )
        db.add(script)

        # 更新專案
        project.script_id = script.id
        project.updated_at = datetime.utcnow()
        db.commit()

        # 更新進度 (100%)
        self.update_state(state="PROGRESS", meta={"progress": 100})

        logger.info(f"Generated script for project {project_id}")

        return script.id

    except Exception as e:
        logger.error(f"Failed to generate script: {e}")
        project.status = "failed"
        db.commit()
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()
```

---

### Task 2: 素材生成（並行任務組）

**檔案:** `app/tasks/asset_tasks.py`

```python
from app.celery_app import celery_app
from app.integrations.stability_client import StabilityAIClient
from app.integrations.did_client import DIDClient
from app.models.project import Project
from app.database import SessionLocal
from celery import group
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def generate_images(self, project_id: str):
    """
    生成所有圖片素材（批次並行）

    Args:
        project_id: 專案 ID

    Returns:
        image_asset_ids: 圖片素材 ID 列表
    """
    db = SessionLocal()

    try:
        # 取得專案和腳本
        project = db.query(Project).filter(Project.id == project_id).first()
        script = project.script

        # 提取圖片描述
        prompts = [
            segment.get("image_description")
            for segment in script.script_data.get("segments", [])
            if "image_description" in segment
        ]

        logger.info(f"Generating {len(prompts)} images for project {project_id}")

        # 批次生成
        from app.services.image_service import ImageService
        image_service = ImageService(db)

        assets = await image_service.generate_images_for_script(
            project_id=project_id,
            script_data=script.script_data
        )

        asset_ids = [asset.id for asset in assets if asset]

        logger.info(f"Generated {len(asset_ids)} images")

        return asset_ids

    except Exception as e:
        logger.error(f"Failed to generate images: {e}")
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def generate_audio(self, project_id: str):
    """
    生成語音檔案

    Args:
        project_id: 專案 ID

    Returns:
        audio_asset_ids: 語音素材 ID 列表
    """
    db = SessionLocal()

    try:
        # TODO: 整合 TTS API (例如 Google Cloud Text-to-Speech)
        logger.info(f"Generating audio for project {project_id}")

        # 暫時返回空列表
        return []

    except Exception as e:
        logger.error(f"Failed to generate audio: {e}")
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def generate_avatars(self, project_id: str):
    """
    生成虛擬主播影片

    Args:
        project_id: 專案 ID

    Returns:
        avatar_asset_ids: 虛擬主播素材 ID 列表
    """
    db = SessionLocal()

    try:
        logger.info(f"Generating avatars for project {project_id}")

        # TODO: 整合 D-ID API
        # from app.services.avatar_service import AvatarService
        # avatar_service = AvatarService(db)
        # assets = await avatar_service.generate_avatars_batch(...)

        return []

    except Exception as e:
        logger.error(f"Failed to generate avatars: {e}")
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()


@celery_app.task
def generate_all_assets(project_id: str):
    """
    並行生成所有素材

    Args:
        project_id: 專案 ID

    Returns:
        所有素材 ID
    """
    # 使用 Celery group 並行執行
    job = group(
        generate_images.s(project_id),
        generate_audio.s(project_id),
        generate_avatars.s(project_id)
    )

    result = job.apply_async()
    result.get()  # 等待全部完成

    return result
```

---

### Task 3: 影片渲染

**檔案:** `app/tasks/render_tasks.py`

```python
from app.celery_app import celery_app
from app.models.project import Project
from app.database import SessionLocal
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=2)
def render_video(self, project_id: str):
    """
    渲染影片

    Args:
        project_id: 專案 ID

    Returns:
        video_path: 影片檔案路徑
    """
    db = SessionLocal()

    try:
        logger.info(f"Rendering video for project {project_id}")

        # TODO: 實作 FFmpeg 渲染 (Task-011)
        # from app.services.video_renderer import VideoRenderer
        # renderer = VideoRenderer()
        # video_path = renderer.render_project(project_id)

        video_path = f"/projects/{project_id}/output.mp4"

        # 更新專案
        project = db.query(Project).filter(Project.id == project_id).first()
        project.video_path = video_path
        db.commit()

        return video_path

    except Exception as e:
        logger.error(f"Failed to render video: {e}")
        raise self.retry(exc=e, countdown=120)

    finally:
        db.close()


@celery_app.task(bind=True, max_retries=2)
def generate_thumbnail(self, project_id: str):
    """
    生成縮圖

    Args:
        project_id: 專案 ID

    Returns:
        thumbnail_path: 縮圖路徑
    """
    db = SessionLocal()

    try:
        logger.info(f"Generating thumbnail for project {project_id}")

        # TODO: 實作縮圖生成 (從影片第一幀或使用 Stability AI)

        thumbnail_path = f"/projects/{project_id}/thumbnail.jpg"

        return thumbnail_path

    except Exception as e:
        logger.error(f"Failed to generate thumbnail: {e}")
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()
```

---

### Task 4: YouTube 上傳

**檔案:** `app/tasks/upload_tasks.py`

```python
from app.celery_app import celery_app
from app.services.youtube_service import YouTubeService
from app.models.project import Project
from app.database import SessionLocal
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def upload_to_youtube(self, project_id: str):
    """
    上傳影片到 YouTube

    Args:
        project_id: 專案 ID

    Returns:
        youtube_video_id: YouTube 影片 ID
    """
    db = SessionLocal()

    try:
        logger.info(f"Uploading video to YouTube for project {project_id}")

        # 取得專案
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project {project_id} not found")

        # 更新狀態
        project.status = "uploading"
        db.commit()

        # 上傳
        youtube_service = YouTubeService(db)

        # TODO: 取得 YouTube 憑證（從 Keychain）
        credentials_data = {}  # 暫時

        video_id = youtube_service.upload_project_video(
            project_id=project_id,
            video_path=project.video_path,
            credentials_data=credentials_data
        )

        # 更新狀態
        project.status = "completed"
        project.progress = 100
        db.commit()

        logger.info(f"Upload completed. YouTube ID: {video_id}")

        return video_id

    except Exception as e:
        logger.error(f"Failed to upload to YouTube: {e}")
        project.status = "failed"
        db.commit()
        raise self.retry(exc=e, countdown=300)

    finally:
        db.close()
```

---

### 完整任務鏈定義

**檔案:** `app/services/project_service.py`

```python
from celery import chain, group
from app.tasks.script_tasks import generate_script
from app.tasks.asset_tasks import generate_images, generate_audio, generate_avatars
from app.tasks.render_tasks import render_video, generate_thumbnail
from app.tasks.upload_tasks import upload_to_youtube

class ProjectService:
    @staticmethod
    def start_generation(project_id: str) -> str:
        """
        啟動完整影片生成流程

        任務鏈結構：
        1. generate_script
        2. 並行: [generate_images, generate_audio, generate_avatars]
        3. render_video
        4. generate_thumbnail
        5. upload_to_youtube

        Args:
            project_id: 專案 ID

        Returns:
            task_id: Celery 任務 ID
        """
        workflow = chain(
            # Step 1: 生成腳本
            generate_script.s(project_id),

            # Step 2: 並行生成素材
            group(
                generate_images.s(project_id),
                generate_audio.s(project_id),
                generate_avatars.s(project_id)
            ),

            # Step 3: 渲染影片
            render_video.s(project_id),

            # Step 4: 生成縮圖
            generate_thumbnail.s(project_id),

            # Step 5: 上傳 YouTube
            upload_to_youtube.s(project_id)
        )

        result = workflow.apply_async()

        return result.id
```

---

## 完成檢查清單

- [ ] Celery 配置完成
- [ ] 6 個核心任務實作完成
- [ ] 任務鏈定義完成
- [ ] 進度更新機制實作
- [ ] 錯誤處理與重試實作
- [ ] 任務路由配置
- [ ] 測試通過

---

## 時間分配

- **Celery 配置:** 2 小時
- **腳本生成任務:** 2 小時
- **素材生成任務:** 3 小時
- **渲染與上傳任務:** 2 小時
- **測試:** 1 小時

**總計:** 10 小時
