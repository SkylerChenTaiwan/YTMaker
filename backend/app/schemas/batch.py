"""
Batch Task schemas for request/response validation.
"""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class ProjectInBatch(BaseModel):
    """單一專案資訊 (用於建立批次任務時)"""

    name: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=500, max_length=10000)


class BatchTaskCreate(BaseModel):
    """建立批次任務的請求"""

    name: str = Field(..., min_length=1, max_length=200)
    projects: list[ProjectInBatch] = Field(..., min_length=1)
    configuration_id: Optional[str] = None
    prompt_template_id: Optional[str] = None
    gemini_model: str = Field(default="gemini-1.5-flash")
    youtube_settings: Optional[dict[str, Any]] = None

    @field_validator("gemini_model")
    @classmethod
    def validate_gemini_model(cls, v: str) -> str:
        if not v.startswith("gemini-"):
            raise ValueError(f"Gemini 模型必須以 'gemini-' 開頭")
        return v


class BatchTaskResponse(BaseModel):
    """建立批次任務的回應"""

    batch_id: str
    total_projects: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BatchTaskListItem(BaseModel):
    """批次任務列表項目"""

    id: str
    name: str
    total_projects: int
    completed_projects: int
    failed_projects: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectInBatchDetail(BaseModel):
    """批次詳情中的專案資訊"""

    id: str
    name: str
    status: str
    progress: int  # 0-100
    youtube_url: Optional[str] = None
    error_message: Optional[str] = None


class BatchTaskDetailResponse(BaseModel):
    """批次任務詳細回應"""

    id: str
    name: str
    total_projects: int
    completed_projects: int
    failed_projects: int
    status: str
    created_at: datetime
    projects: list[ProjectInBatchDetail]

    model_config = {"from_attributes": True}
