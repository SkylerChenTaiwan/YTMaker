import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import (
    batch,
    configurations,
    gemini,
    health,
    projects,
    prompt_templates,
    stats,
    system,
    websocket,
    youtube,
)
from app.core.config import settings
from app.core.database import close_db, init_db
from app.core.exceptions import AppException
from app.process_manager import process_manager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用生命週期管理"""
    # 啟動時初始化
    logger.info("=" * 60)
    logger.info("🚀 YTMaker 正在啟動...")
    logger.info("=" * 60)

    # 1. 啟動背景服務 (Redis + Celery)
    try:
        process_manager.start_all()
    except Exception as e:
        logger.error(f"背景服務啟動失敗: {e}")
        logger.warning("應用將繼續啟動，但背景任務功能將無法使用")

    # 2. 初始化資料庫
    logger.info("初始化資料庫連線...")
    init_db()

    logger.info("=" * 60)
    logger.info("✅ YTMaker 啟動完成")
    logger.info("=" * 60)

    yield

    # 關閉時清理資源
    logger.info("=" * 60)
    logger.info("🛑 YTMaker 正在關閉...")
    logger.info("=" * 60)

    # 1. 停止背景服務
    try:
        process_manager.stop_all()
    except Exception as e:
        logger.warning(f"停止背景服務時發生錯誤: {e}")

    # 2. 關閉資料庫
    logger.info("關閉資料庫連線...")
    close_db()

    logger.info("=" * 60)
    logger.info("✅ YTMaker 已安全關閉")
    logger.info("=" * 60)


app = FastAPI(
    title="YTMaker API",
    version="1.0.0",
    description="YouTube 影片自動化生產系統 API",
    lifespan=lifespan,
)

# CORS 配置(僅允許 localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 請求日誌中間件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """記錄所有 HTTP 請求和處理時間"""
    start_time = time.time()

    # 記錄請求資訊
    logger.info(f"收到請求: {request.method} {request.url.path}")

    # 處理請求
    response = await call_next(request)

    # 計算處理時間
    process_time = (time.time() - start_time) * 1000

    # 記錄回應資訊
    logger.info(
        f"{request.method} {request.url.path} - " f"{response.status_code} - {process_time:.0f}ms"
    )

    return response


# 全局異常處理器
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """處理自訂業務異常"""
    logger.warning(
        f"業務異常: {exc.error_code} - {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {"code": exc.error_code, "message": exc.message, "details": exc.details},
            "timestamp": exc.timestamp.isoformat(),
            "path": request.url.path,
        },
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception):
    """處理 404 錯誤"""
    from datetime import datetime, timezone

    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error": {"code": "NOT_FOUND", "message": "請求的資源不存在"},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": request.url.path,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """處理所有未捕獲的異常"""
    # 記錄完整錯誤到日誌(包含堆疊追蹤)
    logger.error(
        f"未處理的異常: {type(exc).__name__} - {str(exc)}",
        exc_info=True,
        extra={"path": request.url.path},
    )

    # 返回安全的錯誤訊息給使用者
    from datetime import datetime, timezone

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {"code": "INTERNAL_ERROR", "message": "伺服器內部錯誤,請稍後再試"},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": request.url.path,
        },
    )


# 註冊路由
app.include_router(health.router, tags=["health"])
app.include_router(projects.router, prefix="/api/v1", tags=["projects"])
app.include_router(system.router, prefix="/api/v1", tags=["system"])
app.include_router(gemini.router, prefix="/api/v1", tags=["gemini"])
app.include_router(youtube.router, prefix="/api/v1", tags=["youtube"])
app.include_router(batch.router, prefix="/api/v1", tags=["batch"])
app.include_router(stats.router, prefix="/api/v1")
app.include_router(configurations.router, prefix="/api/v1")
app.include_router(prompt_templates.router, prefix="/api/v1")
app.include_router(websocket.router, prefix="/api/v1", tags=["websocket"])


# 根路徑
@app.get("/")
async def root():
    return {
        "success": True,
        "data": {"message": "YTMaker API", "version": "1.0.0", "docs": "/docs"},
    }


# 背景服務狀態
@app.get("/status")
async def get_status():
    """獲取背景服務狀態"""
    status = process_manager.get_status()
    all_running = all(
        [
            status["redis"]["running"],
            status["worker"]["alive"],
            status["beat"]["alive"],
        ]
    )

    return {
        "success": True,
        "data": {
            "status": "healthy" if all_running else "degraded",
            "services": status,
            "message": "所有服務正常運行" if all_running else "部分服務未運行",
        },
    }
