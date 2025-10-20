from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="YTMaker API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 開發伺服器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """健康檢查端點"""
    return {"status": "ok"}


@app.get("/api/v1/health")
async def api_health_check():
    """API 健康檢查端點"""
    return {
        "status": "ok",
        "version": "1.0.0",
        "services": {
            "api": "running",
            "redis": "pending",  # Task-002 會實作
            "database": "pending",  # Task-002 會實作
        },
    }
