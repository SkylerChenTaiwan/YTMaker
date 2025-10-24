"""
Project API schemas for request/response validation.
"""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

# ===== Request Schemas =====


class ProjectCreate(BaseModel):
    """Create project request"""

    project_name: str = Field(..., min_length=1, max_length=200, description="Project name")
    content_text: str = Field(..., min_length=500, max_length=10000, description="Text content")
    content_source: Optional[str] = Field(None, pattern="^(paste|upload)$", description="Content source")
    prompt_template_id: Optional[UUID] = Field(None, description="Prompt template ID")
    gemini_model: str = Field(
        "gemini-1.5-flash",
        pattern="^gemini-",
        description="Gemini model",
    )

    @field_validator("content_text")
    @classmethod
    def validate_content_length(cls, v: str) -> str:
        """Validate text length"""
        length = len(v)
        if length < 500 or length > 10000:
            raise ValueError(f"Content length must be between 500-10000 characters, current: {length}")
        return v


class ProjectConfigurationUpdate(BaseModel):
    """Update visual configuration request"""

    subtitle: Optional[dict[str, Any]] = None
    logo: Optional[dict[str, Any]] = None
    overlays: Optional[list[dict[str, Any]]] = None
    segment_overrides: Optional[dict[str, Any]] = None


class PromptModelUpdate(BaseModel):
    """Update Prompt and model request"""

    prompt_template_id: Optional[UUID] = None
    prompt_content: Optional[str] = None
    gemini_model: Optional[str] = Field(None, pattern="^gemini-")


class YouTubeSettingsUpdate(BaseModel):
    """Update YouTube settings request"""

    title: str = Field(..., max_length=100)
    description: str = Field(..., max_length=5000)
    tags: list[str] = Field(default_factory=list, max_length=500)
    privacy: str = Field("public", pattern="^(public|unlisted|private)$")
    publish_type: str = Field("immediate", pattern="^(immediate|scheduled)$")
    scheduled_time: Optional[datetime] = None
    ai_content_flag: bool = True


class ProjectListQuery(BaseModel):
    """List query parameters"""

    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
    sort_by: str = Field("updated_at", pattern="^(created_at|updated_at|name)$")
    order: str = Field("desc", pattern="^(asc|desc)$")
    status: Optional[str] = None


# ===== Response Schemas =====


class ProjectResponse(BaseModel):
    """Project response"""

    id: str
    name: str
    status: str
    created_at: datetime
    updated_at: datetime
    content: Optional[str] = None
    configuration: Optional[dict[str, Any]] = None
    prompt_template_id: Optional[str] = None
    prompt_content: Optional[str] = None
    gemini_model: Optional[str] = None
    youtube_settings: Optional[dict[str, Any]] = None
    youtube_video_id: Optional[str] = None
    script: Optional[dict[str, Any]] = None
    error_info: Optional[dict[str, Any]] = None

    model_config = {"from_attributes": True}


class ProjectListItem(BaseModel):
    """List item"""

    id: str
    name: str
    status: str
    created_at: datetime
    updated_at: datetime
    youtube_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    """Project list response"""

    success: bool = True
    data: dict[str, Any]  # {projects: [...], total: int, limit: int, offset: int}


class GenerateResponse(BaseModel):
    """Start generation response"""

    success: bool = True
    data: dict[str, Any]  # {task_id: str, status: str, estimated_time: int}


class ResultResponse(BaseModel):
    """Result response"""

    success: bool = True
    data: dict[str, Any]  # {youtube_url, youtube_video_id, status, title, description, tags, local_files}


class MessageResponse(BaseModel):
    """Generic message response"""

    success: bool = True
    message: str
