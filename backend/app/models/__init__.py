"""
Database models.
"""
from app.models.asset import Asset, AssetStatus, AssetType
from app.models.base import Base, TimestampMixin, generate_uuid
from app.models.batch_task import BatchTask, BatchTaskStatus
from app.models.configuration import Configuration
from app.models.project import Project, ProjectStatus
from app.models.prompt_template import PromptTemplate
from app.models.system_settings import SystemSettings
from app.models.youtube_account import YouTubeAccount

__all__ = [
    # Base
    "Base",
    "TimestampMixin",
    "generate_uuid",
    # Models
    "Project",
    "ProjectStatus",
    "Asset",
    "AssetType",
    "AssetStatus",
    "Configuration",
    "PromptTemplate",
    "YouTubeAccount",
    "BatchTask",
    "BatchTaskStatus",
    "SystemSettings",
]
