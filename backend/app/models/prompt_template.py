"""
Prompt Template model - represents a reusable prompt template.
"""
from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class PromptTemplate(Base, TimestampMixin):
    """Prompt Template model."""

    __tablename__ = "prompt_templates"

    # Primary Key
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)

    # Basic Info
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )

    # Usage Tracking
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    projects = relationship("Project", back_populates="prompt_template")

    # Indexes (defined in Alembic migration)
    # - idx_is_default on is_default

    def __repr__(self) -> str:
        return f"<PromptTemplate(id={self.id}, name={self.name}, is_default={self.is_default})>"
