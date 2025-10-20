import pytest
from pydantic import ValidationError
from app.schemas.script import SegmentSchema, ScriptSchema, GenerateScriptRequest, GenerateScriptResponse


def test_segment_schema_valid():
    """測試：有效的 SegmentSchema"""
    segment = SegmentSchema(
        type="intro",
        text="歡迎來到我的頻道",
        duration=10,
        image_description="A welcoming scene"
    )

    assert segment.type == "intro"
    assert segment.text == "歡迎來到我的頻道"
    assert segment.duration == 10
    assert segment.image_description == "A welcoming scene"


def test_segment_schema_invalid_duration():
    """測試：duration 必須 > 0"""
    with pytest.raises(ValidationError):
        SegmentSchema(
            type="intro",
            text="歡迎",
            duration=0,  # 無效：必須 > 0
            image_description="..."
        )


def test_script_schema_valid():
    """測試：有效的 ScriptSchema"""
    script = ScriptSchema(
        title="測試標題",
        description="測試描述",
        tags=["tag1", "tag2"],
        segments=[
            SegmentSchema(type="intro", text="開場", duration=10, image_description="intro"),
            SegmentSchema(type="content", text="內容", duration=15, image_description="content"),
            SegmentSchema(type="outro", text="結尾", duration=8, image_description="outro")
        ]
    )

    assert script.title == "測試標題"
    assert len(script.segments) == 3
    assert script.segments[0].type == "intro"


def test_generate_script_request_valid():
    """測試：有效的 GenerateScriptRequest"""
    # 產生超過 500 字符的內容
    long_content = "這是一篇測試文章。" * 30  # 每次約 10 字，共約 300 字
    long_content += "額外的內容來確保超過 500 字符。" * 20  # 再加約 340 字

    request = GenerateScriptRequest(
        content=long_content,
        prompt_template_id="template-123",
        gemini_model="gemini-2.5-flash"
    )

    assert request.gemini_model == "gemini-2.5-flash"
    assert request.prompt_template_id == "template-123"


def test_generate_script_request_content_too_short():
    """測試：content 太短（< 500 字）"""
    with pytest.raises(ValidationError) as exc_info:
        GenerateScriptRequest(
            content="太短了",  # 只有 3 個字
            prompt_template_id="template-123"
        )

    # 驗證錯誤訊息包含最小長度限制
    assert "at least 500 characters" in str(exc_info.value)


def test_generate_script_request_default_model():
    """測試：gemini_model 有預設值"""
    # 產生超過 500 字符的內容
    long_content = "這是一篇測試文章。" * 30
    long_content += "額外的內容來確保超過 500 字符。" * 20

    request = GenerateScriptRequest(
        content=long_content,
        prompt_template_id="template-123"
        # 不提供 gemini_model
    )

    # 驗證：預設為 gemini-2.5-flash
    assert request.gemini_model == "gemini-2.5-flash"


def test_generate_script_response_valid():
    """測試：有效的 GenerateScriptResponse"""
    response = GenerateScriptResponse(
        success=True,
        data={
            "title": "測試標題",
            "description": "測試描述",
            "tags": ["tag1"],
            "segments": []
        }
    )

    assert response.success is True
    assert "title" in response.data
