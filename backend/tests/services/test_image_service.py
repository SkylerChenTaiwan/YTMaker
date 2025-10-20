"""
Image Generation Service 單元測試
"""
import pytest
import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch
from PIL import Image
import io

from app.services.image_service import (
    ImageGenerationService,
    ImageValidationError,
    ImageGenerationFailureError
)


def test_prompt_engineering():
    """測試 5: Prompt Engineering"""
    service = ImageGenerationService(api_key="test_key")

    # Act
    enhanced = service.enhance_prompt(
        description="A serene mountain",
        global_modifiers=["cinematic lighting", "4k quality"]
    )

    # Assert
    assert "A serene mountain" in enhanced
    assert "cinematic lighting" in enhanced
    assert "4k quality" in enhanced
    assert enhanced == "A serene mountain, cinematic lighting, 4k quality"


def test_prompt_engineering_with_defaults():
    """測試 5: Prompt Engineering (使用預設修飾詞)"""
    service = ImageGenerationService(api_key="test_key")

    # Act
    enhanced = service.enhance_prompt(description="A serene mountain")

    # Assert
    assert "A serene mountain" in enhanced
    assert "cinematic lighting" in enhanced
    assert "professional photography" in enhanced
    assert "4k quality" in enhanced


def test_image_validation_success():
    """測試 6: 圖片品質驗證 (成功)"""
    service = ImageGenerationService(api_key="test_key")

    # 生成符合規格的圖片
    img = Image.new('RGB', (1920, 1080), color='blue')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    image_data = buffer.getvalue()

    # Act
    result = service.validate_image(image_data)

    # Assert
    assert result is True


def test_image_validation_wrong_resolution():
    """測試 6: 圖片品質驗證 (錯誤解析度)"""
    service = ImageGenerationService(api_key="test_key")

    # 錯誤解析度
    img = Image.new('RGB', (1280, 720), color='blue')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    image_data = buffer.getvalue()

    # Act & Assert
    with pytest.raises(ImageValidationError) as exc_info:
        service.validate_image(image_data)

    assert "Wrong resolution" in str(exc_info.value)


def test_image_validation_wrong_format():
    """測試 6: 圖片品質驗證 (錯誤格式)"""
    service = ImageGenerationService(api_key="test_key")

    # GIF 格式 (不支援)
    img = Image.new('RGB', (1920, 1080), color='blue')
    buffer = io.BytesIO()
    img.save(buffer, format='GIF')
    image_data = buffer.getvalue()

    # Act & Assert
    with pytest.raises(ImageValidationError) as exc_info:
        service.validate_image(image_data)

    assert "Wrong format" in str(exc_info.value)


@pytest.mark.asyncio
async def test_parallel_image_generation():
    """測試 4: 批次並行生成圖片"""
    service = ImageGenerationService(api_key="test_key")

    # Mock client
    async def mock_generate(*args, **kwargs):
        await asyncio.sleep(0.5)  # 模擬 API 延遲
        # 返回一個小的 PNG
        img = Image.new('RGB', (10, 10), color='red')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return buffer.getvalue()

    service.client.generate_image_with_retry = mock_generate

    prompts = [f"Image {i}" for i in range(10)]

    start_time = time.time()

    # Act
    results = await service.generate_images_parallel(
        prompts=prompts,
        max_concurrent=4
    )

    elapsed = time.time() - start_time

    # Assert
    assert len(results) == 10
    assert all(isinstance(r, bytes) for r in results)
    # 10 張圖片, 每張 0.5 秒, 4 並行 => 應約 1.25 秒
    assert elapsed < 2.0  # 給一些緩衝時間

    await service.close()


@pytest.mark.asyncio
async def test_partial_failure_tolerance():
    """測試 7: 部分失敗容忍"""
    service = ImageGenerationService(api_key="test_key")

    call_count = 0

    async def mock_generate(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        # 第 3 和第 8 次調用失敗
        if call_count in [3, 8]:
            raise Exception("Mock failure")
        # 其他成功
        img = Image.new('RGB', (10, 10), color='red')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return buffer.getvalue()

    service.client.generate_image_with_retry = mock_generate

    descriptions = [f"Image {i}" for i in range(10)]

    # Act
    results = await service.generate_images_with_fallback(
        descriptions=descriptions,
        config={"style_modifiers": []}
    )

    # Assert
    assert len(results) == 10
    assert results[2] is None  # 第 3 個失敗
    assert results[7] is None  # 第 8 個失敗
    success_count = sum(1 for r in results if r is not None)
    assert success_count == 8  # 80% 成功率
    # 不應拋出異常 (因為成功率 >= 80%)

    await service.close()


@pytest.mark.asyncio
async def test_failure_rate_too_high():
    """測試 7: 失敗率過高時拋出異常"""
    service = ImageGenerationService(api_key="test_key")

    call_count = 0

    async def mock_generate(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        # 只有前 7 個成功 (70% 成功率)
        if call_count <= 7:
            img = Image.new('RGB', (10, 10), color='red')
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            return buffer.getvalue()
        else:
            raise Exception("Mock failure")

    service.client.generate_image_with_retry = mock_generate

    descriptions = [f"Image {i}" for i in range(10)]

    # Act & Assert
    with pytest.raises(ImageGenerationFailureError) as exc_info:
        await service.generate_images_with_fallback(
            descriptions=descriptions,
            config={"style_modifiers": []}
        )

    assert "success rate too low" in str(exc_info.value)

    await service.close()
