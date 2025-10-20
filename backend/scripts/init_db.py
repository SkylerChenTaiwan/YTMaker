"""
Database initialization script.

Usage:
    python scripts/init_db.py
"""
from sqlalchemy import create_engine

from app.models.base import Base

# Database URL
DATABASE_URL = "sqlite:///./ytmaker.db"

# Create engine
engine = create_engine(DATABASE_URL, echo=True)

# Create all tables
Base.metadata.create_all(bind=engine)

print("✅ Database initialized successfully!")
print(f"📁 Database file: {DATABASE_URL}")
print("🔧 Next steps:")
print("   1. Run Alembic migrations: alembic upgrade head")
print("   2. Seed test data: python scripts/seed_data.py")
