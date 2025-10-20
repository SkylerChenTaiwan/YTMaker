import json
import logging
from typing import Any

import google.generativeai as genai
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


class GeminiAPIError(Exception):
    """Gemini API 相關錯誤"""

    pass


class GeminiClient:
    """
    Google Gemini API 客戶端

    支援模型：
    - gemini-2.5-flash (快速，成本低)
    - gemini-2.5-pro (高品質，較慢)
    - 其他可用模型可透過 list_models() 查詢
    """

    @staticmethod
    def list_models(api_key: str) -> list[dict[str, Any]]:
        """
        列出所有可用的 Gemini 模型

        Args:
            api_key: Gemini API Key

        Returns:
            模型列表，每個模型包含：
            - name: 模型名稱 (例如 "models/gemini-2.5-flash")
            - display_name: 顯示名稱
            - description: 模型描述
            - supported_generation_methods: 支援的生成方法

        Example:
            >>> models = GeminiClient.list_models(api_key="your-key")
            >>> [m['name'] for m in models]
            ['models/gemini-2.5-flash', 'models/gemini-2.5-pro', ...]
        """
        genai.configure(api_key=api_key)

        try:
            models = []
            for model in genai.list_models():
                # 只包含支援 generateContent 的模型
                if "generateContent" in model.supported_generation_methods:
                    models.append(
                        {
                            "name": model.name,
                            "display_name": model.display_name,
                            "description": model.description,
                            "supported_generation_methods": model.supported_generation_methods,
                        }
                    )

            logger.info(f"Listed {len(models)} available Gemini models")
            return models

        except Exception as e:
            logger.error(f"Failed to list Gemini models: {e}")
            raise GeminiAPIError(f"無法列出 Gemini 模型：{str(e)}") from e

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        """
        初始化 Gemini 客戶端

        Args:
            api_key: Gemini API Key
            model: 模型名稱
        """
        self.api_key = api_key
        self.model = model

        # 配置 Gemini
        genai.configure(api_key=self.api_key)
        self.generative_model = genai.GenerativeModel(self.model)

        logger.info(f"GeminiClient initialized with model: {model}")

    async def generate_script(self, prompt: str, **kwargs) -> dict[str, Any]:
        """
        生成結構化腳本

        Args:
            prompt: 完整的 Prompt（已經過變數替換）
            **kwargs: 額外的生成參數（temperature, max_tokens 等）

        Returns:
            結構化腳本 JSON:
            {
                "title": str,
                "description": str,
                "tags": List[str],
                "segments": [
                    {
                        "type": "intro" | "content" | "outro",
                        "text": str,
                        "duration": int,  # 秒
                        "image_description": str
                    }
                ]
            }

        Raises:
            GeminiAPIError: API 調用失敗
            ValidationError: 回應格式不正確
        """
        try:
            return await self._generate_script_internal(prompt, **kwargs)
        except (ConnectionError, TimeoutError) as e:
            # 重試失敗後，轉換為 GeminiAPIError
            logger.error(f"Gemini API call failed after retries: {e}")
            raise GeminiAPIError("Gemini API 錯誤：伺服器錯誤（已重試 3 次）") from e

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ConnectionError, TimeoutError)),
        reraise=True,
    )
    async def _generate_script_internal(self, prompt: str, **kwargs) -> dict[str, Any]:
        """內部實作：生成腳本並處理錯誤"""
        try:
            # 預設參數
            generation_config = {
                "temperature": kwargs.get("temperature", 0.7),
                "max_output_tokens": kwargs.get("max_output_tokens", 4000),
            }

            logger.info(f"Calling Gemini API with model: {self.model}")

            # 調用 Gemini API
            response = await self.generative_model.generate_content_async(
                prompt, generation_config=generation_config
            )

            # 解析回應
            script_text = response.text

            logger.info("Gemini API call successful")

            # 移除 markdown code block 標記（如果有）
            if script_text.strip().startswith("```"):
                # 移除開頭的 ```json 或 ```
                script_text = script_text.strip()
                first_newline = script_text.find("\n")
                if first_newline != -1:
                    script_text = script_text[first_newline + 1 :]
                # 移除結尾的 ```
                if script_text.strip().endswith("```"):
                    script_text = script_text.strip()[:-3]

            # 嘗試解析為 JSON
            try:
                script = json.loads(script_text)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Gemini response as JSON: {e}")
                raise GeminiAPIError("Gemini 回應格式錯誤：無法解析為 JSON") from e

            return script

        except Exception as e:
            if hasattr(e, "status_code"):
                # Google API 錯誤
                if e.status_code == 401:
                    # API Key 無效，不重試
                    logger.error("Gemini API Key invalid")
                    raise GeminiAPIError("Gemini API 錯誤：API 金鑰無效") from e
                elif e.status_code == 429:
                    # Rate Limit，重試
                    logger.warning("Gemini API rate limit exceeded, retrying...")
                    raise ConnectionError("Rate limit exceeded") from e
                elif e.status_code in [500, 503]:
                    # 伺服器錯誤，重試
                    logger.warning(f"Gemini API server error {e.status_code}, retrying...")
                    raise ConnectionError(f"Server error: {e.status_code}") from e
                else:
                    logger.error(f"Gemini API error: {e}")
                    raise GeminiAPIError(f"Gemini API 錯誤：{str(e)}") from e
            else:
                logger.error(f"Unexpected error calling Gemini API: {e}")
                raise GeminiAPIError(f"Gemini API 調用失敗：{str(e)}") from e
