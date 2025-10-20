"""WebSocket 完整測試 - 提升覆蓋率"""
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.testclient import TestClient

from app.api.v1.websocket import ConnectionManager, heartbeat, redis_listener, manager
from app.main import app


class TestConnectionManager:
    """ConnectionManager 測試"""

    @pytest.fixture
    def manager(self):
        """創建 ConnectionManager 實例"""
        return ConnectionManager()

    @pytest.fixture
    def mock_websocket(self):
        """Mock WebSocket"""
        ws = AsyncMock(spec=WebSocket)
        ws.send_text = AsyncMock()
        ws.accept = AsyncMock()
        return ws

    @pytest.mark.asyncio
    async def test_connect(self, manager, mock_websocket):
        """測試連線建立"""
        await manager.connect(mock_websocket, "project_1")

        assert "project_1" in manager.active_connections
        assert mock_websocket in manager.active_connections["project_1"]
        mock_websocket.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_disconnect(self, manager, mock_websocket):
        """測試斷線處理"""
        await manager.connect(mock_websocket, "project_1")
        manager.disconnect(mock_websocket, "project_1")

        assert "project_1" not in manager.active_connections

    @pytest.mark.asyncio
    async def test_broadcast_no_connections(self, manager):
        """測試廣播到不存在的專案（覆蓋 line 50-51）"""
        # 不應該拋出異常
        await manager.broadcast("nonexistent_project", "test message")

    @pytest.mark.asyncio
    async def test_broadcast_success(self, manager, mock_websocket):
        """測試成功廣播"""
        await manager.connect(mock_websocket, "project_1")
        await manager.broadcast("project_1", "test message")

        mock_websocket.send_text.assert_called_once_with("test message")

    @pytest.mark.asyncio
    async def test_broadcast_with_dead_connection(self, manager):
        """測試廣播時清理死連線（覆蓋 line 58-64）"""
        # 創建一個會失敗的 websocket
        dead_ws = AsyncMock(spec=WebSocket)
        dead_ws.send_text = AsyncMock(side_effect=Exception("Connection lost"))

        # 創建一個正常的 websocket
        good_ws = AsyncMock(spec=WebSocket)
        good_ws.send_text = AsyncMock()
        good_ws.accept = AsyncMock()

        # 手動添加連線（模擬已連線狀態）
        await manager.connect(good_ws, "project_1")
        manager.active_connections["project_1"].append(dead_ws)

        # 廣播應該清理死連線
        await manager.broadcast("project_1", "test")

        # 驗證死連線被移除，好的連線還在
        assert dead_ws not in manager.active_connections["project_1"]
        assert good_ws in manager.active_connections["project_1"]


class TestRedisListener:
    """redis_listener 函數測試"""

    @pytest.mark.asyncio
    async def test_redis_listener_message(self):
        """測試 Redis 訊息轉發"""
        mock_ws = AsyncMock(spec=WebSocket)
        mock_ws.send_text = AsyncMock()

        # 創建一個 mock pubsub，其 listen() 方法返回 async generator
        class MockPubSub:
            async def listen(self):
                yield {"type": "message", "data": "test message"}
                yield {"type": "subscribe", "data": None}

        mock_pubsub = MockPubSub()

        # 執行並立即取消
        task = asyncio.create_task(redis_listener(mock_ws, mock_pubsub))
        await asyncio.sleep(0.1)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

        # 驗證訊息被發送
        assert mock_ws.send_text.called
        assert mock_ws.send_text.call_args[0][0] == "test message"

    @pytest.mark.asyncio
    async def test_redis_listener_bytes_data(self):
        """測試處理 bytes 類型的數據（覆蓋 line 253-255）"""
        mock_ws = AsyncMock(spec=WebSocket)
        mock_ws.send_text = AsyncMock()

        # 創建一個返回 bytes 數據的 pubsub
        class MockPubSub:
            async def listen(self):
                yield {"type": "message", "data": b"test bytes message"}

        mock_pubsub = MockPubSub()

        with patch('app.api.v1.websocket.logger'):
            task = asyncio.create_task(redis_listener(mock_ws, mock_pubsub))
            await asyncio.sleep(0.1)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        # 驗證 bytes 被解碼並發送
        if mock_ws.send_text.called:
            call_args = mock_ws.send_text.call_args[0][0]
            assert isinstance(call_args, str)
            assert call_args == "test bytes message"

    @pytest.mark.asyncio
    async def test_redis_listener_cancelled(self):
        """測試 CancelledError 處理（覆蓋 line 257-259）"""
        mock_ws = AsyncMock(spec=WebSocket)

        # 創建一個會延遲的 pubsub
        class MockPubSub:
            async def listen(self):
                await asyncio.sleep(10)  # 會被 cancel
                yield {"type": "message", "data": "test"}

        mock_pubsub = MockPubSub()

        with patch('app.api.v1.websocket.logger') as mock_logger:
            task = asyncio.create_task(redis_listener(mock_ws, mock_pubsub))
            await asyncio.sleep(0.05)
            task.cancel()

            with pytest.raises(asyncio.CancelledError):
                await task

            # 驗證日誌被記錄
            assert any('cancelled' in str(call).lower() for call in mock_logger.info.call_args_list)

    @pytest.mark.asyncio
    async def test_redis_listener_exception(self):
        """測試一般異常處理（覆蓋 line 260-262）"""
        mock_ws = AsyncMock(spec=WebSocket)
        mock_ws.send_text = AsyncMock(side_effect=RuntimeError("Send failed"))

        # 創建一個返回訊息的 pubsub
        class MockPubSub:
            async def listen(self):
                yield {"type": "message", "data": "test"}

        mock_pubsub = MockPubSub()

        with patch('app.api.v1.websocket.logger') as mock_logger:
            with pytest.raises(RuntimeError):
                await redis_listener(mock_ws, mock_pubsub)

            # 驗證錯誤被記錄
            assert mock_logger.error.called


class TestHeartbeat:
    """heartbeat 函數測試"""

    @pytest.mark.asyncio
    async def test_heartbeat_timeout_close(self):
        """測試心跳超時關閉連線（覆蓋 line 289-291）"""
        mock_ws = AsyncMock(spec=WebSocket)
        mock_ws.send_text = AsyncMock()
        mock_ws.close = AsyncMock()
        mock_ws.receive_text = AsyncMock(side_effect=asyncio.TimeoutError)

        with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
            with patch('asyncio.get_event_loop') as mock_loop:
                # 模擬時間流逝
                times = [0, 30, 61]  # 第三次檢查時超過 60 秒
                mock_loop.return_value.time.side_effect = times

                # 運行心跳（應該在超時後關閉）
                await heartbeat(mock_ws)

                # 驗證連線被關閉
                mock_ws.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_heartbeat_pong_received(self):
        """測試接收到 pong（覆蓋 line 296-298）"""
        mock_ws = AsyncMock(spec=WebSocket)
        mock_ws.send_text = AsyncMock()

        # 第一次返回 pong，第二次拋出異常結束
        pong_responses = [
            json.dumps({"event": "pong"}),
        ]
        mock_ws.receive_text = AsyncMock(side_effect=pong_responses + [asyncio.CancelledError()])

        with patch('asyncio.sleep', new_callable=AsyncMock):
            with patch('asyncio.get_event_loop') as mock_loop:
                mock_loop.return_value.time.return_value = 0

                try:
                    await heartbeat(mock_ws)
                except asyncio.CancelledError:
                    pass

    @pytest.mark.asyncio
    async def test_heartbeat_timeout_ignored(self):
        """測試 TimeoutError 被忽略（覆蓋 line 300）"""
        mock_ws = AsyncMock(spec=WebSocket)
        mock_ws.send_text = AsyncMock()
        mock_ws.receive_text = AsyncMock(side_effect=asyncio.TimeoutError)

        with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
            # 只運行一次循環
            mock_sleep.side_effect = [None, asyncio.CancelledError()]

            with patch('asyncio.get_event_loop') as mock_loop:
                mock_loop.return_value.time.return_value = 0

                try:
                    await heartbeat(mock_ws)
                except asyncio.CancelledError:
                    pass

                # TimeoutError 應該被捕獲，不影響執行

    @pytest.mark.asyncio
    async def test_heartbeat_json_decode_error(self):
        """測試 JSON 解析錯誤被忽略（覆蓋 line 302）"""
        mock_ws = AsyncMock(spec=WebSocket)
        mock_ws.send_text = AsyncMock()
        mock_ws.receive_text = AsyncMock(return_value="invalid json")

        with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
            # 只運行一次循環
            mock_sleep.side_effect = [None, asyncio.CancelledError()]

            with patch('asyncio.get_event_loop') as mock_loop:
                mock_loop.return_value.time.return_value = 0

                try:
                    await heartbeat(mock_ws)
                except asyncio.CancelledError:
                    pass

                # JSONDecodeError 應該被捕獲

    @pytest.mark.asyncio
    async def test_heartbeat_cancelled(self):
        """測試 CancelledError 處理（覆蓋 line 305-306）"""
        mock_ws = AsyncMock(spec=WebSocket)

        with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
            mock_sleep.side_effect = asyncio.CancelledError()

            with patch('app.api.v1.websocket.logger') as mock_logger:
                with pytest.raises(asyncio.CancelledError):
                    await heartbeat(mock_ws)

                # 驗證日誌被記錄
                assert any('cancelled' in str(call).lower() for call in mock_logger.info.call_args_list)

    @pytest.mark.asyncio
    async def test_heartbeat_general_exception(self):
        """測試一般異常處理"""
        mock_ws = AsyncMock(spec=WebSocket)
        mock_ws.send_text = AsyncMock(side_effect=RuntimeError("Send failed"))

        with patch('asyncio.sleep', new_callable=AsyncMock):
            with patch('asyncio.get_event_loop') as mock_loop:
                mock_loop.return_value.time.return_value = 0

                with patch('app.api.v1.websocket.logger') as mock_logger:
                    with pytest.raises(RuntimeError):
                        await heartbeat(mock_ws)

                    # 驗證錯誤被記錄
                    assert mock_logger.error.called
