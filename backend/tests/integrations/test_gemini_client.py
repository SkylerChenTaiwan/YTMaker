import pytest
import json
from unittest.mock import Mock, patch, AsyncMock
from app.integrations.gemini_client import GeminiClient, GeminiAPIError


@pytest.fixture
def gemini_client():
    """Gemini 客戶端 fixture"""
    return GeminiClient(api_key="test-api-key", model="gemini-1.5-flash")


@pytest.fixture
def mock_valid_script():
    """Mock 有效腳本回應"""
    return {
        "title": "如何學習 Python 程式設計",
        "description": "本影片將介紹 Python 程式設計的基礎知識",
        "tags": ["Python", "程式設計", "教學"],
        "segments": [
            {
                "type": "intro",
                "text": "歡迎來到我的頻道",
                "duration": 10,
                "image_description": "A welcoming scene with Python logo"
            },
            {
                "type": "content",
                "text": "Python 是一種易學易用的程式語言",
                "duration": 15,
                "image_description": "Python code on a computer screen"
            },
            {
                "type": "outro",
                "text": "感謝觀看",
                "duration": 8,
                "image_description": "Outro scene with subscribe button"
            }
        ]
    }


@pytest.mark.asyncio
async def test_generate_script_success(mock_valid_script):
    """測試 1：成功生成腳本（使用 Mock）"""
    # Mock genai.GenerativeModel
    with patch('app.integrations.gemini_client.genai') as mock_genai:
        mock_response = Mock()
        mock_response.text = json.dumps(mock_valid_script)

        mock_model_instance = Mock()
        mock_model_instance.generate_content_async = AsyncMock(return_value=mock_response)

        mock_genai.configure = Mock()
        mock_genai.GenerativeModel.return_value = mock_model_instance

        # 創建客戶端 (在 mock 之後)
        gemini_client = GeminiClient(api_key="test-api-key", model="gemini-1.5-flash")

        # 執行
        script = await gemini_client.generate_script(prompt="Test prompt")

        # 驗證
        assert script["title"] == "如何學習 Python 程式設計"
        assert len(script["segments"]) == 3
        assert script["segments"][0]["type"] == "intro"
        assert script["segments"][0]["duration"] == 10
        assert "tags" in script
        assert "description" in script


@pytest.mark.asyncio
async def test_generate_script_401_unauthorized():
    """測試 5：API 錯誤處理與重試（401 Unauthorized）"""
    with patch('app.integrations.gemini_client.genai') as mock_genai:
        # Mock API 回傳 401 錯誤
        mock_error = Exception("API key not valid")
        mock_error.status_code = 401

        mock_model_instance = Mock()
        mock_model_instance.generate_content_async = AsyncMock(side_effect=mock_error)

        mock_genai.configure = Mock()
        mock_genai.GenerativeModel.return_value = mock_model_instance

        gemini_client = GeminiClient(api_key="invalid-key", model="gemini-1.5-flash")

        # 執行並驗證拋出錯誤
        with pytest.raises(GeminiAPIError) as exc_info:
            await gemini_client.generate_script(prompt="Test prompt")

        assert "API 金鑰無效" in str(exc_info.value)


@pytest.mark.asyncio
async def test_generate_script_429_rate_limit():
    """測試 6：API 錯誤處理與重試（429 Rate Limit）"""
    with patch('app.integrations.gemini_client.genai') as mock_genai:
        # Mock API：前兩次 429，第三次成功
        mock_error = Exception("Rate limit exceeded")
        mock_error.status_code = 429

        mock_valid_script = {
            "title": "測試標題",
            "description": "測試描述",
            "tags": ["tag1"],
            "segments": [
                {"type": "intro", "text": "開場", "duration": 10, "image_description": "intro"},
                {"type": "content", "text": "內容", "duration": 15, "image_description": "content"},
                {"type": "outro", "text": "結尾", "duration": 8, "image_description": "outro"}
            ]
        }

        mock_response = Mock()
        mock_response.text = json.dumps(mock_valid_script)

        call_count = 0

        async def mock_generate(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise mock_error
            return mock_response

        mock_model_instance = Mock()
        mock_model_instance.generate_content_async = mock_generate

        mock_genai.configure = Mock()
        mock_genai.GenerativeModel.return_value = mock_model_instance

        gemini_client = GeminiClient(api_key="test-api-key", model="gemini-1.5-flash")

        # 執行
        script = await gemini_client.generate_script(prompt="Test prompt")

        # 驗證：最終成功
        assert script["title"] == "測試標題"
        assert call_count == 3  # 重試了 2 次後成功


@pytest.mark.asyncio
async def test_generate_script_500_server_error_max_retries():
    """測試 7：API 錯誤處理與重試（500 Server Error，重試失敗）"""
    with patch('app.integrations.gemini_client.genai') as mock_genai:
        # Mock API：所有調用都回傳 500
        mock_error = Exception("Internal server error")
        mock_error.status_code = 500

        mock_model_instance = Mock()
        mock_model_instance.generate_content_async = AsyncMock(side_effect=mock_error)

        mock_genai.configure = Mock()
        mock_genai.GenerativeModel.return_value = mock_model_instance

        gemini_client = GeminiClient(api_key="test-api-key", model="gemini-1.5-flash")

        # 執行並驗證拋出錯誤
        with pytest.raises(GeminiAPIError):
            await gemini_client.generate_script(prompt="Test prompt")
