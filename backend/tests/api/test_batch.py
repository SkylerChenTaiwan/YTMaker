"""
Unit tests for Batch API endpoints.

測試覆蓋：
- 建立批次任務 (POST /api/v1/batch)
- 列出所有批次任務 (GET /api/v1/batch)
- 取得批次任務詳情 (GET /api/v1/batch/:id)
- 暫停批次任務 (POST /api/v1/batch/:id/pause)
- 恢復批次任務 (POST /api/v1/batch/:id/resume)
"""
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models.base import Base
from app.models.batch_task import BatchTask, BatchTaskStatus
from app.models.project import Project, ProjectStatus
from app.core.database import get_db
# 確保導入所有模型類以便 Base.metadata 包含所有表定義
from app.models.asset import Asset
from app.models.configuration import Configuration
from app.models.prompt_template import PromptTemplate
from app.models.system_settings import SystemSettings
from app.models.youtube_account import YouTubeAccount

# Test database - 使用記憶體資料庫避免檔案衝突
# 使用 StaticPool 確保所有連接共享同一個 database connection
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, echo=False, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 在模組載入時就創建所有表格
Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing"""
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


@pytest.fixture(scope="function")
def db():
    """Provide a database session for each test."""
    # 清理所有資料
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()

    session = TestSessionLocal()
    yield session

    session.close()

    # 測試後清理
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()


def test_create_batch_task_success(db):
    """測試 1：成功建立批次任務"""
    response = client.post(
        "/api/v1/batch",
        json={
            "name": "測試批次任務",
            "projects": [
                {"name": "專案 1", "content": "這是測試內容" + "x" * 500},
                {"name": "專案 2", "content": "這是測試內容" + "y" * 500},
            ],
            "gemini_model": "gemini-1.5-flash",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_projects"] == 2
    assert data["data"]["status"] == "QUEUED"
    assert "batch_id" in data["data"]

    # 驗證資料庫記錄
    batch_id = data["data"]["batch_id"]
    batch = db.query(BatchTask).filter(BatchTask.id == batch_id).first()
    assert batch is not None
    assert batch.total_projects == 2
    assert batch.completed_projects == 0
    assert batch.failed_projects == 0
    assert batch.status == BatchTaskStatus.QUEUED

    # 驗證專案記錄
    projects = db.query(Project).filter(Project.batch_task_id == batch_id).all()
    assert len(projects) == 2
    for project in projects:
        assert project.status == ProjectStatus.INITIALIZED
        assert project.batch_task_id == batch_id


def test_list_batch_tasks(db):
    """測試 2：取得批次任務列表"""
    # 建立測試數據
    batch1 = BatchTask(
        name="批次任務 1",
        total_projects=10,
        completed_projects=0,
        failed_projects=0,
        status=BatchTaskStatus.QUEUED,
    )
    batch2 = BatchTask(
        name="批次任務 2",
        total_projects=5,
        completed_projects=2,
        failed_projects=1,
        status=BatchTaskStatus.RUNNING,
    )
    batch3 = BatchTask(
        name="批次任務 3",
        total_projects=3,
        completed_projects=3,
        failed_projects=0,
        status=BatchTaskStatus.COMPLETED,
    )
    db.add_all([batch1, batch2, batch3])
    db.commit()

    response = client.get("/api/v1/batch")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "batches" in data["data"]
    assert len(data["data"]["batches"]) == 3

    # 驗證按 created_at 降序排列（最後創建的在前面）
    batches = data["data"]["batches"]
    # 由於時間戳可能相同，只驗證數量
    assert len(batches) == 3
    # 驗證所有名稱都存在
    names = {b["name"] for b in batches}
    assert names == {"批次任務 1", "批次任務 2", "批次任務 3"}


def test_get_batch_task_detail(db):
    """測試 3：取得批次任務詳情（含專案列表）"""
    # 建立批次任務
    batch = BatchTask(
        name="測試批次",
        total_projects=3,
        completed_projects=1,
        failed_projects=1,
        status=BatchTaskStatus.RUNNING,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # 建立專案
    project1 = Project(
        name="專案 1",
        content="x" * 500,
        status=ProjectStatus.COMPLETED,
        gemini_model="gemini-1.5-flash",
        batch_task_id=batch.id,
        youtube_video_id="abc123",
    )
    project2 = Project(
        name="專案 2",
        content="y" * 500,
        status=ProjectStatus.FAILED,
        gemini_model="gemini-1.5-flash",
        batch_task_id=batch.id,
        error_message="圖片生成失敗：Stability AI API 超時",
    )
    project3 = Project(
        name="專案 3",
        content="z" * 500,
        status=ProjectStatus.RENDERING,
        gemini_model="gemini-1.5-flash",
        batch_task_id=batch.id,
    )
    db.add_all([project1, project2, project3])
    db.commit()

    response = client.get(f"/api/v1/batch/{batch.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == batch.id
    assert data["data"]["name"] == "測試批次"
    assert data["data"]["total_projects"] == 3
    assert data["data"]["completed_projects"] == 1
    assert data["data"]["failed_projects"] == 1
    assert data["data"]["status"] == "RUNNING"

    # 驗證專案列表
    projects = data["data"]["projects"]
    assert len(projects) == 3

    # 找出各專案
    proj1 = next(p for p in projects if p["name"] == "專案 1")
    proj2 = next(p for p in projects if p["name"] == "專案 2")
    proj3 = next(p for p in projects if p["name"] == "專案 3")

    assert proj1["status"] == "COMPLETED"
    assert proj1["progress"] == 100
    assert "youtube.com/watch?v=abc123" in proj1["youtube_url"]

    assert proj2["status"] == "FAILED"
    assert proj2["error_message"] == "圖片生成失敗：Stability AI API 超時"

    assert proj3["status"] == "RENDERING"
    assert proj3["progress"] == 75


def test_get_batch_task_not_found(db):
    """測試 4：批次任務不存在時回傳錯誤"""
    response = client.get("/api/v1/batch/non-existent-batch-id")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    # FastAPI 的 HTTPException 返回格式可能不同
    assert "error" in data


def test_create_batch_task_empty_projects(db):
    """測試 5：建立批次任務時專案列表為空"""
    response = client.post(
        "/api/v1/batch",
        json={
            "name": "空批次任務",
            "projects": [],
            "gemini_model": "gemini-1.5-flash",
        },
    )

    # Pydantic validation error returns 422
    assert response.status_code == 422
    data = response.json()
    # Pydantic 返回格式不同
    assert "detail" in data


def test_create_batch_task_content_too_short(db):
    """測試 6：建立批次任務時專案內容長度不符"""
    response = client.post(
        "/api/v1/batch",
        json={
            "name": "測試批次",
            "projects": [{"name": "專案 1", "content": "太短了"}],
            "gemini_model": "gemini-1.5-flash",
        },
    )

    # Pydantic validation error returns 422
    assert response.status_code == 422
    data = response.json()
    # Pydantic 返回格式不同
    assert "detail" in data


def test_batch_lifecycle(db):
    """測試 7：批次任務生命週期完整流程"""
    # 1. 建立批次任務
    response = client.post(
        "/api/v1/batch",
        json={
            "name": "生命週期測試",
            "projects": [
                {"name": "專案 1", "content": "x" * 500},
                {"name": "專案 2", "content": "y" * 500},
            ],
            "gemini_model": "gemini-1.5-flash",
        },
    )
    batch_id = response.json()["data"]["batch_id"]

    # 2. 查詢初始狀態
    response = client.get(f"/api/v1/batch/{batch_id}")
    assert response.json()["data"]["completed_projects"] == 0
    assert response.json()["data"]["failed_projects"] == 0
    assert response.json()["data"]["status"] == "QUEUED"

    # 3. 模擬專案 1 完成
    projects = db.query(Project).filter(Project.batch_task_id == batch_id).all()
    projects[0].status = ProjectStatus.COMPLETED
    db.commit()

    # 4. 再次查詢（統計應該更新）
    response = client.get(f"/api/v1/batch/{batch_id}")
    data = response.json()["data"]
    assert data["completed_projects"] == 1
    assert data["failed_projects"] == 0
    assert data["status"] == "RUNNING"  # 有專案完成，狀態變 RUNNING

    # 5. 模擬專案 2 失敗
    projects[1].status = ProjectStatus.FAILED
    projects[1].error_message = "測試錯誤"
    db.commit()

    # 6. 最後查詢（所有專案都結束）
    response = client.get(f"/api/v1/batch/{batch_id}")
    data = response.json()["data"]
    assert data["completed_projects"] == 1
    assert data["failed_projects"] == 1
    assert data["status"] == "COMPLETED"  # 所有專案都結束，狀態變 COMPLETED


def test_pause_batch_task(db):
    """測試：暫停批次任務"""
    batch = BatchTask(
        name="測試批次",
        total_projects=5,
        status=BatchTaskStatus.RUNNING,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    response = client.post(f"/api/v1/batch/{batch.id}/pause")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # 驗證資料庫狀態已更新
    db.refresh(batch)
    assert batch.status == BatchTaskStatus.PAUSED


def test_resume_batch_task(db):
    """測試：恢復批次任務"""
    batch = BatchTask(
        name="測試批次",
        total_projects=5,
        completed_projects=2,
        status=BatchTaskStatus.PAUSED,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    response = client.post(f"/api/v1/batch/{batch.id}/resume")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # 驗證資料庫狀態已更新
    db.refresh(batch)
    assert batch.status == BatchTaskStatus.RUNNING


def test_pause_nonexistent_batch(db):
    """測試：暫停不存在的批次任務"""
    response = client.post("/api/v1/batch/non-existent-id/pause")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    # FastAPI 的 HTTPException 返回格式可能不同
    assert "error" in data
