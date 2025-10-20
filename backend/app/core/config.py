from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """應用配置"""

    # 環境
    ENV: str = "development"
    DEBUG: bool = True

    # API
    API_V1_PREFIX: str = "/api/v1"
    PORT: int = 8000

    # 資料庫
    DATABASE_URL: str = "sqlite:///./data/database.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
