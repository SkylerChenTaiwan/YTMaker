# Task-012: WebSocket 即時進度推送

> **建立日期:** 2025-01-19
> **狀態:** ⏳ 未開始
> **預計時間:** 6 小時
> **優先級:** P0

---

## 關聯文件

- **API 規格:** `tech-specs/backend/api-projects.md#WebSocket 進度推送`
- **產品設計:** `product-design/flows.md#Flow-2`
- **技術規格:** `tech-specs/backend/overview.md#WebSocket`

### 相關任務
- **前置任務:** Task-010 (Celery 任務系統)
- **並行任務:** Task-011 (影片渲染)
- **後續任務:** Task-020 (前端進度監控頁面會使用此 WebSocket)

---

## 任務目標

實作 WebSocket 端點，整合 Redis Pub/Sub，即時推送影片生成進度、階段變更、錯誤通知。

---

## 實作規格

### WebSocket 端點

**檔案:** `app/api/v1/endpoints/websocket.py`

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.services.progress_service import ProgressService
from app.database import SessionLocal
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    """WebSocket 連線管理器"""

    def __init__(self):
        # 儲存每個專案的活躍連線
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, project_id: str, websocket: WebSocket):
        """接受新連線"""
        await websocket.accept()

        if project_id not in self.active_connections:
            self.active_connections[project_id] = []

        self.active_connections[project_id].append(websocket)

        logger.info(f"WebSocket connected for project {project_id}. Total: {len(self.active_connections[project_id])}")

    def disconnect(self, project_id: str, websocket: WebSocket):
        """移除連線"""
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)

            if len(self.active_connections[project_id]) == 0:
                del self.active_connections[project_id]

        logger.info(f"WebSocket disconnected for project {project_id}")

    async def send_to_project(self, project_id: str, message: dict):
        """
        發送訊息到指定專案的所有連線

        Args:
            project_id: 專案 ID
            message: 訊息內容
        """
        if project_id not in self.active_connections:
            return

        # 移除已斷線的連線
        disconnected = []

        for connection in self.active_connections[project_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message: {e}")
                disconnected.append(connection)

        # 清理斷線
        for conn in disconnected:
            self.disconnect(project_id, conn)


manager = ConnectionManager()


@router.websocket("/projects/{project_id}/progress")
async def websocket_progress(websocket: WebSocket, project_id: str):
    """
    WebSocket 端點：即時進度推送

    Args:
        project_id: 專案 ID

    訊息格式:
    {
        "type": "progress" | "stage_change" | "error" | "completed",
        "data": {
            "stage": "script_generating",
            "progress": 50,
            "sub_progress": 30,
            "message": "Generating script..."
        }
    }
    """
    await manager.connect(project_id, websocket)

    db = SessionLocal()
    progress_service = ProgressService(db)

    try:
        # 發送初始狀態
        current_status = progress_service.get_project_status(project_id)
        await websocket.send_json({
            "type": "initial",
            "data": current_status
        })

        # 開始監聽 Redis Pub/Sub
        await progress_service.subscribe_to_project(project_id, websocket)

        # 保持連線（接收客戶端 ping）
        while True:
            data = await websocket.receive_text()

            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {project_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(project_id, websocket)
        db.close()
```

---

### Progress Service

**檔案:** `app/services/progress_service.py`

```python
import redis
import json
import asyncio
from fastapi import WebSocket
from sqlalchemy.orm import Session
from app.models.project import Project
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class ProgressService:
    """進度管理服務"""

    def __init__(self, db: Session):
        self.db = db
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

    def get_project_status(self, project_id: str) -> dict:
        """
        取得專案當前狀態

        Args:
            project_id: 專案 ID

        Returns:
            狀態資訊
        """
        project = self.db.query(Project).filter(Project.id == project_id).first()

        if not project:
            raise ValueError(f"Project {project_id} not found")

        return {
            "project_id": project_id,
            "status": project.status,
            "progress": project.progress,
            "updated_at": project.updated_at.isoformat()
        }

    async def subscribe_to_project(self, project_id: str, websocket: WebSocket):
        """
        訂閱專案的 Redis Pub/Sub 頻道

        Args:
            project_id: 專案 ID
            websocket: WebSocket 連線
        """
        pubsub = self.redis_client.pubsub()
        channel = f"progress:{project_id}"

        pubsub.subscribe(channel)
        logger.info(f"Subscribed to Redis channel: {channel}")

        try:
            # 使用 asyncio 包裝 Redis pubsub（因為 redis-py 是同步的）
            for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])

                    # 發送到 WebSocket
                    await websocket.send_json({
                        "type": "progress",
                        "data": data
                    })

        except Exception as e:
            logger.error(f"Redis subscription error: {e}")
        finally:
            pubsub.unsubscribe(channel)

    def publish_progress(
        self,
        project_id: str,
        stage: str,
        progress: int,
        sub_progress: int = 0,
        message: str = ""
    ):
        """
        發布進度更新到 Redis

        Args:
            project_id: 專案 ID
            stage: 當前階段
            progress: 總進度 (0-100)
            sub_progress: 子階段進度 (0-100)
            message: 訊息
        """
        channel = f"progress:{project_id}"

        data = {
            "stage": stage,
            "progress": progress,
            "sub_progress": sub_progress,
            "message": message,
            "timestamp": asyncio.get_event_loop().time()
        }

        self.redis_client.publish(channel, json.dumps(data))

        logger.info(f"Published progress to {channel}: {progress}%")

    def publish_error(self, project_id: str, error_message: str, stage: str):
        """
        發布錯誤訊息

        Args:
            project_id: 專案 ID
            error_message: 錯誤訊息
            stage: 發生錯誤的階段
        """
        channel = f"progress:{project_id}"

        data = {
            "type": "error",
            "stage": stage,
            "message": error_message,
            "timestamp": asyncio.get_event_loop().time()
        }

        self.redis_client.publish(channel, json.dumps(data))

        logger.error(f"Published error to {channel}: {error_message}")

    def publish_completion(self, project_id: str):
        """
        發布完成訊息

        Args:
            project_id: 專案 ID
        """
        channel = f"progress:{project_id}"

        data = {
            "type": "completed",
            "progress": 100,
            "timestamp": asyncio.get_event_loop().time()
        }

        self.redis_client.publish(channel, json.dumps(data))

        logger.info(f"Published completion to {channel}")
```

---

### 進度管理器（整合到 Celery Tasks）

**檔案:** `app/utils/progress_manager.py`

```python
from app.services.progress_service import ProgressService
from app.database import SessionLocal

class ProgressManager:
    """進度管理器（用於 Celery 任務）"""

    STAGE_WEIGHTS = {
        "script_generating": 20,      # 0-20%
        "images_generating": 25,       # 20-45%
        "audio_generating": 10,        # 45-55%
        "avatars_generating": 10,      # 55-65%
        "rendering": 25,               # 65-90%
        "uploading": 10                # 90-100%
    }

    @staticmethod
    def update_progress(
        project_id: str,
        stage: str,
        sub_progress: int,
        message: str = ""
    ):
        """
        更新並廣播進度

        Args:
            project_id: 專案 ID
            stage: 當前階段
            sub_progress: 子進度 (0-100)
            message: 訊息
        """
        # 計算總進度
        total_progress = 0

        for s, weight in ProgressManager.STAGE_WEIGHTS.items():
            if s == stage:
                total_progress += weight * (sub_progress / 100)
                break
            else:
                total_progress += weight

        # 更新資料庫
        from app.models.project import Project
        db = SessionLocal()

        db.query(Project).filter(Project.id == project_id).update({
            "progress": int(total_progress),
            "status": stage
        })
        db.commit()
        db.close()

        # 發布到 Redis
        progress_service = ProgressService(SessionLocal())
        progress_service.publish_progress(
            project_id=project_id,
            stage=stage,
            progress=int(total_progress),
            sub_progress=sub_progress,
            message=message
        )
```

---

### 更新 Celery 任務以使用進度推送

**範例（更新 Task-010 的腳本生成任務）：**

```python
from app.utils.progress_manager import ProgressManager

@celery_app.task(bind=True, max_retries=3)
def generate_script(self, project_id: str):
    try:
        # 更新進度: 0%
        ProgressManager.update_progress(
            project_id,
            "script_generating",
            0,
            "Starting script generation..."
        )

        # ... (生成腳本邏輯)

        # 更新進度: 50%
        ProgressManager.update_progress(
            project_id,
            "script_generating",
            50,
            "Calling Gemini API..."
        )

        # ... (呼叫 API)

        # 更新進度: 100%
        ProgressManager.update_progress(
            project_id,
            "script_generating",
            100,
            "Script generated successfully"
        )

        return script.id

    except Exception as e:
        # 發布錯誤
        progress_service = ProgressService(SessionLocal())
        progress_service.publish_error(project_id, str(e), "script_generating")
        raise
```

---

## 完成檢查清單

- [ ] WebSocket 端點實作
- [ ] ConnectionManager 實作
- [ ] ProgressService 實作
- [ ] Redis Pub/Sub 整合
- [ ] ProgressManager 實作
- [ ] Celery 任務進度推送整合
- [ ] 錯誤處理與重連
- [ ] 測試通過

---

## 時間分配

- **WebSocket 端點:** 2 小時
- **Redis Pub/Sub 整合:** 2 小時
- **ProgressManager:** 1 小時
- **測試:** 1 小時

**總計:** 6 小時
