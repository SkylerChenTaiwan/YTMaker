"""
Stability AI Client 單元測試
"""
import pytest
import asyncio
import time
from unittest.mock import AsyncMock, patch, MagicMock
from PIL import Image
import io

from app.integrations.stability_client import (
    StabilityAIClient,
    ContentPolicyViolationError,
    ImageGenerationError
)


@pytest.mark.asyncio
async def test_generate_image_success():
    """測試 1: 成功生成單張圖片"""
    # Arrange
    client = StabilityAIClient(api_key="test_key")

    # Mock 回應
    mock_response = MagicMock()
    mock_response.status_code = 200

    # 生成一個真實的 1x1 PNG 圖片的 base64
    # 這是一個有效的 1x1 透明 PNG 圖片
    base64_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    mock_response.json.return_value = {
        "artifacts": [
            {
                "base64": base64_data,
                "finishReason": "SUCCESS"
            }
        ]
    }

    client.client.post = AsyncMock(return_value=mock_response)

    # Act
    image_data = await client.generate_image(
        prompt="A beautiful sunset",
        negative_prompt="blurry"
    )

    # Assert
    assert isinstance(image_data, bytes)
    assert len(image_data) > 0

    # 驗證可解碼為圖片
    img = Image.open(io.BytesIO(image_data))
    assert img is not None
    assert img.size == (1, 1)  # 1x1 測試圖片

    await client.close()


@pytest.mark.asyncio
async def test_content_policy_violation():
    """測試 3: Content Policy 違規處理"""
    client = StabilityAIClient(api_key="test_key")

    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.json.return_value = {"message": "Content policy violation"}

    client.client.post = AsyncMock(return_value=mock_response)

    # Act & Assert
    with pytest.raises(ContentPolicyViolationError) as exc_info:
        await client.generate_image(prompt="Inappropriate content")

    assert "Content policy violation" in str(exc_info.value)

    await client.close()


@pytest.mark.asyncio
async def test_rate_limiting_error():
    """測試 2 (簡化版): Rate Limiting 429 錯誤"""
    client = StabilityAIClient(api_key="test_key")

    mock_response = MagicMock()
    mock_response.status_code = 429
    mock_response.json.return_value = {"message": "Rate limit exceeded"}

    client.client.post = AsyncMock(return_value=mock_response)

    # Act & Assert
    with pytest.raises(ImageGenerationError) as exc_info:
        await client.generate_image(prompt="Test prompt")

    assert "Rate limit exceeded" in str(exc_info.value)

    await client.close()
