"""
Project model - represents a video project.
"""
import enum
from typing import Optional

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class ProjectStatus(str, enum.Enum):
    """Project status enum."""

    INITIALIZED = "INITIALIZED"
    SCRIPT_GENERATING = "SCRIPT_GENERATING"
    SCRIPT_GENERATED = "SCRIPT_GENERATED"
    ASSETS_GENERATING = "ASSETS_GENERATING"
    ASSETS_GENERATED = "ASSETS_GENERATED"
    RENDERING = "RENDERING"
    RENDERED = "RENDERED"
    THUMBNAIL_GENERATING = "THUMBNAIL_GENERATING"
    THUMBNAIL_GENERATED = "THUMBNAIL_GENERATED"
    UPLOADING = "UPLOADING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PAUSED = "PAUSED"


class Project(Base, TimestampMixin):
    """Project model."""

    __tablename__ = "projects"

    # Primary Key
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)

    # Basic Info
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(
        SQLEnum(ProjectStatus),
        nullable=False,
        default=ProjectStatus.INITIALIZED,
        index=True,
    )

    # Configuration
    configuration: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    configuration_id: Mapped[Optional[str]] = mapped_column(
        String,
        ForeignKey("configurations.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Prompt & Model
    prompt_template_id: Mapped[Optional[str]] = mapped_column(
        String,
        ForeignKey("prompt_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    gemini_model: Mapped[str] = mapped_column(String(50), nullable=False)

    # YouTube Settings
    youtube_settings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    youtube_video_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Generated Content
    script: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Error Info
    error_info: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Batch Task Relationship
    batch_task_id: Mapped[Optional[str]] = mapped_column(
        String,
        ForeignKey("batch_tasks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")
    configuration_rel = relationship("Configuration")
    prompt_template = relationship("PromptTemplate", back_populates="projects")
    batch_task = relationship("BatchTask", back_populates="projects")

    # Indexes (defined in Alembic migration)
    # - idx_status on status
    # - idx_created_at on created_at
    # - idx_updated_at on updated_at

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name={self.name}, status={self.status})>"
