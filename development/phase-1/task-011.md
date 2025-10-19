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
- **第三方整合：** `tech-specs/backend/integrations.md#Stability AI`
- **業務邏輯：** `tech-specs/backend/business-logic.md#圖片生成服務`

### 相關任務
- **前置任務:** Task-003 ✅, Task-006 ✅
- **後續任務:** Task-014 (Celery 任務), Task-015 (影片渲染)
- **並行任務:** Task-010, 012, 013 (可並行開發)

---

## 任務目標

### 簡述
整合 Stability AI SDXL，實作批次圖片生成、風格一致性控制、並行處理邏輯。

### 成功標準
- [x] StabilityAIClient 類別完整實作
- [x] ImageGenerationService 業務邏輯完整
- [x] 並行處理邏輯（4-6 個並行請求）完成
- [x] Prompt Engineering（全局風格修飾詞）完成
- [x] 品質驗證（解析度、檔案大小）完成
- [x] Rate limiting 與重試完成
- [x] 單元測試與 Mock 完成

---

## 主要產出

### 1. Stability AI 客戶端
```python
# backend/app/integrations/stability_client.py
class StabilityAIClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.endpoint = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str,
        width: int = 1920,
        height: int = 1080,
        cfg_scale: float = 8.0,
        steps: int = 40,
        style_preset: Optional[str] = None
    ) -> bytes:
        """生成單張圖片"""
        pass
```

### 2. 圖片生成服務
```python
# backend/app/services/image_service.py
class ImageGenerationService:
    async def generate_images_batch(
        self,
        project_id: int,
        image_descriptions: List[str],
        config: Dict[str, Any]
    ) -> List[Asset]:
        """
        批次生成圖片（並行處理）

        Args:
            image_descriptions: 圖片描述列表（來自腳本）
            config: 全局配置（style_preset, cfg_scale等）

        Returns:
            生成的圖片 Asset 列表
        """
        # 1. Prompt Engineering（加入全局風格修飾詞）
        # 2. 並行生成（4-6 個並行）
        # 3. 品質驗證
        # 4. 儲存檔案
        # 5. 建立 Asset 記錄
        pass

    def enhance_prompt(
        self,
        description: str,
        global_modifiers: List[str]
    ) -> str:
        """
        Prompt Engineering

        範例：
            description = "A busy city street"
            global_modifiers = ["cinematic lighting", "4k quality"]
            → "A busy city street, cinematic lighting, 4k quality"
        """
        pass
```

---

## Prompt Engineering 策略

### 全局風格修飾詞
```python
DEFAULT_STYLE_MODIFIERS = [
    "cinematic lighting",
    "professional photography",
    "4k quality",
    "highly detailed",
    "photorealistic",
    "warm color palette"
]

DEFAULT_NEGATIVE_PROMPT = [
    "blurry",
    "low quality",
    "distorted",
    "watermark",
    "text",
    "logo",
    "anime",
    "cartoon"
]
```

### Prompt 組合範例
```python
# 原始描述（來自 Gemini）
description = "一座寧靜的山景，夕陽西下"

# 翻譯為英文
english_prompt = "A serene mountain landscape at sunset"

# 加入風格修飾詞
final_prompt = enhance_prompt(english_prompt, DEFAULT_STYLE_MODIFIERS)
# → "A serene mountain landscape at sunset, cinematic lighting, professional photography, 4k quality, highly detailed, photorealistic, warm color palette"

# 負面 Prompt
negative = ", ".join(DEFAULT_NEGATIVE_PROMPT)
```

---

## 並行處理策略

### 使用 asyncio.gather
```python
import asyncio

async def generate_images_parallel(
    self,
    prompts: List[str],
    max_concurrent: int = 4
) -> List[bytes]:
    """
    並行生成圖片（限制並行數量）
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def generate_with_semaphore(prompt: str):
        async with semaphore:
            return await self.client.generate_image(prompt)

    tasks = [generate_with_semaphore(p) for p in prompts]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

---

## Rate Limiting 與重試

### Rate Limiter
```python
from aiolimiter import AsyncLimiter

class StabilityAIClient:
    def __init__(self, api_key: str):
        # Stability AI 限制：約 150 requests/分鐘
        self.rate_limiter = AsyncLimiter(150, 60)

    async def generate_image(self, prompt: str) -> bytes:
        async with self.rate_limiter:
            # API 調用
            pass
```

### 指數退避重試
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
async def generate_image_with_retry(self, prompt: str) -> bytes:
    pass
```

---

## 品質驗證

### 技術驗證
```python
def validate_image(image_data: bytes) -> bool:
    """
    驗證圖片品質

    檢查項目：
    - 圖片解析度 = 1920x1080
    - 檔案格式 = PNG/JPEG
    - 檔案大小 < 10MB
    - 圖片可正常載入
    """
    from PIL import Image
    import io

    img = Image.open(io.BytesIO(image_data))

    assert img.size == (1920, 1080), f"Wrong resolution: {img.size}"
    assert img.format in ["PNG", "JPEG"], f"Wrong format: {img.format}"
    assert len(image_data) < 10 * 1024 * 1024, "File too large"

    return True
```

---

## 錯誤處理

### 錯誤類型
- `401 Unauthorized` - API Key 無效
- `429 Rate Limit` - 配額不足（等待後重試）
- `400 Bad Request` - Prompt 被拒絕（記錄並跳過）
- `500 Internal Error` - 伺服器錯誤（重試）

### Fallback 策略
```python
async def generate_images_with_fallback(
    self,
    descriptions: List[str]
) -> List[Optional[bytes]]:
    """
    批次生成，失敗的圖片返回 None
    """
    results = []
    for desc in descriptions:
        try:
            img = await self.generate_image_with_retry(desc)
            results.append(img)
        except Exception as e:
            logger.error(f"Failed to generate image: {desc}, error: {e}")
            results.append(None)

    # 檢查成功率
    success_rate = sum(1 for r in results if r is not None) / len(results)
    if success_rate < 0.8:
        raise Exception(f"Image generation success rate too low: {success_rate}")

    return results
```

---

## 驗證檢查

### 單元測試
```bash
pytest tests/integrations/test_stability_client.py -v
pytest tests/services/test_image_service.py -v
# 測試覆蓋率 > 80%
```

### 整合測試
```bash
# 需要真實的 Stability AI API Key
pytest tests/integration/test_image_generation.py --api-key=YOUR_KEY
```

---

## 完成檢查清單

- [ ] StabilityAIClient 類別實作完成
- [ ] 並行處理邏輯完成
- [ ] Prompt Engineering 完成
- [ ] Rate limiting 完成
- [ ] 品質驗證完成
- [ ] 錯誤處理與 fallback 完成
- [ ] 單元測試完成（含 Mock）
- [ ] 整合測試完成
- [ ] 測試覆蓋率 > 80%
