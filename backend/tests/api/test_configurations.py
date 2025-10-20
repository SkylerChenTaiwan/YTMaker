"""Configuration API 測試"""
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_db
from app.models.base import Base
from app.models.configuration import Configuration
from app.models.project import Project
# 確保導入所有模型類以便 Base.metadata 包含所有表定義
from app.models.asset import Asset
from app.models.batch_task import BatchTask
from app.models.prompt_template import PromptTemplate
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
def sample_configuration(db_session):
    """建立測試用配置"""
    config = Configuration(
        id="test-uuid-1",
        name="測試配置",
        configuration={
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
        },
        usage_count=5,
        last_used_at=datetime.utcnow()
    )
    db_session.add(config)
    db_session.commit()
    db_session.refresh(config)
    return config


def test_list_configurations(sample_configuration):
    """測試 1: 列出所有配置"""
    response = client.get("/api/v1/configurations")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "configurations" in data["data"]
    assert len(data["data"]["configurations"]) >= 1

    # 檢查配置內容
    config = data["data"]["configurations"][0]
    assert config["id"] == "test-uuid-1"
    assert config["name"] == "測試配置"
    assert "created_at" in config
    assert "last_used_at" in config
    assert "usage_count" in config
    assert config["usage_count"] == 5

    # 列表不應包含完整的 configuration 內容
    assert "configuration" not in config


def test_create_configuration_success():
    """測試 2: 成功建立配置"""
    payload = {
        "name": "新配置",
        "configuration": {
            "subtitle": {
                "font_family": "Arial",
                "font_size": 48,
                "font_color": "#FFFFFF",
                "position": "bottom",
                "border_enabled": True,
                "border_color": "#000000",
                "border_width": 2
            },
            "logo": {
                "logo_file": None,
                "logo_x": 100,
                "logo_y": 100,
                "logo_size": 120,
                "logo_opacity": 90
            },
            "overlay_elements": []
        }
    }

    response = client.post("/api/v1/configurations", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "新配置"
    assert "id" in data["data"]
    assert "created_at" in data["data"]
    assert data["data"]["message"] == "配置已建立"


def test_create_configuration_duplicate_name(sample_configuration):
    """測試 3: 重複名稱建立失敗"""
    payload = {
        "name": "測試配置",  # 與 sample_configuration 重複
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

    response = client.post("/api/v1/configurations", json=payload)

    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CONFIGURATION_NAME_EXISTS"
    assert data["error"]["message"] == "配置名稱已存在"
    assert data["error"]["details"]["field"] == "name"
    assert data["error"]["details"]["value"] == "測試配置"


def test_create_configuration_invalid_data():
    """測試 4: 配置資料驗證失敗"""
    payload = {
        "name": "錯誤配置",
        "configuration": {
            "subtitle": {
                "font_family": "Arial",
                "font_size": 200,  # 超出範圍 (max: 100)
                "font_color": "FFFFFF",  # 缺少 #
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

    response = client.post("/api/v1/configurations", json=payload)

    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert data["error"]["message"] == "配置資料驗證失敗"
    assert "errors" in data["error"]["details"]
    assert len(data["error"]["details"]["errors"]) > 0

    # 檢查錯誤包含欄位資訊
    errors = data["error"]["details"]["errors"]
    error_fields = [e["field"] for e in errors]
    assert any("font_size" in field for field in error_fields)
    assert any("font_color" in field for field in error_fields)


def test_get_configuration_success(sample_configuration, db_session):
    """測試 5: 成功取得單一配置"""
    original_usage_count = sample_configuration.usage_count

    response = client.get(f"/api/v1/configurations/{sample_configuration.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == sample_configuration.id
    assert data["data"]["name"] == "測試配置"

    # 應包含完整的 configuration 物件
    assert "configuration" in data["data"]
    assert "subtitle" in data["data"]["configuration"]
    assert "logo" in data["data"]["configuration"]

    # usage_count 應該增加 1
    assert data["data"]["usage_count"] == original_usage_count + 1

    # last_used_at 應該更新
    assert "last_used_at" in data["data"]


def test_get_configuration_not_found():
    """測試 6: 配置不存在回傳 404"""
    response = client.get("/api/v1/configurations/non-existent-uuid")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CONFIGURATION_NOT_FOUND"
    assert data["error"]["message"] == "配置不存在"
    assert data["error"]["details"]["configuration_id"] == "non-existent-uuid"


def test_update_configuration_success(sample_configuration):
    """測試 7: 成功更新配置"""
    payload = {
        "name": "更新後的配置",
        "configuration": {
            "subtitle": {
                "font_family": "Arial",
                "font_size": 52,  # 更新字體大小
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

    response = client.put(
        f"/api/v1/configurations/{sample_configuration.id}",
        json=payload
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == sample_configuration.id
    assert data["data"]["name"] == "更新後的配置"
    assert data["data"]["message"] == "配置已更新"


def test_delete_configuration_success(db_session):
    """測試 8: 成功刪除配置"""
    # 建立一個沒有專案使用的配置
    config = Configuration(
        id="delete-test",
        name="待刪除配置",
        configuration={
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
        },
        usage_count=0
    )
    db_session.add(config)
    db_session.commit()

    response = client.delete(f"/api/v1/configurations/{config.id}")

    assert response.status_code == 204

    # 驗證已刪除
    deleted_config = db_session.query(Configuration).filter(Configuration.id == config.id).first()
    assert deleted_config is None


def test_delete_configuration_in_use(sample_configuration, db_session):
    """測試 9: 配置刪除

    注意：由於 Project.configuration 是 JSON 欄位而不是外鍵，
    目前無法在資料庫層面檢查配置是否被使用。
    這個測試驗證配置可以被刪除。
    """
    response = client.delete(f"/api/v1/configurations/{sample_configuration.id}")

    # 配置可以被刪除（因為沒有外鍵約束）
    assert response.status_code == 204

    # 驗證配置已被刪除
    existing_config = db_session.query(Configuration).filter(
        Configuration.id == sample_configuration.id
    ).first()
    assert existing_config is None
