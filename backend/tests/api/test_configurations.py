"""
Unit tests for Configuration API endpoints.

測試覆蓋：
- 列出所有配置 (GET /api/v1/configurations)
- 建立配置 (POST /api/v1/configurations)
- 取得單一配置 (GET /api/v1/configurations/:id)
- 更新配置 (PUT /api/v1/configurations/:id)
- 刪除配置 (DELETE /api/v1/configurations/:id)
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from app.main import app
from app.models.base import Base
from app.models.configuration import Configuration
from app.models.project import Project, ProjectStatus
from app.core.database import get_db

# Test database
TEST_DATABASE_URL = "sqlite:///./test_configurations.db"
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
def sample_configuration(db):
    """建立測試用配置"""
    config = Configuration(
        name="測試配置",
        configuration={
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
                "logo_x": 50,
                "logo_y": 50,
                "logo_size": 100,
                "logo_opacity": 80
            },
            "overlay_elements": []
        },
        usage_count=5
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@pytest.fixture
def sample_configuration_2(db):
    """建立第二個測試用配置"""
    config = Configuration(
        name="科技風格",
        configuration={
            "subtitle": {
                "font_family": "Roboto",
                "font_size": 52,
                "font_color": "#00FF00",
                "position": "center",
                "border_enabled": False
            },
            "logo": {
                "logo_file": None,
                "logo_x": 100,
                "logo_y": 100,
                "logo_size": 120,
                "logo_opacity": 90
            },
            "overlay_elements": []
        },
        usage_count=3
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def test_list_configurations_success(db, sample_configuration, sample_configuration_2):
    """測試 1：成功列出所有視覺配置模板"""
    response = client.get("/api/v1/configurations")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "configurations" in data["data"]
    assert len(data["data"]["configurations"]) >= 2

    # 檢查資料結構
    config = data["data"]["configurations"][0]
    assert "id" in config
    assert "name" in config
    assert "created_at" in config
    assert "last_used_at" in config
    assert "usage_count" in config
    # 列表不應包含完整 configuration 內容
    assert "configuration" not in config


def test_create_configuration_success(db):
    """測試 2：成功建立新的視覺配置模板"""
    payload = {
        "name": "簡約風格",
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
                "logo_x": 50,
                "logo_y": 50,
                "logo_size": 100,
                "logo_opacity": 80
            },
            "overlay_elements": []
        }
    }

    response = client.post("/api/v1/configurations", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "簡約風格"
    assert "id" in data["data"]
    assert "created_at" in data["data"]
    assert data["data"]["message"] == "配置已建立"

    # 驗證資料庫記錄
    config_id = data["data"]["id"]
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    assert config is not None
    assert config.usage_count == 0
    assert config.last_used_at is None


def test_create_configuration_duplicate_name(db, sample_configuration):
    """測試 3：配置名稱重複時建立失敗"""
    payload = {
        "name": "測試配置",  # 與 sample_configuration 重複
        "configuration": {
            "subtitle": {
                "font_family": "Arial",
                "font_size": 48,
                "font_color": "#FFFFFF",
                "position": "bottom"
            },
            "logo": {
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


def test_create_configuration_invalid_data(db):
    """測試 4：配置資料格式驗證失敗"""
    payload = {
        "name": "錯誤配置",
        "configuration": {
            "subtitle": {
                "font_size": 200,  # 超出範圍 (max: 100)
                "font_color": "FFFFFF"  # 缺少 #
            }
        }
    }

    response = client.post("/api/v1/configurations", json=payload)

    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "errors" in data["error"]["details"]


def test_get_configuration_success(db, sample_configuration):
    """測試 5：成功取得單一配置的完整內容"""
    original_usage_count = sample_configuration.usage_count

    response = client.get(f"/api/v1/configurations/{sample_configuration.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == str(sample_configuration.id)
    assert data["data"]["name"] == "測試配置"
    assert "configuration" in data["data"]  # 單一配置包含完整內容
    assert data["data"]["usage_count"] == original_usage_count + 1  # +1
    assert data["data"]["last_used_at"] is not None  # 已更新


def test_get_configuration_not_found(db):
    """測試 6：配置不存在時回傳 404"""
    response = client.get("/api/v1/configurations/non-existent-uuid")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CONFIGURATION_NOT_FOUND"
    assert data["error"]["message"] == "配置不存在"


def test_update_configuration_success(db, sample_configuration):
    """測試 7：成功更新配置"""
    payload = {
        "name": "預設配置（已更新）"
    }

    response = client.put(
        f"/api/v1/configurations/{sample_configuration.id}",
        json=payload
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "預設配置（已更新）"
    assert data["data"]["message"] == "配置已更新"

    # 驗證資料庫
    db.refresh(sample_configuration)
    assert sample_configuration.name == "預設配置（已更新）"
    assert sample_configuration.updated_at is not None


def test_delete_configuration_success(db):
    """測試 8：成功刪除配置"""
    # 建立一個沒有專案使用的配置
    config = Configuration(
        name="待刪除",
        configuration={"subtitle": {}, "logo": {}, "overlay_elements": []},
        usage_count=0
    )
    db.add(config)
    db.commit()
    db.refresh(config)

    response = client.delete(f"/api/v1/configurations/{config.id}")

    assert response.status_code == 204

    # 驗證資料庫已刪除
    deleted_config = db.query(Configuration).filter(Configuration.id == config.id).first()
    assert deleted_config is None


def test_delete_configuration_in_use(db, sample_configuration):
    """測試 9：配置正在使用時無法刪除"""
    # 建立一個使用此配置的專案
    project = Project(
        name="測試專案",
        content="測試內容",
        status=ProjectStatus.INITIALIZED,
        configuration_id=sample_configuration.id,
        gemini_model="gemini-1.5-pro"
    )
    db.add(project)
    db.commit()

    response = client.delete(f"/api/v1/configurations/{sample_configuration.id}")

    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CONFIGURATION_IN_USE"
    assert data["error"]["message"] == "配置正在使用中,無法刪除"
    assert data["error"]["details"]["projects_count"] == 1

    # 驗證配置未被刪除
    config = db.query(Configuration).filter(Configuration.id == sample_configuration.id).first()
    assert config is not None
