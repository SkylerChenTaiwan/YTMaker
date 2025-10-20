"""
Batch Task API schemas for request/response validation.
"""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator

# ===== Request Schemas =====


class ProjectInBatch(BaseModel):
    """批次中的單一專案"""

    name: str = Field(..., min_length=1, max_length=200, description="專案名稱")
    content: str = Field(..., min_length=500, max_length=10000, description="文字內容")

    @field_validator("content")
    @classmethod
    def validate_content_length(cls, v: str) -> str:
        """驗證內容長度"""
        length = len(v)
        if length < 500 or length > 10000:
            raise ValueError(f"文字內容必須在 500-10000 字之間（當前：{length} 字）")
        return v


class BatchTaskCreate(BaseModel):
    """建立批次任務的請求"""

    name: str = Field(..., min_length=1, max_length=200, description="批次任務名稱")
    projects: list[ProjectInBatch] = Field(..., min_length=1, description="專案列表（至少1個）")
    configuration_id: Optional[str] = Field(None, description="視覺配置 ID")
    prompt_template_id: Optional[str] = Field(None, description="Prompt 範本 ID")
    gemini_model: str = Field(
        "gemini-1.5-flash",
        pattern="^(gemini-1.5-pro|gemini-1.5-flash)$",
        description="Gemini 模型名稱",
    )
    youtube_settings: Optional[dict[str, Any]] = Field(None, description="YouTube 設定")

    @field_validator("projects")
    @classmethod
    def validate_projects_not_empty(cls, v: list[ProjectInBatch]) -> list[ProjectInBatch]:
        """驗證專案列表不為空"""
        if not v or len(v) == 0:
            raise ValueError("批次任務必須至少包含一個專案")
        return v


# ===== Response Schemas =====


class BatchTaskResponse(BaseModel):
    """批次任務基本回應"""

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
    progress: int = Field(..., ge=0, le=100, description="進度百分比（0-100）")
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
