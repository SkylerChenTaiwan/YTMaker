"""ProgressService 單元測試"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio

from app.services.progress_service import ProgressService


class TestProgressService:
    """ProgressService 單元測試"""

    @pytest_asyncio.fixture
    async def mock_redis(self):
        """Mock Redis 客戶端"""
        mock = AsyncMock()
        mock.publish = AsyncMock(return_value=1)
        return mock

    @pytest.mark.asyncio
    async def test_publish_progress(self, mock_redis):
        """測試發布進度更新"""
        with patch("app.services.progress_service.get_async_redis", return_value=mock_redis):
            await ProgressService.publish_progress(
                project_id="test_project_1",
                status="SCRIPT_GENERATING",
                progress=20,
                current_stage="正在生成腳本...",
                estimated_remaining=600,
            )

            # 驗證 Redis publish 被調用
            assert mock_redis.publish.called
            call_args = mock_redis.publish.call_args
            assert call_args[0][0] == "progress:test_project_1"

            # 驗證訊息格式
            message = json.loads(call_args[0][1])
            assert message["event"] == "progress_update"
            assert message["data"]["status"] == "SCRIPT_GENERATING"
            assert message["data"]["progress"] == 20
            assert message["data"]["current_stage"] == "正在生成腳本..."
            assert message["data"]["estimated_remaining"] == 600
            assert "timestamp" in message["data"]

    @pytest.mark.asyncio
    async def test_publish_stage_change(self, mock_redis):
        """測試發布階段變化"""
        with patch("app.services.progress_service.get_async_redis", return_value=mock_redis):
            await ProgressService.publish_stage_change(
                project_id="test_project_1",
                previous_stage="SCRIPT_GENERATING",
                current_stage="ASSETS_GENERATING",
                progress=25,
            )

            assert mock_redis.publish.called
            call_args = mock_redis.publish.call_args
            message = json.loads(call_args[0][1])

            assert message["event"] == "stage_change"
            assert message["data"]["previous_stage"] == "SCRIPT_GENERATING"
            assert message["data"]["current_stage"] == "ASSETS_GENERATING"
            assert message["data"]["progress"] == 25

    @pytest.mark.asyncio
    async def test_publish_log(self, mock_redis):
        """測試發布日誌訊息"""
        with patch("app.services.progress_service.get_async_redis", return_value=mock_redis):
            await ProgressService.publish_log(
                project_id="test_project_1",
                level="INFO",
                message="開始生成圖片...",
            )

            assert mock_redis.publish.called
            call_args = mock_redis.publish.call_args
            message = json.loads(call_args[0][1])

            assert message["event"] == "log"
            assert message["data"]["level"] == "INFO"
            assert message["data"]["message"] == "開始生成圖片..."

    @pytest.mark.asyncio
    async def test_publish_error(self, mock_redis):
        """測試發布錯誤訊息"""
        with patch("app.services.progress_service.get_async_redis", return_value=mock_redis):
            await ProgressService.publish_error(
                project_id="test_project_1",
                error_code="STABILITY_AI_ERROR",
                error_message="Stability AI API 配額已用盡",
                stage="ASSETS_GENERATING",
                retry_count=2,
                max_retries=3,
                details={"quota_used": 100, "quota_total": 100},
                solutions=["等待配額重置", "升級方案"],
                trace_id="abc-123",
            )

            assert mock_redis.publish.called
            call_args = mock_redis.publish.call_args
            message = json.loads(call_args[0][1])

            assert message["type"] == "error"
            assert message["project_id"] == "test_project_1"
            assert message["error"]["code"] == "STABILITY_AI_ERROR"
            assert message["error"]["message"] == "Stability AI API 配額已用盡"
            assert message["error"]["stage"] == "ASSETS_GENERATING"
            assert message["error"]["is_retryable"] is True  # 2 < 3
            assert message["error"]["retry_count"] == 2
            assert message["error"]["max_retries"] == 3
            assert message["error"]["details"]["quota_used"] == 100
            assert "等待配額重置" in message["error"]["solutions"]
            assert message["error"]["trace_id"] == "abc-123"

    @pytest.mark.asyncio
    async def test_publish_error_not_retryable(self, mock_redis):
        """測試發布不可重試的錯誤"""
        with patch("app.services.progress_service.get_async_redis", return_value=mock_redis):
            await ProgressService.publish_error(
                project_id="test_project_1",
                error_code="GEMINI_QUOTA_EXCEEDED",
                error_message="Gemini 配額用盡",
                stage="SCRIPT_GENERATING",
                retry_count=3,
                max_retries=3,
            )

            call_args = mock_redis.publish.call_args
            message = json.loads(call_args[0][1])

            # retry_count == max_retries, 所以 is_retryable = False
            assert message["error"]["is_retryable"] is False

    @pytest.mark.asyncio
    async def test_publish_complete(self, mock_redis):
        """測試發布完成訊息"""
        with patch("app.services.progress_service.get_async_redis", return_value=mock_redis):
            await ProgressService.publish_complete(
                project_id="test_project_1",
                status="COMPLETED",
                youtube_url="https://youtube.com/watch?v=test123",
            )

            assert mock_redis.publish.called
            call_args = mock_redis.publish.call_args
            message = json.loads(call_args[0][1])

            assert message["event"] == "complete"
            assert message["data"]["status"] == "COMPLETED"
            assert message["data"]["youtube_url"] == "https://youtube.com/watch?v=test123"

    @pytest.mark.asyncio
    async def test_publish_complete_failed(self, mock_redis):
        """測試發布失敗完成訊息"""
        with patch("app.services.progress_service.get_async_redis", return_value=mock_redis):
            await ProgressService.publish_complete(
                project_id="test_project_1",
                status="FAILED",
                youtube_url=None,
            )

            call_args = mock_redis.publish.call_args
            message = json.loads(call_args[0][1])

            assert message["event"] == "complete"
            assert message["data"]["status"] == "FAILED"
            assert message["data"]["youtube_url"] is None
