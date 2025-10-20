"""
Asset model - represents a media asset (audio, image, avatar, thumbnail, video).
"""
import enum
from typing import Optional, Dict, Any

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class AssetType(str, enum.Enum):
    """Asset type enum."""

    AUDIO = "AUDIO"
    IMAGE = "IMAGE"
    AVATAR_INTRO = "AVATAR_INTRO"
    AVATAR_OUTRO = "AVATAR_OUTRO"
    THUMBNAIL = "THUMBNAIL"
    FINAL_VIDEO = "FINAL_VIDEO"


class AssetStatus(str, enum.Enum):
    """Asset status enum."""

    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Asset(Base, TimestampMixin):
    """Asset model."""

    __tablename__ = "assets"

    # Primary Key
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)

    # Foreign Key
    project_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Asset Info
    type: Mapped[AssetType] = mapped_column(SQLEnum(AssetType), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[AssetStatus] = mapped_column(
        SQLEnum(AssetStatus), nullable=False, default=AssetStatus.PENDING
    )

    # Optional: segment index for images (0, 1, 2, ...)
    segment_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Optional: extra_info for storing additional info (duration, validation, etc.)
    extra_info: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="assets")

    # Indexes (defined in Alembic migration)
    # - idx_project_id on project_id
    # - idx_type on type

    def __repr__(self) -> str:
        return f"<Asset(id={self.id}, type={self.type}, project_id={self.project_id})>"
