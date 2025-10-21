# [v] Task-013: YouTube Data API 整合(上傳)

> **建立日期:** 2025-10-19
> **狀態:** ✅ 已完成
> **預計時間:** 10 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **產品概述:** `product-design/overview.md#核心功能-12-YouTube-自動上傳`
- **使用者流程:** `product-design/flows.md#Flow-1-基本影片生成流程` (步驟 13-14: 自動上傳到 YouTube)
- **使用者流程:** `product-design/flows.md#Flow-4-排程發布影片`
- **使用者流程:** `product-design/flows.md#Flow-9-系統設定管理` (YouTube 授權管理)

### 技術規格
- **第三方整合:** `tech-specs/backend/integrations.md#7.4-YouTube Data API v3`
- **業務邏輯:** `tech-specs/backend/business-logic.md#3.5-YouTube上傳邏輯`
- **認證與授權:** `tech-specs/backend/auth.md#OAuth-2.0-整合`
- **背景任務:** `tech-specs/backend/background-jobs.md#5.5-upload_to_youtube_task`

### 相關任務
- **前置任務:** Task-003 ✅ (API 基礎架構), Task-007 ✅ (YouTube OAuth 授權)
- **後續任務:** Task-014 (Celery 背景任務整合), Task-023 (YouTube 設定頁面)
- **並行任務:** Task-010, 011, 012 (其他第三方 API 整合，可並行開發)

---

## 任務目標

### 簡述
整合 YouTube Data API v3，實作完整的影片上傳流程，包含影片上傳、metadata 設定、封面上傳、排程發布、AI 內容標註、配額監控、OAuth 2.0 token 管理、斷點續傳機制。

### 成功標準
- [ ] `YouTubeClient` 類別完整實作並通過所有測試
- [ ] `VideoUploadService` 業務邏輯完整實作
- [ ] OAuth 2.0 Refresh Token 自動更新機制運作正常
- [ ] 影片上傳支援 Resumable Upload（斷點續傳）
- [ ] Metadata 設定功能完整（標題、描述、標籤、隱私、排程、分類）
- [ ] AI 內容標註正確實作（符合 YouTube 政策）
- [ ] 封面上傳功能正常運作
- [ ] 配額監控與使用量追蹤功能實作
- [ ] 完整錯誤處理與重試機制
- [ ] 單元測試覆蓋率 > 85%（含 Mock 測試）
- [ ] 整合測試通過（需要真實的 OAuth credentials）

---

## 測試要求

### 單元測試

#### 測試 1: OAuth Token 自動刷新機制

**目的:** 驗證系統能自動檢測 expired token 並使用 refresh token 更新

**前置條件:**
- 資料庫中存在一個 YouTube 帳號記錄
- Access token 已過期（`expires_at < 當前時間`）
- Refresh token 有效

**輸入:**
```python
youtube_account = {
    "id": 1,
    "channel_id": "UC1234567890",
    "channel_name": "Test Channel",
    "access_token": "expired_access_token",
    "refresh_token": "valid_refresh_token",
    "expires_at": datetime.now() - timedelta(hours=1)  # 已過期
}
```

**預期輸出:**
```python
# YouTubeClient.get_credentials() 被調用時
# 1. 檢測到 token 已過期
# 2. 使用 refresh_token 向 Google OAuth 端點請求新 token
# 3. 更新資料庫中的 access_token 和 expires_at
# 4. 返回有效的 Credentials 物件

updated_account = {
    "id": 1,
    "access_token": "new_access_token",  # 已更新
    "refresh_token": "valid_refresh_token",  # 保持不變
    "expires_at": datetime.now() + timedelta(hours=1)  # 新的過期時間
}
```

**驗證點:**
- [ ] 檢測到 token 過期（`creds.expired == True`）
- [ ] 調用 `creds.refresh(Request())` 更新 token
- [ ] 資料庫中的 `access_token` 已更新為新值
- [ ] 資料庫中的 `expires_at` 已更新為未來時間
- [ ] `refresh_token` 保持不變
- [ ] 返回的 Credentials 物件有效（`creds.valid == True`）

**Mock 設定:**
- Mock `google.oauth2.credentials.Credentials.refresh()` 方法
- Mock 資料庫更新操作

---

#### 測試 2: 成功上傳影片（立即發布）

**目的:** 驗證完整的影片上傳流程

**前置條件:**
- YouTube 帳號已授權（valid token）
- 影片檔案存在且有效（`final_video.mp4`, 150MB）
- Metadata 完整

**輸入:**
```python
upload_params = {
    "video_path": "/path/to/final_video.mp4",
    "title": "Test Video Title",
    "description": "This is a test video.\n\n⚠️ 此影片由 AI 自動生成",
    "tags": ["AI", "test", "automation"],
    "privacy_status": "public",
    "category_id": "22",  # People & Blogs
    "self_declared_made_for_kids": False,
    "publish_at": None  # 立即發布
}
```

**預期輸出:**
```python
{
    "video_id": "dQw4w9WgXcQ",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "status": "uploaded",
    "privacy_status": "public"
}
```

**驗證點:**
- [ ] 調用 `youtube.videos().insert()` 建立影片資源
- [ ] Request body 包含正確的 snippet 和 status
- [ ] 使用 `MediaFileUpload` 進行 resumable upload
- [ ] `chunksize` 設定為 1MB（1024*1024）
- [ ] 上傳進度正確記錄（0% → 100%）
- [ ] 返回的 `video_id` 有效
- [ ] AI 內容標註存在於 description 中
- [ ] `self_declared_made_for_kids` 設定為 `False`

**Mock 設定:**
- Mock `googleapiclient.discovery.build()`
- Mock `youtube.videos().insert()` 返回模擬的 video response
- Mock `MediaFileUpload` 和 `next_chunk()` 上傳流程

---

#### 測試 3: 成功上傳影片（排程發布）

**目的:** 驗證排程發布功能

**前置條件:**
- YouTube 帳號已授權
- 影片檔案存在
- 設定未來的發布時間

**輸入:**
```python
upload_params = {
    "video_path": "/path/to/final_video.mp4",
    "title": "Scheduled Video",
    "description": "This video will be published at a scheduled time.",
    "tags": ["scheduled"],
    "privacy_status": "private",  # 排程影片必須先設為 private
    "publish_at": "2025-12-25T10:00:00Z"  # ISO 8601 格式
}
```

**預期輸出:**
```python
{
    "video_id": "abc123",
    "url": "https://www.youtube.com/watch?v=abc123",
    "status": "uploaded",
    "privacy_status": "private",
    "publish_at": "2025-12-25T10:00:00Z"
}
```

**驗證點:**
- [ ] Request body 的 `status.privacyStatus` 設為 `"private"`
- [ ] Request body 的 `status.publishAt` 設為指定時間（ISO 8601 格式）
- [ ] 驗證 `publish_at` 為未來時間（不接受過去時間）
- [ ] 影片成功上傳且狀態為 "private"
- [ ] 排程時間正確儲存

**Mock 設定:**
- Mock YouTube API `videos().insert()` 返回排程影片 response

---

#### 測試 4: 成功上傳封面

**目的:** 驗證封面上傳功能

**前置條件:**
- 影片已上傳（video_id 存在）
- 封面檔案存在且符合 YouTube 規範（1280x720, < 2MB）

**輸入:**
```python
thumbnail_params = {
    "video_id": "dQw4w9WgXcQ",
    "thumbnail_path": "/path/to/thumbnail.jpg"
}
```

**預期輸出:**
```python
{
    "video_id": "dQw4w9WgXcQ",
    "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
}
```

**驗證點:**
- [ ] 調用 `youtube.thumbnails().set()`
- [ ] `videoId` 參數正確
- [ ] 使用 `MediaFileUpload` 上傳封面檔案
- [ ] 封面上傳成功
- [ ] 返回封面 URL

**Mock 設定:**
- Mock `youtube.thumbnails().set()` 返回成功 response

---

#### 測試 5: 處理 401 Unauthorized（Token 過期）

**目的:** 驗證 Token 過期時的自動重試機制

**前置條件:**
- Access token 已過期
- 第一次上傳請求返回 401

**模擬流程:**
1. 第一次調用 `upload_video()` → 返回 `HttpError 401`
2. 系統檢測到 401 → 調用 `refresh_token_if_needed()`
3. Token 更新成功
4. 重試上傳 → 成功

**預期行為:**
```python
# 第一次請求
try:
    upload_video(...)
except HttpError as e:
    if e.resp.status == 401:
        # 刷新 token
        refresh_token_if_needed()
        # 重試
        upload_video(...)
```

**驗證點:**
- [ ] 檢測到 `HttpError` 狀態碼 401
- [ ] 自動調用 `refresh_token_if_needed()`
- [ ] Token 成功更新
- [ ] 自動重試上傳操作
- [ ] 第二次上傳成功

**Mock 設定:**
- 第一次 Mock `videos().insert()` 拋出 `HttpError(status=401)`
- 第二次 Mock 返回成功 response

---

#### 測試 6: 處理 403 Quota Exceeded（配額用盡）

**目的:** 驗證配額不足時的錯誤處理

**前置條件:**
- YouTube API 配額已用盡

**輸入:**
```python
# 嘗試上傳影片
upload_params = {...}
```

**預期行為:**
```python
try:
    upload_video(...)
except YouTubeQuotaExceededError as e:
    # 停止上傳
    # 保存影片和 metadata 到本地
    # 提示用戶等待配額恢復
    raise
```

**預期錯誤:**
```python
YouTubeQuotaExceededError: "YouTube API quota exceeded. Daily limit: 10,000 units. Please try again tomorrow."
```

**驗證點:**
- [ ] 檢測到 `HttpError` 狀態碼 403
- [ ] 錯誤訊息包含 "quotaExceeded"
- [ ] 拋出自訂的 `YouTubeQuotaExceededError`
- [ ] 不進行重試（配額問題無法通過重試解決）
- [ ] 記錄錯誤日誌

**Mock 設定:**
- Mock `videos().insert()` 拋出 `HttpError(status=403, reason="quotaExceeded")`

---

#### 測試 7: 處理 500/503 Server Error（伺服器錯誤重試）

**目的:** 驗證伺服器錯誤的重試機制

**前置條件:**
- YouTube API 暫時不可用

**模擬流程:**
1. 第一次請求 → 返回 `HttpError 500`
2. 等待 2 秒後重試
3. 第二次請求 → 返回 `HttpError 503`
4. 等待 5 秒後重試
5. 第三次請求 → 成功

**預期行為:**
```python
max_retries = 3
retry_delays = [2, 5, 10]

for attempt in range(max_retries):
    try:
        return upload_video(...)
    except HttpError as e:
        if e.resp.status in [500, 502, 503, 504]:
            if attempt < max_retries - 1:
                time.sleep(retry_delays[attempt])
            else:
                raise
```

**驗證點:**
- [ ] 檢測到可重試的錯誤（500, 502, 503, 504）
- [ ] 執行指數退避重試（delays: 2s, 5s, 10s）
- [ ] 最多重試 3 次
- [ ] 第三次重試成功後返回結果
- [ ] 記錄每次重試的日誌

**Mock 設定:**
- 第一次 Mock 拋出 `HttpError(status=500)`
- 第二次 Mock 拋出 `HttpError(status=503)`
- 第三次 Mock 返回成功 response
- Mock `time.sleep()` 避免實際等待

---

#### 測試 8: 斷點續傳機制（Resumable Upload）

**目的:** 驗證上傳中斷後可從斷點繼續

**前置條件:**
- 開始上傳大檔案（150MB）
- 上傳到 50% 時模擬網路中斷

**模擬流程:**
```python
# 模擬上傳流程
response = None
progress = 0

while response is None:
    try:
        status, response = request.next_chunk()
        if status:
            progress = int(status.progress() * 100)
            print(f"Progress: {progress}%")
    except HttpError as e:
        if e.resp.status in [500, 502, 503, 504]:
            # 網路問題，稍後重試
            time.sleep(2)
            continue  # next_chunk() 會自動從斷點繼續
        else:
            raise
```

**驗證點:**
- [ ] 使用 `MediaFileUpload` 的 `resumable=True` 參數
- [ ] 上傳中斷時不重新從 0% 開始
- [ ] `next_chunk()` 自動從斷點繼續
- [ ] 進度正確更新（50% → 51% → ... → 100%）
- [ ] 最終上傳成功

**Mock 設定:**
- Mock `request.next_chunk()` 返回模擬的進度
- 在 50% 時拋出一次 `HttpError(status=503)`
- 後續調用正常返回進度直到完成

---

#### 測試 9: 配額檢查與追蹤

**目的:** 驗證配額使用量追蹤功能

**前置條件:**
- 資料庫中有配額使用記錄

**輸入:**
```python
# 查詢當日配額使用情況
get_quota_usage(date="2025-10-20")
```

**預期輸出:**
```python
{
    "date": "2025-10-20",
    "total_quota": 10000,
    "used_units": 3200,
    "remaining_units": 6800,
    "uploads_today": 2,  # 每次上傳約 1600 units
    "can_upload": True   # 剩餘配額足夠
}
```

**驗證點:**
- [ ] 正確計算已使用配額（影片上傳 1600 units + 封面上傳 50 units）
- [ ] 正確計算剩餘配額（10000 - 已使用）
- [ ] 判斷是否可繼續上傳（剩餘 >= 1650 units）
- [ ] 記錄每次 API 調用的配額消耗

**測試案例:**
```python
# 案例 1: 配額充足
assert quota_usage["remaining_units"] >= 1650
assert quota_usage["can_upload"] == True

# 案例 2: 配額不足
quota_usage["used_units"] = 9000
quota_usage["remaining_units"] = 1000
assert quota_usage["can_upload"] == False
```

---

### 整合測試

#### 測試 10: YouTube 配額超限應正確處理

**目的:** 驗證當 YouTube API 配額用盡時,系統能正確處理錯誤而不是重試

**測試設置:**
```python
import responses
from googleapiclient.errors import HttpError

# Mock YouTube API 返回 403 Quota Exceeded
mock_response = MagicMock()
mock_response.status = 403
mock_response.reason = 'quotaExceeded'

mock_error = HttpError(resp=mock_response, content=b'{"error": {"errors": [{"domain": "youtube.quota", "reason": "quotaExceeded"}], "code": 403, "message": "The request cannot be completed because you have exceeded your quota."}}')
```

**測試執行:**
```python
@pytest.mark.asyncio
async def test_youtube_upload_quota_exceeded():
    # Arrange
    service = VideoUploadService(db_session)

    # Mock QuotaService 顯示配額充足(但實際 API 會失敗)
    mock_quota_service = AsyncMock()
    mock_quota_service.check_quota.return_value = True
    service.quota_service = mock_quota_service

    # Mock YouTube 帳號
    mock_youtube_account = MagicMock()
    mock_youtube_account.id = 1
    mock_youtube_account.access_token = "valid_token"
    mock_youtube_account.refresh_token = "refresh_token"
    db_session.query().filter().first.return_value = mock_youtube_account

    # Mock YouTubeClient.upload_video() 拋出 HttpError 403 quotaExceeded
    with patch('app.services.upload_service.YouTubeClient') as MockYouTubeClient:
        mock_client = MockYouTubeClient.return_value
        mock_client.upload_video.side_effect = mock_error

        # Act & Assert - 應拋出 YouTubeQuotaExceededError
        with pytest.raises(YouTubeQuotaExceededError) as exc_info:
            await service.upload_to_youtube(
                project_id=1,
                video_path="/path/to/video.mp4",
                youtube_account_id=1,
                metadata={
                    "title": "Test Video",
                    "description": "Test Description",
                    "tags": ["test"],
                    "privacy_status": "public"
                }
            )

        # Assert - 驗證錯誤訊息
        assert "quota exceeded" in str(exc_info.value).lower()
        assert "10,000 units" in str(exc_info.value)

        # Assert - 驗證沒有重試(upload_video 只被調用一次)
        assert mock_client.upload_video.call_count == 1
```

**預期結果:**
- ✅ 檢測到 403 Quota Exceeded 錯誤
- ✅ 拋出 `YouTubeQuotaExceededError` 自訂例外
- ✅ 錯誤訊息包含配額資訊("10,000 units")
- ✅ **不進行重試**(因為重試無法解決配額問題)
- ✅ 記錄錯誤日誌

**實作要求:**
```python
# 在 VideoUploadService.upload_to_youtube() 中處理配額錯誤
try:
    video_id = await youtube_client.upload_video(...)
except HttpError as e:
    # 檢查是否為配額超限錯誤
    if e.resp.status == 403:
        error_content = json.loads(e.content.decode('utf-8'))
        error_reason = error_content.get('error', {}).get('errors', [{}])[0].get('reason', '')

        if error_reason == 'quotaExceeded':
            logger.error(f"YouTube API quota exceeded for project {project_id}")
            raise YouTubeQuotaExceededError(
                "YouTube API quota exceeded. Daily limit: 10,000 units. "
                "Please try again tomorrow after quota resets (Pacific Time midnight)."
            )

    # 其他錯誤
    logger.error(f"YouTube upload failed: {str(e)}")
    raise YouTubeUploadError(f"Failed to upload video: {str(e)}")
```

**錯誤處理策略:**
1. **配額超限 (403 quotaExceeded):**
   - ❌ 不重試(無法通過重試解決)
   - 拋出 `YouTubeQuotaExceededError`
   - 記錄錯誤並通知用戶等待配額恢復
   - 可選:將上傳任務標記為「待配額恢復」狀態

2. **Token 過期 (401 Unauthorized):**
   - ✅ 自動刷新 token 並重試一次

3. **伺服器錯誤 (500/503):**
   - ✅ 指數退避重試(最多 3 次)

4. **其他錯誤 (400, 404等):**
   - ❌ 不重試
   - 拋出 `YouTubeUploadError`

---

#### 測試 11: 完整上傳流程（端到端）

**目的:** 驗證從檔案到 YouTube 發布的完整流程

**前置條件:**
- 真實的 YouTube OAuth credentials（測試環境）
- 真實的影片和封面檔案

**測試流程:**
```python
# Step 1: 準備測試影片和封面
video_path = "tests/fixtures/test_video.mp4"
thumbnail_path = "tests/fixtures/test_thumbnail.jpg"

# Step 2: 上傳影片
service = VideoUploadService(db_session)
result = service.upload_to_youtube(
    project_id=1,
    video_path=video_path,
    youtube_account_id=1,
    metadata={
        "title": "[TEST] Integration Test Video",
        "description": "This is an integration test.\n\n⚠️ 此影片由 AI 自動生成",
        "tags": ["test", "integration"],
        "privacy_status": "private",  # 使用 private 避免公開測試影片
        "publish_at": None
    }
)

# Step 3: 驗證影片已上傳
assert result["video_id"] is not None
assert result["status"] == "uploaded"

# Step 4: 上傳封面
service.upload_thumbnail(
    video_id=result["video_id"],
    thumbnail_path=thumbnail_path
)

# Step 5: 驗證封面已上傳
# 可通過 YouTube API 查詢影片資訊驗證

# Step 6: 清理測試影片（刪除）
youtube_client.delete_video(result["video_id"])
```

**驗證點:**
- [ ] 影片成功上傳到 YouTube
- [ ] Metadata 正確設定
- [ ] 封面正確上傳
- [ ] AI 內容標註存在
- [ ] 隱私狀態為 "private"
- [ ] 可通過 YouTube API 查詢到影片
- [ ] 測試後成功刪除影片

**注意事項:**
- 需要真實的 OAuth credentials（存放在安全的環境變數中）
- 測試影片應標記為 "private" 避免污染 YouTube 頻道
- 測試後應刪除測試影片
- 考慮配額消耗（每次測試約 1650 units）

---

## 實作規格

### 需要建立/修改的檔案

#### 1. YouTube 客戶端: `backend/app/integrations/youtube_client.py`

**職責:** 封裝 YouTube Data API v3 的所有操作

**主要類別:**
```python
from typing import Dict, List, Optional, Any
from datetime import datetime
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import time
import logging

logger = logging.getLogger(__name__)

class YouTubeClient:
    """
    YouTube Data API v3 客戶端

    處理所有與 YouTube API 的互動，包含：
    - OAuth 2.0 認證與 token 管理
    - 影片上傳（支援 resumable upload）
    - 封面上傳
    - 頻道資訊查詢
    - 配額追蹤
    """

    def __init__(self, credentials: Dict[str, Any], db_session):
        """
        初始化 YouTube 客戶端

        Args:
            credentials: OAuth 2.0 憑證字典
                {
                    "access_token": str,
                    "refresh_token": str,
                    "token_uri": str,
                    "client_id": str,
                    "client_secret": str,
                    "scopes": List[str],
                    "expires_at": datetime
                }
            db_session: SQLAlchemy session（用於更新 token）
        """
        self.credentials_dict = credentials
        self.db_session = db_session
        self.youtube = None
        self._initialize_client()

    def _initialize_client(self) -> None:
        """
        初始化 YouTube API 客戶端

        自動檢查並刷新 expired token
        """
        creds = self.get_credentials()
        self.youtube = build('youtube', 'v3', credentials=creds)

    def get_credentials(self) -> Credentials:
        """
        取得有效的 OAuth 2.0 憑證

        如果 access token 已過期，自動使用 refresh token 更新

        Returns:
            google.oauth2.credentials.Credentials 物件

        Raises:
            Exception: Token 刷新失敗
        """
        creds = Credentials(
            token=self.credentials_dict["access_token"],
            refresh_token=self.credentials_dict["refresh_token"],
            token_uri=self.credentials_dict["token_uri"],
            client_id=self.credentials_dict["client_id"],
            client_secret=self.credentials_dict["client_secret"],
            scopes=self.credentials_dict["scopes"]
        )

        # 檢查是否過期
        if creds.expired and creds.refresh_token:
            logger.info("Access token expired, refreshing...")

            try:
                creds.refresh(Request())

                # 更新資料庫中的 token
                self._update_credentials_in_db({
                    "access_token": creds.token,
                    "refresh_token": creds.refresh_token,
                    "expires_at": creds.expiry
                })

                logger.info("Access token refreshed successfully")
            except Exception as e:
                logger.error(f"Failed to refresh token: {str(e)}")
                raise

        return creds

    def _update_credentials_in_db(self, new_credentials: Dict[str, Any]) -> None:
        """
        更新資料庫中的 OAuth credentials

        Args:
            new_credentials: 新的憑證資料
        """
        # TODO: 實作資料庫更新邏輯
        # 這部分需要與 YouTubeAccount model 整合
        pass

    async def upload_video(
        self,
        video_path: str,
        title: str,
        description: str,
        tags: List[str],
        privacy_status: str = "public",
        category_id: str = "22",
        publish_at: Optional[datetime] = None,
        made_for_kids: bool = False
    ) -> str:
        """
        上傳影片到 YouTube

        使用 Resumable Upload 支援斷點續傳

        Args:
            video_path: 影片檔案路徑
            title: 影片標題
            description: 影片描述
            tags: 標籤列表
            privacy_status: 隱私狀態 ("public", "private", "unlisted")
            category_id: 影片分類 ID（預設 "22" = People & Blogs）
            publish_at: 排程發布時間（ISO 8601 格式）
            made_for_kids: 是否為兒童內容

        Returns:
            video_id: YouTube 影片 ID

        Raises:
            HttpError: YouTube API 錯誤
            FileNotFoundError: 影片檔案不存在
        """
        # 建立影片資源
        body = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags,
                "categoryId": category_id
            },
            "status": {
                "privacyStatus": privacy_status,
                "selfDeclaredMadeForKids": made_for_kids
            }
        }

        # 排程發布
        if publish_at:
            body["status"]["publishAt"] = publish_at.isoformat()

        # 使用 Resumable Upload
        media = MediaFileUpload(
            video_path,
            chunksize=1024 * 1024,  # 1MB chunks
            resumable=True,
            mimetype="video/mp4"
        )

        request = self.youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media
        )

        # 執行上傳（支援斷點續傳）
        response = None
        error = None
        retry_count = 0
        max_retries = 3

        while response is None:
            try:
                status, response = request.next_chunk()

                if status:
                    progress = int(status.progress() * 100)
                    logger.info(f"Upload progress: {progress}%")
                    # TODO: 更新進度到資料庫或 Redis

            except HttpError as e:
                if e.resp.status in [500, 502, 503, 504]:
                    # 可重試的伺服器錯誤
                    error = e
                    if retry_count < max_retries:
                        retry_count += 1
                        delay = 2 ** retry_count  # 指數退避: 2, 4, 8 秒
                        logger.warning(
                            f"Server error {e.resp.status}, retrying in {delay}s... "
                            f"(attempt {retry_count}/{max_retries})"
                        )
                        time.sleep(delay)
                    else:
                        logger.error(f"Max retries reached, upload failed: {str(e)}")
                        raise
                else:
                    # 不可重試的錯誤（401, 403, 400 等）
                    raise

        video_id = response["id"]
        logger.info(f"Video uploaded successfully: {video_id}")

        return video_id

    async def upload_thumbnail(
        self,
        video_id: str,
        thumbnail_path: str
    ) -> str:
        """
        上傳影片封面

        Args:
            video_id: YouTube 影片 ID
            thumbnail_path: 封面圖片路徑

        Returns:
            thumbnail_url: 封面圖片 URL

        Raises:
            HttpError: YouTube API 錯誤
            FileNotFoundError: 封面檔案不存在
        """
        media = MediaFileUpload(
            thumbnail_path,
            mimetype="image/jpeg",
            resumable=True
        )

        response = self.youtube.thumbnails().set(
            videoId=video_id,
            media_body=media
        ).execute()

        # 提取封面 URL（maxresdefault 品質）
        thumbnail_url = response["items"][0]["maxres"]["url"]

        logger.info(f"Thumbnail uploaded for video {video_id}")

        return thumbnail_url

    async def get_channel_info(self, channel_id: str) -> Dict[str, Any]:
        """
        取得頻道資訊

        Args:
            channel_id: YouTube 頻道 ID

        Returns:
            頻道資訊字典
        """
        response = self.youtube.channels().list(
            part="snippet,statistics",
            id=channel_id
        ).execute()

        if not response["items"]:
            raise ValueError(f"Channel not found: {channel_id}")

        channel = response["items"][0]

        return {
            "id": channel["id"],
            "title": channel["snippet"]["title"],
            "description": channel["snippet"]["description"],
            "thumbnail_url": channel["snippet"]["thumbnails"]["default"]["url"],
            "subscriber_count": int(channel["statistics"]["subscriberCount"]),
            "video_count": int(channel["statistics"]["videoCount"]),
            "view_count": int(channel["statistics"]["viewCount"])
        }

    async def delete_video(self, video_id: str) -> None:
        """
        刪除影片（用於測試清理）

        Args:
            video_id: YouTube 影片 ID
        """
        self.youtube.videos().delete(id=video_id).execute()
        logger.info(f"Video deleted: {video_id}")
```

---

#### 2. 影片上傳服務: `backend/app/services/upload_service.py`

**職責:** 協調影片上傳的業務邏輯

**主要類別:**
```python
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.integrations.youtube_client import YouTubeClient
from app.models.project import Project
from app.models.youtube_account import YouTubeAccount
from app.services.quota_service import QuotaService
import logging

logger = logging.getLogger(__name__)

class VideoUploadService:
    """
    影片上傳業務邏輯服務

    協調影片上傳的完整流程：
    1. 檢查配額
    2. 刷新 access token（如需要）
    3. 上傳影片
    4. 設定 metadata
    5. 上傳封面
    6. 標註 AI 內容
    7. 設定排程（如有）
    8. 更新專案狀態
    """

    def __init__(self, db: Session):
        self.db = db
        self.quota_service = QuotaService(db)

    async def upload_to_youtube(
        self,
        project_id: int,
        video_path: str,
        youtube_account_id: int,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        完整的 YouTube 上傳流程

        Args:
            project_id: 專案 ID
            video_path: 影片檔案路徑
            youtube_account_id: YouTube 帳號 ID
            metadata: 影片 metadata
                {
                    "title": str,
                    "description": str,
                    "tags": List[str],
                    "privacy_status": str,
                    "publish_at": Optional[datetime],
                    "thumbnail_path": Optional[str]
                }

        Returns:
            上傳結果
                {
                    "video_id": str,
                    "url": str,
                    "status": str,
                    "privacy_status": str,
                    "publish_at": Optional[datetime]
                }

        Raises:
            QuotaExceededError: 配額不足
            YouTubeAPIError: YouTube API 錯誤
        """
        logger.info(f"Starting YouTube upload for project {project_id}")

        # Step 1: 檢查配額
        if not await self.quota_service.check_quota("youtube", cost=1650):
            raise QuotaExceededError(
                "YouTube API quota exceeded. Daily limit: 10,000 units. "
                "Video upload costs 1,600 units + thumbnail upload costs 50 units."
            )

        # Step 2: 取得 YouTube 帳號與憑證
        youtube_account = self.db.query(YouTubeAccount).filter(
            YouTubeAccount.id == youtube_account_id
        ).first()

        if not youtube_account:
            raise ValueError(f"YouTube account not found: {youtube_account_id}")

        credentials = {
            "access_token": youtube_account.access_token,
            "refresh_token": youtube_account.refresh_token,
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": youtube_account.client_id,
            "client_secret": youtube_account.client_secret,
            "scopes": youtube_account.scopes.split(","),
            "expires_at": youtube_account.expires_at
        }

        # Step 3: 初始化 YouTube 客戶端
        youtube_client = YouTubeClient(credentials, self.db)

        # Step 4: 準備 metadata（加入 AI 內容標註）
        description = metadata["description"]
        if "⚠️ 此影片由 AI 自動生成" not in description:
            description += "\n\n⚠️ 此影片由 AI 自動生成"

        # Step 5: 上傳影片
        try:
            video_id = await youtube_client.upload_video(
                video_path=video_path,
                title=metadata["title"],
                description=description,
                tags=metadata["tags"],
                privacy_status=metadata.get("privacy_status", "public"),
                category_id=metadata.get("category_id", "22"),
                publish_at=metadata.get("publish_at"),
                made_for_kids=False
            )

            # 記錄配額使用
            await self.quota_service.record_usage("youtube", cost=1600)

        except Exception as e:
            logger.error(f"Video upload failed: {str(e)}")
            raise

        # Step 6: 上傳封面（如果提供）
        thumbnail_url = None
        if metadata.get("thumbnail_path"):
            try:
                thumbnail_url = await youtube_client.upload_thumbnail(
                    video_id=video_id,
                    thumbnail_path=metadata["thumbnail_path"]
                )

                # 記錄配額使用
                await self.quota_service.record_usage("youtube", cost=50)

            except Exception as e:
                logger.warning(f"Thumbnail upload failed (non-critical): {str(e)}")
                # 封面上傳失敗不影響整體流程

        # Step 7: 更新專案狀態
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.youtube_video_id = video_id
            project.youtube_video_url = f"https://www.youtube.com/watch?v={video_id}"
            project.status = "completed"
            self.db.commit()

        logger.info(f"Video uploaded successfully: {video_id}")

        return {
            "video_id": video_id,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "status": "uploaded",
            "privacy_status": metadata.get("privacy_status", "public"),
            "publish_at": metadata.get("publish_at"),
            "thumbnail_url": thumbnail_url
        }
```

---

#### 3. 配額服務: `backend/app/services/quota_service.py`

**職責:** 管理 YouTube API 配額追蹤

```python
from typing import Dict, Any
from datetime import datetime, date
from sqlalchemy.orm import Session
from app.models.quota_usage import QuotaUsage
import logging

logger = logging.getLogger(__name__)

class QuotaService:
    """
    API 配額管理服務

    追蹤各 API 的配額使用情況
    """

    # YouTube API 配額限制
    YOUTUBE_DAILY_QUOTA = 10000
    YOUTUBE_UPLOAD_COST = 1600
    YOUTUBE_THUMBNAIL_COST = 50

    def __init__(self, db: Session):
        self.db = db

    async def check_quota(self, service: str, cost: int) -> bool:
        """
        檢查配額是否足夠

        Args:
            service: 服務名稱（"youtube", "did", etc.）
            cost: 本次操作消耗的配額

        Returns:
            bool: 配額是否足夠
        """
        today = date.today()

        usage = self.db.query(QuotaUsage).filter(
            QuotaUsage.service == service,
            QuotaUsage.date == today
        ).first()

        if not usage:
            # 今日尚未使用，配額充足
            return True

        if service == "youtube":
            remaining = self.YOUTUBE_DAILY_QUOTA - usage.used_units
            return remaining >= cost

        return True

    async def record_usage(self, service: str, cost: int) -> None:
        """
        記錄配額使用

        Args:
            service: 服務名稱
            cost: 消耗的配額
        """
        today = date.today()

        usage = self.db.query(QuotaUsage).filter(
            QuotaUsage.service == service,
            QuotaUsage.date == today
        ).first()

        if usage:
            usage.used_units += cost
        else:
            usage = QuotaUsage(
                service=service,
                date=today,
                used_units=cost
            )
            self.db.add(usage)

        self.db.commit()

        logger.info(f"{service} quota used: {cost} units (total today: {usage.used_units})")

    async def get_quota_usage(self, service: str, date: date) -> Dict[str, Any]:
        """
        查詢配額使用情況

        Args:
            service: 服務名稱
            date: 查詢日期

        Returns:
            配額使用資訊
        """
        usage = self.db.query(QuotaUsage).filter(
            QuotaUsage.service == service,
            QuotaUsage.date == date
        ).first()

        if service == "youtube":
            used_units = usage.used_units if usage else 0
            remaining_units = self.YOUTUBE_DAILY_QUOTA - used_units
            uploads_today = used_units // (self.YOUTUBE_UPLOAD_COST + self.YOUTUBE_THUMBNAIL_COST)

            return {
                "service": service,
                "date": date.isoformat(),
                "total_quota": self.YOUTUBE_DAILY_QUOTA,
                "used_units": used_units,
                "remaining_units": remaining_units,
                "uploads_today": uploads_today,
                "can_upload": remaining_units >= (self.YOUTUBE_UPLOAD_COST + self.YOUTUBE_THUMBNAIL_COST)
            }

        return {}
```

---

#### 4. 自訂例外: `backend/app/exceptions/youtube_exceptions.py`

**職責:** YouTube 相關的自訂例外

```python
class YouTubeAPIError(Exception):
    """YouTube API 基礎錯誤"""
    pass

class YouTubeQuotaExceededError(YouTubeAPIError):
    """YouTube API 配額用盡"""
    pass

class YouTubeAuthError(YouTubeAPIError):
    """YouTube OAuth 認證錯誤"""
    pass

class YouTubeUploadError(YouTubeAPIError):
    """影片上傳錯誤"""
    pass
```

---

#### 5. 資料模型: `backend/app/models/quota_usage.py`

**職責:** 儲存配額使用記錄

```python
from sqlalchemy import Column, Integer, String, Date
from app.models.base import Base

class QuotaUsage(Base):
    __tablename__ = "quota_usage"

    id = Column(Integer, primary_key=True, index=True)
    service = Column(String(50), nullable=False)  # "youtube", "did", etc.
    date = Column(Date, nullable=False, index=True)
    used_units = Column(Integer, default=0)

    __table_args__ = (
        # 每個服務每天只有一筆記錄
        {"schema": None}
    )
```

---

#### 6. 測試檔案: `backend/tests/integrations/test_youtube_client.py`

**職責:** YouTubeClient 單元測試

```python
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from app.integrations.youtube_client import YouTubeClient
from googleapiclient.errors import HttpError

@pytest.fixture
def mock_credentials():
    return {
        "access_token": "test_access_token",
        "refresh_token": "test_refresh_token",
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_id": "test_client_id",
        "client_secret": "test_client_secret",
        "scopes": ["https://www.googleapis.com/auth/youtube.upload"],
        "expires_at": datetime.now() + timedelta(hours=1)
    }

@pytest.fixture
def mock_db_session():
    return Mock()

class TestYouTubeClient:
    def test_token_refresh_when_expired(self, mock_credentials, mock_db_session):
        """測試 1: OAuth Token 自動刷新機制"""
        # 設定 token 已過期
        mock_credentials["expires_at"] = datetime.now() - timedelta(hours=1)

        with patch('app.integrations.youtube_client.Credentials') as mock_creds_class:
            mock_creds = Mock()
            mock_creds.expired = True
            mock_creds.refresh_token = "test_refresh_token"
            mock_creds.token = "new_access_token"
            mock_creds.refresh = Mock()

            mock_creds_class.return_value = mock_creds

            client = YouTubeClient(mock_credentials, mock_db_session)
            creds = client.get_credentials()

            # 驗證 refresh 被調用
            assert mock_creds.refresh.called
            assert creds.token == "new_access_token"

    @pytest.mark.asyncio
    async def test_upload_video_success(self, mock_credentials, mock_db_session):
        """測試 2: 成功上傳影片（立即發布）"""
        with patch('app.integrations.youtube_client.build') as mock_build:
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock videos().insert() API
            mock_request = Mock()
            mock_youtube.videos().insert.return_value = mock_request

            # Mock next_chunk() 上傳流程
            mock_status = Mock()
            mock_status.progress.return_value = 1.0  # 100%
            mock_request.next_chunk.return_value = (mock_status, {"id": "test_video_id"})

            client = YouTubeClient(mock_credentials, mock_db_session)
            video_id = await client.upload_video(
                video_path="/path/to/video.mp4",
                title="Test Video",
                description="Test Description",
                tags=["test"],
                privacy_status="public"
            )

            assert video_id == "test_video_id"
            assert mock_youtube.videos().insert.called

    # 更多測試...
```

---

#### 7. 整合測試: `backend/tests/integration/test_youtube_upload.py`

**職責:** 完整上傳流程整合測試（需要真實 credentials）

```python
import pytest
import os
from app.services.upload_service import VideoUploadService

@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("YOUTUBE_TEST_CREDENTIALS"),
    reason="Requires real YouTube OAuth credentials"
)
class TestYouTubeIntegration:
    @pytest.mark.asyncio
    async def test_full_upload_flow(self, db_session):
        """測試 10: 完整上傳流程（端到端）"""
        # 使用真實的 OAuth credentials
        # 上傳測試影片
        # 驗證上傳成功
        # 清理測試影片
        pass
```

---

## API 端點規格

雖然此 task 主要是整合層的實作，但需要確保與以下 API 端點整合：

### POST /api/v1/youtube/upload

**用途:** 觸發影片上傳（由 Celery task 調用）

**Request Body:**
```json
{
  "project_id": 1,
  "video_path": "/path/to/final_video.mp4",
  "youtube_account_id": 1,
  "metadata": {
    "title": "Video Title",
    "description": "Video Description",
    "tags": ["tag1", "tag2"],
    "privacy_status": "public",
    "publish_at": null,
    "thumbnail_path": "/path/to/thumbnail.jpg"
  }
}
```

**Response:**
```json
{
  "video_id": "dQw4w9WgXcQ",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "status": "uploaded",
  "privacy_status": "public"
}
```

---

### GET /api/v1/youtube/quota

**用途:** 查詢配額使用情況

**Response:**
```json
{
  "date": "2025-10-20",
  "total_quota": 10000,
  "used_units": 3200,
  "remaining_units": 6800,
  "uploads_today": 2,
  "can_upload": true
}
```

---

## 資料流程

### 完整上傳流程

```
VideoUploadService.upload_to_youtube()
    ↓
1. QuotaService.check_quota()
    → 檢查 YouTube API 配額是否足夠
    → 需要 1650 units (影片 1600 + 封面 50)
    ↓
2. 從資料庫取得 YouTubeAccount
    → 包含 access_token, refresh_token, expires_at
    ↓
3. 初始化 YouTubeClient(credentials, db_session)
    → YouTubeClient._initialize_client()
    → YouTubeClient.get_credentials()
        → 檢查 token 是否過期
        → 若過期，調用 creds.refresh(Request())
        → 更新資料庫中的 access_token 和 expires_at
    ↓
4. 準備 metadata
    → 加入 AI 內容標註到 description
    ↓
5. YouTubeClient.upload_video()
    → 建立 request body (snippet + status)
    → 使用 MediaFileUpload (resumable=True)
    → 調用 youtube.videos().insert()
    → 執行 resumable upload (next_chunk() 循環)
        → 若遇到 500/503 錯誤，重試
        → 更新上傳進度（0% → 100%）
    → 返回 video_id
    ↓
6. QuotaService.record_usage("youtube", cost=1600)
    ↓
7. YouTubeClient.upload_thumbnail() (如果有)
    → 調用 youtube.thumbnails().set()
    → 返回 thumbnail_url
    ↓
8. QuotaService.record_usage("youtube", cost=50)
    ↓
9. 更新 Project 資料庫記錄
    → project.youtube_video_id = video_id
    → project.youtube_video_url = url
    → project.status = "completed"
    ↓
10. 返回上傳結果
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步: 環境準備 (15 分鐘)

1. **確認前置任務完成**
   - Task-003 (API 基礎架構) ✅
   - Task-007 (YouTube OAuth 授權) ✅

2. **安裝依賴套件**
```bash
cd backend
pip install google-api-python-client google-auth google-auth-oauthlib
pip install pytest pytest-asyncio pytest-cov
```

3. **建立測試檔案結構**
```bash
mkdir -p tests/integrations
mkdir -p tests/integration
touch tests/integrations/test_youtube_client.py
touch tests/services/test_upload_service.py
touch tests/integration/test_youtube_upload.py
```

4. **閱讀相關 spec**
   - `tech-specs/backend/integrations.md#7.4`
   - `tech-specs/backend/business-logic.md#3.5`

---

#### 第 2 步: 撰寫第一個測試 (20 分鐘)

**測試 1: OAuth Token 自動刷新機制**

```python
# tests/integrations/test_youtube_client.py

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from app.integrations.youtube_client import YouTubeClient

def test_token_refresh_when_expired():
    """測試 Token 過期時自動刷新"""
    # 準備測試資料
    mock_credentials = {
        "access_token": "expired_token",
        "refresh_token": "valid_refresh_token",
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_id": "test_client_id",
        "client_secret": "test_secret",
        "scopes": ["https://www.googleapis.com/auth/youtube.upload"],
        "expires_at": datetime.now() - timedelta(hours=1)  # 已過期
    }

    mock_db_session = Mock()

    with patch('app.integrations.youtube_client.Credentials') as MockCreds:
        mock_creds = Mock()
        mock_creds.expired = True
        mock_creds.refresh_token = "valid_refresh_token"
        mock_creds.token = "new_access_token"
        mock_creds.refresh = Mock()

        MockCreds.return_value = mock_creds

        # 執行
        client = YouTubeClient(mock_credentials, mock_db_session)
        creds = client.get_credentials()

        # 驗證
        assert mock_creds.refresh.called
        assert creds.token == "new_access_token"
```

**執行測試（預期失敗）：**
```bash
pytest tests/integrations/test_youtube_client.py::test_token_refresh_when_expired -v
# 預期: FAILED (因為 YouTubeClient 還未實作)
```

---

#### 第 3 步: 實作基礎架構 (30 分鐘)

1. **建立 YouTubeClient 骨架**
```bash
touch backend/app/integrations/youtube_client.py
```

2. **實作 `__init__` 和 `get_credentials` 方法**
```python
# backend/app/integrations/youtube_client.py

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

class YouTubeClient:
    def __init__(self, credentials: dict, db_session):
        self.credentials_dict = credentials
        self.db_session = db_session
        self.youtube = None
        self._initialize_client()

    def _initialize_client(self):
        creds = self.get_credentials()
        self.youtube = build('youtube', 'v3', credentials=creds)

    def get_credentials(self) -> Credentials:
        creds = Credentials(
            token=self.credentials_dict["access_token"],
            refresh_token=self.credentials_dict["refresh_token"],
            token_uri=self.credentials_dict["token_uri"],
            client_id=self.credentials_dict["client_id"],
            client_secret=self.credentials_dict["client_secret"],
            scopes=self.credentials_dict["scopes"]
        )

        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # TODO: 更新資料庫

        return creds
```

3. **執行測試（應該通過）：**
```bash
pytest tests/integrations/test_youtube_client.py::test_token_refresh_when_expired -v
# 預期: PASSED ✅
```

---

#### 第 4 步: 實作影片上傳功能 (1 小時)

1. **撰寫測試 2: 成功上傳影片**
```python
@pytest.mark.asyncio
async def test_upload_video_success():
    """測試成功上傳影片"""
    # ... (參考測試要求中的測試 2)
```

2. **實作 `upload_video` 方法**
```python
async def upload_video(
    self,
    video_path: str,
    title: str,
    description: str,
    tags: list,
    privacy_status: str = "public",
    **kwargs
) -> str:
    # 建立 request body
    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags,
            "categoryId": kwargs.get("category_id", "22")
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": kwargs.get("made_for_kids", False)
        }
    }

    # 使用 Resumable Upload
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

    # 執行上傳
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Upload progress: {int(status.progress() * 100)}%")

    return response["id"]
```

3. **執行測試**
```bash
pytest tests/integrations/test_youtube_client.py::test_upload_video_success -v
```

---

#### 第 5 步: 實作錯誤處理與重試 (45 分鐘)

1. **撰寫測試 5, 6, 7（錯誤處理）**

2. **實作重試邏輯**
```python
# 在 upload_video 中加入錯誤處理
from googleapiclient.errors import HttpError
import time

retry_count = 0
max_retries = 3

while response is None:
    try:
        status, response = request.next_chunk()
    except HttpError as e:
        if e.resp.status in [500, 502, 503, 504]:
            if retry_count < max_retries:
                retry_count += 1
                delay = 2 ** retry_count
                time.sleep(delay)
            else:
                raise
        else:
            # 不可重試錯誤（401, 403）
            raise
```

3. **執行所有錯誤處理測試**
```bash
pytest tests/integrations/test_youtube_client.py -k "error" -v
```

---

#### 第 6 步: 實作封面上傳 (30 分鐘)

1. **撰寫測試 4: 成功上傳封面**

2. **實作 `upload_thumbnail` 方法**
```python
async def upload_thumbnail(self, video_id: str, thumbnail_path: str) -> str:
    media = MediaFileUpload(thumbnail_path, mimetype="image/jpeg")

    response = self.youtube.thumbnails().set(
        videoId=video_id,
        media_body=media
    ).execute()

    return response["items"][0]["maxres"]["url"]
```

3. **執行測試**
```bash
pytest tests/integrations/test_youtube_client.py::test_upload_thumbnail_success -v
```

---

#### 第 7 步: 實作 VideoUploadService (1 小時)

1. **建立服務骨架**
```bash
touch backend/app/services/upload_service.py
```

2. **撰寫服務測試**
```python
# tests/services/test_upload_service.py

@pytest.mark.asyncio
async def test_upload_to_youtube_full_flow():
    """測試完整上傳流程"""
    # ... (Mock YouTubeClient, QuotaService, Database)
```

3. **實作 VideoUploadService**
   - 參考「實作規格」中的程式碼骨架

4. **執行測試**
```bash
pytest tests/services/test_upload_service.py -v
```

---

#### 第 8 步: 實作配額服務 (45 分鐘)

1. **建立 QuotaUsage 模型**
```bash
touch backend/app/models/quota_usage.py
```

2. **撰寫配額服務測試**
```python
# tests/services/test_quota_service.py

@pytest.mark.asyncio
async def test_check_quota_sufficient():
    """測試配額檢查（配額充足）"""
    # ...

@pytest.mark.asyncio
async def test_check_quota_insufficient():
    """測試配額檢查（配額不足）"""
    # ...
```

3. **實作 QuotaService**

4. **執行測試**
```bash
pytest tests/services/test_quota_service.py -v
```

---

#### 第 9 步: 整合測試（可選）(30 分鐘)

**注意:** 整合測試需要真實的 YouTube OAuth credentials，會消耗 API 配額

1. **設定測試環境變數**
```bash
export YOUTUBE_TEST_CREDENTIALS="path/to/credentials.json"
```

2. **撰寫整合測試**
```python
# tests/integration/test_youtube_upload.py

@pytest.mark.integration
@pytest.mark.skipif(...)
async def test_full_upload_and_cleanup():
    """完整測試：上傳影片並清理"""
    # 上傳測試影片（private）
    # 驗證上傳成功
    # 刪除測試影片
```

3. **執行整合測試**
```bash
pytest tests/integration/test_youtube_upload.py -v --integration
```

---

#### 第 10 步: 重構與優化 (30 分鐘)

1. **檢查程式碼重複**
   - 提取共用的重試邏輯
   - 提取 token 刷新邏輯

2. **改善錯誤訊息**
   - 使用自訂例外類別
   - 提供友善的錯誤訊息

3. **加強日誌記錄**
```python
import logging
logger = logging.getLogger(__name__)

logger.info(f"Starting video upload: {video_path}")
logger.warning(f"Token expired, refreshing...")
logger.error(f"Upload failed: {str(e)}")
```

4. **再次執行所有測試**
```bash
pytest tests/integrations/test_youtube_client.py -v
pytest tests/services/test_upload_service.py -v
```

---

#### 第 11 步: 文件與檢查 (30 分鐘)

1. **更新 API 文檔**
   - 確保所有方法都有 docstring
   - 更新參數說明和返回值說明

2. **檢查測試覆蓋率**
```bash
pytest --cov=app.integrations.youtube_client --cov=app.services.upload_service --cov-report=html
# 目標: > 85%
```

3. **執行 Linter**
```bash
ruff check app/integrations/youtube_client.py
ruff check app/services/upload_service.py
```

4. **格式化程式碼**
```bash
ruff format app/integrations/youtube_client.py
ruff format app/services/upload_service.py
```

---

## 注意事項

### 安全性

- ⚠️ **絕對不要**在日誌中記錄 OAuth tokens 或 API keys
- ⚠️ **絕對不要**將 refresh_token 寫入錯誤訊息
- ⚠️ 使用環境變數或 Keychain 儲存敏感資訊
- ⚠️ Token 刷新失敗時，不應洩漏 client_secret

**範例：安全的日誌記錄**
```python
# ❌ 不安全
logger.info(f"Using token: {access_token}")

# ✅ 安全
logger.info(f"Using token: {access_token[:10]}...")
```

---

### 效能

- 💡 Resumable Upload 使用 1MB chunks 平衡速度和記憶體
- 💡 Token 刷新應該是同步的，避免多次刷新
- 💡 配額檢查應該使用快取（Redis），避免頻繁查詢資料庫

---

### 測試

- ✅ 使用 Mock 避免真實 API 調用（單元測試）
- ✅ 整合測試應該可選（需要真實 credentials）
- ✅ 測試後應清理測試影片（避免污染 YouTube 頻道）
- ✅ Mock `time.sleep()` 避免測試時間過長

**範例：Mock time.sleep**
```python
with patch('time.sleep') as mock_sleep:
    # 測試重試邏輯
    # mock_sleep 不會真的等待
    pass
```

---

### YouTube API 特定注意事項

- 📌 **排程發布**的影片必須先設為 `"private"`，不能是 `"public"`
- 📌 **AI 內容標註**是 YouTube 政策要求（2023 年起）
- 📌 封面尺寸必須是 **1280x720**，檔案大小 < 2MB
- 📌 影片上傳成本 **1600 units**，封面上傳成本 **50 units**
- 📌 每日配額 **10,000 units** ≈ **6 支影片/日**（含封面）

---

### 與其他模組整合

- 🔗 **Task-007 (YouTube OAuth)** 提供 `YouTubeAccount` 模型和授權流程
- 🔗 **Task-014 (Celery 背景任務)** 的 `upload_to_youtube_task` 會調用此服務
- 🔗 **Task-023 (YouTube 設定頁面)** 會顯示配額使用情況

---

## 完成檢查清單

### 功能完整性
- [ ] YouTubeClient 類別完整實作
  - [ ] `get_credentials()` 實作（支援 token 刷新）
  - [ ] `upload_video()` 實作（支援 resumable upload）
  - [ ] `upload_thumbnail()` 實作
  - [ ] `get_channel_info()` 實作
- [ ] VideoUploadService 完整實作
  - [ ] `upload_to_youtube()` 實作（完整流程）
  - [ ] 配額檢查整合
  - [ ] 專案狀態更新
- [ ] QuotaService 實作
  - [ ] `check_quota()` 實作
  - [ ] `record_usage()` 實作
  - [ ] `get_quota_usage()` 實作
- [ ] OAuth Token 刷新機制正常運作
- [ ] 影片上傳支援斷點續傳
- [ ] Metadata 設定完整（標題、描述、標籤、隱私、排程）
- [ ] AI 內容標註正確實作
- [ ] 封面上傳功能正常
- [ ] 配額監控功能正常

### 錯誤處理
- [ ] 401 Unauthorized 自動刷新 token 並重試
- [ ] 403 Quota Exceeded 正確處理（拋出自訂例外）
- [ ] 500/503 Server Error 指數退避重試（最多 3 次）
- [ ] 網路中斷時支援斷點續傳
- [ ] 所有錯誤都有清楚的日誌記錄

### 測試
- [ ] 單元測試全部通過（9 個測試）
  - [ ] 測試 1: OAuth Token 自動刷新 ✅
  - [ ] 測試 2: 成功上傳影片（立即發布） ✅
  - [ ] 測試 3: 成功上傳影片（排程發布） ✅
  - [ ] 測試 4: 成功上傳封面 ✅
  - [ ] 測試 5: 處理 401 Unauthorized ✅
  - [ ] 測試 6: 處理 403 Quota Exceeded ✅
  - [ ] 測試 7: 處理 500/503 Server Error ✅
  - [ ] 測試 8: 斷點續傳機制 ✅
  - [ ] 測試 9: 配額檢查與追蹤 ✅
- [ ] 整合測試通過（測試 10，可選）
- [ ] 測試覆蓋率 > 85%

### 程式碼品質
- [ ] Ruff check 無錯誤: `ruff check app/integrations/youtube_client.py app/services/upload_service.py`
- [ ] 程式碼已格式化: `ruff format app/integrations/ app/services/`
- [ ] 所有函數都有 docstring（包含參數和返回值說明）
- [ ] 無 type 錯誤（如使用 mypy）
- [ ] 無安全性警告（不洩漏敏感資訊）

### 文件
- [ ] 所有類別和方法都有清楚的 docstring
- [ ] 錯誤處理邏輯有註解說明
- [ ] 重試機制有註解說明
- [ ] API 端點規格文件已更新（如需要）

### 整合
- [ ] 與 YouTubeAccount 模型整合正常
- [ ] 與 Project 模型整合正常
- [ ] 與 QuotaUsage 模型整合正常
- [ ] 可被 Celery task 正常調用

### Spec 同步
- [ ] 如果實作與 spec 有差異，已更新 `tech-specs/backend/integrations.md`
- [ ] 如果有新的依賴套件，已更新 `requirements.txt`
- [ ] 如果有新的環境變數，已更新 `.env.example`

---

## 預估時間分配

- **環境準備與閱讀:** 15 分鐘
- **測試撰寫:** 1 小時 30 分鐘
  - 單元測試（9 個）: 1 小時
  - 整合測試: 30 分鐘
- **實作功能:** 4 小時 30 分鐘
  - YouTubeClient 基礎: 30 分鐘
  - upload_video: 1 小時
  - 錯誤處理與重試: 45 分鐘
  - upload_thumbnail: 30 分鐘
  - VideoUploadService: 1 小時
  - QuotaService: 45 分鐘
- **整合測試（可選）:** 30 分鐘
- **重構優化:** 30 分鐘
- **文件檢查:** 30 分鐘
- **Buffer:** 1 小時 15 分鐘

**總計：約 9 小時**（預留 1 小時 buffer = 10 小時）

---

## 參考資源

### YouTube API 官方文檔
- [YouTube Data API v3 Overview](https://developers.google.com/youtube/v3/getting-started)
- [Videos: insert](https://developers.google.com/youtube/v3/docs/videos/insert)
- [Thumbnails: set](https://developers.google.com/youtube/v3/docs/thumbnails/set)
- [Resumable Upload](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)
- [OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Quota Usage](https://developers.google.com/youtube/v3/determine_quota_cost)

### Python 套件文檔
- [google-api-python-client](https://github.com/googleapis/google-api-python-client)
- [google-auth](https://google-auth.readthedocs.io/)
- [google-auth-oauthlib](https://google-auth-oauthlib.readthedocs.io/)

### 專案內部文件
- `tech-specs/backend/integrations.md#7.4` - YouTube Data API 整合規格
- `tech-specs/backend/business-logic.md#3.5` - YouTube 上傳邏輯
- `tech-specs/backend/auth.md` - OAuth 2.0 認證規格
- `tech-specs/backend/background-jobs.md#5.5` - upload_to_youtube_task

---

**準備好了嗎？** 開始使用 TDD 方式實作 YouTube Data API 整合！🚀
