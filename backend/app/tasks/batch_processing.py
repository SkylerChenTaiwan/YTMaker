"""批次處理任務"""

import logging

from celery import chain

from app.celery_app import celery_app
from app.db.session import get_db
from app.models.batch_task import BatchStatus, BatchTask
from app.models.project import Project, ProjectStatus
from app.tasks.video_generation import (
    generate_assets_task,
    generate_script_task,
    generate_thumbnail_task,
    render_video_task,
    upload_to_youtube_task,
)

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def batch_processing_task(self, batch_id: int) -> dict:
    """
    任務 6: 批次處理

    依序處理批次中的所有專案

    Args:
        batch_id: 批次任務 ID

    Returns:
        dict: 批次處理結果
    """
    logger.info(f"Starting batch processing for batch {batch_id}")

    db = next(get_db())
    batch = db.query(BatchTask).get(batch_id)

    if not batch:
        raise ValueError(f"Batch task {batch_id} not found")

    # 更新批次狀態
    batch.status = BatchStatus.PROCESSING
    db.commit()

    # 取得批次中的所有專案
    projects = db.query(Project).filter(Project.batch_id == batch_id).all()

    results = []
    completed_count = 0
    failed_count = 0

    for project in projects:
        try:
            logger.info(f"Processing project {project.id} in batch {batch_id}")

            # 建立任務鏈
            video_chain = chain(
                generate_script_task.s(project.id),
                generate_assets_task.s(),
                render_video_task.s(),
                generate_thumbnail_task.s(),
                upload_to_youtube_task.s(),
            )

            # 執行任務鏈
            result = video_chain.apply_async()
            final_result = result.get(timeout=1800)  # 最多 30 分鐘

            completed_count += 1
            results.append(
                {
                    "project_id": project.id,
                    "status": "COMPLETED",
                    "video_id": final_result.get("video_id"),
                }
            )

            logger.info(f"Project {project.id} completed successfully")

        except Exception as e:
            failed_count += 1
            results.append(
                {"project_id": project.id, "status": "FAILED", "error": str(e)}
            )

            logger.error(f"Project {project.id} failed: {str(e)}")

            # 更新專案狀態
            project.status = ProjectStatus.FAILED
            db.commit()

        # 更新批次進度
        batch.completed_projects = completed_count
        batch.failed_projects = failed_count
        db.commit()

    # 更新批次狀態
    batch.status = BatchStatus.COMPLETED
    db.commit()

    logger.info(
        f"Batch processing completed for batch {batch_id}: {completed_count} completed, {failed_count} failed"
    )

    return {
        "status": "success",
        "batch_id": batch_id,
        "total_projects": len(projects),
        "completed": completed_count,
        "failed": failed_count,
        "results": results,
    }
