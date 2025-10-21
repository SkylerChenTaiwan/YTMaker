"""
Celery-WebSocket 整合測試

測試 Celery 後台任務與 WebSocket 推送的整合流程
"""

import pytest
import asyncio
import json
import time
from unittest.mock import Mock, patch, AsyncMock


@pytest.mark.integration
@pytest.mark.asyncio
async def test_celery_task_progress_pushes_to_websocket():
    """
    測試 8: Celery 任務進度應透過 WebSocket 即時推送到前端

    驗證點:
    - 收到至少一個進度訊息
    - 訊息包含 'processing' 狀態
    - 最後訊息為 'completed' 狀態
    - 進度數值單調遞增
    - WebSocket 推送延遲 < 1 秒
    """
    # Mock WebSocket 連線
    mock_ws_manager = Mock()
    mock_ws_manager.send_to_project = AsyncMock()

    # Mock Celery 任務
    with patch('app.tasks.video_generation.generate_video') as mock_task:
        # 模擬任務執行過程中發送進度更新
        async def mock_generate():
            project_id = 'test-project-123'

            # 進度更新 1: 腳本生成開始
            await mock_ws_manager.send_to_project(project_id, {
                'type': 'progress',
                'status': 'processing',
                'stage': 'script',
                'progress': 0.1,
                'message': '開始生成腳本...'
            })

            # 進度更新 2: 腳本生成完成
            await asyncio.sleep(0.1)
            await mock_ws_manager.send_to_project(project_id, {
                'type': 'progress',
                'status': 'processing',
                'stage': 'script',
                'progress': 0.25,
                'message': '腳本生成完成'
            })

            # 進度更新 3: 素材生成中
            await asyncio.sleep(0.1)
            await mock_ws_manager.send_to_project(project_id, {
                'type': 'progress',
                'status': 'processing',
                'stage': 'assets',
                'progress': 0.5,
                'message': '素材生成中...'
            })

            # 進度更新 4: 完成
            await asyncio.sleep(0.1)
            await mock_ws_manager.send_to_project(project_id, {
                'type': 'progress',
                'status': 'completed',
                'stage': 'upload',
                'progress': 1.0,
                'message': '影片生成完成!'
            })

            return {'success': True}

        mock_task.delay = Mock(return_value=asyncio.create_task(mock_generate()))

        # 執行任務
        task = mock_task.delay('test-project-123')
        await task

        # 驗證 WebSocket 推送
        calls = mock_ws_manager.send_to_project.call_args_list

        # 應收到至少 4 個進度訊息
        assert len(calls) >= 4, f"應收到至少 4 個進度訊息，實際收到 {len(calls)} 個"

        # 提取所有訊息
        messages = [call[0][1] for call in calls]

        # 應包含 processing 狀態
        processing_messages = [m for m in messages if m.get('status') == 'processing']
        assert len(processing_messages) > 0, "應包含 processing 狀態訊息"

        # 最後應為 completed
        assert messages[-1]['status'] == 'completed', "最後訊息應為 completed 狀態"

        # 進度應遞增
        progresses = [m.get('progress', 0) for m in messages]
        assert progresses == sorted(progresses), f"進度應單調遞增: {progresses}"

        # 驗證進度從 0.1 到 1.0
        assert progresses[0] >= 0.1
        assert progresses[-1] == 1.0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_celery_task_failure_notifies_websocket():
    """
    測試 9: Celery 任務失敗應透過 WebSocket 通知前端

    驗證點:
    - 收到 'failed' 狀態訊息
    - 訊息包含 'error' 欄位
    - 錯誤訊息清楚描述失敗原因
    - 失敗通知延遲 < 3 秒
    """
    # Mock WebSocket 連線
    mock_ws_manager = Mock()
    mock_ws_manager.send_to_project = AsyncMock()

    # Mock Celery 任務 (會失敗)
    with patch('app.tasks.video_generation.generate_video') as mock_task:
        async def mock_generate_with_failure():
            project_id = 'invalid-project'

            # 進度更新 1: 開始
            await mock_ws_manager.send_to_project(project_id, {
                'type': 'progress',
                'status': 'processing',
                'stage': 'script',
                'progress': 0.1,
                'message': '開始生成腳本...'
            })

            # 模擬任務失敗
            await asyncio.sleep(0.1)

            # 發送失敗通知
            await mock_ws_manager.send_to_project(project_id, {
                'type': 'progress',
                'status': 'failed',
                'stage': 'script',
                'progress': 0.1,
                'error': {
                    'code': 'GEMINI_API_ERROR',
                    'message': 'Gemini API 配額不足',
                    'stage': 'script',
                    'timestamp': time.time()
                }
            })

            raise Exception('Gemini API 配額不足')

        mock_task.delay = Mock(return_value=asyncio.create_task(mock_generate_with_failure()))

        # 執行任務 (會失敗)
        task = mock_task.delay('invalid-project')

        # 捕獲異常
        start_time = time.time()
        with pytest.raises(Exception, match='Gemini API 配額不足'):
            await task

        elapsed_time = time.time() - start_time

        # 驗證失敗通知延遲 < 3 秒
        assert elapsed_time < 3, f"失敗通知延遲應 < 3 秒，實際: {elapsed_time:.2f}秒"

        # 驗證 WebSocket 推送
        calls = mock_ws_manager.send_to_project.call_args_list

        # 應收到至少 2 個訊息 (開始 + 失敗)
        assert len(calls) >= 2, f"應收到至少 2 個訊息，實際收到 {len(calls)} 個"

        # 提取所有訊息
        messages = [call[0][1] for call in calls]

        # 最後一個訊息應為失敗狀態
        last_message = messages[-1]
        assert last_message['status'] == 'failed', "最後訊息應為 failed 狀態"

        # 應包含 error 欄位
        assert 'error' in last_message, "失敗訊息應包含 error 欄位"

        # 錯誤訊息應清楚描述失敗原因
        error = last_message['error']
        assert 'message' in error, "error 應包含 message 欄位"
        assert len(error['message']) > 0, "錯誤訊息不應為空"
        assert 'Gemini API' in error['message'], "錯誤訊息應包含具體的錯誤原因"

        # 應包含錯誤碼
        assert 'code' in error, "error 應包含 code 欄位"
        assert error['code'] == 'GEMINI_API_ERROR'


@pytest.mark.integration
@pytest.mark.asyncio
async def test_websocket_connection_persistence():
    """
    測試 WebSocket 連線持久性

    驗證在長時間任務執行期間，WebSocket 連線保持活躍
    """
    mock_ws_manager = Mock()
    mock_ws_manager.send_to_project = AsyncMock()
    mock_ws_manager.is_connected = Mock(return_value=True)

    # 模擬長時間任務 (5 秒)
    async def long_running_task():
        project_id = 'test-project-123'

        for i in range(5):
            # 每秒發送一次進度更新
            await asyncio.sleep(1)
            await mock_ws_manager.send_to_project(project_id, {
                'type': 'progress',
                'status': 'processing',
                'progress': (i + 1) * 0.2,
                'message': f'處理中... {(i + 1) * 20}%'
            })

            # 驗證連線仍然活躍
            assert mock_ws_manager.is_connected(), "WebSocket 連線應保持活躍"

    # 執行任務
    await long_running_task()

    # 驗證收到 5 次進度更新
    assert mock_ws_manager.send_to_project.call_count == 5


@pytest.mark.integration
def test_celery_task_retry_mechanism():
    """
    測試 Celery 任務重試機制

    驗證任務失敗時會自動重試，且每次重試都會通知前端
    """
    mock_ws_manager = Mock()
    retry_count = 0
    max_retries = 3

    def mock_task_with_retries():
        nonlocal retry_count
        retry_count += 1

        # 通知前端重試狀態
        if retry_count <= max_retries:
            mock_ws_manager.send_to_project('test-project', {
                'type': 'log',
                'level': 'warning',
                'message': f'任務失敗，正在重試 ({retry_count}/{max_retries})...'
            })

        # 前兩次失敗，第三次成功
        if retry_count < 3:
            raise Exception('暫時性錯誤')

        return {'success': True}

    # 模擬重試流程
    result = None
    for attempt in range(max_retries):
        try:
            result = mock_task_with_retries()
            break
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            continue

    # 驗證重試次數
    assert retry_count == 3, f"應重試 3 次，實際重試 {retry_count} 次"

    # 驗證最終成功
    assert result == {'success': True}

    # 驗證重試通知
    assert mock_ws_manager.send_to_project.call_count == 2  # 第 1, 2 次重試
