from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """應用配置"""

    # 應用基本配置
    APP_NAME: str = "YTMaker"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # API 配置
    API_V1_PREFIX: str = "/api/v1"

    # CORS 配置
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # 資料庫配置
    DATABASE_URL: str = "sqlite:///./ytmaker.db"

    # Redis 配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Celery 配置
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # 日誌配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    # Google OAuth 配置
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/oauth/callback"

    # Token 加密金鑰 (Fernet key)
    ENCRYPTION_KEY: str = ""

    # Stability AI 配置
    STABILITY_API_KEY: str = ""
    STABILITY_MAX_CONCURRENT: int = 4
    STABILITY_RATE_LIMIT: int = 150

    # 圖片生成配置
    IMAGE_WIDTH: int = 1920
    IMAGE_HEIGHT: int = 1080
    IMAGE_CFG_SCALE: float = 8.0
    IMAGE_STEPS: int = 40

    # D-ID API 配置
    DID_API_KEY: str = ""
    DID_QUOTA_WARNING_THRESHOLD: float = 0.1  # 10% 剩餘時警告

    # Storage 配置
    STORAGE_PATH: str = "./storage"
    TEMP_FILE_EXPIRY: int = 3600  # 1 小時

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
