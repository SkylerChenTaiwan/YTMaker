"""
Test cases for Projects API endpoints.
Testing all 12 endpoints with comprehensive test coverage.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models.base import Base
# 確保導入所有模型類以便 Base.metadata 包含所有表定義
from app.models.asset import Asset
from app.models.batch_task import BatchTask
from app.models.configuration import Configuration
from app.models.project import Project
from app.models.prompt_template import PromptTemplate
from app.models.system_settings import SystemSettings
from app.models.youtube_account import YouTubeAccount

# Setup test database - 使用記憶體資料庫避免檔案衝突
# 使用 StaticPool 確保所有連接共享同一個 database connection
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 在模組載入時就創建所有表格
Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_test_app():
    """在模組層級設置 dependency override"""
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Setup and teardown test database for each test"""
    # 清理所有資料
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()
    yield
    # 測試後清理
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()


# Helper function to create valid content
def valid_content():
    """Generate valid content (>500 chars)"""
    # "這是測試內容。" = 7 chars, * 75 = 525 chars (>500) ✓
    return "這是測試內容。" * 75


# ===== Test 1-2: Create Project =====

def test_create_project_success():
    """測試 1: 成功建立專案"""
    payload = {
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    }

    response = client.post("/api/v1/projects", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["id"] is not None
    assert data["name"] == "測試專案"
    assert data["status"] == "INITIALIZED"
    assert data["gemini_model"] == "gemini-1.5-flash"
    assert "created_at" in data
    assert "updated_at" in data


def test_create_project_content_too_short():
    """測試 2a: 內容長度太短 (< 500)"""
    payload = {
        "name": "測試專案",
        "content": "太短了",
        "gemini_model": "gemini-1.5-flash"
    }

    response = client.post("/api/v1/projects", json=payload)
    assert response.status_code == 422


def test_create_project_content_too_long():
    """測試 2b: 內容長度太長 (> 10000)"""
    payload = {
        "name": "測試專案",
        "content": "測" * 10001,
        "gemini_model": "gemini-1.5-flash"
    }

    response = client.post("/api/v1/projects", json=payload)
    assert response.status_code == 422


def test_create_project_invalid_model():
    """測試 2c: 無效的 Gemini 模型"""
    payload = {
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "invalid-model"
    }

    response = client.post("/api/v1/projects", json=payload)
    assert response.status_code == 422


# ===== Test 3-4: List and Get Projects =====

def test_list_projects_with_pagination():
    """測試 3: 列出專案（含分頁）"""
    # Create 3 test projects
    for i in range(3):
        payload = {
            "name": f"專案 {i+1}",
            "content": valid_content(),
            "gemini_model": "gemini-1.5-flash"
        }
        client.post("/api/v1/projects", json=payload)

    # Test list with pagination
    response = client.get("/api/v1/projects?limit=2&offset=0")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["projects"]) == 2
    assert data["data"]["total"] == 3
    assert data["data"]["limit"] == 2
    assert data["data"]["offset"] == 0


def test_list_projects_with_sorting():
    """測試 3b: 列出專案（排序）"""
    # Create projects
    for i in range(2):
        payload = {
            "name": f"專案 {chr(65+i)}",  # A, B
            "content": valid_content(),
            "gemini_model": "gemini-1.5-flash"
        }
        client.post("/api/v1/projects", json=payload)

    # Test sorting by name ascending
    response = client.get("/api/v1/projects?sort_by=name&order=asc")

    assert response.status_code == 200
    data = response.json()
    projects = data["data"]["projects"]
    assert projects[0]["name"] == "專案 A"
    assert projects[1]["name"] == "專案 B"


def test_get_project_by_id():
    """測試 4: 取得單一專案"""
    # Create a project
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]

    # Get the project
    response = client.get(f"/api/v1/projects/{project_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == project_id
    assert data["name"] == "測試專案"
    assert data["status"] == "INITIALIZED"


def test_get_project_not_found():
    """測試 5: 專案不存在 (404)"""
    response = client.get("/api/v1/projects/non-existent-id")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


# ===== Test 6-8: Update Configuration =====

def test_update_configuration():
    """測試 6: 更新視覺配置"""
    # Create a project
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]

    # Update configuration
    config_payload = {
        "subtitle": {
            "font": "Arial",
            "size": 24,
            "color": "#FFFFFF"
        },
        "logo": {
            "position": "top-right",
            "size": "small"
        }
    }

    response = client.put(f"/api/v1/projects/{project_id}/configuration", json=config_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify configuration was saved
    get_response = client.get(f"/api/v1/projects/{project_id}")
    project_data = get_response.json()
    assert project_data["configuration"] is not None
    assert project_data["configuration"]["subtitle"]["font"] == "Arial"


def test_update_youtube_settings():
    """測試 8: 更新 YouTube 設定"""
    # Create a project
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]

    # Update YouTube settings
    youtube_payload = {
        "title": "我的測試影片",
        "description": "這是測試描述",
        "tags": ["測試", "Python", "FastAPI"],
        "privacy": "public",
        "publish_type": "immediate",
        "ai_content_flag": True
    }

    response = client.put(f"/api/v1/projects/{project_id}/youtube-settings", json=youtube_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify settings were saved
    get_response = client.get(f"/api/v1/projects/{project_id}")
    project_data = get_response.json()
    assert project_data["youtube_settings"] is not None
    assert project_data["youtube_settings"]["title"] == "我的測試影片"


def test_update_prompt_model_success():
    """測試 7: 更新 Prompt 與模型 - 成功案例"""
    from uuid import uuid4
    from app.models.prompt_template import PromptTemplate

    # Create a prompt template first
    db = TestingSessionLocal()
    template = PromptTemplate(
        id=str(uuid4()),
        name="測試範本",
        content="測試 Prompt 內容",
        is_default=True
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    template_id = str(template.id)
    db.close()

    # Create a project
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]

    # Update prompt model
    prompt_payload = {
        "prompt_template_id": template_id,
        "gemini_model": "gemini-1.5-pro"
    }

    response = client.put(f"/api/v1/projects/{project_id}/prompt-model", json=prompt_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify settings were saved
    get_response = client.get(f"/api/v1/projects/{project_id}")
    project_data = get_response.json()
    assert project_data["gemini_model"] == "gemini-1.5-pro"


def test_update_prompt_model_project_not_found():
    """測試 7b: 更新 Prompt 與模型 - 專案不存在 (404)"""
    from uuid import uuid4

    prompt_payload = {
        "prompt_template_id": str(uuid4()),  # Use valid UUID
        "gemini_model": "gemini-1.5-pro"
    }

    response = client.put("/api/v1/projects/non-existent-id/prompt-model", json=prompt_payload)

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


def test_update_prompt_model_template_not_found():
    """測試 7c: 更新 Prompt 與模型 - Prompt Template 不存在 (400)"""
    from uuid import uuid4

    # Create a project
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]

    # Update with non-existent template (valid UUID but doesn't exist in DB)
    prompt_payload = {
        "prompt_template_id": str(uuid4()),
        "gemini_model": "gemini-1.5-pro"
    }

    response = client.put(f"/api/v1/projects/{project_id}/prompt-model", json=prompt_payload)

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


# ===== Test 9-13: Generation Control =====

def test_start_generation():
    """測試 9: 開始生成"""
    # Create a project
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]

    # Start generation
    response = client.post(f"/api/v1/projects/{project_id}/generate")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "task_id" in data["data"]
    assert data["data"]["status"] == "SCRIPT_GENERATING"
    assert "estimated_time" in data["data"]


def test_start_generation_invalid_status():
    """測試 10: 無效狀態無法開始生成 (409)"""
    # Create a project
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]

    # Start generation (first time should succeed)
    client.post(f"/api/v1/projects/{project_id}/generate")

    # Try to start again (should fail with 409)
    response = client.post(f"/api/v1/projects/{project_id}/generate")

    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_PROJECT_STATUS"


def test_pause_generation():
    """測試 11: 暫停生成"""
    # Create and start generation
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]
    client.post(f"/api/v1/projects/{project_id}/generate")

    # Pause generation
    response = client.post(f"/api/v1/projects/{project_id}/pause")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify status changed
    get_response = client.get(f"/api/v1/projects/{project_id}")
    project_data = get_response.json()
    assert project_data["status"] == "PAUSED"


def test_resume_generation():
    """測試 12: 繼續生成"""
    # Create, start, and pause generation
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]
    client.post(f"/api/v1/projects/{project_id}/generate")
    client.post(f"/api/v1/projects/{project_id}/pause")

    # Resume generation
    response = client.post(f"/api/v1/projects/{project_id}/resume")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "task_id" in data["data"]
    assert data["data"]["status"] == "SCRIPT_GENERATING"


def test_cancel_generation():
    """測試 13: 取消生成"""
    # Create and start generation
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]
    client.post(f"/api/v1/projects/{project_id}/generate")

    # Cancel generation
    response = client.post(f"/api/v1/projects/{project_id}/cancel")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify status changed to FAILED
    get_response = client.get(f"/api/v1/projects/{project_id}")
    project_data = get_response.json()
    assert project_data["status"] == "FAILED"


# ===== Test 14-15: Result and Delete =====

def test_get_result_not_completed():
    """測試 14a: 未完成專案無法取得結果"""
    # Create a project (INITIALIZED status)
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]

    # Try to get result
    response = client.get(f"/api/v1/projects/{project_id}/result")

    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_PROJECT_STATUS"


def test_get_result_success():
    """測試 14b: 成功取得已完成專案的結果"""
    from app.models.project import Project, ProjectStatus

    # Create a COMPLETED project directly in database
    db = TestingSessionLocal()
    project = Project(
        name="已完成專案",
        content=valid_content(),
        status=ProjectStatus.COMPLETED,
        gemini_model="gemini-1.5-flash",
        youtube_video_id="test-video-123",
        youtube_settings={
            "title": "測試影片標題",
            "description": "測試描述",
            "tags": ["測試", "影片"]
        }
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    project_id = str(project.id)
    db.close()

    # Get result
    response = client.get(f"/api/v1/projects/{project_id}/result")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "youtube_url" in data["data"]
    assert data["data"]["youtube_video_id"] == "test-video-123"
    assert data["data"]["status"] == "published"


def test_delete_project():
    """測試 15: 刪除專案"""
    # Create a project
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]

    # Delete the project
    response = client.delete(f"/api/v1/projects/{project_id}?delete_files=true")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Verify project was deleted
    get_response = client.get(f"/api/v1/projects/{project_id}")
    assert get_response.status_code == 404


def test_delete_project_not_found():
    """測試 15b: 刪除不存在的專案"""
    response = client.delete("/api/v1/projects/non-existent-id")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


# ===== Additional Error Handling Tests =====

def test_update_configuration_project_not_found():
    """測試: 更新配置 - 專案不存在 (404)"""
    config_payload = {
        "subtitle": {"font": "Arial", "size": 24}
    }

    response = client.put("/api/v1/projects/non-existent-id/configuration", json=config_payload)

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


def test_update_youtube_settings_project_not_found():
    """測試: 更新 YouTube 設定 - 專案不存在 (404)"""
    youtube_payload = {
        "title": "測試",
        "description": "測試",
        "tags": [],
        "privacy": "public",
        "publish_type": "immediate",
        "ai_content_flag": True
    }

    response = client.put("/api/v1/projects/non-existent-id/youtube-settings", json=youtube_payload)

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


def test_cancel_generation_project_not_found():
    """測試: 取消生成 - 專案不存在 (404)"""
    response = client.post("/api/v1/projects/non-existent-id/cancel")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


def test_pause_generation_project_not_found():
    """測試: 暫停生成 - 專案不存在 (404)"""
    response = client.post("/api/v1/projects/non-existent-id/pause")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


def test_resume_generation_project_not_found():
    """測試: 繼續生成 - 專案不存在 (404)"""
    response = client.post("/api/v1/projects/non-existent-id/resume")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


def test_resume_generation_invalid_status():
    """測試: 繼續生成 - 非 PAUSED 狀態無法繼續"""
    # Create a project (INITIALIZED status)
    create_response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": valid_content(),
        "gemini_model": "gemini-1.5-flash"
    })
    project_id = create_response.json()["id"]

    # Try to resume (should fail as status is INITIALIZED, not PAUSED)
    response = client.post(f"/api/v1/projects/{project_id}/resume")

    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_PROJECT_STATUS"
