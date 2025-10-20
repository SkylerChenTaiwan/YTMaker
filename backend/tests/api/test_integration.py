"""Configuration 和 Prompt Template 整合測試"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import get_db
from app.models.base import Base
from app.models.configuration import Configuration
from app.models.prompt_template import PromptTemplate
from app.models.project import Project, ProjectStatus

# 測試資料庫設定
TEST_DATABASE_URL = "sqlite:///./test.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """覆寫資料庫依賴"""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """每個測試前設置資料庫"""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """提供測試用資料庫 session"""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_configuration_lifecycle(db_session):
    """測試 17: 完整的配置模板生命週期

    驗證從建立 → 使用 → 更新 → 刪除的完整流程
    """

    # 1. 建立新配置 → 201 Created
    create_payload = {
        "name": "生命週期測試配置",
        "configuration": {
            "subtitle": {
                "font_family": "Arial",
                "font_size": 48,
                "font_color": "#FFFFFF",
                "position": "bottom",
                "border_enabled": False
            },
            "logo": {
                "logo_file": None,
                "logo_x": 50,
                "logo_y": 50,
                "logo_size": 100,
                "logo_opacity": 80
            },
            "overlay_elements": []
        }
    }

    create_response = client.post("/api/v1/configurations", json=create_payload)
    assert create_response.status_code == 201
    created_data = create_response.json()
    config_id = created_data["data"]["id"]
    assert created_data["data"]["name"] == "生命週期測試配置"

    # 2. 列出所有配置 → 看到新配置
    list_response = client.get("/api/v1/configurations")
    assert list_response.status_code == 200
    list_data = list_response.json()
    config_names = [c["name"] for c in list_data["data"]["configurations"]]
    assert "生命週期測試配置" in config_names

    # 3. 取得單一配置（模擬使用） → usage_count +1
    get_response_1 = client.get(f"/api/v1/configurations/{config_id}")
    assert get_response_1.status_code == 200
    get_data_1 = get_response_1.json()
    assert get_data_1["data"]["usage_count"] == 1
    assert get_data_1["data"]["last_used_at"] is not None

    # 4. 再次取得 → usage_count +1
    get_response_2 = client.get(f"/api/v1/configurations/{config_id}")
    assert get_response_2.status_code == 200
    get_data_2 = get_response_2.json()
    assert get_data_2["data"]["usage_count"] == 2

    # 5. 更新配置名稱 → 200 OK
    update_payload = {
        "name": "生命週期測試配置（已更新）"
    }
    update_response = client.put(f"/api/v1/configurations/{config_id}", json=update_payload)
    assert update_response.status_code == 200
    update_data = update_response.json()
    assert update_data["data"]["name"] == "生命週期測試配置（已更新）"

    # 6. 驗證更新後的配置
    get_response_3 = client.get(f"/api/v1/configurations/{config_id}")
    assert get_response_3.status_code == 200
    get_data_3 = get_response_3.json()
    assert get_data_3["data"]["name"] == "生命週期測試配置（已更新）"
    assert get_data_3["data"]["usage_count"] == 3  # 又被讀取了一次

    # 7. 刪除配置 → 204 No Content
    delete_response = client.delete(f"/api/v1/configurations/{config_id}")
    assert delete_response.status_code == 204

    # 8. 嘗試取得已刪除配置 → 404 Not Found
    get_response_4 = client.get(f"/api/v1/configurations/{config_id}")
    assert get_response_4.status_code == 404
    assert get_response_4.json()["error"]["code"] == "CONFIGURATION_NOT_FOUND"

    # 9. 驗證資料庫中已刪除
    deleted_config = db_session.query(Configuration).filter(
        Configuration.id == config_id
    ).first()
    assert deleted_config is None


def test_prompt_template_project_integration(db_session):
    """測試 18: Prompt 範本與專案整合

    驗證 Prompt 範本可以被專案正確使用，且使用中的範本無法刪除
    """

    # 1. 建立 Prompt 範本
    create_payload = {
        "name": "整合測試範本",
        "content": "請將以下內容改寫為 YouTube 腳本：\n\n{{content}}"
    }

    create_response = client.post("/api/v1/prompt-templates", json=create_payload)
    assert create_response.status_code == 201
    created_data = create_response.json()
    template_id = created_data["data"]["id"]

    # 2. 檢查初始 usage_count
    get_response_1 = client.get(f"/api/v1/prompt-templates/{template_id}")
    assert get_response_1.status_code == 200
    initial_usage = get_response_1.json()["data"]["usage_count"]
    assert initial_usage == 1  # 因為被讀取了一次

    # 3. 建立使用此範本的專案
    project = Project(
        id="integration-test-project",
        name="整合測試專案",
        content="測試內容",
        prompt_template_id=template_id,
        gemini_model="gemini-pro",
        status=ProjectStatus.INITIALIZED
    )
    db_session.add(project)
    db_session.commit()

    # 4. 取得範本，驗證 usage_count 增加
    get_response_2 = client.get(f"/api/v1/prompt-templates/{template_id}")
    assert get_response_2.status_code == 200
    current_usage = get_response_2.json()["data"]["usage_count"]
    assert current_usage == 2  # 又被讀取了一次

    # 5. 嘗試刪除正在使用的範本 → 應失敗（409 Conflict）
    delete_response_1 = client.delete(f"/api/v1/prompt-templates/{template_id}")
    assert delete_response_1.status_code == 409
    delete_data_1 = delete_response_1.json()
    assert delete_data_1["success"] is False
    assert delete_data_1["error"]["code"] == "PROMPT_TEMPLATE_IN_USE"
    assert delete_data_1["error"]["details"]["projects_count"] == 1

    # 6. 驗證範本仍然存在
    template_still_exists = db_session.query(PromptTemplate).filter(
        PromptTemplate.id == template_id
    ).first()
    assert template_still_exists is not None

    # 7. 刪除專案（解除使用關係）
    db_session.delete(project)
    db_session.commit()

    # 8. 再次嘗試刪除範本 → 應成功（204 No Content）
    delete_response_2 = client.delete(f"/api/v1/prompt-templates/{template_id}")
    assert delete_response_2.status_code == 204

    # 9. 驗證範本已被刪除
    template_deleted = db_session.query(PromptTemplate).filter(
        PromptTemplate.id == template_id
    ).first()
    assert template_deleted is None

    # 10. 嘗試取得已刪除的範本 → 404
    get_response_3 = client.get(f"/api/v1/prompt-templates/{template_id}")
    assert get_response_3.status_code == 404
    assert get_response_3.json()["error"]["code"] == "PROMPT_TEMPLATE_NOT_FOUND"


def test_configuration_and_prompt_template_together(db_session):
    """測試額外: Configuration 和 PromptTemplate 同時使用

    驗證專案可以同時使用 Configuration 和 PromptTemplate

    注意：由於 Project.configuration 是 JSON 欄位，Configuration 無法檢查使用狀態
    """

    # 1. 建立 Configuration
    config_payload = {
        "name": "整合配置",
        "configuration": {
            "subtitle": {
                "font_family": "Arial",
                "font_size": 48,
                "font_color": "#FFFFFF",
                "position": "bottom",
                "border_enabled": False
            },
            "logo": {
                "logo_file": None,
                "logo_x": 50,
                "logo_y": 50,
                "logo_size": 100,
                "logo_opacity": 80
            },
            "overlay_elements": []
        }
    }
    config_response = client.post("/api/v1/configurations", json=config_payload)
    assert config_response.status_code == 201
    config_id = config_response.json()["data"]["id"]

    # 2. 建立 PromptTemplate
    template_payload = {
        "name": "整合範本",
        "content": "測試內容... {{content}}"
    }
    template_response = client.post("/api/v1/prompt-templates", json=template_payload)
    assert template_response.status_code == 201
    template_id = template_response.json()["data"]["id"]

    # 3. 建立同時使用兩者的專案
    project = Project(
        id="full-integration-project",
        name="完整整合測試專案",
        content="測試內容",
        prompt_template_id=template_id,
        gemini_model="gemini-pro",
        status=ProjectStatus.INITIALIZED
    )
    db_session.add(project)
    db_session.commit()

    # 4. Configuration 可以刪除（因為是 JSON 欄位）
    delete_config_response = client.delete(f"/api/v1/configurations/{config_id}")
    assert delete_config_response.status_code == 204

    # 5. 嘗試刪除 PromptTemplate → 應失敗（有外鍵約束）
    delete_template_response = client.delete(f"/api/v1/prompt-templates/{template_id}")
    assert delete_template_response.status_code == 409
    assert delete_template_response.json()["error"]["code"] == "PROMPT_TEMPLATE_IN_USE"

    # 6. 刪除專案
    db_session.delete(project)
    db_session.commit()

    # 7. 現在可以刪除 PromptTemplate
    delete_template_response_2 = client.delete(f"/api/v1/prompt-templates/{template_id}")
    assert delete_template_response_2.status_code == 204
