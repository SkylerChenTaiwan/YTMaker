"""WebSocket 端點 - 即時進度推送"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.redis import get_async_redis

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket 連線管理器"""

    def __init__(self):
        # 儲存所有活躍連線: {project_id: [websocket1, websocket2, ...]}
        self.active_connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        """新增連線"""
        await websocket.accept()

        if project_id not in self.active_connections:
            self.active_connections[project_id] = []

        self.active_connections[project_id].append(websocket)
        logger.info(
            f"Client connected to project {project_id}. "
            f"Total: {len(self.active_connections[project_id])}"
        )

    def disconnect(self, websocket: WebSocket, project_id: str):
        """移除連線"""
        if project_id in self.active_connections:
            if websocket in self.active_connections[project_id]:
                self.active_connections[project_id].remove(websocket)

            # 如果該專案沒有連線了,清理
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

        logger.info(f"Client disconnected from project {project_id}")

    async def broadcast(self, project_id: str, message: str):
        """廣播訊息給所有訂閱該專案的客戶端"""
        if project_id not in self.active_connections:
            return

        dead_connections = []

        for connection in self.active_connections[project_id]:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message: {e}")
                dead_connections.append(connection)

        # 清理斷線的連線
        for conn in dead_connections:
            self.disconnect(conn, project_id)


manager = ConnectionManager()


@router.websocket("/projects/{project_id}/progress")
async def progress_websocket(websocket: WebSocket, project_id: str):
    """
    WebSocket 端點: 即時推送專案生成進度

    ## 連線方式
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/api/v1/projects/1/progress');
    ```

    ## 訊息格式

    ### 連線成功
    ```json
    {
      "event": "connected",
      "data": {
        "project_id": "1",
        "timestamp": "2025-10-21T10:00:00Z"
      }
    }
    ```

    ### 進度更新
    ```json
    {
      "event": "progress_update",
      "data": {
        "status": "SCRIPT_GENERATING",
        "progress": 20,
        "current_stage": "正在生成腳本...",
        "estimated_remaining": 600,
        "timestamp": "2025-10-21T10:00:00Z"
      }
    }
    ```

    ### 階段變化
    ```json
    {
      "event": "stage_change",
      "data": {
        "previous_stage": "SCRIPT_GENERATING",
        "current_stage": "ASSETS_GENERATING",
        "progress": 25,
        "timestamp": "2025-10-21T10:00:00Z"
      }
    }
    ```

    ### 日誌訊息
    ```json
    {
      "event": "log",
      "data": {
        "level": "INFO",
        "message": "開始生成圖片...",
        "timestamp": "2025-10-21T10:00:00Z"
      }
    }
    ```

    ### 錯誤訊息
    ```json
    {
      "type": "error",
      "project_id": "1",
      "error": {
        "code": "GEMINI_QUOTA_EXCEEDED",
        "message": "Gemini API 配額已用盡",
        "stage": "SCRIPT_GENERATING",
        "is_retryable": false,
        "details": {...},
        "solutions": ["等待配額重置", "升級方案"],
        "timestamp": "2025-10-21T10:00:00Z"
      }
    }
    ```

    ### 完成訊息
    ```json
    {
      "event": "complete",
      "data": {
        "status": "COMPLETED",
        "youtube_url": "https://youtube.com/watch?v=...",
        "timestamp": "2025-10-21T10:00:00Z"
      }
    }
    ```

    ### 心跳檢測
    伺服器每 30 秒發送 ping，客戶端應回應 pong：
    ```json
    // Server → Client
    {"event": "ping", "data": {"timestamp": "..."}}

    // Client → Server
    {"event": "pong"}
    ```

    ## 參數
    - **project_id** (path): 專案 ID

    ## 注意事項
    - 支援多客戶端同時連線
    - 心跳機制：30秒 ping, 60秒無回應則斷線
    - 自動清理斷線連線
    - 所有訊息使用 JSON 格式
    """

    # 建立連線
    await manager.connect(websocket, project_id)

    # 取得 Redis 客戶端
    redis = get_async_redis()

    # 建立 Redis Pub/Sub
    pubsub = redis.pubsub()
    channel_name = f"progress:{project_id}"

    try:
        # 訂閱 Redis channel
        await pubsub.subscribe(channel_name)
        logger.info(f"Subscribed to Redis channel: {channel_name}")

        # 發送連線成功訊息
        await websocket.send_text(
            json.dumps(
                {
                    "event": "connected",
                    "data": {
                        "project_id": project_id,
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                    },
                }
            )
        )

        # 創建心跳任務
        heartbeat_task = asyncio.create_task(heartbeat(websocket))

        # 創建 Redis 監聽任務
        redis_task = asyncio.create_task(redis_listener(websocket, pubsub))

        # 等待任務完成(或異常)
        done, pending = await asyncio.wait(
            [heartbeat_task, redis_task], return_when=asyncio.FIRST_COMPLETED
        )

        # 取消未完成的任務
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for project {project_id}")

    except Exception as e:
        logger.error(f"WebSocket error for project {project_id}: {e}", exc_info=True)

    finally:
        # 清理連線
        manager.disconnect(websocket, project_id)

        # 取消 Redis 訂閱
        await pubsub.unsubscribe(channel_name)
        await pubsub.aclose()

        logger.info(f"Cleaned up WebSocket connection for project {project_id}")


async def redis_listener(websocket: WebSocket, pubsub):
    """
    監聽 Redis Pub/Sub 訊息並轉發給 WebSocket
    """
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                # 轉發訊息
                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode("utf-8")
                await websocket.send_text(data)
    except asyncio.CancelledError:
        logger.info("Redis listener cancelled")
        raise
    except Exception as e:
        logger.error(f"Error in redis_listener: {e}", exc_info=True)
        raise


async def heartbeat(websocket: WebSocket):
    """
    心跳檢測:每 30 秒發送一次 ping
    客戶端應回應 pong,否則 60 秒後視為斷線
    """
    last_pong = asyncio.get_event_loop().time()

    try:
        while True:
            # 等待 30 秒
            await asyncio.sleep(30)

            # 發送 ping
            ping_message = json.dumps(
                {
                    "event": "ping",
                    "data": {"timestamp": datetime.utcnow().isoformat() + "Z"},
                }
            )
            await websocket.send_text(ping_message)

            # 檢查是否超過 60 秒沒收到 pong
            current_time = asyncio.get_event_loop().time()
            if current_time - last_pong > 60:
                logger.warning("No pong received for 60 seconds, closing connection")
                await websocket.close()
                break

            # 嘗試接收 pong (非阻塞)
            try:
                pong_data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                pong_msg = json.loads(pong_data)
                if pong_msg.get("event") == "pong":
                    last_pong = asyncio.get_event_loop().time()
            except asyncio.TimeoutError:
                pass  # 沒收到也沒關係,等下次檢查
            except json.JSONDecodeError:
                pass  # JSON 解析失敗,忽略

    except asyncio.CancelledError:
        logger.info("Heartbeat cancelled")
        raise
    except Exception as e:
        logger.error(f"Heartbeat error: {e}", exc_info=True)
        raise
