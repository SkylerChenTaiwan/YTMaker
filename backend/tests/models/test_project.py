"""
Unit tests for Project model.
"""
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.asset import Asset, AssetStatus, AssetType
from app.models.base import Base
from app.models.batch_task import BatchTask, BatchTaskStatus
from app.models.configuration import Configuration
from app.models.project import Project, ProjectStatus
from app.models.prompt_template import PromptTemplate
from app.models.system_settings import SystemSettings
from app.models.youtube_account import YouTubeAccount

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


def test_model_repr_methods(db):
    """測試所有模型的 __repr__ 方法"""
    # Test Project __repr__
    project = Project(
        name="測試專案",
        content="測試內容",
        status=ProjectStatus.INITIALIZED,
        gemini_model="gemini-1.5-pro",
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    repr_str = repr(project)
    assert "Project" in repr_str
    assert project.name in repr_str
    assert str(project.status.value) in repr_str

    # Test Asset __repr__
    asset = Asset(
        project_id=project.id,
        type=AssetType.AUDIO,
        status=AssetStatus.PENDING,
        file_path="/test.mp3",
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    repr_str = repr(asset)
    assert "Asset" in repr_str
    assert str(asset.type.value) in repr_str

    # Test Configuration __repr__
    config = Configuration(
        name="測試配置", configuration={"test": "value"}, usage_count=0
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    repr_str = repr(config)
    assert "Configuration" in repr_str
    assert config.name in repr_str

    # Test PromptTemplate __repr__
    template = PromptTemplate(
        name="測試範本", content="測試內容", is_default=True, usage_count=0
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    repr_str = repr(template)
    assert "PromptTemplate" in repr_str
    assert template.name in repr_str

    # Test YouTubeAccount __repr__
    account = YouTubeAccount(
        channel_name="測試頻道",
        channel_id="UC123456",
        access_token="test_token",
        refresh_token="refresh_token",
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        subscriber_count=0,
        is_authorized=True,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    repr_str = repr(account)
    assert "YouTubeAccount" in repr_str
    assert account.channel_name in repr_str

    # Test BatchTask __repr__
    batch = BatchTask(
        name="測試批次任務",
        total_projects=10,
        completed_projects=0,
        failed_projects=0,
        status=BatchTaskStatus.QUEUED,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    repr_str = repr(batch)
    assert "BatchTask" in repr_str
    assert batch.name in repr_str

    # Test SystemSettings __repr__
    setting = SystemSettings(key="test_key", value="test_value")
    db.add(setting)
    db.commit()
    db.refresh(setting)
    repr_str = repr(setting)
    assert "SystemSettings" in repr_str
    assert setting.key in repr_str


def test_youtube_account_token_expiry(db):
    """測試 YouTubeAccount 的 token 過期檢查"""
    # Test expired token
    expired_account = YouTubeAccount(
        channel_name="過期帳號",
        channel_id="UC_EXPIRED",
        access_token="expired_token",
        refresh_token="refresh_token",
        token_expires_at=datetime.utcnow() - timedelta(hours=1),  # 1 小時前過期
        subscriber_count=0,
        is_authorized=True,
    )
    db.add(expired_account)
    db.commit()
    db.refresh(expired_account)

    assert expired_account.is_token_expired() is True

    # Test valid token
    valid_account = YouTubeAccount(
        channel_name="有效帳號",
        channel_id="UC_VALID",
        access_token="valid_token",
        refresh_token="refresh_token",
        token_expires_at=datetime.utcnow() + timedelta(hours=1),  # 1 小時後過期
        subscriber_count=0,
        is_authorized=True,
    )
    db.add(valid_account)
    db.commit()
    db.refresh(valid_account)

    assert valid_account.is_token_expired() is False
