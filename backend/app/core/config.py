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

    # 日誌配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    # Google OAuth 配置
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/oauth/callback"

    # Token 加密金鑰 (Fernet key)
    ENCRYPTION_KEY: str = ""

    # D-ID API 配置
    DID_API_KEY: str = ""
    DID_QUOTA_WARNING_THRESHOLD: float = 0.1  # 10% 剩餘時警告

    # Storage 配置
    STORAGE_PATH: str = "./storage"
    TEMP_FILE_EXPIRY: int = 3600  # 1 小時

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
