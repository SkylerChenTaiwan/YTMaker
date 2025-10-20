"""Celery 應用配置"""

from celery import Celery

from app.core.config import settings

# 初始化 Celery app
celery_app = Celery(
    "ytmaker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.video_generation",
        "app.tasks.batch_processing",
        "app.tasks.maintenance",
    ],
)

# Celery 配置
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Taipei",
    enable_utc=True,
    # Worker 設定
    worker_concurrency=4,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    # 重試設定
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # 結果過期時間
    result_expires=86400,  # 24 小時
    # 任務路由
    task_routes={
        "app.tasks.video_generation.*": {"queue": "video_generation"},
        "app.tasks.batch_processing.*": {"queue": "batch_processing"},
        "app.tasks.maintenance.*": {"queue": "maintenance"},
    },
    # Beat 排程（定期任務）
    beat_schedule={
        "sync-quotas-hourly": {
            "task": "app.tasks.maintenance.sync_quotas",
            "schedule": 3600.0,  # 每小時
        },
    },
)


@celery_app.task(bind=True)
def debug_task(self):
    """測試任務"""
    print(f"Request: {self.request!r}")
