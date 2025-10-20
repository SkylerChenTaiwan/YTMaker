"""
Unit tests for Project model.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.asset import Asset, AssetStatus, AssetType
from app.models.base import Base
from app.models.project import Project, ProjectStatus

# Test database
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def test_create_project_with_all_fields(db):
    """測試 1：建立專案並驗證所有欄位"""
    project = Project(
        name="測試專案",
        content="這是一段測試內容" * 100,
        status=ProjectStatus.INITIALIZED,
        gemini_model="gemini-1.5-pro",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Assertions
    assert project.id is not None
    assert project.name == "測試專案"
    assert project.status == ProjectStatus.INITIALIZED
    assert project.created_at is not None
    assert project.updated_at is not None
    assert project.configuration is None
    assert project.youtube_video_id is None


def test_project_asset_relationship_and_cascade(db):
    """測試 2：專案關聯素材，測試外鍵關聯和級聯刪除"""
    # Create project
    project = Project(
        name="關聯測試專案",
        content="測試內容",
        status=ProjectStatus.INITIALIZED,
        gemini_model="gemini-1.5-flash",
    )
    db.add(project)
    db.commit()

    # Create assets
    audio = Asset(
        project_id=project.id,
        type=AssetType.AUDIO,
        status=AssetStatus.PENDING,
        file_path="/audio.mp3",
    )
    image1 = Asset(
        project_id=project.id,
        type=AssetType.IMAGE,
        status=AssetStatus.COMPLETED,
        file_path="/img1.png",
        segment_index=0,
    )
    image2 = Asset(
        project_id=project.id,
        type=AssetType.IMAGE,
        status=AssetStatus.COMPLETED,
        file_path="/img2.png",
        segment_index=1,
    )

    db.add_all([audio, image1, image2])
    db.commit()

    # Refresh and check relationships
    db.refresh(project)
    assert len(project.assets) == 3

    # Test cascade delete
    project_id = project.id
    db.delete(project)
    db.commit()

    remaining_assets = db.query(Asset).filter(Asset.project_id == project_id).all()
    assert len(remaining_assets) == 0  # All assets should be deleted


def test_project_status_transition(db):
    """測試 9：完整專案生命週期（狀態變更）"""
    project = Project(
        name="完整流程測試",
        content="測試內容",
        status=ProjectStatus.INITIALIZED,
        gemini_model="gemini-1.5-pro",
    )
    db.add(project)
    db.commit()

    # Status transitions
    project.status = ProjectStatus.SCRIPT_GENERATING
    db.commit()

    project.status = ProjectStatus.SCRIPT_GENERATED
    project.script = {"segments": [{"text": "開場白", "duration": 5}]}
    db.commit()

    project.status = ProjectStatus.COMPLETED
    project.youtube_video_id = "dQw4w9WgXcQ"
    db.commit()

    db.refresh(project)
    assert project.status == ProjectStatus.COMPLETED
    assert project.youtube_video_id == "dQw4w9WgXcQ"
    assert project.script is not None
