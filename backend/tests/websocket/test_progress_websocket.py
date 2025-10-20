"""WebSocket 進度推送測試"""
import asyncio
import json

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient


class TestWebSocketConnection:
    """測試 1: WebSocket 連線"""

    def test_websocket_connection(self, test_client, test_project_id):
        """測試成功建立 WebSocket 連線"""
        # 使用較短的超時時間
        with test_client.websocket_connect(
            f"/api/v1/projects/{test_project_id}/progress"
        ) as websocket:
            # 應該收到連線成功訊息
            data = websocket.receive_text()
            message = json.loads(data)

            assert message["event"] == "connected"
            assert message["data"]["project_id"] == test_project_id
            assert "timestamp" in message["data"]


class TestProgressUpdate:
    """測試 2: 接收進度更新訊息"""

    @pytest.mark.asyncio
    async def test_receive_progress_update(
        self, test_client, redis_client, test_project_id
    ):
        """測試接收進度更新訊息"""
        with test_client.websocket_connect(
            f"/api/v1/projects/{test_project_id}/progress"
        ) as websocket:
            # 讀取連線訊息
            websocket.receive_text()

            # 模擬發布進度訊息
            test_message = {
                "event": "progress_update",
                "data": {
                    "status": "SCRIPT_GENERATING",
                    "progress": 20,
                    "current_stage": "正在生成腳本...",
                    "estimated_remaining": 600,
                },
            }

            # 發布到 Redis
            await redis_client.publish(
                f"progress:{test_project_id}", json.dumps(test_message)
            )

            # 給一點時間讓訊息傳遞
            await asyncio.sleep(0.2)

            # 接收 WebSocket 訊息
            data = websocket.receive_text()
            received_message = json.loads(data)

            assert received_message["event"] == "progress_update"
            assert received_message["data"]["progress"] == 20
            assert received_message["data"]["status"] == "SCRIPT_GENERATING"


class TestStageChange:
    """測試 3: 階段變化通知"""

    @pytest.mark.asyncio
    async def test_stage_change(self, test_client, redis_client, test_project_id):
        """測試階段變化通知"""
        with test_client.websocket_connect(
            f"/api/v1/projects/{test_project_id}/progress"
        ) as websocket:
            # 讀取連線訊息
            websocket.receive_text()

            # 發布階段變化訊息
            stage_change_message = {
                "event": "stage_change",
                "data": {
                    "previous_stage": "SCRIPT_GENERATING",
                    "current_stage": "ASSETS_GENERATING",
                    "progress": 25,
                    "timestamp": "2025-10-19T10:35:00Z",
                },
            }

            await redis_client.publish(
                f"progress:{test_project_id}", json.dumps(stage_change_message)
            )

            await asyncio.sleep(0.2)

            # 接收訊息
            data = websocket.receive_text()
            message = json.loads(data)

            assert message["event"] == "stage_change"
            assert message["data"]["previous_stage"] == "SCRIPT_GENERATING"
            assert message["data"]["current_stage"] == "ASSETS_GENERATING"
            assert message["data"]["progress"] == 25


class TestLogMessage:
    """測試 4: 日誌訊息推送"""

    @pytest.mark.asyncio
    async def test_log_messages(self, test_client, redis_client, test_project_id):
        """測試日誌訊息推送"""
        with test_client.websocket_connect(
            f"/api/v1/projects/{test_project_id}/progress"
        ) as websocket:
            # 讀取連線訊息
            websocket.receive_text()

            # 發送多條日誌
            log_messages = [
                {
                    "event": "log",
                    "data": {
                        "level": "INFO",
                        "message": "[1/15] 正在生成圖片: 段落 1 - 科技趨勢展望",
                        "timestamp": "2025-10-19T10:36:00Z",
                    },
                },
                {
                    "event": "log",
                    "data": {
                        "level": "INFO",
                        "message": "[2/15] 正在生成圖片: 段落 2 - AI 應用場景",
                        "timestamp": "2025-10-19T10:36:15Z",
                    },
                },
            ]

            for msg in log_messages:
                await redis_client.publish(
                    f"progress:{test_project_id}", json.dumps(msg)
                )

            await asyncio.sleep(0.2)

            # 接收第一條日誌
            data1 = websocket.receive_text()
            message1 = json.loads(data1)
            assert message1["event"] == "log"
            assert message1["data"]["level"] == "INFO"
            assert "[1/15]" in message1["data"]["message"]

            # 接收第二條日誌
            data2 = websocket.receive_text()
            message2 = json.loads(data2)
            assert message2["event"] == "log"
            assert "[2/15]" in message2["data"]["message"]


class TestErrorMessage:
    """測試 5: 錯誤訊息處理"""

    @pytest.mark.asyncio
    async def test_error_message(self, test_client, redis_client, test_project_id):
        """測試錯誤訊息推送"""
        with test_client.websocket_connect(
            f"/api/v1/projects/{test_project_id}/progress"
        ) as websocket:
            # 讀取連線訊息
            websocket.receive_text()

            # 發布錯誤訊息
            error_message = {
                "type": "error",
                "project_id": test_project_id,
                "error": {
                    "code": "STABILITY_AI_ERROR",
                    "message": "Stability AI API 配額已用盡",
                    "stage": "ASSETS_GENERATING",
                    "is_retryable": False,
                    "retry_count": 2,
                    "max_retries": 3,
                    "timestamp": "2025-10-19T10:38:00Z",
                },
            }

            await redis_client.publish(
                f"progress:{test_project_id}", json.dumps(error_message)
            )

            await asyncio.sleep(0.2)

            # 接收錯誤訊息
            data = websocket.receive_text()
            message = json.loads(data)

            assert message["type"] == "error"
            assert message["error"]["code"] == "STABILITY_AI_ERROR"
            assert message["error"]["stage"] == "ASSETS_GENERATING"
            assert message["error"]["retry_count"] == 2


class TestHeartbeat:
    """測試 6: 心跳檢測機制"""

    @pytest.mark.asyncio
    async def test_heartbeat(self, test_client, test_project_id):
        """測試心跳機制"""
        with test_client.websocket_connect(
            f"/api/v1/projects/{test_project_id}/progress"
        ) as websocket:
            # 讀取連線訊息
            websocket.receive_text()

            # 等待 31 秒,應該收到 ping
            await asyncio.sleep(31)

            # 接收 ping 訊息
            data = websocket.receive_text()
            message = json.loads(data)

            assert message["event"] == "ping"
            assert "timestamp" in message["data"]

            # 回應 pong
            websocket.send_text(json.dumps({"event": "pong"}))

            # 連線應該還活著
            # (檢查是否還能發送訊息)
            assert websocket.client_state.name in ["CONNECTED", "CONNECTING"]


class TestMultipleClients:
    """測試 7: 多客戶端廣播"""

    @pytest.mark.asyncio
    async def test_multiple_clients(
        self, test_client, redis_client, test_project_id
    ):
        """測試多個客戶端同時連線並接收訊息"""
        with test_client.websocket_connect(
            f"/api/v1/projects/{test_project_id}/progress"
        ) as ws1:
            with test_client.websocket_connect(
                f"/api/v1/projects/{test_project_id}/progress"
            ) as ws2:
                # 兩個客戶端都讀取連線訊息
                ws1.receive_text()
                ws2.receive_text()

                # 發布進度訊息
                progress_msg = {
                    "event": "progress_update",
                    "data": {"progress": 50, "status": "RENDERING"},
                }
                await redis_client.publish(
                    f"progress:{test_project_id}", json.dumps(progress_msg)
                )

                await asyncio.sleep(0.2)

                # 兩個客戶端都應該收到
                msg1 = json.loads(ws1.receive_text())
                msg2 = json.loads(ws2.receive_text())

                assert msg1["data"]["progress"] == 50
                assert msg2["data"]["progress"] == 50


class TestDisconnectReconnect:
    """測試 8: 斷線與重連"""

    def test_disconnect_reconnect(self, test_client, test_project_id):
        """測試斷線後重連"""
        # 第一次連線
        with test_client.websocket_connect(
            f"/api/v1/projects/{test_project_id}/progress"
        ) as websocket:
            # 讀取連線訊息
            data = websocket.receive_text()
            message = json.loads(data)
            assert message["event"] == "connected"

        # 連線已關閉,重新連線
        with test_client.websocket_connect(
            f"/api/v1/projects/{test_project_id}/progress"
        ) as websocket:
            # 應該能正常連線
            data = websocket.receive_text()
            message = json.loads(data)
            assert message["event"] == "connected"
            assert message["data"]["project_id"] == test_project_id
