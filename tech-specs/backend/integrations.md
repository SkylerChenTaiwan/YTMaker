# 第三方整合 (Third-party Integrations)

## 關聯文件
- [業務邏輯](./business-logic.md)
- [背景任務](./background-jobs.md)
- [認證與授權](./auth.md)
- [效能優化](./performance.md)

---

## 7. 第三方整合

### 7.1 Google Gemini API

**SDK：** `google-generativeai`

**端點：** `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent`

**認證：** API Key

**使用場景：**
- 腳本生成（將長文轉換為影片腳本）
- 圖片描述翻譯（中文 → 英文）

**實作範例：**
```python
import google.generativeai as genai

genai.configure(api_key=api_key)

def generate_script(content, prompt_template):
    model = genai.GenerativeModel('gemini-1.5-flash')

    prompt = prompt_template.format(content=content)

    response = model.generate_content(
        prompt,
        generation_config={
            'temperature': 0.7,
            'max_output_tokens': 4000,
        }
    )

    return json.loads(response.text)
```

**重試機制：**
- 429 Rate Limit：等待 10 秒後重試
- 500/503 Server Error：等待 5 秒後重試，最多 3 次

**錯誤處理：**
```python
from google.api_core import exceptions

def generate_script_with_retry(content, prompt_template):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return generate_script(content, prompt_template)
        except exceptions.ResourceExhausted:
            # 429 Rate Limit
            if attempt < max_retries - 1:
                time.sleep(10)
            else:
                raise
        except exceptions.InternalServerError:
            # 500 Server Error
            if attempt < max_retries - 1:
                time.sleep(5)
            else:
                raise
```

---

### 7.2 Stability AI API

**SDK：** 直接使用 `requests` 調用 REST API

**端點：** `https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image`

**認證：** Bearer Token

**使用場景：**
- 圖片生成（根據描述生成 1920x1080 圖片）

**實作範例：**
```python
import requests

def generate_image(prompt, negative_prompt):
    url = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

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
        "cfg_scale": 7,
        "height": 1080,
        "width": 1920,
        "samples": 1,
        "steps": 30
    }

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()

    image_data = response.json()["artifacts"][0]["base64"]
    return base64.b64decode(image_data)
```

**並行處理：**
- 同時發送 4 個請求
- Rate Limiting：每分鐘最多 150 請求

**並行實作：**
```python
from concurrent.futures import ThreadPoolExecutor
import time

def generate_images_parallel(prompts, max_workers=4):
    results = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for prompt in prompts:
            future = executor.submit(generate_image_with_retry, prompt)
            futures.append(future)

            # Rate limiting: 150 req/min = 2.5 req/sec
            time.sleep(0.4)

        for future in futures:
            results.append(future.result())

    return results
```

**重試機制：**
- 429 Rate Limit：指數退避，最多 3 次
- 400 Content Policy：記錄 Prompt，嘗試修改後重試

**錯誤處理：**
```python
def generate_image_with_retry(prompt, negative_prompt="blurry, low quality"):
    max_retries = 3
    delays = [2, 5, 10]

    for attempt in range(max_retries):
        try:
            return generate_image(prompt, negative_prompt)
        except requests.HTTPError as e:
            if e.response.status_code == 429:
                # Rate limit
                if attempt < max_retries - 1:
                    time.sleep(delays[attempt])
                else:
                    raise
            elif e.response.status_code == 400:
                # Content policy violation
                log_error(f"Content policy violation: {prompt}")
                # 嘗試修改 prompt
                prompt = sanitize_prompt(prompt)
                if attempt < max_retries - 1:
                    time.sleep(2)
                else:
                    raise
            else:
                raise
```

---

### 7.3 D-ID API

**SDK：** 直接使用 `requests` 調用 REST API

**端點：** `https://api.d-id.com/talks`

**認證：** API Key

**使用場景：**
- 虛擬主播生成（開場和結尾）

**實作範例：**
```python
def generate_avatar_video(audio_url, avatar_image_url):
    url = "https://api.d-id.com/talks"

    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "source_url": avatar_image_url,
        "script": {
            "type": "audio",
            "audio_url": audio_url
        },
        "config": {
            "fluent": True,
            "pad_audio": 0.0
        }
    }

    # 建立任務
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()

    talk_id = response.json()["id"]

    # 輪詢任務狀態
    while True:
        status_url = f"https://api.d-id.com/talks/{talk_id}"
        status_response = requests.get(status_url, headers=headers)
        status = status_response.json()["status"]

        if status == "done":
            return status_response.json()["result_url"]
        elif status == "error":
            raise Exception("D-ID avatar generation failed")

        time.sleep(5)
```

**錯誤處理（嚴格模式）：**

> **重要：** 採用「失敗零容忍」策略，不使用自動降級。參考 `error-codes.md` 的完整錯誤碼定義。

```python
from app.utils.logging import StructuredLogger
from app.models.errors import DIDAPIError

logger = StructuredLogger(__name__)

async def generate_avatar_strict(audio_url: str, avatar_image_url: str, project_id: str):
    """
    嚴格模式：失敗時拋出異常，包含詳細錯誤資訊
    """
    try:
        result = await did_client.create_video(
            audio_url=audio_url,
            image_url=avatar_image_url
        )

        logger.info("Avatar generation succeeded", extra={
            "api": "d-id",
            "project_id": project_id,
            "video_id": result.id
        })

        return result.video_url

    except DIDQuotaExceededError as e:
        # 配額用盡：不可重試
        logger.error("D-ID quota exceeded", extra={
            "error_code": "DID_QUOTA_EXCEEDED",
            "project_id": project_id,
            "details": e.details
        })
        raise DIDAPIError(
            reason="DID_QUOTA_EXCEEDED",
            is_retryable=False,
            details={
                "quota_used": e.quota_used,
                "quota_total": e.quota_total,
                "reset_date": e.reset_date
            }
        )

    except DIDServerError as e:
        # 伺服器錯誤：可重試
        logger.error("D-ID server error", extra={
            "error_code": "DID_SERVER_ERROR",
            "project_id": project_id,
            "status_code": e.status_code
        })
        raise DIDAPIError(
            reason="DID_SERVER_ERROR",
            is_retryable=True,
            details={"status_code": e.status_code}
        )

    except DIDProcessingTimeout as e:
        # 處理超時：可重試
        logger.error("D-ID processing timeout", extra={
            "error_code": "DID_PROCESSING_TIMEOUT",
            "project_id": project_id
        })
        raise DIDAPIError(
            reason="DID_PROCESSING_TIMEOUT",
            is_retryable=True,
            details={}
        )
```

**重試策略：**
參考 `error-codes.md` 第 3.2 節的 D-ID 重試配置。

**禁止自動降級：**
- ❌ 不再使用 `generate_avatar_with_fallback`
- ❌ 不再自動返回 `None` 並繼續執行
- ✅ 所有錯誤都必須拋出異常，由呼叫者處理

---

### 7.4 YouTube Data API v3

**SDK：** `google-api-python-client`

**認證：** OAuth 2.0

**使用場景：**
- 影片上傳
- 封面上傳
- 頻道資訊取得

**實作範例：**
```python
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

def upload_video(video_path, title, description, tags, privacy):
    credentials = get_oauth_credentials()
    youtube = build('youtube', 'v3', credentials=credentials)

    # 影片 metadata
    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': tags,
            'categoryId': '22'  # People & Blogs
        },
        'status': {
            'privacyStatus': privacy,
            'selfDeclaredMadeForKids': False
        }
    }

    # 使用 Resumable Upload
    media = MediaFileUpload(
        video_path,
        chunksize=256*1024,  # 256KB chunks
        resumable=True
    )

    request = youtube.videos().insert(
        part='snippet,status',
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Upload progress: {int(status.progress() * 100)}%")

    return response['id']
```

**上傳封面：**
```python
def upload_thumbnail(video_id, thumbnail_path):
    credentials = get_oauth_credentials()
    youtube = build('youtube', 'v3', credentials=credentials)

    youtube.thumbnails().set(
        videoId=video_id,
        media_body=MediaFileUpload(thumbnail_path)
    ).execute()
```

**重試機制：**
- 401 Unauthorized：使用 Refresh Token 更新 Access Token
- 403 Quota Exceeded：停止上傳，提示用戶等待配額恢復
- Timeout：使用 Resumable Upload 斷點續傳

**錯誤處理：**
```python
from googleapiclient.errors import HttpError

def upload_video_with_retry(video_path, metadata):
    try:
        return upload_video(video_path, **metadata)
    except HttpError as e:
        if e.resp.status == 401:
            # Token 過期，更新後重試
            refresh_oauth_token()
            return upload_video(video_path, **metadata)
        elif e.resp.status == 403:
            # 配額用盡
            raise Exception("YouTube API quota exceeded")
        else:
            raise
```

---

## 7.5 整合最佳實踐

### 7.5.1 API Key 安全管理

- 使用環境變數或 Keychain 儲存
- 不寫入日誌或錯誤訊息
- 定期輪換 API Key

### 7.5.2 速率限制處理

- 實作指數退避重試
- 使用佇列控制請求速率
- 監控 API 使用量

### 7.5.3 錯誤處理

- 區分可重試錯誤和不可重試錯誤
- 記錄詳細錯誤日誌
- 提供友善的用戶錯誤訊息

### 7.5.4 成本優化

- 快取 API 回應
- 批次處理請求
- 使用較便宜的 API 選項（如 Gemini Flash vs Pro）
