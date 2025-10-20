"""Prompt Template API 測試"""
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_db
from app.models.base import Base
from app.models.prompt_template import PromptTemplate
from app.models.project import Project
# 確保導入所有模型類以便 Base.metadata 包含所有表定義
from app.models.asset import Asset
from app.models.batch_task import BatchTask
from app.models.configuration import Configuration
from app.models.system_settings import SystemSettings
from app.models.youtube_account import YouTubeAccount

# 測試資料庫設定 - 使用記憶體資料庫避免檔案衝突
# 使用 StaticPool 確保所有連接共享同一個 database connection
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# 在模組載入時就創建所有表格
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    """覆寫資料庫依賴"""
    db = TestSessionLocal()
    try:
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


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """每個測試前清理並重建資料庫"""
    # 清理所有資料
    with test_engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()
    yield
    # 測試後清理
    with test_engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()


@pytest.fixture
def db_session():
    """提供測試用資料庫 session"""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def sample_default_template(db_session):
    """建立測試用預設範本"""
    template = PromptTemplate(
        id="default-template-1",
        name="預設範本",
        content="請將以下內容改寫為 YouTube 腳本...\n\n內容：{{content}}",
        is_default=True,
        usage_count=25
    )
    db_session.add(template)
    db_session.commit()
    db_session.refresh(template)
    return template


@pytest.fixture
def sample_custom_template(db_session):
    """建立測試用自訂範本"""
    template = PromptTemplate(
        id="custom-template-1",
        name="科技評測範本",
        content="請以科技評測風格改寫...\n\n{{content}}",
        is_default=False,
        usage_count=10
    )
    db_session.add(template)
    db_session.commit()
    db_session.refresh(template)
    return template


def test_list_prompt_templates(sample_default_template, sample_custom_template):
    """測試 10: 列出所有 Prompt 範本"""
    response = client.get("/api/v1/prompt-templates")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "templates" in data["data"]
    assert len(data["data"]["templates"]) >= 2

    # 預設範本應該排在最前面
    first_template = data["data"]["templates"][0]
    assert first_template["is_default"] is True
    assert first_template["name"] == "預設範本"

    # 檢查範本包含完整內容
    assert "content" in first_template
    assert "{{content}}" in first_template["content"]
    assert "usage_count" in first_template
    assert "created_at" in first_template


def test_create_prompt_template_success():
    """測試 11: 成功建立 Prompt 範本"""
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


def test_create_prompt_template_duplicate_name(sample_default_template):
    """測試 12: Prompt 範本名稱重複時建立失敗"""
    payload = {
        "name": "預設範本",  # 與 sample_default_template 重複
        "content": "另一個內容... {{content}}"
    }

    response = client.post("/api/v1/prompt-templates", json=payload)

    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "PROMPT_TEMPLATE_NAME_EXISTS"
    assert data["error"]["message"] == "Prompt 範本名稱已存在"


def test_create_prompt_template_missing_placeholder():
    """測試 13: Prompt 內容驗證（必須包含 {{content}} 佔位符）"""
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
    assert data["error"]["details"]["field"] == "content"


def test_get_prompt_template_success(sample_custom_template, db_session):
    """測試額外: 成功取得單一 Prompt 範本"""
    original_usage_count = sample_custom_template.usage_count

    response = client.get(f"/api/v1/prompt-templates/{sample_custom_template.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == sample_custom_template.id
    assert data["data"]["name"] == "科技評測範本"
    assert "content" in data["data"]

    # usage_count 應該增加 1
    assert data["data"]["usage_count"] == original_usage_count + 1


def test_update_prompt_template_success(sample_custom_template):
    """測試 14: 成功更新 Prompt 範本"""
    payload = {
        "name": "科技評測範本（v2）",
        "content": "更新後的 Prompt 內容...\n\n{{content}}\n\n請使用科技術語。"
    }

    response = client.put(
        f"/api/v1/prompt-templates/{sample_custom_template.id}",
        json=payload
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == sample_custom_template.id
    assert data["data"]["name"] == "科技評測範本（v2）"
    assert data["data"]["message"] == "Prompt 範本已更新"


def test_update_prompt_template_invalid_content(sample_custom_template):
    """測試額外: 更新時移除佔位符應該失敗"""
    payload = {
        "content": "這個更新移除了佔位符"  # 缺少 {{content}}
    }

    response = client.put(
        f"/api/v1/prompt-templates/{sample_custom_template.id}",
        json=payload
    )

    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "{{content}}" in data["error"]["message"]


def test_delete_default_template_forbidden(sample_default_template):
    """測試 15: 預設範本無法刪除"""
    response = client.delete(f"/api/v1/prompt-templates/{sample_default_template.id}")

    assert response.status_code == 403
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "DEFAULT_TEMPLATE_PROTECTED"
    assert data["error"]["message"] == "預設範本無法刪除"

    # 驗證範本未被刪除
    get_response = client.get(f"/api/v1/prompt-templates/{sample_default_template.id}")
    assert get_response.status_code == 200


def test_delete_custom_template_success(db_session):
    """測試 16: 成功刪除非預設 Prompt 範本"""
    # 建立一個非預設範本
    template = PromptTemplate(
        id="delete-test",
        name="待刪除範本",
        content="測試內容... {{content}}",
        is_default=False,
        usage_count=0
    )
    db_session.add(template)
    db_session.commit()

    response = client.delete(f"/api/v1/prompt-templates/{template.id}")

    assert response.status_code == 204

    # 驗證已刪除
    deleted_template = db_session.query(PromptTemplate).filter(
        PromptTemplate.id == template.id
    ).first()
    assert deleted_template is None


def test_delete_template_in_use(sample_custom_template, db_session):
    """測試額外: 正在使用的範本無法刪除"""
    # 建立一個使用此範本的專案
    from app.models.project import ProjectStatus

    project = Project(
        id="test-project",
        name="測試專案",
        content="測試內容",
        prompt_template_id=sample_custom_template.id,
        gemini_model="gemini-pro",
        status=ProjectStatus.INITIALIZED
    )
    db_session.add(project)
    db_session.commit()

    response = client.delete(f"/api/v1/prompt-templates/{sample_custom_template.id}")

    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "PROMPT_TEMPLATE_IN_USE"
    assert "無法刪除" in data["error"]["message"]
    assert data["error"]["details"]["projects_count"] == 1

    # 驗證範本未被刪除
    existing_template = db_session.query(PromptTemplate).filter(
        PromptTemplate.id == sample_custom_template.id
    ).first()
    assert existing_template is not None


def test_prompt_template_not_found():
    """測試額外: 範本不存在時回傳 404"""
    response = client.get("/api/v1/prompt-templates/non-existent-id")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "PROMPT_TEMPLATE_NOT_FOUND"
    assert data["error"]["message"] == "Prompt 範本不存在"
