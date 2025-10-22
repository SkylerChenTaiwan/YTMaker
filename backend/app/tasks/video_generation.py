"""影片生成相關的 Celery 任務"""

import logging

from celery import Task

from app.celery_app import celery_app
from app.core.database import get_db
from app.models.project import Project, ProjectStatus
from app.tasks.progress import ProgressStage, publish_progress
from app.tasks.state_manager import StateManager

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """基礎任務類別，提供通用的回調和錯誤處理"""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """任務失敗時的回調"""
        project_id = args[0] if args else kwargs.get("project_id")
        if project_id:
            # 更新專案狀態為 FAILED
            db = next(get_db())
            project = db.query(Project).get(project_id)
            if project:
                project.status = ProjectStatus.FAILED
                # 儲存錯誤資訊
                if not project.error_info:
                    project.error_info = {}
                project.error_info["last_error"] = str(exc)
                project.error_info["task_id"] = task_id
                db.commit()

            # 發布錯誤到 Redis
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"任務失敗: {str(exc)}",
                error=str(exc),
            )

        logger.error(f"Task {task_id} failed: {exc}", exc_info=einfo)


@celery_app.task(
    bind=True,
    base=CallbackTask,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def generate_script_task(self, project_id: int) -> dict:
    """
    任務 1: 生成腳本

    Args:
        project_id: 專案 ID

    Returns:
        dict: 包含 script 的字典

    Raises:
        Exception: 腳本生成失敗
    """
    logger.info(f"Starting script generation for project {project_id}")

    # 初始化狀態管理器
    state_mgr = StateManager(project_id)

    try:
        # 發布開始進度
        publish_progress(
            project_id=project_id,
            stage=ProgressStage.SCRIPT_GENERATION,
            progress=0,
            message="開始生成腳本...",
        )

        # 更新專案狀態
        db = next(get_db())
        project = db.query(Project).get(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        project.status = ProjectStatus.SCRIPT_GENERATING
        db.commit()

        # 調用腳本生成服務
        from app.services.script_service import ScriptService

        script_service = ScriptService(db)

        publish_progress(
            project_id, ProgressStage.SCRIPT_GENERATION, 30, "調用 Gemini API..."
        )

        script = script_service.generate_script(project_id)

        # 驗證腳本
        script_service.validate_script(script)

        publish_progress(
            project_id, ProgressStage.SCRIPT_GENERATION, 80, "儲存腳本..."
        )

        # 儲存腳本到資料庫
        project.script = script
        project.status = ProjectStatus.SCRIPT_GENERATED
        db.commit()

        # 儲存狀態
        state_mgr.save_state({"stage": "script_generated", "script": script})

        publish_progress(
            project_id, ProgressStage.SCRIPT_GENERATION, 100, "腳本生成完成"
        )

        logger.info(f"Script generation completed for project {project_id}")

        return {"status": "success", "project_id": project_id, "script": script}

    except Exception as e:
        logger.error(f"Script generation failed for project {project_id}: {str(e)}")

        # 重試邏輯
        if self.request.retries < self.max_retries:
            logger.info(
                f"Retrying script generation (attempt {self.request.retries + 1}/{self.max_retries})"
            )
            raise self.retry(exc=e, countdown=2**self.request.retries) from e
        else:
            # 最終失敗
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"腳本生成失敗: {str(e)}",
                error=str(e),
            )
            raise


@celery_app.task(bind=True, base=CallbackTask, max_retries=3)
def generate_assets_task(self, project_id: int) -> dict:
    """
    任務 2: 生成素材（語音、圖片、虛擬主播）

    使用 asyncio 並行處理素材生成以提升效率

    Args:
        project_id: 專案 ID

    Returns:
        dict: 包含所有素材路徑的字典
    """
    logger.info(f"Starting asset generation for project {project_id}")

    state_mgr = StateManager(project_id)

    try:
        publish_progress(
            project_id=project_id,
            stage=ProgressStage.ASSET_GENERATION,
            progress=0,
            message="開始生成素材...",
        )

        # 更新專案狀態
        db = next(get_db())
        project = db.query(Project).get(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        project.status = ProjectStatus.ASSETS_GENERATING
        db.commit()

        # 調用素材生成服務（內部使用 asyncio 並行處理）
        from app.services.avatar_service import AvatarService
        from app.services.image_service import ImageGenerationService

        # 進度回調
        def progress_callback(progress, msg):
            publish_progress(
                project_id, ProgressStage.ASSET_GENERATION, progress, msg
            )

        # 生成圖片
        image_service = ImageGenerationService(db)
        images = image_service.generate_all_images(project_id, progress_callback)

        # 生成虛擬主播 (開場和結尾)
        avatar_service = AvatarService(db)
        avatars = avatar_service.generate_avatars(project_id, progress_callback)

        assets = {"images": images, "avatars": avatars}

        # 更新專案狀態
        project.status = ProjectStatus.ASSETS_GENERATED
        db.commit()

        # 儲存狀態
        state_mgr.save_state({"stage": "assets_generated", "assets": assets})

        publish_progress(
            project_id, ProgressStage.ASSET_GENERATION, 100, "素材生成完成"
        )

        logger.info(f"Asset generation completed for project {project_id}")

        return {"status": "success", "project_id": project_id, "assets": assets}

    except Exception as e:
        logger.error(f"Asset generation failed for project {project_id}: {str(e)}")

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=2**self.request.retries) from e
        else:
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"素材生成失敗: {str(e)}",
                error=str(e),
            )
            raise


@celery_app.task(bind=True, base=CallbackTask, max_retries=2)
def render_video_task(self, project_id: int) -> dict:
    """
    任務 3: 渲染影片

    使用 FFmpeg 合成所有素材為最終影片

    Args:
        project_id: 專案 ID

    Returns:
        dict: 包含影片路徑和資訊的字典
    """
    logger.info(f"Starting video rendering for project {project_id}")

    state_mgr = StateManager(project_id)

    try:
        publish_progress(
            project_id=project_id,
            stage=ProgressStage.VIDEO_RENDERING,
            progress=0,
            message="開始渲染影片...",
        )

        # 更新專案狀態
        db = next(get_db())
        project = db.query(Project).get(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        project.status = ProjectStatus.RENDERING
        db.commit()

        # TODO: 調用影片渲染服務 (Task-015 實作)
        # from app.services.video_service import VideoRenderService
        # render_service = VideoRenderService(db)
        # video_info = render_service.render_video(
        #     project_id=project_id,
        #     progress_callback=lambda progress, msg: publish_progress(
        #         project_id, ProgressStage.VIDEO_RENDERING, progress, msg
        #     )
        # )

        # 暫時模擬渲染結果
        video_info = {
            "video_path": f"data/projects/{project_id}/output/final_video.mp4",
            "duration": 300,
            "resolution": "1920x1080",
        }

        publish_progress(
            project_id, ProgressStage.VIDEO_RENDERING, 50, "正在合成影片..."
        )

        # 更新專案狀態
        project.status = ProjectStatus.RENDERED
        db.commit()

        # 儲存狀態
        state_mgr.save_state({"stage": "video_rendered", "video_info": video_info})

        publish_progress(
            project_id, ProgressStage.VIDEO_RENDERING, 100, "影片渲染完成"
        )

        logger.info(f"Video rendering completed for project {project_id}")

        return {"status": "success", "project_id": project_id, "video_info": video_info}

    except Exception as e:
        logger.error(f"Video rendering failed for project {project_id}: {str(e)}")

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=10) from e  # 渲染失敗等待較久
        else:
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"影片渲染失敗: {str(e)}",
                error=str(e),
            )
            raise


@celery_app.task(bind=True, base=CallbackTask, max_retries=2)
def generate_thumbnail_task(self, project_id: int) -> dict:
    """
    任務 4: 生成封面

    基於第一張圖片生成 YouTube 封面

    Args:
        project_id: 專案 ID

    Returns:
        dict: 包含封面路徑的字典
    """
    logger.info(f"Starting thumbnail generation for project {project_id}")

    state_mgr = StateManager(project_id)

    try:
        publish_progress(
            project_id=project_id,
            stage=ProgressStage.THUMBNAIL_GENERATION,
            progress=0,
            message="開始生成封面...",
        )

        # 更新專案狀態
        db = next(get_db())
        project = db.query(Project).get(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        project.status = ProjectStatus.THUMBNAIL_GENERATING
        db.commit()

        # TODO: 調用封面生成服務
        # from app.services.thumbnail_service import ThumbnailService
        # thumbnail_service = ThumbnailService(db)
        # thumbnail_info = thumbnail_service.generate_thumbnail(project_id)

        # 暫時模擬封面生成
        thumbnail_info = {
            "thumbnail_path": f"data/projects/{project_id}/output/thumbnail.jpg",
            "resolution": "1280x720",
        }

        publish_progress(
            project_id, ProgressStage.THUMBNAIL_GENERATION, 50, "正在處理封面..."
        )

        # 更新專案狀態
        project.status = ProjectStatus.THUMBNAIL_GENERATED
        db.commit()

        # 儲存狀態
        state_mgr.save_state(
            {"stage": "thumbnail_generated", "thumbnail_info": thumbnail_info}
        )

        publish_progress(
            project_id, ProgressStage.THUMBNAIL_GENERATION, 100, "封面生成完成"
        )

        logger.info(f"Thumbnail generation completed for project {project_id}")

        return {
            "status": "success",
            "project_id": project_id,
            "thumbnail_info": thumbnail_info,
        }

    except Exception as e:
        logger.error(f"Thumbnail generation failed for project {project_id}: {str(e)}")

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=5) from e
        else:
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"封面生成失敗: {str(e)}",
                error=str(e),
            )
            raise


@celery_app.task(bind=True, base=CallbackTask, max_retries=3)
def upload_to_youtube_task(self, project_id: int) -> dict:
    """
    任務 5: 上傳到 YouTube

    上傳影片和封面到 YouTube

    Args:
        project_id: 專案 ID

    Returns:
        dict: 包含 YouTube 影片 ID 和 URL 的字典
    """
    logger.info(f"Starting YouTube upload for project {project_id}")

    state_mgr = StateManager(project_id)

    try:
        publish_progress(
            project_id=project_id,
            stage=ProgressStage.YOUTUBE_UPLOAD,
            progress=0,
            message="開始上傳到 YouTube...",
        )

        # 更新專案狀態
        db = next(get_db())
        project = db.query(Project).get(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        project.status = ProjectStatus.UPLOADING
        db.commit()

        # 調用 YouTube 上傳服務
        from app.services.upload_service import YouTubeUploadService

        upload_service = YouTubeUploadService(db)

        upload_result = upload_service.upload_video(
            project_id=project_id,
            progress_callback=lambda progress, msg: publish_progress(
                project_id, ProgressStage.YOUTUBE_UPLOAD, progress, msg
            ),
        )

        # 更新專案
        project.youtube_video_id = upload_result["video_id"]
        project.status = ProjectStatus.COMPLETED
        db.commit()

        # 儲存狀態
        state_mgr.save_state({"stage": "completed", "upload_result": upload_result})

        publish_progress(project_id, ProgressStage.YOUTUBE_UPLOAD, 100, "上傳完成!")

        logger.info(f"YouTube upload completed for project {project_id}")

        return {
            "status": "success",
            "project_id": project_id,
            "video_id": upload_result["video_id"],
            "video_url": upload_result["video_url"],
        }

    except Exception as e:
        logger.error(f"YouTube upload failed for project {project_id}: {str(e)}")

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=2**self.request.retries) from e
        else:
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"YouTube 上傳失敗: {str(e)}",
                error=str(e),
            )
            raise
