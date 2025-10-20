"""Celery tasks module"""

from app.tasks.batch_processing import batch_processing_task
from app.tasks.maintenance import sync_quotas
from app.tasks.progress import ProgressStage, publish_progress, subscribe_progress
from app.tasks.state_manager import StateManager, recover_interrupted_tasks
from app.tasks.video_generation import (
    generate_assets_task,
    generate_script_task,
    generate_thumbnail_task,
    render_video_task,
    upload_to_youtube_task,
)

__all__ = [
    # Video generation tasks
    "generate_script_task",
    "generate_assets_task",
    "render_video_task",
    "generate_thumbnail_task",
    "upload_to_youtube_task",
    # Batch processing
    "batch_processing_task",
    # Maintenance tasks
    "sync_quotas",
    # Progress management
    "ProgressStage",
    "publish_progress",
    "subscribe_progress",
    # State management
    "StateManager",
    "recover_interrupted_tasks",
]
