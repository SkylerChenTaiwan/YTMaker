"""
Stability AI SDXL 圖片生成客戶端
"""
import base64
import logging
from typing import Optional

import httpx
from aiolimiter import AsyncLimiter
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


class ContentPolicyViolationError(Exception):
    """Content Policy 違規錯誤"""

    pass


class ImageGenerationError(Exception):
    """圖片生成錯誤"""

    pass


class StabilityAIClient:
    """
    Stability AI API 客戶端

    功能:
    - 調用 SDXL 1024 模型生成圖片
    - Rate Limiting (150 req/min)
    - 指數退避重試
    - 錯誤處理
    """

    ENDPOINT = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"

    def __init__(self, api_key: str):
        """
        初始化客戶端

        Args:
            api_key: Stability AI API Key
        """
        self.api_key = api_key

        # Rate Limiter: 150 requests/分鐘
        self.rate_limiter = AsyncLimiter(150, 60)

        # HTTP 客戶端
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0),
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
        )

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = "blurry, low quality, distorted, watermark, text",
        width: int = 1920,
        height: int = 1080,
        cfg_scale: float = 8.0,
        steps: int = 40,
        style_preset: Optional[str] = None,
    ) -> bytes:
        """
        生成單張圖片

        Args:
            prompt: 正面 Prompt
            negative_prompt: 負面 Prompt
            width: 圖片寬度 (預設 1920)
            height: 圖片高度 (預設 1080)
            cfg_scale: CFG Scale (預設 8.0)
            steps: 生成步數 (預設 40)
            style_preset: 風格預設 (可選)

        Returns:
            bytes: PNG 格式圖片資料

        Raises:
            ContentPolicyViolationError: Prompt 違反 Content Policy
            ImageGenerationError: 其他生成錯誤
        """
        async with self.rate_limiter:
            payload = {
                "text_prompts": [
                    {"text": prompt, "weight": 1},
                    {"text": negative_prompt, "weight": -1},
                ],
                "cfg_scale": cfg_scale,
                "height": height,
                "width": width,
                "samples": 1,
                "steps": steps,
            }

            if style_preset:
                payload["style_preset"] = style_preset

            try:
                response = await self.client.post(self.ENDPOINT, json=payload)

                # 處理錯誤回應
                if response.status_code == 400:
                    error_msg = response.json().get("message", "Unknown error")
                    logger.error(f"Content policy violation: {prompt}")
                    raise ContentPolicyViolationError(f"Prompt rejected: {error_msg}")

                if response.status_code == 429:
                    logger.warning("Rate limit exceeded")
                    raise ImageGenerationError("Rate limit exceeded")

                response.raise_for_status()

                # 解析回應
                data = response.json()
                artifacts = data.get("artifacts", [])

                if not artifacts:
                    raise ImageGenerationError("No image generated")

                # 解碼 base64 圖片
                base64_image = artifacts[0]["base64"]
                image_data = base64.b64decode(base64_image)

                logger.info(f"Generated image: {len(image_data)} bytes")
                return image_data

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error: {e.response.status_code}")
                raise ImageGenerationError(f"API error: {e.response.status_code}") from e
            except httpx.RequestError as e:
                logger.error(f"Request error: {str(e)}")
                raise ImageGenerationError(f"Network error: {str(e)}") from e

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ImageGenerationError),
        reraise=True,
    )
    async def generate_image_with_retry(self, prompt: str, **kwargs) -> bytes:
        """
        生成圖片 (含重試機制)

        重試策略:
        - 最多 3 次
        - 指數退避: 2秒、5秒、10秒
        - 只重試 ImageGenerationError (不重試 ContentPolicyViolationError)

        Args:
            prompt: 圖片 Prompt
            **kwargs: 其他參數傳遞給 generate_image()

        Returns:
            bytes: 圖片資料
        """
        logger.info(f"Generating image with retry: {prompt[:50]}...")
        return await self.generate_image(prompt=prompt, **kwargs)

    async def close(self):
        """關閉 HTTP 客戶端"""
        await self.client.aclose()
