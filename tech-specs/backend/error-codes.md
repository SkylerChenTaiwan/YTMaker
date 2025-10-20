# 後端錯誤碼體系

> **版本：** 1.0
> **最後更新：** 2025-10-20
> **狀態：** ✅ Approved

---

## 目錄

1. [Gemini API 錯誤](#1-gemini-api-錯誤)
2. [Stability AI 錯誤](#2-stability-ai-錯誤)
3. [D-ID 錯誤](#3-d-id-錯誤)
4. [YouTube API 錯誤](#4-youtube-api-錯誤)
5. [系統錯誤](#5-系統錯誤)
6. [錯誤優先級](#6-錯誤優先級)

---

## 1. Gemini API 錯誤

### 1.1 錯誤碼定義

| 錯誤碼 | 說明 | HTTP Status | 可重試 | 恢復指南 |
|--------|------|-------------|--------|----------|
| `GEMINI_QUOTA_EXCEEDED` | Gemini 配額用盡 | 429 | ❌ | 等待配額重置（每日）或升級 API 方案 |
| `GEMINI_INVALID_API_KEY` | API Key 無效或被撤銷 | 401 | ❌ | 檢查環境變數 `GEMINI_API_KEY` 是否正確 |
| `GEMINI_RATE_LIMIT` | 請求過於頻繁 | 429 | ✅ | 自動等待 10 秒後重試（最多 3 次） |
| `GEMINI_SERVER_ERROR` | Gemini 伺服器內部錯誤 | 500 | ✅ | 等待 5 秒後重試（最多 3 次） |
| `GEMINI_CONTENT_POLICY` | 生成內容違反政策 | 400 | ❌ | 修改 Prompt 內容，移除敏感詞彙 |
| `GEMINI_TIMEOUT` | API 請求超時 | 504 | ✅ | 重試一次 |
| `GEMINI_NETWORK_ERROR` | 網路連線失敗 | 503 | ✅ | 檢查網路連線後重試（最多 3 次） |
| `GEMINI_INVALID_REQUEST` | 請求參數不正確 | 400 | ❌ | 檢查 Prompt 長度、格式 |

### 1.2 重試策略

```python
# Gemini API 重試配置
GEMINI_RETRY_CONFIG = {
    "GEMINI_RATE_LIMIT": {
        "max_retries": 3,
        "backoff": "exponential",  # 1s, 2s, 4s
        "base_delay": 1.0
    },
    "GEMINI_SERVER_ERROR": {
        "max_retries": 3,
        "backoff": "fixed",
        "base_delay": 5.0
    },
    "GEMINI_TIMEOUT": {
        "max_retries": 1,
        "backoff": "fixed",
        "base_delay": 2.0
    },
    "GEMINI_NETWORK_ERROR": {
        "max_retries": 3,
        "backoff": "exponential",
        "base_delay": 2.0
    }
}
```

---

## 2. Stability AI 錯誤

### 2.1 錯誤碼定義

| 錯誤碼 | 說明 | HTTP Status | 可重試 | 恢復指南 |
|--------|------|-------------|--------|----------|
| `STABILITY_QUOTA_EXCEEDED` | 圖片生成配額用盡 | 429 | ❌ | 等待配額重置或購買額度 |
| `STABILITY_INVALID_API_KEY` | API Key 無效 | 401 | ❌ | 檢查環境變數 `STABILITY_API_KEY` |
| `STABILITY_INVALID_PROMPT` | Prompt 不合法 | 400 | ❌ | 修改圖片描述 |
| `STABILITY_RATE_LIMIT` | 請求過於頻繁 | 429 | ✅ | 指數退避重試（最多 3 次） |
| `STABILITY_CONTENT_POLICY` | 違反內容政策 | 400 | ❌ | 修改圖片描述，移除敏感內容 |
| `STABILITY_SERVER_ERROR` | Stability AI 伺服器錯誤 | 500 | ✅ | 等待 5 秒後重試（最多 3 次） |
| `STABILITY_TIMEOUT` | 圖片生成超時 | 504 | ✅ | 重試一次 |
| `STABILITY_NETWORK_ERROR` | 網路連線失敗 | 503 | ✅ | 檢查網路連線後重試 |

### 2.2 重試策略

```python
# Stability AI 重試配置
STABILITY_RETRY_CONFIG = {
    "STABILITY_RATE_LIMIT": {
        "max_retries": 3,
        "backoff": "exponential",
        "base_delay": 2.0
    },
    "STABILITY_SERVER_ERROR": {
        "max_retries": 3,
        "backoff": "fixed",
        "base_delay": 5.0
    },
    "STABILITY_TIMEOUT": {
        "max_retries": 1,
        "backoff": "fixed",
        "base_delay": 3.0
    },
    "STABILITY_NETWORK_ERROR": {
        "max_retries": 3,
        "backoff": "exponential",
        "base_delay": 2.0
    }
}
```

### 2.3 特殊情況：部分圖片失敗

當生成多張圖片時，可能出現部分失敗的情況：

**處理策略：**
1. 記錄所有失敗的圖片及其錯誤碼
2. 如果失敗 < 20%，標記為部分成功，繼續流程
3. 如果失敗 >= 20%，整個任務失敗
4. 前端顯示哪些圖片失敗及原因

```python
# 範例：處理部分圖片失敗
failed_images = []
for i, image_prompt in enumerate(image_prompts):
    try:
        image_url = await generate_image(image_prompt)
        image_urls.append(image_url)
    except StabilityAPIError as e:
        failed_images.append({
            "index": i,
            "prompt": image_prompt,
            "error_code": e.error_code,
            "reason": e.reason
        })

# 判斷是否可接受
failure_rate = len(failed_images) / len(image_prompts)
if failure_rate >= 0.2:
    # 失敗率過高，整個任務失敗
    raise ImageGenerationError(
        reason="TOO_MANY_IMAGES_FAILED",
        is_retryable=False,
        details={"failed_images": failed_images}
    )
else:
    # 部分失敗可接受，記錄並繼續
    logger.warning("Some images failed to generate", extra={
        "failed_count": len(failed_images),
        "total_count": len(image_prompts),
        "failed_images": failed_images,
        "project_id": project_id
    })
```

---

## 3. D-ID 錯誤

### 3.1 錯誤碼定義

| 錯誤碼 | 說明 | HTTP Status | 可重試 | 恢復指南 |
|--------|------|-------------|--------|----------|
| `DID_QUOTA_EXCEEDED` | 虛擬主播配額用盡 | 429 | ❌ | 等待配額重置（每月 1 號）或升級方案 |
| `DID_INVALID_API_KEY` | API Key 無效 | 401 | ❌ | 檢查環境變數 `DID_API_KEY` |
| `DID_PROCESSING_TIMEOUT` | 虛擬主播生成超時 | 504 | ✅ | 重試一次 |
| `DID_INVALID_AUDIO` | 音訊檔案格式或大小不正確 | 400 | ❌ | 檢查音訊檔案：格式（mp3）、大小（< 10 MB） |
| `DID_INVALID_IMAGE` | 虛擬主播圖片格式不正確 | 400 | ❌ | 檢查圖片：格式（jpg/png）、解析度 |
| `DID_SERVER_ERROR` | D-ID 伺服器錯誤 | 500 | ✅ | 等待 30 秒後重試（最多 2 次） |
| `DID_RATE_LIMIT` | 請求過於頻繁 | 429 | ✅ | 等待 10 秒後重試 |
| `DID_NETWORK_ERROR` | 網路連線失敗 | 503 | ✅ | 檢查網路連線後重試 |

### 3.2 重試策略

```python
# D-ID 重試配置
DID_RETRY_CONFIG = {
    "DID_PROCESSING_TIMEOUT": {
        "max_retries": 1,
        "backoff": "fixed",
        "base_delay": 5.0
    },
    "DID_SERVER_ERROR": {
        "max_retries": 2,
        "backoff": "fixed",
        "base_delay": 30.0
    },
    "DID_RATE_LIMIT": {
        "max_retries": 3,
        "backoff": "exponential",
        "base_delay": 10.0
    },
    "DID_NETWORK_ERROR": {
        "max_retries": 3,
        "backoff": "exponential",
        "base_delay": 2.0
    }
}
```

### 3.3 重要注意事項

**D-ID API 特性：**
- 配額計算：每次成功生成消耗 1 個配額（失敗不計）
- 處理時間：通常 30-60 秒
- 超時設定：建議 120 秒

---

## 4. YouTube API 錯誤

### 4.1 錯誤碼定義

| 錯誤碼 | 說明 | HTTP Status | 可重試 | 恢復指南 |
|--------|------|-------------|--------|----------|
| `YOUTUBE_QUOTA_EXCEEDED` | YouTube 配額用盡 | 403 | ❌ | 等待配額重置（每日太平洋時間午夜）或申請增加配額 |
| `YOUTUBE_INVALID_TOKEN` | OAuth Token 無效 | 401 | ✅ | 使用 Refresh Token 更新 Access Token |
| `YOUTUBE_TOKEN_EXPIRED` | OAuth Token 過期 | 401 | ✅ | 使用 Refresh Token 更新 Access Token |
| `YOUTUBE_REFRESH_FAILED` | Refresh Token 失敗 | 401 | ❌ | 要求用戶重新授權 |
| `YOUTUBE_UPLOAD_FAILED` | 影片上傳失敗 | 500 | ✅ | 使用 Resumable Upload 重試 |
| `YOUTUBE_VIDEO_TOO_LARGE` | 影片檔案過大 | 400 | ❌ | 壓縮影片（目標 < 128 GB） |
| `YOUTUBE_INVALID_METADATA` | 影片元資料不正確 | 400 | ❌ | 檢查標題、描述、標籤格式 |
| `YOUTUBE_SERVER_ERROR` | YouTube 伺服器錯誤 | 500 | ✅ | 等待 10 秒後重試 |

### 4.2 重試策略

```python
# YouTube API 重試配置
YOUTUBE_RETRY_CONFIG = {
    "YOUTUBE_INVALID_TOKEN": {
        "max_retries": 1,
        "action": "refresh_token"  # 先嘗試刷新 token
    },
    "YOUTUBE_TOKEN_EXPIRED": {
        "max_retries": 1,
        "action": "refresh_token"
    },
    "YOUTUBE_UPLOAD_FAILED": {
        "max_retries": 3,
        "backoff": "exponential",
        "base_delay": 5.0,
        "use_resumable": True  # 使用 Resumable Upload
    },
    "YOUTUBE_SERVER_ERROR": {
        "max_retries": 3,
        "backoff": "fixed",
        "base_delay": 10.0
    }
}
```

### 4.3 配額管理

**YouTube API 配額消耗：**
- 上傳影片：1600 單位
- 更新影片：50 單位
- 搜尋影片：100 單位
- 預設每日配額：10,000 單位（約 6 次上傳）

**建議：**
- 監控剩餘配額，當 < 20% 時發出警告
- 紀錄每次 API 呼叫的配額消耗
- 提供配額不足時的友好提示

---

## 5. 系統錯誤

### 5.1 錯誤碼定義

| 錯誤碼 | 說明 | HTTP Status | 可重試 | 恢復指南 |
|--------|------|-------------|--------|----------|
| `FFMPEG_EXECUTION_FAILED` | FFmpeg 執行失敗 | 500 | ❌ | 檢查 FFmpeg 安裝、檔案權限、磁碟空間 |
| `FFMPEG_NOT_FOUND` | FFmpeg 未安裝或未在 PATH 中 | 500 | ❌ | 安裝 FFmpeg：`apt-get install ffmpeg` |
| `FFMPEG_INVALID_INPUT` | 輸入檔案格式不支援 | 400 | ❌ | 檢查音訊/影片格式 |
| `REDIS_CONNECTION_FAILED` | Redis 連線失敗 | 500 | ✅ | 檢查 Redis 服務：`systemctl status redis` |
| `DATABASE_ERROR` | 資料庫錯誤 | 500 | ✅ | 檢查資料庫連線和狀態 |
| `DATABASE_CONNECTION_FAILED` | 資料庫連線失敗 | 500 | ✅ | 檢查連線字串和網路 |
| `FILE_SYSTEM_ERROR` | 檔案系統錯誤 | 500 | ❌ | 檢查磁碟空間、權限 |
| `DISK_SPACE_INSUFFICIENT` | 磁碟空間不足 | 500 | ❌ | 清理臨時檔案或增加磁碟空間 |
| `FILE_NOT_FOUND` | 檔案不存在 | 404 | ❌ | 確認檔案路徑正確 |
| `FILE_PERMISSION_DENIED` | 檔案權限不足 | 403 | ❌ | 檢查檔案權限：`chmod` |
| `CELERY_TASK_FAILED` | Celery 任務執行失敗 | 500 | ✅ | 檢查 Celery Worker 狀態和日誌 |
| `CELERY_WORKER_DOWN` | Celery Worker 未運行 | 503 | ❌ | 啟動 Celery Worker |
| `VALIDATION_ERROR` | 輸入驗證錯誤 | 400 | ❌ | 檢查輸入參數格式 |
| `INTERNAL_ERROR` | 未預期的內部錯誤 | 500 | ❌ | 檢查日誌並回報 |

### 5.2 磁碟空間監控

```python
import shutil

def check_disk_space(threshold_gb=10):
    """檢查磁碟空間"""
    stat = shutil.disk_usage("/")
    free_gb = stat.free / (1024 ** 3)

    if free_gb < threshold_gb:
        raise FileSystemError(
            reason="DISK_SPACE_INSUFFICIENT",
            is_retryable=False,
            details={
                "free_gb": free_gb,
                "threshold_gb": threshold_gb,
                "total_gb": stat.total / (1024 ** 3)
            }
        )
```

---

## 6. 錯誤優先級

### 6.1 P0 - 立即通知（嚴重）

需要立即處理，可能導致服務不可用：

- `GEMINI_INVALID_API_KEY`
- `STABILITY_INVALID_API_KEY`
- `DID_INVALID_API_KEY`
- `YOUTUBE_REFRESH_FAILED`
- `DATABASE_CONNECTION_FAILED`
- `REDIS_CONNECTION_FAILED`
- `FFMPEG_NOT_FOUND`
- `CELERY_WORKER_DOWN`
- `DISK_SPACE_INSUFFICIENT` (< 5%)

**通知方式：**
- 發送即時警報（Email/Slack/Webhook）
- 記錄 ERROR 級別日誌
- 自動建立 incident

### 6.2 P1 - 重要通知（需關注）

可能影響部分功能，需在 1 小時內處理：

- `GEMINI_QUOTA_EXCEEDED`
- `STABILITY_QUOTA_EXCEEDED`
- `DID_QUOTA_EXCEEDED`
- `YOUTUBE_QUOTA_EXCEEDED`
- 連續失敗 > 5 次（任何 API）
- `FILE_SYSTEM_ERROR`
- 錯誤率 > 10%

**通知方式：**
- 發送警告通知
- 記錄 WARNING 級別日誌
- 每小時彙總統計

### 6.3 P2 - 一般記錄（監控）

單次錯誤，有重試機制，僅記錄：

- `GEMINI_RATE_LIMIT`
- `STABILITY_RATE_LIMIT`
- `DID_RATE_LIMIT`
- `GEMINI_TIMEOUT`
- `STABILITY_TIMEOUT`
- `NETWORK_ERROR` (所有服務)
- `SERVER_ERROR` (所有服務)

**通知方式：**
- 記錄 INFO 級別日誌
- 每日彙總報告
- 監控趨勢變化

---

## 7. 錯誤回應格式

### 7.1 API 錯誤回應

所有 API 錯誤都應返回統一格式：

```json
{
  "error": {
    "code": "GEMINI_QUOTA_EXCEEDED",
    "message": "Gemini API 配額已用盡",
    "is_retryable": false,
    "details": {
      "quota_used": 1000,
      "quota_total": 1000,
      "reset_date": "2025-10-21T00:00:00Z"
    },
    "solutions": [
      "等待配額重置（每日太平洋時間午夜）",
      "升級 Gemini API 方案",
      "聯絡管理員增加配額"
    ],
    "trace_id": "abc-123-def-456",
    "timestamp": "2025-10-20T10:30:15.123Z"
  }
}
```

### 7.2 WebSocket 錯誤訊息

```json
{
  "type": "error",
  "project_id": "proj_12345",
  "error": {
    "code": "DID_QUOTA_EXCEEDED",
    "message": "虛擬主播配額已用盡",
    "stage": "avatar_generation",
    "is_retryable": false,
    "details": {
      "quota_used": 100,
      "quota_total": 100,
      "reset_date": "2025-11-01T00:00:00Z"
    },
    "solutions": [
      "等待配額重置（每月 1 號）",
      "升級 D-ID 方案",
      "暫時不使用虛擬主播功能"
    ],
    "trace_id": "abc-123-def-456",
    "timestamp": "2025-10-20T10:30:15.123Z"
  }
}
```

---

## 8. 錯誤處理範例

### 8.1 自訂錯誤類別

```python
class APIError(Exception):
    """基礎 API 錯誤類別"""
    def __init__(self, reason: str, is_retryable: bool, details: dict = None):
        self.reason = reason
        self.is_retryable = is_retryable
        self.details = details or {}
        super().__init__(reason)

class GeminiAPIError(APIError):
    """Gemini API 錯誤"""
    pass

class StabilityAPIError(APIError):
    """Stability AI 錯誤"""
    pass

class DIDAPIError(APIError):
    """D-ID 錯誤"""
    pass

class YouTubeAPIError(APIError):
    """YouTube API 錯誤"""
    pass

class SystemError(APIError):
    """系統錯誤"""
    pass
```

### 8.2 錯誤處理模式

```python
from app.utils.logging import StructuredLogger
from app.models.errors import GeminiAPIError

logger = StructuredLogger(__name__)

async def call_gemini_with_retry(prompt: str, project_id: str):
    """呼叫 Gemini API，包含重試邏輯"""
    max_retries = 3
    retry_count = 0

    while retry_count <= max_retries:
        try:
            response = await gemini_client.generate(prompt)
            return response.text

        except GeminiQuotaExceededError as e:
            # 配額用盡：不可重試
            logger.error("Gemini quota exceeded", extra={
                "error_code": "GEMINI_QUOTA_EXCEEDED",
                "project_id": project_id,
                "details": e.details
            })
            raise GeminiAPIError(
                reason="GEMINI_QUOTA_EXCEEDED",
                is_retryable=False,
                details=e.details
            )

        except GeminiRateLimitError as e:
            # Rate Limit：可重試
            retry_count += 1
            if retry_count > max_retries:
                logger.error("Gemini rate limit exceeded max retries", extra={
                    "error_code": "GEMINI_RATE_LIMIT",
                    "project_id": project_id,
                    "retry_count": retry_count
                })
                raise GeminiAPIError(
                    reason="GEMINI_RATE_LIMIT",
                    is_retryable=False,
                    details={"retry_count": retry_count}
                )

            # 指數退避
            delay = 2 ** retry_count
            logger.warning("Gemini rate limit, retrying", extra={
                "project_id": project_id,
                "retry_count": retry_count,
                "delay_seconds": delay
            })
            await asyncio.sleep(delay)

        except GeminiNetworkError as e:
            # 網路錯誤：可重試
            retry_count += 1
            if retry_count > max_retries:
                raise GeminiAPIError(
                    reason="GEMINI_NETWORK_ERROR",
                    is_retryable=False,
                    details={"retry_count": retry_count}
                )

            logger.warning("Gemini network error, retrying", extra={
                "project_id": project_id,
                "retry_count": retry_count
            })
            await asyncio.sleep(2)
```

---

**最後更新：** 2025-10-20
**維護者：** Backend Team
