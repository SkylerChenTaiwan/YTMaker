# Task-013: YouTube Data API 整合（上傳）

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 10 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **產品概述：** `product-design/overview.md#核心功能-12-YouTube-自動上傳`
- **使用者流程：** `product-design/flows.md#Flow-1` (上傳階段)
- **使用者流程：** `product-design/flows.md#Flow-4` (排程發布)

### 技術規格
- **第三方整合：** `tech-specs/backend/integrations.md#YouTube Data API`
- **業務邏輯：** `tech-specs/backend/business-logic.md#YouTube上傳服務`

### 相關任務
- **前置任務:** Task-003 ✅, Task-007 ✅ (YouTube API)
- **後續任務:** Task-014 (Celery 任務), Task-023 (YouTube 設定頁面)
- **並行任務:** Task-010, 011, 012 (可並行開發)

---

## 任務目標

### 簡述
整合 YouTube Data API，實作影片上傳、排程發布、metadata 設定、斷點續傳、配額監控。

### 成功標準
- [x] YouTubeClient 類別完整實作
- [x] VideoUploadService 業務邏輯完整
- [x] OAuth 2.0 refresh token 處理完成
- [x] 影片上傳邏輯（支援斷點續傳）完成
- [x] Metadata 設定完整
- [x] AI 內容標註完成
- [x] 配額監控（10,000 units/日）完成
- [x] 錯誤處理與重試完成
- [x] 單元測試與 Mock 完成

---

## 主要產出

### 1. YouTube 客戶端
```python
# backend/app/integrations/youtube_client.py
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

class YouTubeClient:
    def __init__(self, credentials: Dict):
        self.credentials = credentials
        self.youtube = build('youtube', 'v3', credentials=self.get_credentials())

    async def upload_video(
        self,
        video_path: str,
        title: str,
        description: str,
        tags: List[str],
        privacy_status: Literal["public", "private", "unlisted"],
        publish_at: Optional[datetime] = None,
        thumbnail_path: Optional[str] = None
    ) -> str:
        """
        上傳影片到 YouTube

        Returns:
            video_id: YouTube 影片 ID
        """
        pass

    async def refresh_token_if_needed(self) -> None:
        """檢查並刷新 access token"""
        pass
```

### 2. 影片上傳服務
```python
# backend/app/services/upload_service.py
class VideoUploadService:
    async def upload_to_youtube(
        self,
        project_id: int,
        video_path: str,
        youtube_account_id: int,
        metadata: Dict[str, Any]
    ) -> str:
        """
        完整的 YouTube 上傳流程

        流程：
        1. 檢查配額
        2. 刷新 access token（如需要）
        3. 上傳影片
        4. 設定 metadata
        5. 上傳封面
        6. 標註 AI 內容
        7. 設定排程（如有）
        8. 更新專案狀態
        """
        pass

    async def check_quota(self) -> bool:
        """檢查 YouTube API 配額是否足夠"""
        pass
```

---

## YouTube Upload API

### 1. 建立影片資源
```python
body = {
    "snippet": {
        "title": title,
        "description": description,
        "tags": tags,
        "categoryId": "22"  # People & Blogs
    },
    "status": {
        "privacyStatus": privacy_status,
        "publishAt": publish_at.isoformat() if publish_at else None,
        "selfDeclaredMadeForKids": False
    }
}

# 標註 AI 內容（重要！）
if ai_generated:
    body["status"]["madeForKids"] = False
    body["snippet"]["description"] += "\n\n⚠️ 此影片由 AI 自動生成"
```

### 2. 上傳影片
```python
media = MediaFileUpload(
    video_path,
    chunksize=1024*1024,  # 1MB chunks
    resumable=True
)

request = youtube.videos().insert(
    part="snippet,status",
    body=body,
    media_body=media
)

response = None
while response is None:
    status, response = request.next_chunk()
    if status:
        print(f"Uploaded {int(status.progress() * 100)}%")
```

### 3. 上傳封面
```python
youtube.thumbnails().set(
    videoId=video_id,
    media_body=MediaFileUpload(thumbnail_path)
).execute()
```

---

## OAuth 2.0 Token 管理

### Refresh Token 邏輯
```python
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

def get_credentials(self) -> Credentials:
    """
    取得有效的 credentials

    自動刷新 expired token
    """
    creds = Credentials(**self.credentials)

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())

        # 更新資料庫中的 token
        await self.update_credentials({
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "expires_at": creds.expiry
        })

    return creds
```

---

## 斷點續傳

### 實作邏輯
```python
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

async def upload_with_resumable(
    self,
    video_path: str,
    body: Dict
) -> str:
    """
    支援斷點續傳的上傳

    如果上傳中斷，可以從中斷點繼續
    """
    media = MediaFileUpload(
        video_path,
        chunksize=1024*1024,
        resumable=True
    )

    request = self.youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    error = None
    retry = 0

    while response is None:
        try:
            status, response = request.next_chunk()
            if status:
                progress = int(status.progress() * 100)
                logger.info(f"Upload progress: {progress}%")
                # 更新進度到資料庫
                await self.update_progress(progress)

        except HttpError as e:
            if e.resp.status in [500, 502, 503, 504]:
                # 可重試的錯誤
                error = e
                if retry < 3:
                    retry += 1
                    await asyncio.sleep(2 ** retry)
                else:
                    raise
            else:
                raise

    return response["id"]
```

---

## 配額監控

### YouTube API 配額
- **每日配額:** 10,000 units
- **影片上傳:** 1,600 units
- **縮圖上傳:** 50 units
- **可上傳數量:** 10,000 / 1,650 ≈ 6 支/日

### 配額檢查
```python
async def check_quota(self) -> Dict[str, Any]:
    """
    查詢 YouTube API 配額

    Returns:
        {
            "used_units": 3200,
            "total_units": 10000,
            "remaining_units": 6800,
            "can_upload": True
        }
    """
    # YouTube API 不提供即時配額查詢
    # 需要本地追蹤配額使用
    pass

async def estimate_upload_cost(self) -> int:
    """
    估算上傳所需配額

    Returns:
        1650 units（影片 1600 + 縮圖 50）
    """
    return 1650
```

---

## 錯誤處理

### 錯誤類型
- `401 Unauthorized` - Token 過期（刷新 token）
- `403 Forbidden` - 配額不足（等待明日）
- `400 Bad Request` - Metadata 格式錯誤
- `500 Internal Error` - 伺服器錯誤（重試）
- `Timeout` - 上傳超時（使用斷點續傳）

### 重試策略
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(HttpError)
)
async def upload_video_with_retry(self, **kwargs):
    pass
```

---

## 驗證檢查

### 單元測試
```bash
pytest tests/integrations/test_youtube_client.py -v
pytest tests/services/test_upload_service.py -v
# 測試覆蓋率 > 80%
```

### 整合測試
```bash
# 需要真實的 YouTube OAuth credentials
pytest tests/integration/test_youtube_upload.py --credentials=YOUR_CREDS
```

---

## 完成檢查清單

- [ ] YouTubeClient 類別實作完成
- [ ] VideoUploadService 完成
- [ ] OAuth token 刷新完成
- [ ] 斷點續傳完成
- [ ] Metadata 設定完成
- [ ] AI 內容標註完成
- [ ] 配額監控完成
- [ ] 錯誤處理與重試完成
- [ ] 單元測試完成（含 Mock）
- [ ] 整合測試完成
- [ ] 測試覆蓋率 > 80%
