from typing import Any

from pydantic import BaseModel, Field


class SegmentSchema(BaseModel):
    """段落 Schema"""

    type: str = Field(..., description="段落類型 (intro/content/outro)")
    text: str = Field(..., description="段落文字")
    duration: int = Field(..., gt=0, description="段落時長（秒）")
    image_description: str = Field(..., description="圖片描述")

    class Config:
        from_attributes = True


class ScriptSchema(BaseModel):
    """腳本 Schema"""

    title: str = Field(..., description="影片標題")
    description: str = Field(..., description="影片描述")
    tags: list[str] = Field(..., description="影片標籤")
    segments: list[SegmentSchema] = Field(..., description="段落列表")

    class Config:
        from_attributes = True


class GenerateScriptRequest(BaseModel):
    """生成腳本請求"""

    content: str = Field(..., min_length=500, max_length=10000, description="原始文字內容")
    prompt_template_id: str = Field(..., description="Prompt 範本 ID")
    gemini_model: str = Field(default="gemini-2.5-flash", description="Gemini 模型")

    class Config:
        from_attributes = True


class GenerateScriptResponse(BaseModel):
    """生成腳本回應"""

    success: bool = True
    data: dict[str, Any] = Field(..., description="生成的腳本")

    class Config:
        from_attributes = True
