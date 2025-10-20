"""
Unit tests for Prompt Template API endpoints.

測試覆蓋：
- 列出所有 Prompt 範本 (GET /api/v1/prompt-templates)
- 建立 Prompt 範本 (POST /api/v1/prompt-templates)
- 取得單一 Prompt 範本 (GET /api/v1/prompt-templates/:id)
- 更新 Prompt 範本 (PUT /api/v1/prompt-templates/:id)
- 刪除 Prompt 範本 (DELETE /api/v1/prompt-templates/:id)
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.models.base import Base
from app.models.prompt_template import PromptTemplate
from app.models.project import Project, ProjectStatus
from app.core.database import get_db

# Test database
TEST_DATABASE_URL = "sqlite:///./test_prompt_templates.db"
engine = create_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

client = TestClient(app)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestSessionLocal()

    # Override the get_db dependency
    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    yield session

    session.close()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def default_template(db):
    """建立預設 Prompt 範本"""
    template = PromptTemplate(
        name="預設範本",
        content="請將以下內容改寫為 YouTube 腳本...\n\n內容：{{content}}",
        is_default=True,
        usage_count=25
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@pytest.fixture
def custom_template(db):
    """建立自訂 Prompt 範本"""
    template = PromptTemplate(
        name="科技評測範本",
        content="請以科技評測風格改寫以下內容...\n\n{{content}}",
        is_default=False,
        usage_count=10
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def test_list_prompt_templates_success(db, default_template, custom_template):
    """測試 10：成功列出所有 Prompt 範本"""
    response = client.get("/api/v1/prompt-templates")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "templates" in data["data"]
    assert len(data["data"]["templates"]) >= 2

    # 預設範本應該排在最前面
    templates = data["data"]["templates"]
    assert templates[0]["is_default"] is True
    assert templates[0]["name"] == "預設範本"

    # 檢查資料結構
    template = templates[0]
    assert "id" in template
    assert "name" in template
    assert "content" in template  # Prompt 範本列表包含 content
    assert "is_default" in template
    assert "created_at" in template
    assert "usage_count" in template


def test_create_prompt_template_success(db):
    """測試 11：成功建立 Prompt 範本"""
    payload = {
        "name": "教學影片範本",
        "content": "請將以下內容改寫為教學風格的 YouTube 腳本。要求：\n1. 開場吸引人\n2. 每個段落 10-15 秒\n3. 結尾呼籲訂閱\n\n內容：{{content}}"
    }

    response = client.post("/api/v1/prompt-templates", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "教學影片範本"
    assert "id" in data["data"]
    assert data["data"]["message"] == "Prompt 範本已建立"

    # 驗證資料庫記錄
    template_id = data["data"]["id"]
    template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    assert template is not None
    assert template.is_default is False
    assert template.usage_count == 0


def test_create_prompt_template_duplicate_name(db, default_template):
    """測試 12：Prompt 範本名稱重複時建立失敗"""
    payload = {
        "name": "預設範本",  # 與 default_template 重複
        "content": "測試內容 {{content}}"
    }

    response = client.post("/api/v1/prompt-templates", json=payload)

    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "PROMPT_TEMPLATE_NAME_EXISTS"
    assert data["error"]["message"] == "Prompt 範本名稱已存在"


def test_create_prompt_template_missing_placeholder(db):
    """測試 13：Prompt 內容驗證（必須包含變數佔位符）"""
    payload = {
        "name": "錯誤範本",
        "content": "請改寫為 YouTube 腳本"  # 缺少 {{content}}
    }

    response = client.post("/api/v1/prompt-templates", json=payload)

    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "{{content}}" in data["error"]["message"]


def test_get_prompt_template_success(db, custom_template):
    """測試：成功取得單一 Prompt 範本"""
    original_usage_count = custom_template.usage_count

    response = client.get(f"/api/v1/prompt-templates/{custom_template.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == str(custom_template.id)
    assert data["data"]["name"] == "科技評測範本"
    assert data["data"]["content"] == custom_template.content
    assert data["data"]["usage_count"] == original_usage_count + 1  # +1


def test_get_prompt_template_not_found(db):
    """測試：Prompt 範本不存在時回傳 404"""
    response = client.get("/api/v1/prompt-templates/non-existent-uuid")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "PROMPT_TEMPLATE_NOT_FOUND"


def test_update_prompt_template_success(db, custom_template):
    """測試 14：成功更新 Prompt 範本"""
    payload = {
        "name": "科技評測範本（v2）",
        "content": "更新後的 Prompt 內容... {{content}}"
    }

    response = client.put(
        f"/api/v1/prompt-templates/{custom_template.id}",
        json=payload
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "科技評測範本（v2）"
    assert data["data"]["message"] == "Prompt 範本已更新"

    # 驗證資料庫
    db.refresh(custom_template)
    assert custom_template.name == "科技評測範本（v2）"
    assert custom_template.content == "更新後的 Prompt 內容... {{content}}"


def test_delete_default_template_forbidden(db, default_template):
    """測試 15：預設範本無法刪除"""
    response = client.delete(f"/api/v1/prompt-templates/{default_template.id}")

    assert response.status_code == 403
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "DEFAULT_TEMPLATE_PROTECTED"
    assert data["error"]["message"] == "預設範本無法刪除"

    # 驗證範本未被刪除
    template = db.query(PromptTemplate).filter(PromptTemplate.id == default_template.id).first()
    assert template is not None


def test_delete_non_default_template_success(db):
    """測試 16：成功刪除非預設 Prompt 範本"""
    # 建立一個非預設範本
    template = PromptTemplate(
        name="待刪除範本",
        content="測試內容 {{content}}",
        is_default=False,
        usage_count=0
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    response = client.delete(f"/api/v1/prompt-templates/{template.id}")

    assert response.status_code == 204

    # 驗證範本已刪除
    deleted_template = db.query(PromptTemplate).filter(PromptTemplate.id == template.id).first()
    assert deleted_template is None


def test_delete_template_in_use(db, custom_template):
    """測試：正在使用的範本無法刪除"""
    # 建立一個使用此範本的專案
    project = Project(
        name="測試專案",
        content="測試內容",
        status=ProjectStatus.INITIALIZED,
        prompt_template_id=custom_template.id,
        gemini_model="gemini-1.5-pro"
    )
    db.add(project)
    db.commit()

    response = client.delete(f"/api/v1/prompt-templates/{custom_template.id}")

    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "PROMPT_TEMPLATE_IN_USE"
    assert "正在使用" in data["error"]["message"]

    # 驗證範本未被刪除
    template = db.query(PromptTemplate).filter(PromptTemplate.id == custom_template.id).first()
    assert template is not None
