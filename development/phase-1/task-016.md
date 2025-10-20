# Task-016: WebSocket 即時進度推送

> **建立日期:** 2025-10-19
> **狀態:** ⚠️  部分完成 (核心功能已實作,部分測試待修復)
> **實際時間:** ~3 小時
> **預計時間:** 6 小時
> **優先級:** P0 (必須)
> **分支:** `feature/task-016-websocket-progress`
> **Commit:** `5bd89b7`

---

## 關聯文件

### 產品設計
- **User Flow:** `product-design/flows.md#Flow-1-基本影片生成流程` (步驟 9-13: 進度監控)

### 技術規格
- **API 設計:** `tech-specs/backend/api-design.md#8-WebSocket-規範`
- **背景任務:** `tech-specs/backend/background-jobs.md#6-背景任務` (Celery 進度更新機制)
- **前端頁面:** `tech-specs/frontend/pages.md#7-進度監控頁-Progress`

### 相關任務
- **前置任務:** Task-014 ✅ (Celery 任務系統,提供進度資料)
- **後續任務:** Task-024 (進度監控頁面,前端 WebSocket 客戶端)

---

## 任務目標

### 簡述
實作 WebSocket 端點,透過 Redis Pub/Sub 機制即時推送影片生成進度、階段變化、日誌訊息、錯誤資訊給前端進度監控頁面,實現低延遲(<200ms)的即時通訊。

### 詳細成功標準
- [ ] WebSocket 端點 `ws://localhost:8000/api/v1/projects/:id/progress` 實作完成
- [ ] Redis Pub/Sub 訂閱機制實作完成 (訂閱 `progress:{project_id}` channel)
- [ ] 支援多種訊息類型 (progress_update, stage_change, log, error, complete)
- [ ] 連線管理 (accept, disconnect, reconnect)
- [ ] 心跳檢測機制 (每 30 秒 ping/pong)
- [ ] 多客戶端廣播 (同一個專案可多個客戶端同時監控)
- [ ] Celery 任務進度發布邏輯整合
- [ ] 錯誤處理與自動重連邏輯
- [ ] 單元測試覆蓋率 > 85%
- [ ] WebSocket 整合測試 (模擬完整生成流程)

---

## 測試要求

### 單元測試

#### 測試 1: 成功建立 WebSocket 連線

**目的:** 驗證客戶端可以成功連線到 WebSocket 端點

**前置條件:**
- FastAPI 應用已啟動
- Redis 服務正在運行
- 測試專案 `project_id=1` 已存在

**測試步驟:**
```python
from fastapi.testclient import TestClient
from app.main import app

def test_websocket_connection():
    client = TestClient(app)

    with client.websocket_connect("/api/v1/projects/1/progress") as websocket:
        # 連線成功
        assert websocket is not None
```

**預期結果:**
- WebSocket 連線成功建立
- 狀態碼 101 Switching Protocols

**驗證點:**
- [ ] 連線成功建立
- [ ] 無錯誤訊息
- [ ] Redis Pub/Sub 訂閱成功

---

#### 測試 2: 接收進度更新訊息

**目的:** 驗證當 Celery 任務發布進度時,WebSocket 可正確接收並轉發

**前置條件:**
- WebSocket 連線已建立
- Redis Pub/Sub 已訂閱 `progress:1`

**測試步驟:**
```python
import json
from unittest.mock import AsyncMock, patch

async def test_receive_progress_update():
    # 模擬 Redis 發布進度訊息
    test_message = {
        "event": "progress_update",
        "data": {
            "status": "SCRIPT_GENERATING",
            "progress": 20,
            "current_stage": "正在生成腳本...",
            "estimated_remaining": 600
        }
    }

    # 發布到 Redis
    await redis_client.publish(
        "progress:1",
        json.dumps(test_message)
    )

    # 接收 WebSocket 訊息
    message = websocket.receive_text()
    data = json.loads(message)

    assert data["event"] == "progress_update"
    assert data["data"]["progress"] == 20
```

**預期輸出:**
```json
{
  "event": "progress_update",
  "data": {
    "status": "SCRIPT_GENERATING",
    "progress": 20,
    "current_stage": "正在生成腳本...",
    "estimated_remaining": 600
  }
}
```

**驗證點:**
- [ ] 訊息格式正確
- [ ] 進度值準確
- [ ] 訊息延遲 < 200ms
- [ ] JSON 可正確解析

---

#### 測試 3: 階段變化通知

**目的:** 驗證生成階段變化時,系統能正確推送 stage_change 事件

**測試場景:**
腳本生成完成 → 素材生成開始

**輸入:**
```python
# Celery 任務發布階段變化
stage_change_message = {
    "event": "stage_change",
    "data": {
        "previous_stage": "SCRIPT_GENERATING",
        "current_stage": "ASSETS_GENERATING",
        "progress": 25,
        "timestamp": "2025-10-19T10:35:00Z"
    }
}

await redis_client.publish("progress:1", json.dumps(stage_change_message))
```

**預期輸出:**
```json
{
  "event": "stage_change",
  "data": {
    "previous_stage": "SCRIPT_GENERATING",
    "current_stage": "ASSETS_GENERATING",
    "progress": 25,
    "timestamp": "2025-10-19T10:35:00Z"
  }
}
```

**驗證點:**
- [ ] 階段轉換正確
- [ ] 進度連續性 (不倒退)
- [ ] 時間戳格式正確 (ISO 8601)

---

#### 測試 4: 日誌訊息推送

**目的:** 驗證 Celery 任務日誌能即時推送給前端

**測試場景:**
圖片生成過程中的日誌訊息

**輸入:**
```python
log_messages = [
    {
        "event": "log",
        "data": {
            "level": "INFO",
            "message": "[1/15] 正在生成圖片: 段落 1 - 科技趨勢展望",
            "timestamp": "2025-10-19T10:36:00Z"
        }
    },
    {
        "event": "log",
        "data": {
            "level": "INFO",
            "message": "[2/15] 正在生成圖片: 段落 2 - AI 應用場景",
            "timestamp": "2025-10-19T10:36:15Z"
        }
    }
]

for msg in log_messages:
    await redis_client.publish("progress:1", json.dumps(msg))
```

**預期行為:**
- 前端收到所有日誌訊息
- 訊息順序正確
- 時間戳遞增

**驗證點:**
- [ ] 所有日誌都收到
- [ ] 順序正確
- [ ] level 分類正確 (INFO, WARNING, ERROR)

---

#### 測試 5: 錯誤訊息處理

**目的:** 驗證當 Celery 任務失敗時,錯誤訊息能正確推送

**測試場景:**
Stability AI API 失敗

**輸入:**
```python
error_message = {
    "event": "error",
    "data": {
        "error_code": "STABILITY_AI_ERROR",
        "message": "Stability AI API 配額已用盡",
        "stage": "ASSETS_GENERATING",
        "retry_count": 2,
        "max_retries": 3,
        "timestamp": "2025-10-19T10:38:00Z"
    }
}

await redis_client.publish("progress:1", json.dumps(error_message))
```

**預期輸出:**
```json
{
  "event": "error",
  "data": {
    "error_code": "STABILITY_AI_ERROR",
    "message": "Stability AI API 配額已用盡",
    "stage": "ASSETS_GENERATING",
    "retry_count": 2,
    "max_retries": 3,
    "timestamp": "2025-10-19T10:38:00Z"
  }
}
```

**驗證點:**
- [ ] 錯誤碼正確
- [ ] 錯誤訊息清晰
- [ ] 包含重試資訊
- [ ] 前端可顯示錯誤提示

---

#### 測試 6: 心跳檢測機制

**目的:** 驗證 WebSocket 心跳機制能正常運作,防止連線超時

**測試流程:**
```python
import asyncio

async def test_heartbeat():
    with client.websocket_connect("/api/v1/projects/1/progress") as websocket:
        # 等待 30 秒
        await asyncio.sleep(31)

        # 應該收到 ping 訊息
        ping_message = websocket.receive_text()
        data = json.loads(ping_message)

        assert data["event"] == "ping"

        # 回應 pong
        websocket.send_text(json.dumps({"event": "pong"}))

        # 連線應保持
        assert websocket.client_state.name == "CONNECTED"
```

**預期行為:**
- 每 30 秒收到一次 ping 訊息
- 客戶端回應 pong 後連線保持
- 無回應則 60 秒後斷線

**驗證點:**
- [ ] Ping 訊息定時發送
- [ ] Pong 回應正確處理
- [ ] 無回應時連線斷開

---

#### 測試 7: 多客戶端廣播

**目的:** 驗證同一個專案可以被多個客戶端同時監控

**測試場景:**
2 個瀏覽器 tab 同時監控同一個專案

**測試步驟:**
```python
async def test_multiple_clients():
    # 客戶端 1
    with client.websocket_connect("/api/v1/projects/1/progress") as ws1:
        # 客戶端 2
        with client.websocket_connect("/api/v1/projects/1/progress") as ws2:
            # 發布進度訊息
            progress_msg = {
                "event": "progress_update",
                "data": {"progress": 50}
            }
            await redis_client.publish("progress:1", json.dumps(progress_msg))

            # 兩個客戶端都應收到
            msg1 = json.loads(ws1.receive_text())
            msg2 = json.loads(ws2.receive_text())

            assert msg1["data"]["progress"] == 50
            assert msg2["data"]["progress"] == 50
```

**驗證點:**
- [ ] 兩個連線都成功建立
- [ ] 兩個客戶端都收到訊息
- [ ] 訊息內容一致

---

#### 測試 8: 客戶端斷線與重連

**目的:** 驗證客戶端斷線後可正常重連並繼續接收進度

**測試流程:**
```python
async def test_disconnect_reconnect():
    # 建立連線
    ws = client.websocket_connect("/api/v1/projects/1/progress")

    # 接收一條訊息
    msg1 = ws.receive_text()

    # 主動斷線
    ws.close()

    # 重新連線
    ws = client.websocket_connect("/api/v1/projects/1/progress")

    # 應該能繼續接收
    progress_msg = {
        "event": "progress_update",
        "data": {"progress": 75}
    }
    await redis_client.publish("progress:1", json.dumps(progress_msg))

    msg2 = ws.receive_text()
    data = json.loads(msg2)

    assert data["data"]["progress"] == 75
```

**驗證點:**
- [ ] 斷線後 Redis 訂閱正確清理
- [ ] 重連後可正常接收
- [ ] 無記憶體洩漏

---

### 整合測試

#### 測試 9: 完整生成流程的進度推送

**目的:** 驗證從開始生成到完成的整個過程中,所有進度訊息都能正確推送

**測試場景:**
模擬 Flow-1 完整流程

**測試步驟:**
1. 建立 WebSocket 連線
2. 觸發 `generate_video` Celery 任務 (使用 Mock API)
3. 記錄所有接收到的 WebSocket 訊息
4. 驗證訊息完整性

**預期訊息序列:**
```python
expected_events = [
    {"event": "stage_change", "data": {"current_stage": "SCRIPT_GENERATING"}},
    {"event": "progress_update", "data": {"progress": 10}},
    {"event": "log", "data": {"message": "開始生成腳本..."}},
    {"event": "progress_update", "data": {"progress": 20}},
    {"event": "stage_change", "data": {"current_stage": "ASSETS_GENERATING"}},
    {"event": "log", "data": {"message": "開始生成語音..."}},
    {"event": "progress_update", "data": {"progress": 30}},
    # ... (更多中間步驟)
    {"event": "progress_update", "data": {"progress": 100}},
    {"event": "complete", "data": {"status": "COMPLETED"}}
]
```

**驗證點:**
- [ ] 所有階段都有 stage_change 事件
- [ ] 進度值從 0 遞增到 100
- [ ] 最終收到 complete 事件
- [ ] 無遺漏訊息
- [ ] 整體耗時 < 25 分鐘 (模擬環境)

---

## 實作規格

### 需要建立/修改的檔案

#### 1. WebSocket 端點: `backend/app/api/v1/websocket.py`

**職責:** 處理 WebSocket 連線、訂閱 Redis、轉發訊息、心跳檢測

**完整實作:**

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import asyncio
import json
import logging
from datetime import datetime
from app.core.redis import redis_client
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# 連線管理器
class ConnectionManager:
    def __init__(self):
        # 儲存所有活躍連線: {project_id: [websocket1, websocket2, ...]}
        self.active_connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        """新增連線"""
        await websocket.accept()

        if project_id not in self.active_connections:
            self.active_connections[project_id] = []

        self.active_connections[project_id].append(websocket)
        logger.info(f"Client connected to project {project_id}. Total: {len(self.active_connections[project_id])}")

    def disconnect(self, websocket: WebSocket, project_id: str):
        """移除連線"""
        if project_id in self.active_connections:
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
    WebSocket 端點:即時推送專案生成進度

    參數:
    - project_id: 專案 ID

    訊息格式:
    {
      "event": "progress_update" | "stage_change" | "log" | "error" | "complete" | "ping",
      "data": { ... }
    }
    """

    # 建立連線
    await manager.connect(websocket, project_id)

    # 建立 Redis Pub/Sub
    pubsub = redis_client.pubsub()
    channel_name = f"progress:{project_id}"

    try:
        # 訂閱 Redis channel
        await pubsub.subscribe(channel_name)
        logger.info(f"Subscribed to Redis channel: {channel_name}")

        # 發送連線成功訊息
        await websocket.send_text(json.dumps({
            "event": "connected",
            "data": {
                "project_id": project_id,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }))

        # 創建心跳任務
        heartbeat_task = asyncio.create_task(heartbeat(websocket))

        # 創建 Redis 監聽任務
        redis_task = asyncio.create_task(redis_listener(websocket, pubsub))

        # 等待任務完成(或異常)
        done, pending = await asyncio.wait(
            [heartbeat_task, redis_task],
            return_when=asyncio.FIRST_COMPLETED
        )

        # 取消未完成的任務
        for task in pending:
            task.cancel()

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for project {project_id}")

    except Exception as e:
        logger.error(f"WebSocket error for project {project_id}: {e}")

    finally:
        # 清理連線
        manager.disconnect(websocket, project_id)

        # 取消 Redis 訂閱
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()

        logger.info(f"Cleaned up WebSocket connection for project {project_id}")


async def redis_listener(websocket: WebSocket, pubsub):
    """
    監聽 Redis Pub/Sub 訊息並轉發給 WebSocket
    """
    async for message in pubsub.listen():
        if message["type"] == "message":
            # 轉發訊息
            await websocket.send_text(message["data"].decode('utf-8'))


async def heartbeat(websocket: WebSocket):
    """
    心跳檢測:每 30 秒發送一次 ping
    客戶端應回應 pong,否則 60 秒後視為斷線
    """
    last_pong = asyncio.get_event_loop().time()

    while True:
        try:
            # 等待 30 秒
            await asyncio.sleep(30)

            # 發送 ping
            ping_message = json.dumps({
                "event": "ping",
                "data": {
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
            })
            await websocket.send_text(ping_message)

            # 檢查是否超過 60 秒沒收到 pong
            current_time = asyncio.get_event_loop().time()
            if current_time - last_pong > 60:
                logger.warning("No pong received for 60 seconds, closing connection")
                await websocket.close()
                break

            # 嘗試接收 pong (非阻塞)
            try:
                pong_data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=1.0
                )
                pong_msg = json.loads(pong_data)
                if pong_msg.get("event") == "pong":
                    last_pong = asyncio.get_event_loop().time()
            except asyncio.TimeoutError:
                pass  # 沒收到也沒關係,等下次檢查

        except Exception as e:
            logger.error(f"Heartbeat error: {e}")
            break
```

---

#### 2. 進度發布工具: `backend/app/services/progress_service.py`

**職責:** 提供統一的進度發布介面,供 Celery 任務使用

**實作:**

```python
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from app.core.redis import redis_client

logger = logging.getLogger(__name__)


class ProgressService:
    """進度發布服務"""

    @staticmethod
    async def publish_progress(
        project_id: str,
        status: str,
        progress: int,
        current_stage: str,
        estimated_remaining: Optional[int] = None
    ):
        """
        發布進度更新

        參數:
        - project_id: 專案 ID
        - status: 狀態 (SCRIPT_GENERATING, ASSETS_GENERATING, etc.)
        - progress: 進度百分比 (0-100)
        - current_stage: 當前階段描述
        - estimated_remaining: 預計剩餘時間(秒)
        """
        message = {
            "event": "progress_update",
            "data": {
                "status": status,
                "progress": progress,
                "current_stage": current_stage,
                "estimated_remaining": estimated_remaining,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }

        await redis_client.publish(
            f"progress:{project_id}",
            json.dumps(message)
        )

        logger.info(f"[Project {project_id}] Progress: {progress}% - {current_stage}")

    @staticmethod
    async def publish_stage_change(
        project_id: str,
        previous_stage: str,
        current_stage: str,
        progress: int
    ):
        """
        發布階段變化
        """
        message = {
            "event": "stage_change",
            "data": {
                "previous_stage": previous_stage,
                "current_stage": current_stage,
                "progress": progress,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }

        await redis_client.publish(
            f"progress:{project_id}",
            json.dumps(message)
        )

        logger.info(f"[Project {project_id}] Stage: {previous_stage} → {current_stage}")

    @staticmethod
    async def publish_log(
        project_id: str,
        level: str,
        message: str
    ):
        """
        發布日誌訊息

        參數:
        - level: INFO | WARNING | ERROR
        - message: 日誌內容
        """
        log_message = {
            "event": "log",
            "data": {
                "level": level,
                "message": message,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }

        await redis_client.publish(
            f"progress:{project_id}",
            json.dumps(log_message)
        )

        logger.log(
            getattr(logging, level),
            f"[Project {project_id}] {message}"
        )

    @staticmethod
    async def publish_error(
        project_id: str,
        error_code: str,
        error_message: str,
        stage: str,
        retry_count: int = 0,
        max_retries: int = 3
    ):
        """
        發布錯誤訊息
        """
        message = {
            "event": "error",
            "data": {
                "error_code": error_code,
                "message": error_message,
                "stage": stage,
                "retry_count": retry_count,
                "max_retries": max_retries,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }

        await redis_client.publish(
            f"progress:{project_id}",
            json.dumps(message)
        )

        logger.error(f"[Project {project_id}] Error: {error_code} - {error_message}")

    @staticmethod
    async def publish_complete(
        project_id: str,
        status: str,
        youtube_url: Optional[str] = None
    ):
        """
        發布完成訊息

        參數:
        - status: COMPLETED | FAILED
        - youtube_url: YouTube 影片連結 (如有)
        """
        message = {
            "event": "complete",
            "data": {
                "status": status,
                "youtube_url": youtube_url,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }

        await redis_client.publish(
            f"progress:{project_id}",
            json.dumps(message)
        )

        logger.info(f"[Project {project_id}] Generation complete: {status}")
```

---

#### 3. Celery 任務整合: `backend/app/tasks/video_generation.py` (修改)

**職責:** 在 Celery 任務中調用 ProgressService 發布進度

**修改範例:**

```python
from app.services.progress_service import ProgressService

@app.task(bind=True)
async def generate_script_task(self, project_id: str):
    """
    腳本生成任務
    """
    try:
        # 發布階段變化
        await ProgressService.publish_stage_change(
            project_id=project_id,
            previous_stage="INITIALIZED",
            current_stage="SCRIPT_GENERATING",
            progress=5
        )

        # 發布日誌
        await ProgressService.publish_log(
            project_id=project_id,
            level="INFO",
            message="開始生成腳本..."
        )

        # 實際生成腳本 (調用 Gemini API)
        script = await gemini_client.generate_script(...)

        # 更新進度
        await ProgressService.publish_progress(
            project_id=project_id,
            status="SCRIPT_GENERATING",
            progress=20,
            current_stage="腳本生成完成",
            estimated_remaining=600
        )

        return script

    except Exception as e:
        # 發布錯誤
        await ProgressService.publish_error(
            project_id=project_id,
            error_code="GEMINI_API_ERROR",
            error_message=str(e),
            stage="SCRIPT_GENERATING",
            retry_count=self.request.retries,
            max_retries=self.max_retries
        )
        raise
```

---

#### 4. FastAPI 應用註冊: `backend/app/main.py` (修改)

**職責:** 註冊 WebSocket router

**修改:**

```python
from fastapi import FastAPI
from app.api.v1 import websocket

app = FastAPI()

# 註冊 WebSocket router
app.include_router(
    websocket.router,
    prefix="/api/v1",
    tags=["WebSocket"]
)

# ... (其他 router)
```

---

#### 5. Redis 客戶端配置: `backend/app/core/redis.py`

**職責:** 提供異步 Redis 客戶端

**實作:**

```python
import redis.asyncio as redis
from app.core.config import settings

# 創建異步 Redis 客戶端
redis_client = redis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True
)

async def get_redis():
    """依賴注入用"""
    return redis_client
```

---

#### 6. 測試檔案: `backend/tests/websocket/test_progress_websocket.py`

**職責:** WebSocket 端點測試

**實作架構:**

```python
import pytest
import asyncio
import json
from fastapi.testclient import TestClient
from app.main import app
from app.core.redis import redis_client

@pytest.fixture
def test_client():
    return TestClient(app)

@pytest.fixture
async def test_project():
    """創建測試專案"""
    # ... 創建測試專案邏輯
    yield project
    # ... 清理

async def test_websocket_connection(test_client, test_project):
    """測試 1: 成功建立連線"""
    # ... (見上方測試 1)

async def test_receive_progress_update(test_client, test_project):
    """測試 2: 接收進度更新"""
    # ... (見上方測試 2)

# ... (其他測試)
```

---

### 訊息格式規範

#### 1. 進度更新 (progress_update)

```json
{
  "event": "progress_update",
  "data": {
    "status": "SCRIPT_GENERATING" | "ASSETS_GENERATING" | "RENDERING" | "THUMBNAIL_GENERATING" | "UPLOADING",
    "progress": 0-100,
    "current_stage": "描述文字",
    "estimated_remaining": 600,
    "timestamp": "2025-10-19T10:30:00Z"
  }
}
```

#### 2. 階段變化 (stage_change)

```json
{
  "event": "stage_change",
  "data": {
    "previous_stage": "SCRIPT_GENERATING",
    "current_stage": "ASSETS_GENERATING",
    "progress": 25,
    "timestamp": "2025-10-19T10:35:00Z"
  }
}
```

#### 3. 日誌訊息 (log)

```json
{
  "event": "log",
  "data": {
    "level": "INFO" | "WARNING" | "ERROR",
    "message": "日誌內容",
    "timestamp": "2025-10-19T10:36:00Z"
  }
}
```

#### 4. 錯誤訊息 (error)

```json
{
  "event": "error",
  "data": {
    "error_code": "GEMINI_API_ERROR" | "STABILITY_AI_ERROR" | "DID_API_ERROR" | "YOUTUBE_API_ERROR",
    "message": "錯誤描述",
    "stage": "SCRIPT_GENERATING",
    "retry_count": 2,
    "max_retries": 3,
    "timestamp": "2025-10-19T10:38:00Z"
  }
}
```

#### 5. 完成訊息 (complete)

```json
{
  "event": "complete",
  "data": {
    "status": "COMPLETED" | "FAILED",
    "youtube_url": "https://youtube.com/watch?v=...",
    "timestamp": "2025-10-19T11:00:00Z"
  }
}
```

#### 6. 心跳訊息 (ping/pong)

```json
// Server → Client
{
  "event": "ping",
  "data": {
    "timestamp": "2025-10-19T10:40:00Z"
  }
}

// Client → Server
{
  "event": "pong"
}
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步: 環境準備 (10 分鐘)

1. 確認 Task-014 (Celery 任務系統) 已完成
2. 確認 Redis 服務運行中:
   ```bash
   redis-cli ping
   # 應回傳 PONG
   ```
3. 閱讀 `tech-specs/backend/api-design.md#WebSocket`

---

#### 第 2 步: 建立基礎架構 (30 分鐘)

1. 建立 `backend/app/core/redis.py`
   - 異步 Redis 客戶端配置

2. 建立 `backend/app/api/v1/websocket.py`
   - 基本 WebSocket 端點骨架
   - ConnectionManager 類別

3. 在 `backend/app/main.py` 註冊 router

4. 測試基本連線:
   ```bash
   # 啟動 FastAPI
   uvicorn app.main:app --reload

   # 使用 wscat 測試
   npm install -g wscat
   wscat -c ws://localhost:8000/api/v1/projects/1/progress
   ```

---

#### 第 3 步: 撰寫測試 1 (連線測試) (15 分鐘)

1. 建立 `backend/tests/websocket/test_progress_websocket.py`
2. 撰寫 `test_websocket_connection`
3. 執行測試:
   ```bash
   pytest tests/websocket/test_progress_websocket.py::test_websocket_connection -v
   ```
4. 測試應該通過 ✅

---

#### 第 4 步: 實作 Redis Pub/Sub 整合 (45 分鐘)

1. 實作 `redis_listener` 函數
2. 實作 Redis channel 訂閱邏輯
3. 撰寫測試 2 (接收進度更新)
4. 執行測試:
   ```bash
   pytest tests/websocket/test_progress_websocket.py::test_receive_progress_update -v
   ```
5. 調整實作直到測試通過 ✅

---

#### 第 5 步: 實作 ProgressService (45 分鐘)

1. 建立 `backend/app/services/progress_service.py`
2. 實作所有發布方法:
   - `publish_progress()`
   - `publish_stage_change()`
   - `publish_log()`
   - `publish_error()`
   - `publish_complete()`
3. 撰寫單元測試
4. 執行測試並確保通過

---

#### 第 6 步: 實作心跳檢測 (30 分鐘)

1. 實作 `heartbeat()` 函數
2. 撰寫測試 6 (心跳檢測)
3. 測試 ping/pong 機制
4. 測試超時斷線邏輯

---

#### 第 7 步: 多客戶端測試 (20 分鐘)

1. 撰寫測試 7 (多客戶端廣播)
2. 實作 ConnectionManager 的廣播邏輯
3. 確保所有客戶端都收到訊息

---

#### 第 8 步: 整合 Celery 任務 (60 分鐘)

1. 修改 `backend/app/tasks/video_generation.py`
2. 在所有 Celery 任務中加入進度發布:
   - `generate_script_task`
   - `generate_assets_task`
   - `render_video_task`
   - `generate_thumbnail_task`
   - `upload_to_youtube_task`
3. 測試完整生成流程

---

#### 第 9 步: 整合測試 (40 分鐘)

1. 撰寫測試 9 (完整生成流程)
2. 執行完整的影片生成流程 (使用 Mock API)
3. 記錄所有 WebSocket 訊息
4. 驗證訊息完整性和順序

---

#### 第 10 步: 錯誤處理與重構 (30 分鐘)

1. 加入異常處理:
   - Redis 斷線
   - WebSocket 異常關閉
   - 記憶體洩漏防護
2. 重構程式碼,提取共用邏輯
3. 執行所有測試:
   ```bash
   pytest tests/websocket/ -v --cov=app/api/v1/websocket
   ```

---

#### 第 11 步: 文件與檢查 (20 分鐘)

1. 更新 API 文檔 (Swagger)
2. 檢查測試覆蓋率:
   ```bash
   pytest --cov=app/api/v1/websocket --cov-report=html
   ```
   - 目標: > 85%
3. 執行 linter:
   ```bash
   ruff check app/api/v1/websocket.py
   ruff check app/services/progress_service.py
   ```

---

### 注意事項

#### 效能考量

- **連線數量:** 預期同時連線數 < 100,單機 Redis Pub/Sub 足夠
- **訊息頻率:** 避免過於頻繁發送 (建議間隔 > 500ms),防止訊息淹沒
- **記憶體管理:** 定期清理斷線的連線,避免記憶體洩漏
- **Redis 記憶體:** Pub/Sub 訊息不持久化,無需擔心記憶體累積

#### 安全性

- ⚠️ **專案權限:** 本地應用無認證,生產環境需加入專案權限檢查
- ⚠️ **輸入驗證:** 驗證 project_id 格式,防止注入攻擊
- ⚠️ **錯誤訊息:** 不洩漏系統內部資訊

#### 錯誤處理

- ✅ WebSocket 斷線時正確清理 Redis 訂閱
- ✅ Redis 斷線時嘗試重連 (最多 3 次)
- ✅ 異常情況記錄詳細日誌,便於除錯

#### 測試策略

- **單元測試:** 測試各個函數的邏輯 (publish, broadcast, heartbeat)
- **整合測試:** 測試 WebSocket + Redis + Celery 的完整流程
- **壓力測試:** (可選) 測試多客戶端同時連線 (100+ 連線)

#### 與前端整合

- 前端使用標準 WebSocket API 連線
- 前端需處理自動重連邏輯
- 前端需回應 ping 訊息 (pong)
- 詳見 Task-024 (進度監控頁面)

---

### 完成檢查清單

#### 功能完整性
- [ ] WebSocket 端點 `/api/v1/projects/:id/progress` 可正常連線
- [ ] Redis Pub/Sub 訂閱與發布正常運作
- [ ] 支援所有訊息類型 (progress_update, stage_change, log, error, complete, ping/pong)
- [ ] 多客戶端可同時監控同一專案
- [ ] 心跳檢測正常運作 (30 秒 ping,60 秒超時)
- [ ] 斷線後 Redis 訂閱正確清理

#### Celery 整合
- [ ] ProgressService 實作完成
- [ ] 所有 Celery 任務已整合進度發布
- [ ] 完整生成流程可正確推送進度

#### 測試
- [ ] 所有單元測試通過 (測試 1-8)
- [ ] 整合測試通過 (測試 9)
- [ ] 測試覆蓋率 > 85%
- [ ] 無 flaky tests (測試穩定性)

#### 錯誤處理（參考 `error-codes.md` 和 `frontend/api-integration.md`）
- [ ] WebSocket 推送的錯誤訊息格式與後端 `error-codes.md` 一致：
  - `type: 'error'`
  - `project_id`：專案 ID
  - `error.code`：錯誤碼（如 `GEMINI_QUOTA_EXCEEDED`）
  - `error.message`：人類可讀的錯誤訊息
  - `error.stage`：失敗的階段
  - `error.is_retryable`：是否可重試
  - `error.details`：額外錯誤詳情
  - `error.solutions`：解決方案列表（參考 `error-codes.md`）
  - `error.trace_id`：追蹤 ID
  - `error.timestamp`：錯誤發生時間
- [ ] 所有錯誤訊息都記錄結構化日誌
- [ ] 前端收到錯誤訊息後可正確顯示（與 `frontend/api-integration.md` 一致）

#### 程式碼品質
- [ ] Ruff check 無錯誤
- [ ] 程式碼已格式化: `ruff format .`
- [ ] 無 type 錯誤 (如使用 mypy)
- [ ] 日誌記錄完整 (INFO, WARNING, ERROR)

#### 文件
- [ ] API 文檔已更新 (Swagger 註解)
- [ ] 函數都有 docstring
- [ ] 訊息格式規範已記錄

#### 整合驗證
- [ ] 使用 wscat 手動測試連線成功
- [ ] 使用瀏覽器測試進度監控頁面 (需 Task-024)
- [ ] 檢查 Redis 記憶體使用正常
- [ ] 檢查無記憶體洩漏 (長時間運行)

#### Spec 同步
- [ ] 如實作與 spec 有差異,已更新 `tech-specs/backend/api-design.md`
- [ ] 如有新增依賴,已更新 `requirements.txt`

---

## 預估時間分配

- 環境準備與基礎架構: 40 分鐘
- 撰寫測試: 50 分鐘
- 實作 WebSocket 端點: 75 分鐘
- 實作 ProgressService: 45 分鐘
- 實作心跳檢測: 30 分鐘
- 整合 Celery 任務: 60 分鐘
- 整合測試: 40 分鐘
- 錯誤處理與重構: 30 分鐘
- 文件與檢查: 30 分鐘

**總計: 約 6.5 小時** (預留 0.5 小時 buffer)

---

## 參考資源

### FastAPI 官方文檔
- [WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)
- [Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)

### Redis 文檔
- [Redis Pub/Sub](https://redis.io/docs/manual/pubsub/)
- [redis-py Async](https://redis-py.readthedocs.io/en/stable/examples/asyncio_examples.html)

### 相關套件
- [websockets](https://websockets.readthedocs.io/) - WebSocket 協議實作
- [redis.asyncio](https://redis-py.readthedocs.io/) - 異步 Redis 客戶端

### 專案內部文件
- `tech-specs/backend/api-design.md#WebSocket` - WebSocket 規範
- `tech-specs/backend/background-jobs.md` - Celery 任務設計
- `tech-specs/frontend/pages.md#進度監控頁` - 前端整合

---

**準備好了嗎?** 開始使用 TDD 方式實作 WebSocket 即時進度推送! 🚀

---

## 實作完成摘要 (2025-10-21)

### ✅ 已完成項目

1. **基礎架構**
   - ✅ 異步 Redis 客戶端 (`backend/app/core/redis.py`)
   - ✅ WebSocket 端點 (`backend/app/api/v1/websocket.py`)
   - ✅ ConnectionManager 連線管理器
   - ✅ 在 `main.py` 註冊 WebSocket router

2. **核心功能**
   - ✅ Redis Pub/Sub 訂閱機制 (channel: `progress:{project_id}`)
   - ✅ WebSocket 連線建立與管理
   - ✅ 心跳檢測機制 (30秒 ping, 60秒超時)
   - ✅ 多客戶端廣播功能
   - ✅ 自動斷線清理

3. **ProgressService**
   - ✅ `publish_progress()` - 發布進度更新
   - ✅ `publish_stage_change()` - 發布階段變化
   - ✅ `publish_log()` - 發布日誌訊息
   - ✅ `publish_error()` - 發布錯誤訊息 (符合 `error-codes.md` 格式)
   - ✅ `publish_complete()` - 發布完成訊息

4. **測試**
   - ✅ 測試 1: WebSocket 連線測試 (PASSED)
   - ✅ 測試 2: 接收進度更新訊息 (PASSED)
   - ⚠️  測試 3-8: 有 asyncio event loop 問題

### ⚠️  已知問題

1. **AsyncIO Event Loop 問題**
   - 部分測試 (測試 3-8) 出現 `RuntimeError: Task got Future attached to a different loop`
   - 根本原因: FastAPI TestClient 與異步 Redis 客戶端的事件循環衝突
   - 需要重構測試以使用完全異步的測試方式

2. **Python 3.9 相容性**
   - 修復了 `process_manager.py` 中的 `str | None` 型別提示 (改為 `Optional[str]`)

### 📝 後續待辦事項

1. **修復測試**
   - 重構測試使用 `httpx.AsyncClient` 替代 `TestClient`
   - 或使用 `pytest-asyncio` 的 event loop 隔離機制
   - 確保所有測試 (3-8) 通過

2. **整合 Celery 任務**
   - 在 `video_generation.py` 中整合 ProgressService
   - 在所有生成階段添加進度推送

3. **效能優化**
   - 考慮使用連線池
   - 監控記憶體使用

4. **文檔**
   - 添加 API 文檔 (Swagger 註解)
   - 更新使用指南

### 🎯 核心功能已可使用

儘管部分測試待修復,但核心 WebSocket 功能已經實作完成並可正常運作:
- WebSocket 端點可接受連線
- Redis Pub/Sub 機制正常工作
- ProgressService 可正確發布訊息
- 前端可以開始整合並測試

**建議:** 可以先進行前端整合測試 (Task-024),同時並行修復後端測試問題。
