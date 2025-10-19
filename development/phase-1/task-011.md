# Task-011: Stability AI 整合（圖片生成）

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 12 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **產品概述：** `product-design/overview.md#圖片生成-API-規格`
- **使用者流程：** `product-design/flows.md#Flow-1` (素材生成階段)

### 技術規格
- **第三方整合：** `tech-specs/backend/integrations.md#7.2 Stability AI API`
- **業務邏輯：** `tech-specs/backend/business-logic.md#3.2.2 圖片生成`
- **資料模型：** `tech-specs/backend/database.md#assets 表`

### 相關任務
- **前置任務:** Task-003 ✅ (API 基礎架構), Task-006 ✅ (System API - API Keys 管理)
- **後續任務:** Task-014 (Celery 任務 - 素材生成), Task-015 (影片渲染)
- **並行任務:** Task-010 (Gemini), Task-012 (D-ID), Task-013 (YouTube) - 可並行開發

---

## 任務目標

### 簡述
整合 Stability AI SDXL 1024 模型，實作批次圖片生成服務，包含並行處理、風格一致性控制（Prompt Engineering）、品質驗證、Rate Limiting 和錯誤處理邏輯。

### 成功標準
- [ ] StabilityAIClient 類別完整實作（API 調用、重試、Rate Limiting）
- [ ] ImageGenerationService 業務邏輯完整（批次生成、Prompt Engineering）
- [ ] 並行處理邏輯實作（4-6 個並行請求，使用 asyncio.gather + Semaphore）
- [ ] Prompt Engineering 完整（全局風格修飾詞、負面 Prompt、中英翻譯整合）
- [ ] 品質驗證完整（解析度 1920x1080、檔案大小 < 10MB、格式檢查）
- [ ] Rate limiting 與指數退避重試完成（150 req/min 限制、3 次重試）
- [ ] 錯誤處理與 Fallback 策略（部分失敗容忍、成功率監控）
- [ ] 單元測試與 Mock 完成（測試覆蓋率 > 85%）
- [ ] 整合測試完成（需要真實 API Key，可選）

---

## 測試要求

### 單元測試

#### 測試 1：成功生成單張圖片

**目的：** 驗證 StabilityAIClient 可成功調用 API 並回傳圖片資料

**前置條件：**
- Mock Stability AI API 回應（200 OK）
- Mock 回傳 base64 編碼的圖片資料

**輸入：**
```python
prompt = "A serene mountain landscape at sunset, cinematic lighting, 4k quality"
negative_prompt = "blurry, low quality, watermark"
width = 1920
height = 1080
cfg_scale = 8.0
steps = 40
style_preset = None
```

**預期輸出：**
```python
# 回傳 bytes 物件
image_data: bytes  # PNG 格式圖片的 bytes
len(image_data) > 1000  # 合理的檔案大小
```

**驗證點：**
- [ ] HTTP 請求發送到正確的 endpoint
- [ ] Authorization header 包含正確的 Bearer token
- [ ] Request body 包含所有必要參數（text_prompts, width, height, cfg_scale, steps）
- [ ] text_prompts 包含正面和負面 prompt
- [ ] 回傳的 image_data 是有效的 bytes 物件
- [ ] 可成功解碼為 PIL Image 物件

**測試實作參考：**
```python
@pytest.mark.asyncio
async def test_generate_image_success(mock_stability_api):
    """測試成功生成單張圖片"""
    # Arrange
    api_key = "test_api_key"
    client = StabilityAIClient(api_key=api_key)

    # Mock API 回應
    mock_response = {
        "artifacts": [
            {
                "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "finishReason": "SUCCESS"
            }
        ]
    }
    mock_stability_api.post(
        "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        json=mock_response,
        status=200
    )

    # Act
    image_data = await client.generate_image(
        prompt="A beautiful sunset",
        negative_prompt="blurry",
        width=1920,
        height=1080
    )

    # Assert
    assert isinstance(image_data, bytes)
    assert len(image_data) > 0

    # 驗證可解碼為圖片
    from PIL import Image
    import io
    img = Image.open(io.BytesIO(image_data))
    assert img is not None
```

---

#### 測試 2：Rate Limiting 與指數退避重試（429 錯誤）

**目的：** 驗證遇到 Rate Limit 錯誤時會自動重試並使用指數退避

**前置條件：**
- Mock API 前 2 次回傳 429 Too Many Requests
- 第 3 次回傳 200 OK

**輸入：**
```python
prompt = "A city street"
# 其他參數同測試 1
```

**預期輸出：**
- 成功回傳圖片資料（第 3 次嘗試成功）
- 總共發送 3 次 HTTP 請求

**驗證點：**
- [ ] 第一次失敗後等待 2 秒
- [ ] 第二次失敗後等待 5 秒
- [ ] 第三次成功回傳圖片
- [ ] 使用 aiolimiter 或自訂 Rate Limiter（150 req/min）
- [ ] 日誌記錄重試資訊

**測試實作參考：**
```python
@pytest.mark.asyncio
async def test_rate_limiting_retry(mock_stability_api, caplog):
    """測試 Rate Limiting 重試機制"""
    client = StabilityAIClient(api_key="test_key")

    # Mock 前 2 次 429，第 3 次成功
    mock_stability_api.post(
        "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        [
            {"status": 429, "json": {"message": "Rate limit exceeded"}},
            {"status": 429, "json": {"message": "Rate limit exceeded"}},
            {"status": 200, "json": {"artifacts": [{"base64": "valid_image_data"}]}}
        ]
    )

    start_time = time.time()

    # Act
    image_data = await client.generate_image_with_retry(prompt="Test")

    elapsed = time.time() - start_time

    # Assert
    assert isinstance(image_data, bytes)
    assert elapsed >= 7  # 2 + 5 秒延遲
    assert "Rate limit exceeded, retrying" in caplog.text
```

---

#### 測試 3：Content Policy 違規處理（400 錯誤）

**目的：** 驗證 Prompt 被 Content Policy 拒絕時的處理邏輯

**前置條件：**
- Mock API 回傳 400 Bad Request（Content Policy Violation）

**輸入：**
```python
prompt = "Inappropriate content that violates policy"
```

**預期輸出：**
- 拋出 `ContentPolicyViolationError` 異常
- 日誌記錄被拒絕的 Prompt

**驗證點：**
- [ ] 捕獲 400 錯誤
- [ ] 判斷錯誤類型為 Content Policy Violation
- [ ] 記錄完整的 Prompt 到日誌（用於後續分析）
- [ ] 拋出自訂異常 `ContentPolicyViolationError`
- [ ] 不進行重試（Content Policy 錯誤無法通過重試解決）

**測試實作參考：**
```python
@pytest.mark.asyncio
async def test_content_policy_violation(mock_stability_api):
    """測試 Content Policy 違規處理"""
    client = StabilityAIClient(api_key="test_key")

    mock_stability_api.post(
        "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        status=400,
        json={"message": "Content policy violation"}
    )

    # Act & Assert
    with pytest.raises(ContentPolicyViolationError) as exc_info:
        await client.generate_image(prompt="Inappropriate prompt")

    assert "Content policy violation" in str(exc_info.value)
```

---

#### 測試 4：批次並行生成圖片（4 個並行）

**目的：** 驗證 ImageGenerationService 可並行生成多張圖片並控制並行數量

**前置條件：**
- Mock API 每次調用延遲 1 秒
- 10 個圖片描述需要生成

**輸入：**
```python
image_descriptions = [
    "A mountain landscape",
    "A busy city street",
    "A peaceful beach",
    "A forest path",
    "A desert sunset",
    "A snowy village",
    "A tropical island",
    "A modern building",
    "A vintage car",
    "A flower garden"
]
config = {
    "style_modifiers": ["cinematic lighting", "4k quality"],
    "negative_prompt": "blurry, low quality"
}
```

**預期輸出：**
```python
# 回傳 10 個 bytes 物件的列表
results: List[bytes]  # 長度為 10
total_time < 4 秒  # 並行處理，應遠少於 10 秒
```

**驗證點：**
- [ ] 使用 `asyncio.gather()` 並行處理
- [ ] 使用 `asyncio.Semaphore(4)` 限制並行數量為 4
- [ ] 總耗時遠少於序列執行時間（10 秒）
- [ ] 所有 10 張圖片都成功生成
- [ ] 每個 Prompt 都包含 Prompt Engineering（風格修飾詞）
- [ ] Rate Limiter 正確限制請求速率（150 req/min）

**測試實作參考：**
```python
@pytest.mark.asyncio
async def test_parallel_image_generation(mock_stability_api):
    """測試批次並行生成圖片"""
    service = ImageGenerationService()

    # Mock API 延遲 1 秒
    async def mock_delay(*args, **kwargs):
        await asyncio.sleep(1)
        return {"artifacts": [{"base64": "image_data"}]}

    mock_stability_api.post.side_effect = mock_delay

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
    assert elapsed < 4  # 10 張圖 / 4 並行 ≈ 2.5 秒（含延遲）
```

---

#### 測試 5：Prompt Engineering（風格修飾詞組合）

**目的：** 驗證 Prompt Engineering 邏輯正確組合原始描述和風格修飾詞

**輸入：**
```python
description = "一座寧靜的山景"  # 中文描述
global_modifiers = [
    "cinematic lighting",
    "professional photography",
    "4k quality",
    "highly detailed",
    "photorealistic"
]
```

**預期輸出：**
```python
enhanced_prompt = "A serene mountain landscape, cinematic lighting, professional photography, 4k quality, highly detailed, photorealistic"
```

**驗證點：**
- [ ] 中文描述被翻譯為英文（可使用 Gemini 或簡單字典翻譯）
- [ ] 風格修飾詞正確附加到描述後方
- [ ] 使用逗號分隔
- [ ] 格式正確（沒有多餘空格或標點）
- [ ] 支援自訂 global_modifiers（可為空列表）

**測試實作參考：**
```python
def test_prompt_engineering():
    """測試 Prompt Engineering 邏輯"""
    service = ImageGenerationService()

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
```

---

#### 測試 6：圖片品質驗證

**目的：** 驗證生成的圖片符合規格要求（解析度、格式、檔案大小）

**輸入：**
```python
# Mock 生成的圖片資料
image_data = generate_mock_image(width=1920, height=1080, format="PNG")
```

**預期輸出：**
- 驗證通過，回傳 True

**驗證點：**
- [ ] 圖片解析度 = 1920x1080
- [ ] 圖片格式 = PNG 或 JPEG
- [ ] 檔案大小 < 10MB
- [ ] 圖片可正常載入（使用 PIL）
- [ ] 驗證失敗時拋出 `ImageValidationError`

**測試實作參考：**
```python
def test_image_validation_success():
    """測試圖片品質驗證（成功）"""
    service = ImageGenerationService()

    # 生成符合規格的 Mock 圖片
    from PIL import Image
    import io

    img = Image.new('RGB', (1920, 1080), color='blue')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    image_data = buffer.getvalue()

    # Act
    result = service.validate_image(image_data)

    # Assert
    assert result is True

def test_image_validation_wrong_resolution():
    """測試圖片品質驗證（錯誤解析度）"""
    service = ImageGenerationService()

    # 錯誤解析度
    img = Image.new('RGB', (1280, 720), color='blue')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    image_data = buffer.getvalue()

    # Act & Assert
    with pytest.raises(ImageValidationError) as exc_info:
        service.validate_image(image_data)

    assert "Wrong resolution" in str(exc_info.value)
```

---

#### 測試 7：部分失敗容忍（Fallback 策略）

**目的：** 驗證批次生成時，部分圖片失敗不影響整體流程，且成功率監控正確

**前置條件：**
- 10 張圖片中，2 張生成失敗（返回 None）
- 成功率 = 80%（符合最低要求）

**輸入：**
```python
descriptions = [f"Image {i}" for i in range(10)]
```

**預期輸出：**
```python
results = [
    bytes(...),  # 成功
    bytes(...),  # 成功
    None,        # 失敗
    bytes(...),  # 成功
    ...
    None         # 失敗
]
success_rate = 0.8  # 80%
# 不拋出異常，允許繼續
```

**驗證點：**
- [ ] 部分失敗不中斷整個批次
- [ ] 失敗的圖片返回 None
- [ ] 計算成功率（成功數 / 總數）
- [ ] 成功率 >= 80% 時允許繼續
- [ ] 成功率 < 80% 時拋出 `ImageGenerationFailureError`
- [ ] 日誌記錄失敗的圖片描述

**測試實作參考：**
```python
@pytest.mark.asyncio
async def test_partial_failure_tolerance(mock_stability_api):
    """測試部分失敗容忍"""
    service = ImageGenerationService()

    # Mock 10 張圖片，2 張失敗
    responses = [
        {"status": 200, "json": {"artifacts": [{"base64": "img"}]}} if i not in [2, 7]
        else {"status": 500, "json": {"message": "Server error"}}
        for i in range(10)
    ]
    mock_stability_api.post.side_effect = responses

    # Act
    results = await service.generate_images_with_fallback(
        descriptions=[f"Image {i}" for i in range(10)]
    )

    # Assert
    assert len(results) == 10
    assert results[2] is None
    assert results[7] is None
    assert sum(1 for r in results if r is not None) == 8  # 80% 成功率
    # 不應拋出異常
```

---

### 整合測試

#### 測試 8：完整圖片生成流程（需要真實 API Key）

**目的：** 端到端測試整個圖片生成流程

**前置條件：**
- 需要有效的 Stability AI API Key
- 設定環境變數 `STABILITY_API_KEY=your_key`

**測試流程：**
1. 初始化 StabilityAIClient 和 ImageGenerationService
2. 生成 3 張測試圖片（不同描述）
3. 驗證每張圖片符合規格
4. 儲存到臨時目錄
5. 清理臨時檔案

**驗證點：**
- [ ] 所有圖片成功生成
- [ ] 解析度正確（1920x1080）
- [ ] 圖片可正常載入和顯示
- [ ] Prompt Engineering 效果正確（包含風格修飾詞）
- [ ] Rate Limiting 正常運作（無 429 錯誤）

**測試實作參考：**
```python
@pytest.mark.integration
@pytest.mark.skipif(not os.getenv("STABILITY_API_KEY"), reason="需要真實 API Key")
async def test_full_image_generation_flow():
    """完整圖片生成流程測試（需要真實 API Key）"""
    api_key = os.getenv("STABILITY_API_KEY")
    service = ImageGenerationService(api_key=api_key)

    descriptions = [
        "A beautiful sunset over mountains",
        "A busy city street at night",
        "A peaceful beach with palm trees"
    ]

    # Act
    results = await service.generate_images_batch(
        project_id=1,
        image_descriptions=descriptions,
        config={
            "style_modifiers": ["cinematic lighting", "4k quality"],
            "negative_prompt": "blurry, low quality"
        }
    )

    # Assert
    assert len(results) == 3

    for i, asset in enumerate(results):
        assert asset.type == "image"
        assert asset.status == "completed"

        # 驗證檔案存在且符合規格
        assert os.path.exists(asset.file_path)

        img = Image.open(asset.file_path)
        assert img.size == (1920, 1080)

        # 清理
        os.remove(asset.file_path)
```

---

## 實作規格

### 需要建立/修改的檔案

#### 1. Stability AI Client: `backend/app/integrations/stability_client.py`

**職責：** 封裝 Stability AI API 調用邏輯、處理認證、重試、Rate Limiting

**類別與方法：**

```python
"""
Stability AI SDXL 圖片生成客戶端
"""
import httpx
import base64
import asyncio
from typing import Optional, List
from aiolimiter import AsyncLimiter
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings
from app.core.logging import logger


class ContentPolicyViolationError(Exception):
    """Content Policy 違規錯誤"""
    pass


class ImageGenerationError(Exception):
    """圖片生成錯誤"""
    pass


class StabilityAIClient:
    """
    Stability AI API 客戶端

    功能：
    - 調用 SDXL 1024 模型生成圖片
    - Rate Limiting（150 req/min）
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
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
        )

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = "blurry, low quality, distorted, watermark, text",
        width: int = 1920,
        height: int = 1080,
        cfg_scale: float = 8.0,
        steps: int = 40,
        style_preset: Optional[str] = None
    ) -> bytes:
        """
        生成單張圖片

        Args:
            prompt: 正面 Prompt
            negative_prompt: 負面 Prompt
            width: 圖片寬度（預設 1920）
            height: 圖片高度（預設 1080）
            cfg_scale: CFG Scale（預設 8.0）
            steps: 生成步數（預設 40）
            style_preset: 風格預設（可選）

        Returns:
            bytes: PNG 格式圖片資料

        Raises:
            ContentPolicyViolationError: Prompt 違反 Content Policy
            ImageGenerationError: 其他生成錯誤
        """
        async with self.rate_limiter:
            payload = {
                "text_prompts": [
                    {
                        "text": prompt,
                        "weight": 1
                    },
                    {
                        "text": negative_prompt,
                        "weight": -1
                    }
                ],
                "cfg_scale": cfg_scale,
                "height": height,
                "width": width,
                "samples": 1,
                "steps": steps
            }

            if style_preset:
                payload["style_preset"] = style_preset

            try:
                response = await self.client.post(
                    self.ENDPOINT,
                    json=payload
                )

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
                raise ImageGenerationError(f"API error: {e.response.status_code}")
            except httpx.RequestError as e:
                logger.error(f"Request error: {str(e)}")
                raise ImageGenerationError(f"Network error: {str(e)}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ImageGenerationError),
        reraise=True
    )
    async def generate_image_with_retry(
        self,
        prompt: str,
        **kwargs
    ) -> bytes:
        """
        生成圖片（含重試機制）

        重試策略：
        - 最多 3 次
        - 指數退避：2秒、5秒、10秒
        - 只重試 ImageGenerationError（不重試 ContentPolicyViolationError）

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
```

---

#### 2. Image Generation Service: `backend/app/services/image_service.py`

**職責：** 圖片生成業務邏輯、批次處理、Prompt Engineering、品質驗證

**類別與方法：**

```python
"""
圖片生成服務
"""
import asyncio
from typing import List, Dict, Any, Optional
from PIL import Image
import io

from app.integrations.stability_client import StabilityAIClient, ContentPolicyViolationError, ImageGenerationError
from app.models.asset import Asset
from app.core.config import settings
from app.core.logging import logger
from sqlalchemy.orm import Session


class ImageValidationError(Exception):
    """圖片驗證錯誤"""
    pass


class ImageGenerationFailureError(Exception):
    """圖片生成失敗率過高錯誤"""
    pass


class ImageGenerationService:
    """
    圖片生成服務

    功能：
    - 批次生成圖片（並行處理）
    - Prompt Engineering（風格修飾詞）
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
        "warm color palette"
    ]

    # 預設負面 Prompt
    DEFAULT_NEGATIVE_PROMPT = ", ".join([
        "blurry",
        "low quality",
        "distorted",
        "watermark",
        "text",
        "logo",
        "anime",
        "cartoon"
    ])

    def __init__(self, api_key: Optional[str] = None):
        """
        初始化服務

        Args:
            api_key: Stability AI API Key（若為 None 則從 settings 取得）
        """
        self.api_key = api_key or settings.STABILITY_API_KEY
        self.client = StabilityAIClient(api_key=self.api_key)

    def enhance_prompt(
        self,
        description: str,
        global_modifiers: Optional[List[str]] = None
    ) -> str:
        """
        Prompt Engineering

        組合原始描述和風格修飾詞

        Args:
            description: 原始圖片描述（英文）
            global_modifiers: 全局風格修飾詞（若為 None 則使用預設）

        Returns:
            str: 增強後的 Prompt

        範例：
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

        檢查項目：
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

            logger.info(f"Image validation passed: {img.size}, {img.format}, {len(image_data)} bytes")
            return True

        except Exception as e:
            if isinstance(e, ImageValidationError):
                raise
            raise ImageValidationError(f"Failed to validate image: {str(e)}")

    async def generate_images_parallel(
        self,
        prompts: List[str],
        negative_prompt: Optional[str] = None,
        max_concurrent: int = 4
    ) -> List[bytes]:
        """
        並行生成圖片

        Args:
            prompts: Prompt 列表
            negative_prompt: 負面 Prompt（若為 None 則使用預設）
            max_concurrent: 最大並行數量（預設 4）

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
                    prompt=prompt,
                    negative_prompt=negative_prompt
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
        self,
        descriptions: List[str],
        config: Optional[Dict[str, Any]] = None
    ) -> List[Optional[bytes]]:
        """
        批次生成圖片（含 Fallback 策略）

        Fallback 規則：
        - 部分圖片失敗返回 None
        - 計算成功率
        - 成功率 < 80% 時拋出異常

        Args:
            descriptions: 圖片描述列表（英文）
            config: 配置（包含 style_modifiers, negative_prompt）

        Returns:
            List[Optional[bytes]]: 圖片資料列表（失敗的為 None）

        Raises:
            ImageGenerationFailureError: 成功率 < 80%
        """
        if config is None:
            config = {}

        # 提取配置
        style_modifiers = config.get("style_modifiers", self.DEFAULT_STYLE_MODIFIERS)
        negative_prompt = config.get("negative_prompt", self.DEFAULT_NEGATIVE_PROMPT)

        # Prompt Engineering
        enhanced_prompts = [
            self.enhance_prompt(desc, style_modifiers)
            for desc in descriptions
        ]

        # 並行生成
        results = await self.generate_images_parallel(
            prompts=enhanced_prompts,
            negative_prompt=negative_prompt,
            max_concurrent=config.get("max_concurrent", 4)
        )

        # 計算成功率
        success_count = sum(1 for r in results if r is not None)
        success_rate = success_count / len(results) if results else 0

        logger.info(f"Image generation success rate: {success_rate:.2%} ({success_count}/{len(results)})")

        # 檢查成功率
        if success_rate < 0.8:
            raise ImageGenerationFailureError(
                f"Image generation success rate too low: {success_rate:.2%}"
            )

        return results

    async def generate_images_batch(
        self,
        project_id: int,
        image_descriptions: List[str],
        config: Dict[str, Any],
        db: Session
    ) -> List[Asset]:
        """
        批次生成圖片並儲存為 Asset

        完整流程：
        1. Prompt Engineering
        2. 並行生成圖片
        3. 品質驗證
        4. 儲存檔案到本地
        5. 建立 Asset 記錄

        Args:
            project_id: 專案 ID
            image_descriptions: 圖片描述列表
            config: 配置（style_modifiers, negative_prompt, max_concurrent）
            db: Database session

        Returns:
            List[Asset]: 生成的圖片 Asset 列表
        """
        logger.info(f"Starting batch image generation: {len(image_descriptions)} images")

        # 生成圖片（含 Fallback）
        image_data_list = await self.generate_images_with_fallback(
            descriptions=image_descriptions,
            config=config
        )

        # 儲存 Asset
        assets = []
        for i, image_data in enumerate(image_data_list):
            if image_data is None:
                logger.warning(f"Skipping failed image {i}")
                continue

            try:
                # 驗證圖片
                self.validate_image(image_data)

                # 儲存檔案
                file_path = f"projects/{project_id}/assets/image_{i+1:03d}.png"
                # TODO: 實際儲存到檔案系統

                # 建立 Asset 記錄
                asset = Asset(
                    project_id=project_id,
                    type="image",
                    file_path=file_path,
                    metadata={
                        "description": image_descriptions[i],
                        "index": i + 1
                    },
                    status="completed"
                )
                db.add(asset)
                assets.append(asset)

            except ImageValidationError as e:
                logger.error(f"Image validation failed for index {i}: {str(e)}")
                continue

        db.commit()

        logger.info(f"Batch image generation completed: {len(assets)} assets created")
        return assets

    async def close(self):
        """關閉服務"""
        await self.client.close()
```

---

#### 3. 自訂異常: `backend/app/core/exceptions.py`

**新增圖片生成相關異常：**

```python
# ... existing exceptions ...

class ContentPolicyViolationError(Exception):
    """Stability AI Content Policy 違規錯誤"""
    pass


class ImageGenerationError(Exception):
    """圖片生成錯誤（API 錯誤、網路錯誤）"""
    pass


class ImageValidationError(Exception):
    """圖片驗證錯誤（解析度、格式、大小）"""
    pass


class ImageGenerationFailureError(Exception):
    """批次圖片生成成功率過低錯誤"""
    pass
```

---

#### 4. 配置: `backend/app/core/config.py`

**新增 Stability AI 配置：**

```python
# ... existing config ...

class Settings(BaseSettings):
    # ... existing settings ...

    # Stability AI
    STABILITY_API_KEY: Optional[str] = None
    STABILITY_MAX_CONCURRENT: int = 4  # 最大並行請求數
    STABILITY_RATE_LIMIT: int = 150  # 每分鐘請求數限制

    # 圖片生成配置
    IMAGE_WIDTH: int = 1920
    IMAGE_HEIGHT: int = 1080
    IMAGE_CFG_SCALE: float = 8.0
    IMAGE_STEPS: int = 40

    class Config:
        env_file = ".env"


settings = Settings()
```

---

#### 5. 測試檔案: `backend/tests/integrations/test_stability_client.py`

**單元測試（使用 Mock）：**

```python
"""
Stability AI Client 單元測試
"""
import pytest
import asyncio
import time
from unittest.mock import AsyncMock, patch, MagicMock

from app.integrations.stability_client import (
    StabilityAIClient,
    ContentPolicyViolationError,
    ImageGenerationError
)


@pytest.fixture
def mock_httpx_client():
    """Mock httpx.AsyncClient"""
    with patch("httpx.AsyncClient") as mock:
        yield mock


@pytest.mark.asyncio
async def test_generate_image_success(mock_httpx_client):
    """測試 1：成功生成單張圖片"""
    # Arrange
    client = StabilityAIClient(api_key="test_key")

    # Mock 回應
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "artifacts": [
            {
                "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
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


@pytest.mark.asyncio
async def test_rate_limiting_retry():
    """測試 2：Rate Limiting 重試機制"""
    client = StabilityAIClient(api_key="test_key")

    # Mock 前 2 次 429，第 3 次成功
    responses = [
        MagicMock(status_code=429, json=lambda: {"message": "Rate limit"}),
        MagicMock(status_code=429, json=lambda: {"message": "Rate limit"}),
        MagicMock(status_code=200, json=lambda: {"artifacts": [{"base64": "valid_data"}]})
    ]

    call_count = 0

    async def mock_post(*args, **kwargs):
        nonlocal call_count
        response = responses[call_count]
        call_count += 1
        return response

    client.client.post = mock_post

    # Act
    start = time.time()
    # 由於使用 tenacity，會自動重試
    # 需要修改實作以支援測試
    # ... (簡化版測試)


@pytest.mark.asyncio
async def test_content_policy_violation():
    """測試 3：Content Policy 違規處理"""
    client = StabilityAIClient(api_key="test_key")

    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.json.return_value = {"message": "Content policy violation"}

    client.client.post = AsyncMock(return_value=mock_response)

    # Act & Assert
    with pytest.raises(ContentPolicyViolationError):
        await client.generate_image(prompt="Inappropriate content")


# ... 更多測試（測試 4-8）參考前面的測試要求 ...
```

---

#### 6. 測試檔案: `backend/tests/services/test_image_service.py`

**服務層測試：**

```python
"""
Image Generation Service 單元測試
"""
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.image_service import ImageGenerationService, ImageValidationError


def test_prompt_engineering():
    """測試 5：Prompt Engineering"""
    service = ImageGenerationService()

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


def test_image_validation_success():
    """測試 6：圖片品質驗證（成功）"""
    from PIL import Image
    import io

    service = ImageGenerationService()

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
    """測試 6：圖片品質驗證（錯誤解析度）"""
    from PIL import Image
    import io

    service = ImageGenerationService()

    # 錯誤解析度
    img = Image.new('RGB', (1280, 720), color='blue')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    image_data = buffer.getvalue()

    # Act & Assert
    with pytest.raises(ImageValidationError) as exc_info:
        service.validate_image(image_data)

    assert "Wrong resolution" in str(exc_info.value)


# ... 更多測試（測試 4, 7）參考前面的測試要求 ...
```

---

#### 7. 依賴套件: `backend/requirements.txt`

**新增依賴：**

```txt
# ... existing dependencies ...

# Stability AI 整合
httpx>=0.24.0           # 非同步 HTTP 客戶端
aiolimiter>=1.1.0       # Rate Limiting
tenacity>=8.2.0         # 重試機制
Pillow>=10.0.0          # 圖片驗證
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）
1. 確認 Task-003 和 Task-006 已完成
2. 確認測試環境可運行：`pytest`
3. 安裝依賴：`pip install httpx aiolimiter tenacity Pillow`
4. 閱讀 `tech-specs/backend/integrations.md#7.2 Stability AI API`

#### 第 2 步：撰寫第一個測試（20 分鐘）
1. 建立 `tests/integrations/test_stability_client.py`
2. 撰寫「測試 1：成功生成單張圖片」
3. 執行測試 → 失敗（預期，因為還沒實作）

#### 第 3 步：實作 StabilityAIClient 骨架（30 分鐘）
1. 建立 `app/integrations/stability_client.py`
2. 實作 `StabilityAIClient` 類別
3. 實作 `__init__()` 方法
4. 實作 `generate_image()` 基礎邏輯
5. 執行測試 1 → 通過 ✅

#### 第 4 步：實作 Rate Limiting 和重試（40 分鐘）
1. 撰寫「測試 2：Rate Limiting 重試」
2. 整合 `aiolimiter` 和 `tenacity`
3. 實作 `generate_image_with_retry()` 方法
4. 執行測試 2 → 通過 ✅

#### 第 5 步：實作錯誤處理（30 分鐘）
1. 撰寫「測試 3：Content Policy 違規」
2. 定義自訂異常（`ContentPolicyViolationError`, `ImageGenerationError`）
3. 實作錯誤判斷邏輯（400, 429 處理）
4. 執行測試 3 → 通過 ✅

#### 第 6 步：實作 ImageGenerationService 骨架（30 分鐘）
1. 建立 `app/services/image_service.py`
2. 實作 `ImageGenerationService` 類別
3. 實作 `enhance_prompt()` 方法
4. 撰寫「測試 5：Prompt Engineering」
5. 執行測試 5 → 通過 ✅

#### 第 7 步：實作並行處理（60 分鐘）
1. 撰寫「測試 4：批次並行生成」
2. 實作 `generate_images_parallel()` 方法
3. 使用 `asyncio.gather()` + `Semaphore`
4. 執行測試 4 → 通過 ✅

#### 第 8 步：實作品質驗證（40 分鐘）
1. 撰寫「測試 6：圖片品質驗證」（成功和失敗情境）
2. 實作 `validate_image()` 方法
3. 使用 `PIL` 驗證解析度、格式、大小
4. 執行測試 6 → 通過 ✅

#### 第 9 步：實作 Fallback 策略（40 分鐘）
1. 撰寫「測試 7：部分失敗容忍」
2. 實作 `generate_images_with_fallback()` 方法
3. 計算成功率並檢查閾值（80%）
4. 執行測試 7 → 通過 ✅

#### 第 10 步：實作完整流程（40 分鐘）
1. 實作 `generate_images_batch()` 方法
2. 整合所有子方法（Prompt Engineering → 並行生成 → 驗證 → 儲存 Asset）
3. 執行所有單元測試 → 通過 ✅

#### 第 11 步：整合測試（可選，30 分鐘）
1. 撰寫「測試 8：完整圖片生成流程」（需要真實 API Key）
2. 設定環境變數 `STABILITY_API_KEY`
3. 執行整合測試 → 通過 ✅

#### 第 12 步：重構與優化（30 分鐘）
1. 檢查程式碼重複
2. 提取共用邏輯（例如配置處理）
3. 改善錯誤訊息和日誌
4. 執行所有測試確保沒有 regression

#### 第 13 步：文件與檢查（20 分鐘）
1. 更新 docstrings（所有類別和方法）
2. 檢查測試覆蓋率：`pytest --cov=app/integrations --cov=app/services`
3. 執行 linter：`ruff check .`
4. 格式化程式碼：`ruff format .`

---

### 注意事項

#### 安全性
- ⚠️ **絕對不要**在日誌中記錄完整的 API Key
- ⚠️ API Key 應儲存在環境變數或 Keychain 中
- ⚠️ 錯誤訊息中不要包含敏感資訊

#### 效能
- 💡 使用並行處理（4-6 個並行請求）可將 10 張圖片的生成時間從 ~100 秒降到 ~25 秒
- 💡 Rate Limiting 很重要，避免超過 150 req/min 導致 429 錯誤
- 💡 圖片驗證使用 PIL 載入圖片，確保資料有效

#### 測試
- ✅ 使用 Mock 進行單元測試（不調用真實 API）
- ✅ 整合測試需要真實 API Key，使用 `@pytest.mark.integration` 標記
- ✅ 測試應該可以獨立執行（不依賴順序）
- ✅ 使用 `@pytest.mark.asyncio` 標記非同步測試

#### 成本控制
- 💰 Stability AI 按量計費，約 $0.02/張圖片
- 💰 10 分鐘影片約需 15 張圖片，成本 $0.30
- 💰 批次生成前應檢查配額和成本
- 💰 失敗重試最多 3 次，避免無限重試增加成本

#### 與其他模組整合
- 🔗 Task-010（Gemini）會提供圖片描述（中文 → 英文翻譯）
- 🔗 Task-014（Celery 任務）會調用此服務進行批次生成
- 🔗 Task-015（影片渲染）會使用生成的圖片進行合成
- 🔗 Task-006（System API）會管理 API Key 的儲存和驗證

---

### 完成檢查清單

#### 功能完整性
- [ ] StabilityAIClient 類別實作完成
  - [ ] `generate_image()` 方法
  - [ ] `generate_image_with_retry()` 方法（含 tenacity 重試）
  - [ ] Rate Limiting（aiolimiter）
  - [ ] 錯誤處理（400, 429, 500）
- [ ] ImageGenerationService 類別實作完成
  - [ ] `enhance_prompt()` 方法（Prompt Engineering）
  - [ ] `validate_image()` 方法（品質驗證）
  - [ ] `generate_images_parallel()` 方法（並行處理）
  - [ ] `generate_images_with_fallback()` 方法（Fallback 策略）
  - [ ] `generate_images_batch()` 方法（完整流程）
- [ ] 自訂異常定義完成
- [ ] 配置檔案更新完成

#### 測試
- [ ] 所有單元測試通過（測試 1-7）
  - [ ] 測試 1：成功生成單張圖片 ✅
  - [ ] 測試 2：Rate Limiting 重試 ✅
  - [ ] 測試 3：Content Policy 違規 ✅
  - [ ] 測試 4：批次並行生成 ✅
  - [ ] 測試 5：Prompt Engineering ✅
  - [ ] 測試 6：圖片品質驗證 ✅
  - [ ] 測試 7：部分失敗容忍 ✅
- [ ] 整合測試通過（測試 8，可選）
- [ ] 測試覆蓋率 > 85%
- [ ] 所有測試可獨立執行

#### 程式碼品質
- [ ] Ruff check 無錯誤：`ruff check .`
- [ ] 程式碼已格式化：`ruff format .`
- [ ] 無 type 錯誤（如使用 mypy）
- [ ] 所有類別和方法都有 docstring
- [ ] 日誌記錄完整（info, warning, error）

#### 文件
- [ ] 所有函數都有清楚的 docstring
- [ ] 參數和回傳值都有類型標註
- [ ] 錯誤處理都有文件說明
- [ ] README 已更新（如需要）

#### 整合
- [ ] 在本地環境手動測試圖片生成（需要 API Key）
- [ ] 驗證圖片解析度正確（1920x1080）
- [ ] 驗證 Prompt Engineering 效果
- [ ] 驗證並行處理速度提升
- [ ] 驗證 Rate Limiting 正常運作

#### Spec 同步
- [ ] 如果實作與 spec 有差異，已更新 `tech-specs/backend/integrations.md`
- [ ] 如果有新的依賴套件，已更新 `requirements.txt`
- [ ] 如果有配置變更，已更新 `.env.example`

---

## 預估時間分配

- **環境準備：** 10 分鐘
- **撰寫測試（測試 1-7）：** 140 分鐘
- **實作功能：** 280 分鐘
  - StabilityAIClient: 100 分鐘
  - ImageGenerationService: 180 分鐘
- **整合測試：** 30 分鐘
- **重構優化：** 30 分鐘
- **文件檢查：** 20 分鐘
- **手動測試：** 40 分鐘

**總計：約 9-10 小時**（預留 2 小時 buffer = 12 小時）

---

## 參考資源

### Stability AI 官方文檔
- [API Reference](https://platform.stability.ai/docs/api-reference)
- [SDXL 1.0 Model](https://platform.stability.ai/docs/features/api-parameters#about-sdxl-10)
- [Rate Limits](https://platform.stability.ai/docs/api-reference#tag/rate-limits)
- [Error Codes](https://platform.stability.ai/docs/api-reference#tag/errors)

### 相關套件文檔
- [httpx](https://www.python-httpx.org/) - 非同步 HTTP 客戶端
- [aiolimiter](https://aiolimiter.readthedocs.io/) - 非同步 Rate Limiting
- [tenacity](https://tenacity.readthedocs.io/) - 重試機制
- [Pillow](https://pillow.readthedocs.io/) - 圖片處理

### 專案內部文件
- `tech-specs/backend/integrations.md#7.2` - Stability AI 整合規格
- `tech-specs/backend/business-logic.md#3.2.2` - 圖片生成業務邏輯
- `product-design/overview.md#圖片生成-API-規格` - 產品需求

### 範例 Prompts
**好的 Prompts：**
```
A serene mountain landscape at sunset, cinematic lighting, professional photography, 4k quality, highly detailed, photorealistic, warm color palette

Negative: blurry, low quality, distorted, watermark, text, logo, anime, cartoon
```

**Content Policy 容易觸發的內容：**
- 暴力、血腥內容
- 政治敏感內容
- 特定名人或品牌
- 不適當的圖片請求

---

**準備好了嗎？** 開始使用 TDD 方式實作這個 task！🚀

記住核心原則：
1. ✅ **先寫測試，再實作功能**
2. ✅ **並行處理提升效能**（4-6 個並行請求）
3. ✅ **Prompt Engineering 確保風格一致**（全局修飾詞）
4. ✅ **錯誤處理和 Fallback**（部分失敗可容忍）
5. ✅ **Rate Limiting 避免 429 錯誤**（150 req/min）
6. ✅ **品質驗證確保圖片符合規格**（1920x1080, PNG/JPEG, <10MB）
