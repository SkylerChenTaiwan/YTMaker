"""
System Settings model - represents system-wide settings.
"""
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SystemSettings(Base):
    """System Settings model (key-value store)."""

    __tablename__ = "system_settings"

    # Primary Key
    key: Mapped[str] = mapped_column(String(100), primary_key=True)

    # Value (stored as TEXT, can be JSON string)
    value: Mapped[str] = mapped_column(Text, nullable=False)

    # Timestamp
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<SystemSettings(key={self.key})>"
