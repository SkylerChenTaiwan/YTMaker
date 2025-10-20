"""
圖片生成服務
"""
import asyncio
import io
import logging
from typing import Any, Optional

from PIL import Image

from app.core.config import settings
from app.integrations.stability_client import (
    StabilityAIClient,
)

logger = logging.getLogger(__name__)


class ImageValidationError(Exception):
    """圖片驗證錯誤"""

    pass


class ImageGenerationFailureError(Exception):
    """圖片生成失敗率過高錯誤"""

    pass


class ImageGenerationService:
    """
    圖片生成服務

    功能:
    - 批次生成圖片 (並行處理)
    - Prompt Engineering (風格修飾詞)
    - 品質驗證
    - Fallback 策略
    """

    # 預設風格修飾詞
    DEFAULT_STYLE_MODIFIERS = [
        "cinematic lighting",
        "professional photography",
        "4k quality",
        "highly detailed",
        "photorealistic",
        "warm color palette",
    ]

    # 預設負面 Prompt
    DEFAULT_NEGATIVE_PROMPT = ", ".join(
        ["blurry", "low quality", "distorted", "watermark", "text", "logo", "anime", "cartoon"]
    )

    def __init__(self, api_key: Optional[str] = None):
        """
        初始化服務

        Args:
            api_key: Stability AI API Key (若為 None 則從 settings 取得)
        """
        self.api_key = api_key or settings.STABILITY_API_KEY
        self.client = StabilityAIClient(api_key=self.api_key)

    def enhance_prompt(self, description: str, global_modifiers: Optional[list[str]] = None) -> str:
        """
        Prompt Engineering

        組合原始描述和風格修飾詞

        Args:
            description: 原始圖片描述 (英文)
            global_modifiers: 全局風格修飾詞 (若為 None 則使用預設)

        Returns:
            str: 增強後的 Prompt

        範例:
            description = "A busy city street"
            global_modifiers = ["cinematic lighting", "4k quality"]
            → "A busy city street, cinematic lighting, 4k quality"
        """
        if global_modifiers is None:
            global_modifiers = self.DEFAULT_STYLE_MODIFIERS

        if not global_modifiers:
            return description

        modifiers_str = ", ".join(global_modifiers)
        return f"{description}, {modifiers_str}"

    def validate_image(self, image_data: bytes) -> bool:
        """
        驗證圖片品質

        檢查項目:
        - 圖片解析度 = 1920x1080
        - 圖片格式 = PNG 或 JPEG
        - 檔案大小 < 10MB
        - 圖片可正常載入

        Args:
            image_data: 圖片 bytes 資料

        Returns:
            bool: 驗證通過返回 True

        Raises:
            ImageValidationError: 驗證失敗
        """
        try:
            # 載入圖片
            img = Image.open(io.BytesIO(image_data))

            # 檢查解析度
            if img.size != (1920, 1080):
                raise ImageValidationError(f"Wrong resolution: {img.size}, expected (1920, 1080)")

            # 檢查格式
            if img.format not in ["PNG", "JPEG"]:
                raise ImageValidationError(f"Wrong format: {img.format}, expected PNG or JPEG")

            # 檢查檔案大小
            if len(image_data) > 10 * 1024 * 1024:  # 10MB
                raise ImageValidationError(f"File too large: {len(image_data)} bytes")

            logger.info(
                f"Image validation passed: {img.size}, {img.format}, {len(image_data)} bytes"
            )
            return True

        except Exception as e:
            if isinstance(e, ImageValidationError):
                raise
            raise ImageValidationError(f"Failed to validate image: {str(e)}") from e

    async def generate_images_parallel(
        self, prompts: list[str], negative_prompt: Optional[str] = None, max_concurrent: int = 4
    ) -> list[bytes]:
        """
        並行生成圖片

        Args:
            prompts: Prompt 列表
            negative_prompt: 負面 Prompt (若為 None 則使用預設)
            max_concurrent: 最大並行數量 (預設 4)

        Returns:
            List[bytes]: 圖片資料列表
        """
        if negative_prompt is None:
            negative_prompt = self.DEFAULT_NEGATIVE_PROMPT

        # 使用 Semaphore 限制並行數量
        semaphore = asyncio.Semaphore(max_concurrent)

        async def generate_with_semaphore(prompt: str) -> bytes:
            async with semaphore:
                logger.info(f"Generating: {prompt[:50]}...")
                return await self.client.generate_image_with_retry(
                    prompt=prompt, negative_prompt=negative_prompt
                )

        # 並行生成
        tasks = [generate_with_semaphore(p) for p in prompts]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 處理異常
        final_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Failed to generate image {i}: {str(result)}")
                final_results.append(None)
            else:
                final_results.append(result)

        return final_results

    async def generate_images_with_fallback(
        self, descriptions: list[str], config: Optional[dict[str, Any]] = None
    ) -> list[Optional[bytes]]:
        """
        批次生成圖片 (含 Fallback 策略)

        Fallback 規則:
        - 部分圖片失敗返回 None
        - 計算成功率
        - 成功率 < 80% 時拋出異常

        Args:
            descriptions: 圖片描述列表 (英文)
            config: 配置 (包含 style_modifiers, negative_prompt)

        Returns:
            List[Optional[bytes]]: 圖片資料列表 (失敗的為 None)

        Raises:
            ImageGenerationFailureError: 成功率 < 80%
        """
        if config is None:
            config = {}

        # 提取配置
        style_modifiers = config.get("style_modifiers", self.DEFAULT_STYLE_MODIFIERS)
        negative_prompt = config.get("negative_prompt", self.DEFAULT_NEGATIVE_PROMPT)

        # Prompt Engineering
        enhanced_prompts = [self.enhance_prompt(desc, style_modifiers) for desc in descriptions]

        # 並行生成
        results = await self.generate_images_parallel(
            prompts=enhanced_prompts,
            negative_prompt=negative_prompt,
            max_concurrent=config.get("max_concurrent", 4),
        )

        # 計算成功率
        success_count = sum(1 for r in results if r is not None)
        success_rate = success_count / len(results) if results else 0

        logger.info(
            f"Image generation success rate: {success_rate:.2%} ({success_count}/{len(results)})"
        )

        # 檢查成功率
        if success_rate < 0.8:
            raise ImageGenerationFailureError(
                f"Image generation success rate too low: {success_rate:.2%}"
            )

        return results

    async def close(self):
        """關閉服務"""
        await self.client.close()
