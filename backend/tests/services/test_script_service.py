import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.services.script_service import ScriptGenerationService, ValidationError
from app.models.project import Project
from app.models.prompt_template import PromptTemplate


@pytest.fixture
def script_service(db):
    """ScriptGenerationService fixture"""
    return ScriptGenerationService(db=db, gemini_api_key="test-api-key")


@pytest.fixture
def sample_project(db):
    """建立測試專案"""
    project = Project(
        name="測試專案",
        content="測試內容",
        status="INITIALIZED",
        gemini_model="gemini-1.5-flash"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@pytest.fixture
def sample_prompt_template(db):
    """建立測試 Prompt 範本"""
    template = PromptTemplate(
        name="預設範本",
        content="請根據以下內容生成腳本：\n{content}\n時長：{min_duration}-{max_duration}秒",
        is_default=True
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def test_validate_script_structure_missing_field(script_service):
    """測試 2：腳本結構驗證（缺少必要欄位）"""
    # 測試缺少 segments
    invalid_script = {
        "title": "測試標題",
        "description": "測試描述",
        "tags": ["tag1"]
        # 缺少 segments
    }

    with pytest.raises(ValidationError) as exc_info:
        script_service.validate_script_structure(invalid_script)

    assert "缺少必要欄位：segments" in str(exc_info.value)


def test_validate_script_structure_segment_missing_field(script_service):
    """測試 2：segment 缺少必要欄位"""
    invalid_script = {
        "title": "測試標題",
        "description": "測試描述",
        "tags": ["tag1"],
        "segments": [
            {
                "type": "intro",
                "text": "開場白",
                "image_description": "..."
                # 缺少 duration
            },
            {"type": "content", "text": "內容", "duration": 15, "image_description": "..."},
            {"type": "outro", "text": "結尾", "duration": 8, "image_description": "..."}
        ]
    }

    with pytest.raises(ValidationError) as exc_info:
        script_service.validate_script_structure(invalid_script)

    assert "段落 0 缺少必要欄位：duration" in str(exc_info.value)


def test_validate_script_structure_too_few_segments(script_service):
    """測試 2：segments 少於 3 個"""
    invalid_script = {
        "title": "測試標題",
        "description": "測試描述",
        "tags": ["tag1"],
        "segments": [
            {"type": "intro", "text": "開場", "duration": 10, "image_description": "..."},
            {"type": "outro", "text": "結尾", "duration": 8, "image_description": "..."}
        ]
    }

    with pytest.raises(ValidationError) as exc_info:
        script_service.validate_script_structure(invalid_script)

    assert "segments 必須至少有 3 個" in str(exc_info.value)


def test_validate_script_structure_invalid_type(script_service):
    """測試 2：segment type 不合法"""
    invalid_script = {
        "title": "測試標題",
        "description": "測試描述",
        "tags": ["tag1"],
        "segments": [
            {"type": "intro", "text": "開場", "duration": 10, "image_description": "..."},
            {"type": "invalid_type", "text": "內容", "duration": 15, "image_description": "..."},
            {"type": "outro", "text": "結尾", "duration": 8, "image_description": "..."}
        ]
    }

    with pytest.raises(ValidationError) as exc_info:
        script_service.validate_script_structure(invalid_script)

    assert "段落 1 的 type 必須是 intro/content/outro" in str(exc_info.value)


def test_validate_script_structure_invalid_duration(script_service):
    """測試 2：duration 不是正整數"""
    invalid_script = {
        "title": "測試標題",
        "description": "測試描述",
        "tags": ["tag1"],
        "segments": [
            {"type": "intro", "text": "開場", "duration": 0, "image_description": "..."},
            {"type": "content", "text": "內容", "duration": 15, "image_description": "..."},
            {"type": "outro", "text": "結尾", "duration": 8, "image_description": "..."}
        ]
    }

    with pytest.raises(ValidationError) as exc_info:
        script_service.validate_script_structure(invalid_script)

    assert "段落 0 的 duration 必須是正整數" in str(exc_info.value)


def test_validate_segment_duration_warnings(script_service):
    """測試 3：段落時長驗證（5-20 秒範圍檢查）"""
    segments = [
        {"type": "intro", "text": "...", "duration": 3, "image_description": "..."},  # 太短
        {"type": "content", "text": "...", "duration": 15, "image_description": "..."},  # 正常
        {"type": "content", "text": "...", "duration": 25, "image_description": "..."},  # 太長
        {"type": "outro", "text": "...", "duration": 10, "image_description": "..."}  # 正常
    ]

    warnings = script_service.validate_segment_duration(segments)

    # 驗證
    assert len(warnings) == 2
    assert "段落 0" in warnings[0]
    assert "3 秒" in warnings[0]
    assert "段落 2" in warnings[1]
    assert "25 秒" in warnings[1]


def test_validate_segment_duration_all_valid(script_service):
    """測試 3：所有段落時長都正常"""
    segments = [
        {"type": "intro", "text": "...", "duration": 10, "image_description": "..."},
        {"type": "content", "text": "...", "duration": 15, "image_description": "..."},
        {"type": "content", "text": "...", "duration": 18, "image_description": "..."},
        {"type": "outro", "text": "...", "duration": 8, "image_description": "..."}
    ]

    warnings = script_service.validate_segment_duration(segments)

    # 驗證：沒有警告
    assert len(warnings) == 0


@pytest.mark.asyncio
async def test_generate_script_success(script_service, db, sample_project, sample_prompt_template):
    """測試：成功生成腳本並儲存"""
    mock_script = {
        "title": "測試標題",
        "description": "測試描述",
        "tags": ["tag1", "tag2"],
        "segments": [
            {"type": "intro", "text": "開場", "duration": 10, "image_description": "intro"},
            {"type": "content", "text": "內容1", "duration": 15, "image_description": "content1"},
            {"type": "content", "text": "內容2", "duration": 18, "image_description": "content2"},
            {"type": "outro", "text": "結尾", "duration": 8, "image_description": "outro"}
        ]
    }

    # Mock GeminiClient
    with patch('app.services.script_service.GeminiClient') as mock_client_class:
        mock_client = Mock()
        mock_client.generate_script = AsyncMock(return_value=mock_script)
        mock_client_class.return_value = mock_client

        # 執行
        result = await script_service.generate_script(
            project_id=str(sample_project.id),
            content="測試內容",
            prompt_template_id=str(sample_prompt_template.id),
            model="gemini-1.5-flash"
        )

        # 驗證結果
        assert result["title"] == "測試標題"
        assert len(result["segments"]) == 4

        # 驗證資料庫更新
        db.refresh(sample_project)
        assert sample_project.status == "SCRIPT_GENERATED"
        assert sample_project.script is not None
        assert sample_project.script["title"] == "測試標題"


@pytest.mark.asyncio
async def test_generate_script_prompt_template_not_found(script_service, db, sample_project):
    """測試：Prompt 範本不存在"""
    with pytest.raises(ValidationError) as exc_info:
        await script_service.generate_script(
            project_id=str(sample_project.id),
            content="測試內容",
            prompt_template_id="non-existent-id",
            model="gemini-1.5-flash"
        )

    assert "找不到 Prompt 範本" in str(exc_info.value)


@pytest.mark.asyncio
async def test_generate_script_project_not_found(script_service, db, sample_prompt_template):
    """測試：專案不存在"""
    mock_script = {
        "title": "測試標題",
        "description": "測試描述",
        "tags": ["tag1"],
        "segments": [
            {"type": "intro", "text": "開場", "duration": 10, "image_description": "intro"},
            {"type": "content", "text": "內容", "duration": 15, "image_description": "content"},
            {"type": "outro", "text": "結尾", "duration": 8, "image_description": "outro"}
        ]
    }

    with patch('app.services.script_service.GeminiClient') as mock_client_class:
        mock_client = Mock()
        mock_client.generate_script = AsyncMock(return_value=mock_script)
        mock_client_class.return_value = mock_client

        with pytest.raises(ValidationError) as exc_info:
            await script_service.generate_script(
                project_id="non-existent-id",
                content="測試內容",
                prompt_template_id=str(sample_prompt_template.id),
                model="gemini-1.5-flash"
            )

        assert "找不到專案" in str(exc_info.value)
