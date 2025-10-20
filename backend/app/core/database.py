"""資料庫連線管理"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = None
SessionLocal = None


def init_db():
    """初始化資料庫連線"""
    global engine, SessionLocal
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def close_db():
    """關閉資料庫連線"""
    global engine
    if engine:
        engine.dispose()


def get_db():
    """取得資料庫 session"""
    if SessionLocal is None:
        init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
