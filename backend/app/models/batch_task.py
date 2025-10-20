"""
Batch Task model - represents a batch processing task.
"""
import enum

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class BatchTaskStatus(str, enum.Enum):
    """Batch task status enum."""

    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class BatchTask(Base, TimestampMixin):
    """Batch Task model."""

    __tablename__ = "batch_tasks"

    # Primary Key
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)

    # Basic Info
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    total_projects: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_projects: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_projects: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[BatchTaskStatus] = mapped_column(
        SQLEnum(BatchTaskStatus),
        nullable=False,
        default=BatchTaskStatus.QUEUED,
        index=True,
    )

    # Relationships
    projects = relationship("Project", back_populates="batch_task")

    # Indexes (defined in Alembic migration)
    # - idx_status on status
    # - idx_created_at on created_at

    def __repr__(self) -> str:
        return f"<BatchTask(id={self.id}, name={self.name}, status={self.status})>"
