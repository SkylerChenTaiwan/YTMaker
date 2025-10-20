"""
Configuration model - represents a visual configuration template.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid


class Configuration(Base, TimestampMixin):
    """Configuration template model."""

    __tablename__ = "configurations"

    # Primary Key
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)

    # Basic Info
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    configuration: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Usage Tracking
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, index=True
    )
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Indexes (defined in Alembic migration)
    # - idx_last_used_at on last_used_at

    def __repr__(self) -> str:
        return f"<Configuration(id={self.id}, name={self.name})>"
