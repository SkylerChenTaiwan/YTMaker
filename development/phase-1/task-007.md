# Task-007: Stability AI 整合 (圖片生成)

> **建立日期:** 2025-01-19
> **狀態:** ⏳ 未開始
> **預計時間:** 10 小時
> **優先級:** P0

---

## 關聯文件

- **整合規格:** `tech-specs/backend/integrations.md#Stability AI`
- **產品設計:** `product-design/overview.md#圖片生成 API 規格`

### 相關任務
- **並行任務:** Task-006, 008, 009

---

## 任務目標

整合 Stability AI API (SDXL 模型)，實作批次圖片生成、風格一致性控制、並行處理。

---

## 實作規格

### Stability AI Client

**檔案:** `app/integrations/stability_client.py`

```python
import requests
import asyncio
from typing import List, Dict
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class StabilityAIClient:
    """Stability AI API 客戶端"""

    API_BASE = "https://api.stability.ai/v1/generation"
    MODEL = "stable-diffusion-xl-1024-v1-0"

    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.STABILITY_AI_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = None,
        width: int = 1920,
        height: int = 1080,
        cfg_scale: int = 8,
        steps: int = 40,
        style_preset: str = "photographic"
    ) -> bytes:
        """
        生成單張圖片

        Args:
            prompt: 圖片描述
            negative_prompt: 負面 prompt
            width, height: 尺寸 (16:9)
            cfg_scale: Prompt 遵循度
            steps: 推理步數
            style_preset: 風格預設

        Returns:
            圖片二進制數據
        """
        url = f"{self.API_BASE}/{self.MODEL}/text-to-image"

        payload = {
            "text_prompts": [
                {"text": prompt, "weight": 1.0}
            ],
            "width": width,
            "height": height,
            "cfg_scale": cfg_scale,
            "steps": steps,
            "samples": 1
        }

        if negative_prompt:
            payload["text_prompts"].append({
                "text": negative_prompt,
                "weight": -1.0
            })

        if style_preset:
            payload["style_preset"] = style_preset

        # 添加重試機制
        for attempt in range(3):
            try:
                response = requests.post(
                    url,
                    headers=self.headers,
                    json=payload,
                    timeout=60
                )

                if response.status_code == 200:
                    # 提取圖片數據
                    data = response.json()
                    import base64
                    image_data = base64.b64decode(data["artifacts"][0]["base64"])
                    return image_data

                elif response.status_code == 429:
                    # Rate limit - 等待後重試
                    wait_time = 2 ** attempt
                    logger.warning(f"Rate limited, waiting {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue

                else:
                    raise Exception(f"API error: {response.status_code} - {response.text}")

            except Exception as e:
                if attempt == 2:  # 最後一次嘗試
                    raise
                await asyncio.sleep(2 ** attempt)

    async def generate_images_batch(
        self,
        prompts: List[str],
        global_style: Dict = None,
        max_concurrent: int = 4
    ) -> List[bytes]:
        """
        批次生成圖片（並行處理）

        Args:
            prompts: 圖片描述列表
            global_style: 全局風格設定
            max_concurrent: 最大並行數

        Returns:
            圖片數據列表
        """
        global_style = global_style or {}

        # 組合 prompt (添加全局風格修飾詞)
        style_modifiers = global_style.get("modifiers", [
            "cinematic lighting",
            "professional photography",
            "4k quality",
            "photorealistic"
        ])
        modifier_text = ", ".join(style_modifiers)

        negative_prompt = ", ".join(global_style.get("negative_prompt", [
            "blurry",
            "low quality",
            "watermark",
            "text"
        ]))

        enhanced_prompts = [
            f"{prompt}, {modifier_text}" for prompt in prompts
        ]

        # 並行生成（限制並發數）
        semaphore = asyncio.Semaphore(max_concurrent)

        async def generate_with_semaphore(prompt):
            async with semaphore:
                return await self.generate_image(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    **global_style.get("params", {})
                )

        tasks = [generate_with_semaphore(p) for p in enhanced_prompts]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 處理錯誤
        images = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Failed to generate image {i}: {result}")
                images.append(None)
            else:
                images.append(result)

        return images
```

---

### Image Service

**檔案:** `app/services/image_service.py`

```python
from app.integrations.stability_client import StabilityAIClient
from app.models.asset import Asset, AssetType
import os
import uuid

class ImageService:
    def __init__(self, db: Session):
        self.db = db
        self.client = StabilityAIClient()

    async def generate_images_for_script(
        self,
        project_id: str,
        script_data: dict
    ) -> List[Asset]:
        """為腳本生成所有圖片"""

        # 提取圖片描述
        prompts = []
        for segment in script_data.get("segments", []):
            if "image_description" in segment:
                prompts.append(segment["image_description"])

        logger.info(f"Generating {len(prompts)} images for project {project_id}")

        # 批次生成
        images = await self.client.generate_images_batch(prompts)

        # 儲存圖片
        assets = []
        for i, image_data in enumerate(images):
            if image_data is None:
                logger.warning(f"Image {i} failed to generate, skipping...")
                continue

            # 儲存檔案
            filename = f"image_{i+1:02d}.png"
            file_path = f"/projects/{project_id}/{filename}"
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            with open(file_path, "wb") as f:
                f.write(image_data)

            # 建立 Asset 記錄
            asset = Asset(
                id=str(uuid.uuid4()),
                project_id=project_id,
                asset_type=AssetType.IMAGE,
                file_path=file_path,
                metadata={"index": i, "prompt": prompts[i]},
                created_at=datetime.utcnow()
            )
            self.db.add(asset)
            assets.append(asset)

        self.db.commit()
        return assets
```

---

## 完成檢查清單

- [ ] Stability AI Client 實作
- [ ] 批次並行處理實作
- [ ] 風格一致性控制
- [ ] 錯誤處理與重試
- [ ] 圖片品質驗證
- [ ] 測試通過

---

## 時間分配

- **API Client:** 3 小時
- **批次處理:** 3 小時
- **風格控制:** 2 小時
- **測試:** 2 小時

**總計:** 10 小時
