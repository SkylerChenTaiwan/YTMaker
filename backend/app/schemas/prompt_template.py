from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PromptTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=10)


class PromptTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=10)


class PromptTemplateDetail(BaseModel):
    id: str
    name: str
    content: str
    is_default: bool
    created_at: datetime
    usage_count: int

    class Config:
        from_attributes = True
