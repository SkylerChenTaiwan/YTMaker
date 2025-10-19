# 第三方整合

> **關聯文件:** [service-video-generation.md](./service-video-generation.md), [auth.md](./auth.md)

---

## 1. 整合總覽

**第三方服務:**
1. Google Gemini API - 腳本生成
2. Stability AI API - 圖片生成
3. D-ID API - 虛擬主播生成
4. YouTube Data API - 影片上傳

---

## 2. Google Gemini API

### 2.1 SDK 安裝

```bash
pip install google-generativeai>=0.3.0
```

### 2.2 客戶端實作

```python
# app/services/gemini_service.py
import google.generativeai as genai
from app.security.keychain_manager import KeychainManager

class GeminiService:
    """Google Gemini API 客戶端"""

    def __init__(self):
        # 從 Keychain 讀取 API Key
        api_key = KeychainManager.get_api_key("gemini")
        if not api_key:
            raise ValueError("Gemini API Key 未設定")

        genai.configure(api_key=api_key)

    async def generate_script(
        self,
        content: str,
        prompt_template: str,
        model: str = "gemini-1.5-flash"
    ) -> dict:
        """生成影片腳本

        Args:
            content: 原始文字內容
            prompt_template: Prompt 範本
            model: Gemini 模型名稱

        Returns:
            腳本 JSON
        """
        model_instance = genai.GenerativeModel(model)

        # 組合 Prompt
        prompt = prompt_template.replace("{content}", content)

        # 生成內容
        response = await model_instance.generate_content_async(prompt)

        # 解析回應
        script_data = json.loads(response.text)

        return script_data
```

---

## 3. Stability AI API

### 3.1 客戶端實作

```python
# app/services/stability_service.py
import httpx
from app.security.keychain_manager import KeychainManager

class StabilityAIService:
    """Stability AI API 客戶端"""

    BASE_URL = "https://api.stability.ai/v1"

    def __init__(self):
        api_key = KeychainManager.get_api_key("stability")
        if not api_key:
            raise ValueError("Stability AI API Key 未設定")

        self.api_key = api_key
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={"Authorization": f"Bearer {api_key}"}
        )

    async def generate_image(
        self,
        prompt: str,
        width: int = 1920,
        height: int = 1080
    ) -> bytes:
        """生成圖片

        Args:
            prompt: 圖片描述
            width: 寬度
            height: 高度

        Returns:
            圖片二進位資料
        """
        payload = {
            "text_prompts": [
                {"text": prompt, "weight": 1.0}
            ],
            "cfg_scale": 7,
            "height": height,
            "width": width,
            "samples": 1,
            "steps": 30
        }

        response = await self.client.post(
            "/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
            json=payload
        )

        response.raise_for_status()

        # 解析回應
        data = response.json()
        image_b64 = data["artifacts"][0]["base64"]

        # 解碼 base64
        import base64
        image_data = base64.b64decode(image_b64)

        return image_data
```

---

## 4. D-ID API

### 4.1 客戶端實作

```python
# app/services/did_service.py
import httpx
from app.security.keychain_manager import KeychainManager

class DIDService:
    """D-ID API 客戶端 (虛擬主播)"""

    BASE_URL = "https://api.d-id.com"

    def __init__(self):
        api_key = KeychainManager.get_api_key("did")
        if not api_key:
            raise ValueError("D-ID API Key 未設定")

        self.api_key = api_key
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={"Authorization": f"Basic {api_key}"}
        )

    async def create_avatar_video(
        self,
        audio_url: str,
        avatar_image: str = "default"
    ) -> str:
        """生成虛擬主播影片

        Args:
            audio_url: 語音檔案 URL
            avatar_image: 虛擬主播圖片

        Returns:
            影片 URL
        """
        payload = {
            "source_url": avatar_image,
            "script": {
                "type": "audio",
                "audio_url": audio_url
            }
        }

        response = await self.client.post("/talks", json=payload)
        response.raise_for_status()

        talk_id = response.json()["id"]

        # 輪詢等待完成
        while True:
            status_response = await self.client.get(f"/talks/{talk_id}")
            status = status_response.json()

            if status["status"] == "done":
                return status["result_url"]

            await asyncio.sleep(5)
```

---

## 5. YouTube Data API

### 5.1 SDK 安裝

```bash
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

### 5.2 客戶端實作

```python
# app/services/youtube_service.py
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials

class YouTubeService:
    """YouTube Data API 客戶端"""

    def __init__(self, channel_id: str):
        # 從 Keychain 讀取 OAuth 憑證
        credentials_data = KeychainManager.get_api_key(f"youtube_channel_{channel_id}")

        if not credentials_data:
            raise ValueError("YouTube 憑證未設定")

        credentials = Credentials(**json.loads(credentials_data))

        self.youtube = build("youtube", "v3", credentials=credentials)

    def upload_video(
        self,
        video_path: str,
        title: str,
        description: str,
        tags: list[str],
        privacy: str = "public"
    ) -> str:
        """上傳影片到 YouTube

        Args:
            video_path: 影片檔案路徑
            title: 影片標題
            description: 影片描述
            tags: 標籤列表
            privacy: 隱私設定 (public, private, unlisted)

        Returns:
            YouTube 影片 ID
        """
        body = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags,
                "categoryId": "22"  # People & Blogs
            },
            "status": {
                "privacyStatus": privacy
            }
        }

        media = MediaFileUpload(
            video_path,
            chunksize=-1,
            resumable=True,
            mimetype="video/mp4"
        )

        request = self.youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media
        )

        response = request.execute()

        return response["id"]
```

---

## 6. 錯誤處理

### API 錯誤處理

```python
class APIError(Exception):
    """API 錯誤"""
    pass

async def call_api_with_retry(api_func, max_retries=3):
    """API 調用重試包裝器"""
    for attempt in range(max_retries):
        try:
            return await api_func()
        except httpx.HTTPStatusError as e:
            if e.response.status_code in [429, 503]:
                # 速率限制或服務不可用,重試
                await asyncio.sleep(2 ** attempt)
                continue
            else:
                raise APIError(f"API 錯誤: {e.response.status_code}")

    raise APIError("API 調用失敗,已達最大重試次數")
```

---

## 總結

### 整合服務
- ✅ Google Gemini API - 腳本生成
- ✅ Stability AI API - 圖片生成
- ✅ D-ID API - 虛擬主播
- ✅ YouTube Data API - 影片上傳

### 特性
- ✅ API Key 安全儲存 (Keychain)
- ✅ 錯誤處理與重試
- ✅ 非同步調用
