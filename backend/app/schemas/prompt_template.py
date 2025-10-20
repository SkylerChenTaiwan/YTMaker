"""
PromptTemplate schemas for request/response validation.

Pydantic models for:
- PromptTemplateCreate: 建立 Prompt 範本請求
- PromptTemplateUpdate: 更新 Prompt 範本請求
- PromptTemplateDetail: Prompt 範本詳細資料
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PromptTemplateCreate(BaseModel):
    """建立 Prompt 範本的請求 schema"""

    name: str = Field(..., min_length=1, max_length=200, description="範本名稱")
    content: str = Field(..., min_length=10, description="Prompt 內容")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "預設範本",
                "content": "請將以下內容改寫為 YouTube 腳本...\n\n內容：{{content}}",
            }
        }


class PromptTemplateUpdate(BaseModel):
    """更新 Prompt 範本的請求 schema"""

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    content: Optional[str] = Field(default=None, min_length=10)


class PromptTemplateDetail(BaseModel):
    """Prompt 範本詳細資料 schema"""

    id: str
    name: str
    content: str
    is_default: bool
    created_at: datetime
    usage_count: int

    class Config:
        from_attributes = True
