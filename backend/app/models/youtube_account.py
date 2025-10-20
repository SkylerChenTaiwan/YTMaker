"""
YouTube Account model - represents a connected YouTube channel.
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid


class YouTubeAccount(Base, TimestampMixin):
    """YouTube Account model."""

    __tablename__ = "youtube_accounts"

    # Primary Key
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)

    # Channel Info
    channel_name: Mapped[str] = mapped_column(String(200), nullable=False)
    channel_id: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )

    # OAuth Tokens (encrypted in production)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Channel Stats
    subscriber_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Authorization Status
    is_authorized: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    authorized_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now()
    )

    # Indexes (defined in Alembic migration)
    # - idx_channel_id on channel_id

    def is_token_expired(self) -> bool:
        """Check if access token is expired."""
        return datetime.utcnow() >= self.token_expires_at

    def __repr__(self) -> str:
        return f"<YouTubeAccount(id={self.id}, channel_name={self.channel_name})>"
