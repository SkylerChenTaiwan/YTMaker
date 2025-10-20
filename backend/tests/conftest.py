import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.models.base import Base


@pytest.fixture
def test_config():
    """測試配置"""
    return {
        "ENV": "test",
        "DEBUG": True,
    }


@pytest.fixture
def db() -> Session:
    """測試資料庫連線"""
    # 建立測試資料庫引擎（使用 in-memory SQLite）
    engine = create_engine("sqlite:///:memory:", echo=False)

    # 建立所有資料表
    Base.metadata.create_all(engine)

    # 建立 session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        # 清理資料表
        Base.metadata.drop_all(engine)
