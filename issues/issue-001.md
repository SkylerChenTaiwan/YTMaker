# [已解決] Issue-001: 錯誤處理與 Fallback 策略存在嚴重缺陷

> **建立日期：** 2025-10-20
> **狀態：** ✅ Resolved
> **優先級：** P0 緊急
> **分類：** Design
> **負責人：** Skyler
> **解決日期：** 2025-10-20

---

## 問題描述

### 簡述
當前的錯誤處理與 fallback 策略過於寬容，會靜默吞掉錯誤，導致問題難以定位和調試，違反「失敗零容忍」和「輕鬆定位錯誤」的需求。

### 詳細說明
在 spec review 過程中發現，現有的錯誤處理設計存在以下嚴重問題：

1. **自動 Fallback 機制過於寬容**：虛擬主播生成失敗時會靜默降級，用戶和開發者都不知道發生了什麼錯誤
2. **日誌策略缺乏細節**：沒有結構化日誌、沒有 Trace ID、無法快速定位問題
3. **錯誤碼體系不完整**：缺少大量錯誤情境的定義，沒有恢復指南
4. **前後端錯誤處理不一致**：重試策略和錯誤訊息格式不統一
5. **缺少明確的錯誤資訊記錄**：Project 資料表沒有 error_info 欄位，前端無法顯示詳細錯誤

### 發現時機
- **階段：** Spec Review（開發前檢查）
- **任務：** 準備開始 Phase 1 開發
- **檔案：**
  - `tech-specs/backend/integrations.md`
  - `tech-specs/backend/business-logic.md`
  - `tech-specs/backend/overview.md`
  - `tech-specs/frontend/api-integration.md`
- **功能：** 錯誤處理與監控

---

## 環境資訊

**環境：**
- 階段：設計階段（尚未開發）
- 影響範圍：整個後端和前端的錯誤處理架構

**相關版本：**
- 專案版本/Commit：當前 spec 版本
- 相關文件：Phase 1 所有 tech specs

---

## 問題詳細分析

### 問題 1：自動 Fallback 機制過於寬容（高風險）

**問題位置：** `tech-specs/backend/integrations.md:243-252` 和 `tech-specs/backend/business-logic.md:238-246`

**現有設計：**
```python
def generate_avatar_with_fallback(audio_url, avatar_image_url):
    try:
        return generate_avatar_video(audio_url, avatar_image_url)
    except Exception as e:
        log_error(f"Avatar generation failed: {str(e)}")
        # 降級：不使用虛擬主播,直接使用音訊 + 圖片
        return None
```

**問題點：**
- ❌ 直接吞掉所有 Exception，無法區分錯誤類型
- ❌ `log_error` 不夠明確，無法快速定位問題
- ❌ 返回 `None` 後靜默降級，前端可能完全不知道出錯了
- ❌ 沒有區分**可重試的錯誤**和**不可重試的錯誤**

**實際影響：**
- D-ID API Key 無效 → 靜默失敗 → 繼續執行 → 花很多時間才發現是 API Key 問題
- 網路暫時斷線 → 應該重試卻直接放棄 → 用戶不知道為什麼沒有虛擬主播
- 配額用盡 → 靜默失敗 → 用戶以為功能正常但就是沒有虛擬主播

---

### 問題 2：圖片生成的 Fallback 策略不明確（中風險）

**問題位置：** `tech-specs/backend/business-logic.md:102-103`

**現有設計：**
```
**部分圖片失敗：**
- 標記失敗圖片
- 提供選項：使用佔位圖 / 移除該段落
```

**問題點：**
- ❌ 「提供選項」是什麼意思？誰來決定？前端？自動？
- ❌ 如果自動使用佔位圖，用戶可能不知道有圖片失敗
- ❌ 如果自動移除段落，可能破壞腳本邏輯

---

### 問題 3：錯誤處理策略不一致（中風險）

**問題位置：** `tech-specs/backend/integrations.md` 和 `tech-specs/frontend/api-integration.md`

**後端策略：**
```python
# 429 Rate Limit：指數退避，最多 3 次
# 400 Content Policy：記錄 Prompt，嘗試修改後重試
```

**前端策略：**
```typescript
const handleApiError = (error: any) => {
  switch (status) {
    case 400:
      toast.error(data.error?.message || '請求參數錯誤')
      break
    case 500:
      toast.error('伺服器錯誤，請稍後重試')
      break
    default:
      toast.error(error.message || '發生未知錯誤')
  }
}
```

**問題點：**
- ❌ 後端重試 3 次，但前端不知道，可能過早顯示錯誤訊息
- ❌ 前端只顯示 toast，沒有記錄到日誌，調試時找不到
- ❌ 「未知錯誤」太模糊，完全無法定位

---

### 問題 4：日誌策略缺乏細節（高風險）

**問題位置：** `tech-specs/backend/overview.md:248-253`

**現有設計：**
```
**日誌配置:**
- **位置:** `logs/app.log`
- **等級:** INFO (生產), DEBUG (開發)
- **輪替:** 每日輪替,保留 30 天
- **格式:** `[時間] [等級] [模組] - 訊息`
```

**問題點：**
- ❌ 沒有定義**必須記錄什麼**（API 呼叫？參數？回應？）
- ❌ 沒有 Request ID / Trace ID，多個並行請求時無法追蹤
- ❌ 沒有結構化日誌（JSON），只有純文字，難以搜尋和分析
- ❌ 只記錄在本地檔案，沒有集中化日誌系統

**實際影響：**
- 用戶說「10 分鐘前生成失敗」→ 要在幾千行日誌中手動搜尋
- 有 3 個專案同時生成 → 日誌混在一起 → 無法區分哪個專案的錯誤

---

### 問題 5：缺少明確的錯誤碼體系（高風險）

**問題位置：** `tech-specs/backend/api-design.md:65-80`

**現有定義：**
定義了一些錯誤碼，但：
- ❌ 沒有涵蓋所有情境（例如：Redis 連線失敗、FFmpeg 執行失敗、檔案系統錯誤）
- ❌ 沒有錯誤碼的**優先級**（哪些需要立即通知？哪些可以自動重試？）
- ❌ 沒有**錯誤恢復指南**（遇到 `GEMINI_API_ERROR` 該怎麼辦？）

---

### 問題 6：缺少錯誤資訊記錄欄位（高風險）

**問題位置：** `tech-specs/backend/database.md` (Project 資料表)

**現有設計：**
Project 資料表沒有記錄詳細錯誤資訊的欄位

**問題點：**
- ❌ 前端無法顯示「為什麼失敗」和「如何解決」
- ❌ 用戶只知道「失敗了」但不知道原因
- ❌ 無法追蹤錯誤歷史

---

## 影響評估

### 影響範圍
- **功能：** 所有 API 呼叫、錯誤處理、日誌記錄、前端錯誤顯示
- **用戶：** 所有用戶（開發階段可能看不出來，但上線後會嚴重影響調試效率）
- **頻率：** 每次錯誤發生時都會遇到

### 嚴重程度
- [x] 設計缺陷（會影響整個系統的可維護性和調試能力）
- [x] 影響開發效率（難以定位問題）
- [x] 影響用戶體驗（錯誤資訊不明確）

### 是否有替代方案
- [ ] 無替代方案（必須修正設計）

---

## 根因分析

### 根本原因
**原因分類：**
- [x] Spec 定義不清楚
- [x] 設計缺陷（過於樂觀地假設錯誤可以自動恢復）
- [x] 缺少統一的錯誤處理策略

### 為什麼會有這些問題

1. **設計思維過於樂觀**：假設所有錯誤都可以通過 fallback 解決，忽略了調試和維護的需求
2. **缺少「失敗零容忍」的設計理念**：沒有強制要求明確處理每種錯誤情境
3. **日誌設計不足**：沒有考慮到多專案並行、錯誤追蹤、快速定位的需求
4. **前後端設計分離**：前後端的錯誤處理策略沒有統一規劃

---

## 解決方案

### 方案 1：全面重構錯誤處理與 Fallback 策略（建議方案）

#### 概述
取消自動 fallback，改為明確失敗 + 記錄詳細錯誤資訊 + 前端顯示恢復選項。加入結構化日誌、Trace ID、完整錯誤碼體系、錯誤恢復指南。

#### 詳細修改清單

##### 修改 1：虛擬主播生成改為嚴格模式

**檔案：** `tech-specs/backend/business-logic.md` 和 `tech-specs/backend/integrations.md`

**修改內容：**

1. **定義明確的錯誤類型**
```python
class AvatarGenerationError(Exception):
    """虛擬主播生成失敗"""
    def __init__(self, reason: str, is_retryable: bool, details: dict):
        self.reason = reason
        self.is_retryable = is_retryable
        self.details = details
```

2. **改為嚴格失敗模式**
```python
def generate_avatar_strict(audio_url, avatar_image_url):
    """
    嚴格模式：失敗時拋出異常，由呼叫者決定如何處理
    """
    try:
        return generate_avatar_video(audio_url, avatar_image_url)
    except DIDQuotaExceededError as e:
        # 配額用盡：不可重試
        raise AvatarGenerationError(
            reason="DID_QUOTA_EXCEEDED",
            is_retryable=False,
            details={
                "quota_used": e.quota_used,
                "quota_total": e.quota_total,
                "reset_date": e.reset_date
            }
        )
    except DIDAPIError as e:
        # API 錯誤：可重試
        raise AvatarGenerationError(
            reason="DID_API_ERROR",
            is_retryable=True,
            details={"status_code": e.status_code, "message": e.message}
        )
    except NetworkError as e:
        # 網路錯誤：可重試
        raise AvatarGenerationError(
            reason="NETWORK_ERROR",
            is_retryable=True,
            details={"error": str(e)}
        )
```

3. **呼叫者明確處理錯誤**
```python
try:
    avatar_video = generate_avatar_strict(audio_url, avatar_image_url)
except AvatarGenerationError as e:
    # 記錄詳細錯誤
    logger.error("Avatar generation failed", extra={
        "reason": e.reason,
        "is_retryable": e.is_retryable,
        "details": e.details,
        "project_id": project_id,
        "trace_id": trace_id
    })

    # 更新專案狀態為 FAILED，並記錄錯誤原因
    project.status = ProjectStatus.FAILED
    project.error_info = {
        "stage": "avatar_generation",
        "reason": e.reason,
        "details": e.details,
        "timestamp": datetime.utcnow().isoformat()
    }
    db.commit()

    # 透過 WebSocket 通知前端
    await websocket_manager.send_error(
        project_id=project_id,
        error_code=e.reason,
        message="虛擬主播生成失敗",
        is_retryable=e.is_retryable,
        details=e.details
    )

    # 拋出，讓整個任務失敗
    raise
```

##### 修改 2：加入結構化日誌 + Trace ID

**新增檔案：** `tech-specs/backend/logging.md`

**內容：**
```markdown
# 日誌規範

## 1. 結構化日誌

所有日誌必須使用 JSON 格式，包含以下欄位：

- `trace_id`: 追蹤 ID（每個請求唯一）
- `timestamp`: 時間戳記（ISO 8601 格式）
- `level`: 日誌等級（info, warning, error）
- `message`: 日誌訊息
- `project_id`: 專案 ID（如果相關）
- `api`: API 名稱（如果相關）
- `duration_ms`: 執行時間（毫秒）
- `error_code`: 錯誤碼（如果是錯誤）
- `details`: 額外資訊（dict）

## 2. StructuredLogger 實作

```python
import logging
import uuid
import json
from contextvars import ContextVar
from datetime import datetime

# 每個請求都有唯一的 trace_id
trace_id_var: ContextVar[str] = ContextVar('trace_id', default='')

class StructuredLogger:
    """結構化日誌記錄器"""

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)

    def log(self, level: str, message: str, **extra):
        """記錄結構化日誌"""
        trace_id = trace_id_var.get()
        log_data = {
            "trace_id": trace_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "message": message,
            **extra
        }

        # 輸出 JSON 格式
        self.logger.log(
            getattr(logging, level.upper()),
            json.dumps(log_data, ensure_ascii=False)
        )

    def error(self, message: str, **extra):
        self.log("error", message, **extra)

    def info(self, message: str, **extra):
        self.log("info", message, **extra)

    def warning(self, message: str, **extra):
        self.log("warning", message, **extra)
```

## 3. 使用範例

```python
logger = StructuredLogger(__name__)

# API 請求開始
trace_id = str(uuid.uuid4())
trace_id_var.set(trace_id)

logger.info("API request started", extra={
    "endpoint": "/api/v1/projects",
    "method": "POST",
    "project_id": project_id
})

# API 呼叫 Gemini
logger.info("Calling Gemini API", extra={
    "api": "gemini",
    "model": "gemini-1.5-flash",
    "prompt_length": len(prompt),
    "project_id": project_id
})

# 錯誤發生
logger.error("Gemini API failed", extra={
    "api": "gemini",
    "error_code": "QUOTA_EXCEEDED",
    "status_code": 429,
    "project_id": project_id,
    "retry_attempt": 2
})
```
```

**修改檔案：** `tech-specs/backend/overview.md:248-253`

替換為：參考 `logging.md` 規範

##### 修改 3：完善錯誤碼體系

**新增檔案：** `tech-specs/backend/error-codes.md`

**內容：**
```markdown
# 錯誤碼體系

## 1. Gemini API 錯誤

| 錯誤碼 | 說明 | HTTP Status | 可重試 | 恢復指南 |
|--------|------|-------------|--------|----------|
| GEMINI_QUOTA_EXCEEDED | Gemini 配額用盡 | 429 | ❌ | 等待配額重置或升級方案 |
| GEMINI_INVALID_API_KEY | API Key 無效 | 401 | ❌ | 檢查 API Key 是否正確 |
| GEMINI_RATE_LIMIT | 請求過於頻繁 | 429 | ✅ | 等待 10 秒後重試 |
| GEMINI_SERVER_ERROR | Gemini 伺服器錯誤 | 500 | ✅ | 等待 5 秒後重試 |
| GEMINI_CONTENT_POLICY | 內容違反政策 | 400 | ❌ | 修改 Prompt 內容 |
| GEMINI_TIMEOUT | 請求超時 | 504 | ✅ | 重試一次 |
| GEMINI_NETWORK_ERROR | 網路連線失敗 | 503 | ✅ | 檢查網路連線後重試 |

## 2. Stability AI 錯誤

| 錯誤碼 | 說明 | HTTP Status | 可重試 | 恢復指南 |
|--------|------|-------------|--------|----------|
| STABILITY_QUOTA_EXCEEDED | 圖片生成配額用盡 | 429 | ❌ | 等待配額重置或購買額度 |
| STABILITY_INVALID_PROMPT | Prompt 不合法 | 400 | ❌ | 修改圖片描述 |
| STABILITY_RATE_LIMIT | 請求過於頻繁 | 429 | ✅ | 指數退避重試 |
| STABILITY_CONTENT_POLICY | 違反內容政策 | 400 | ❌ | 修改圖片描述，移除敏感內容 |
| STABILITY_SERVER_ERROR | Stability AI 伺服器錯誤 | 500 | ✅ | 等待 5 秒後重試 |
| STABILITY_TIMEOUT | 圖片生成超時 | 504 | ✅ | 重試一次 |

## 3. D-ID 錯誤

| 錯誤碼 | 說明 | HTTP Status | 可重試 | 恢復指南 |
|--------|------|-------------|--------|----------|
| DID_QUOTA_EXCEEDED | 虛擬主播配額用盡 | 429 | ❌ | 等待配額重置（月度）或升級方案 |
| DID_INVALID_API_KEY | API Key 無效 | 401 | ❌ | 檢查 API Key 是否正確 |
| DID_PROCESSING_TIMEOUT | 處理超時 | 504 | ✅ | 重試一次 |
| DID_INVALID_AUDIO | 音訊檔案格式不正確 | 400 | ❌ | 檢查音訊檔案格式和大小 |
| DID_SERVER_ERROR | D-ID 伺服器錯誤 | 500 | ✅ | 等待 30 秒後重試 |

## 4. YouTube API 錯誤

| 錯誤碼 | 說明 | HTTP Status | 可重試 | 恢復指南 |
|--------|------|-------------|--------|----------|
| YOUTUBE_QUOTA_EXCEEDED | YouTube 配額用盡 | 403 | ❌ | 等待配額重置（每日）或申請增加配額 |
| YOUTUBE_INVALID_TOKEN | OAuth Token 無效 | 401 | ✅ | 使用 Refresh Token 更新 |
| YOUTUBE_TOKEN_EXPIRED | OAuth Token 過期 | 401 | ✅ | 使用 Refresh Token 更新 |
| YOUTUBE_UPLOAD_FAILED | 影片上傳失敗 | 500 | ✅ | 使用 Resumable Upload 重試 |
| YOUTUBE_VIDEO_TOO_LARGE | 影片檔案過大 | 400 | ❌ | 壓縮影片或分段上傳 |

## 5. 系統錯誤

| 錯誤碼 | 說明 | HTTP Status | 可重試 | 恢復指南 |
|--------|------|-------------|--------|----------|
| FFMPEG_EXECUTION_FAILED | FFmpeg 執行失敗 | 500 | ❌ | 檢查 FFmpeg 安裝、檔案權限、磁碟空間 |
| FFMPEG_NOT_FOUND | FFmpeg 未安裝 | 500 | ❌ | 安裝 FFmpeg |
| REDIS_CONNECTION_FAILED | Redis 連線失敗 | 500 | ✅ | 檢查 Redis 服務是否運行 |
| DATABASE_ERROR | 資料庫錯誤 | 500 | ✅ | 檢查資料庫連線 |
| FILE_SYSTEM_ERROR | 檔案系統錯誤 | 500 | ❌ | 檢查磁碟空間、權限 |
| DISK_SPACE_INSUFFICIENT | 磁碟空間不足 | 500 | ❌ | 清理磁碟空間 |
| FILE_NOT_FOUND | 檔案不存在 | 404 | ❌ | 確認檔案路徑正確 |
| CELERY_TASK_FAILED | Celery 任務失敗 | 500 | ✅ | 檢查 Celery Worker 狀態 |
| VALIDATION_ERROR | 輸入驗證錯誤 | 400 | ❌ | 檢查輸入參數 |

## 6. 錯誤優先級

### P0 - 立即通知
- API Key 無效（所有服務）
- 配額即將用盡 (< 10%)
- 資料庫連線失敗
- Redis 連線失敗
- FFmpeg 未安裝

### P1 - 重要通知
- 連續失敗 > 5 次
- 配額用盡
- 檔案系統錯誤
- 磁碟空間不足

### P2 - 一般記錄
- 單次 API 呼叫失敗（但會重試）
- 網路暫時性錯誤
- Rate Limit 觸發
```

##### 修改 4：Project 資料表加入 error_info 欄位

**修改檔案：** `tech-specs/backend/database.md`

**在 Project 資料表定義中加入：**

```sql
error_info JSON NULL DEFAULT NULL
```

**欄位說明：**
```json
{
  "stage": "assets_generating",  # 哪個階段失敗
  "error_code": "GEMINI_QUOTA_EXCEEDED",  # 錯誤碼
  "error_message": "Gemini API quota exceeded",  # 錯誤訊息
  "is_retryable": false,  # 是否可重試
  "details": {
    "api": "gemini",
    "quota_used": 1000,
    "quota_total": 1000
  },
  "timestamp": "2025-10-20T10:30:00Z",  # 錯誤發生時間
  "trace_id": "abc-123-def-456"  # 追蹤 ID
}
```

##### 修改 5：前端統一錯誤處理

**修改檔案：** `tech-specs/frontend/api-integration.md`

**加入章節：「錯誤處理統一規範」**

```typescript
// 前端錯誤處理
websocket.on('error', (error) => {
  // 顯示詳細錯誤
  toast.error(`生成失敗：${error.message}`)

  // 記錄到日誌（使用相同的 trace_id）
  logger.error("Generation failed", {
    trace_id: error.trace_id,
    error_code: error.error_code,
    details: error.details,
    project_id: projectId
  })

  // 如果可重試，顯示重試按鈕
  if (error.is_retryable) {
    showRetryButton(projectId)
  } else {
    // 不可重試，顯示原因和解決方案
    showErrorDialog({
      title: '生成失敗',
      reason: error.error_code,
      details: error.details,
      solutions: getErrorSolutions(error.error_code)
    })
  }
})

// 錯誤解決方案對照表
function getErrorSolutions(error_code: string): string[] {
  const solutions = {
    'GEMINI_QUOTA_EXCEEDED': [
      '等待配額重置（每日）',
      '升級 Gemini API 方案',
      '聯絡管理員增加配額'
    ],
    'DID_QUOTA_EXCEEDED': [
      '等待配額重置（每月 1 號）',
      '升級 D-ID 方案',
      '暫時不使用虛擬主播功能'
    ],
    'STABILITY_INVALID_PROMPT': [
      '修改圖片描述，移除敏感詞彙',
      '使用更通用的描述',
      '參考範例 Prompt'
    ],
    // ... 其他錯誤碼
  }
  return solutions[error_code] || ['聯絡技術支援']
}
```

##### 修改 6：新增錯誤監控規範

**新增檔案：** `tech-specs/backend/monitoring.md`

**內容：**
```markdown
# 錯誤監控與警報

## 1. 關鍵錯誤需立即通知

以下錯誤發生時，應立即通知開發者（透過日誌警報或 webhook）：

- **API Key 無效** → 可能是 Key 被撤銷或過期
- **配額即將用盡** (< 10%) → 避免影響正常使用
- **連續失敗 > 5 次** → 可能是系統性問題
- **資料庫連線失敗** → 嚴重的基礎設施問題
- **FFmpeg 執行失敗** → 影響所有影片生成
- **Redis 連線失敗** → 影響快取和任務佇列

## 2. 監控指標

### API 呼叫監控
- **成功率**：每個 API 的成功率（目標 > 95%）
- **回應時間**：P50, P90, P99 延遲
- **錯誤率**：每種錯誤碼的發生頻率
- **重試次數**：平均重試次數

### 系統監控
- **磁碟空間**：剩餘空間（警告 < 20%，嚴重 < 10%）
- **CPU 使用率**：平均 CPU 使用率
- **記憶體使用率**：平均記憶體使用率
- **Celery 佇列長度**：待處理任務數量

### 配額監控
- **D-ID 配額**：每日同步，警告 < 20%
- **YouTube 配額**：每小時同步，警告 < 20%
- **Gemini 配額**：每日同步，警告 < 20%
- **Stability AI 配額**：每日同步，警告 < 20%

## 3. 監控工具（可選）

### 開發階段
- **本地日誌**：結構化 JSON 日誌
- **pytest-cov**：確保錯誤處理路徑有測試覆蓋

### 生產階段（未來可擴展）
- **Sentry**：自動捕獲和聚合錯誤
- **Prometheus + Grafana**：監控 API 呼叫次數、成功率、延遲
- **ELK Stack**：集中化日誌分析

## 4. 警報規則

### 立即通知（P0）
- API Key 無效
- 資料庫/Redis 連線失敗
- 磁碟空間 < 10%
- FFmpeg 執行失敗

### 1 小時內通知（P1）
- 配額 < 10%
- 連續失敗 > 5 次
- 錯誤率 > 10%

### 每日彙總（P2）
- 配額使用量
- API 成功率統計
- 常見錯誤統計
```

#### 需要更新的 Spec 檔案清單

- [x] `tech-specs/backend/business-logic.md` - 移除自動 fallback
- [x] `tech-specs/backend/integrations.md` - 移除自動 fallback
- [x] `tech-specs/backend/overview.md` - 更新日誌規範（改為引用 logging.md）
- [x] **新增** `tech-specs/backend/logging.md` - 結構化日誌規範
- [x] **新增** `tech-specs/backend/error-codes.md` - 完整錯誤碼體系
- [x] **新增** `tech-specs/backend/monitoring.md` - 錯誤監控規範
- [x] `tech-specs/backend/database.md` - Project 資料表加入 error_info 欄位
- [x] `tech-specs/frontend/api-integration.md` - 統一錯誤處理策略

#### 優點
- ✅ **失敗零容忍**：所有錯誤都會明確記錄和通知
- ✅ **輕鬆定位錯誤**：Trace ID + 結構化日誌 + 詳細錯誤資訊
- ✅ **用戶體驗好**：明確的錯誤訊息和解決方案
- ✅ **可維護性高**：統一的錯誤處理策略
- ✅ **可擴展性好**：完整的錯誤碼體系方便未來擴展

#### 缺點
- 實作複雜度較高（需要改動多個模組）
- 需要前後端協同修改
- 開發時間較長

#### 風險評估
- **風險**：修改範圍較大，可能影響原定開發計劃
- **緩解**：在開發前就發現問題，修改 spec 後再開發，避免返工

---

### 方案 2：保持部分 Fallback，加強日誌

**不建議採用**，因為無法根本解決「失敗零容忍」的需求。

---

### 方案比較

| 項目 | 方案 1（建議） | 方案 2（不建議） |
|-----|--------------|----------------|
| 實作複雜度 | 中 | 低 |
| 修改範圍 | 大（8 個檔案） | 小（2 個檔案） |
| 失敗零容忍 | ✅ 完全符合 | ❌ 無法滿足 |
| 輕鬆定位錯誤 | ✅ 完全符合 | 🟡 部分符合 |
| 維護性 | ✅ 高 | 🟡 中 |
| 風險 | 低 | 中（未來還是要改） |

**建議採用：** 方案 1

**理由：**
1. 完全符合「失敗零容忍」和「輕鬆定位錯誤」的需求
2. 在開發前就修改 spec，避免開發後返工
3. 建立統一的錯誤處理規範，對未來維護有長遠好處
4. 雖然修改範圍較大，但都是新增或明確化現有設計，風險可控

---

## 實作計劃

### 第 1 步：更新 Spec 文件（預估 2 小時）

按照「需要更新的 Spec 檔案清單」逐一修改：

1. 新增 `tech-specs/backend/logging.md`
2. 新增 `tech-specs/backend/error-codes.md`
3. 新增 `tech-specs/backend/monitoring.md`
4. 修改 `tech-specs/backend/business-logic.md`
5. 修改 `tech-specs/backend/integrations.md`
6. 修改 `tech-specs/backend/overview.md`
7. 修改 `tech-specs/backend/database.md`
8. 修改 `tech-specs/frontend/api-integration.md`

### 第 2 步：更新 Task 文件（預估 1 小時）

檢查所有 Phase 1 task 文件，確保：
- 測試要求包含錯誤處理測試
- 實作規格遵循新的錯誤處理策略
- 日誌記錄符合結構化日誌規範

需要檢查的 task：
- Task-004: Projects API（錯誤處理）
- Task-006: System API（API Key 測試錯誤處理）
- Task-014: Celery 任務（任務失敗處理）
- Task-015: Gemini 整合（API 錯誤處理）
- Task-016: WebSocket（錯誤訊息推送）

### 第 3 步：驗證 Spec 完整性（預估 30 分鐘）

- [ ] 所有錯誤情境都有對應的錯誤碼
- [ ] 所有錯誤碼都有恢復指南
- [ ] 前後端錯誤處理策略一致
- [ ] 日誌規範清楚明確
- [ ] 資料庫 Schema 包含 error_info 欄位

### 第 4 步：Commit 並合併

```bash
git add tech-specs/ issues/
git commit -m "fix: 重構錯誤處理與 fallback 策略 [issue-001]

- 新增結構化日誌規範（logging.md）
- 新增完整錯誤碼體系（error-codes.md）
- 新增錯誤監控規範（monitoring.md）
- 移除虛擬主播自動 fallback，改為明確失敗
- Project 資料表加入 error_info 欄位
- 統一前後端錯誤處理策略

Closes #issue-001"

git push origin feature/update-phase1-plan
```

---

## 預防措施

### 為什麼會發生這個問題
1. **設計階段沒有明確「失敗零容忍」的需求**：假設錯誤可以自動恢復
2. **缺少 Spec Review 流程**：如果沒有在開發前檢查，這些問題會在開發後才發現
3. **日誌設計經驗不足**：沒有考慮到調試和追蹤的需求

### 如何避免類似問題
1. **在所有 Spec 中明確錯誤處理策略**：每個 API、每個服務都要定義錯誤處理方式
2. **建立 Spec Review Checklist**：包含錯誤處理、日誌、監控等項目
3. **參考業界最佳實踐**：結構化日誌、Trace ID、錯誤碼體系都是成熟的做法

### 需要改進的地方
- **開發流程：** 加入 Spec Review 階段（在開發前）
- **文件規範：** 建立錯誤處理的統一範本
- **設計原則：** 明確「失敗零容忍」作為核心設計理念

---

## 相關資源

### 相關 Task
- Task-001: 專案初始化（需要配置日誌）
- Task-004: Projects API（需要錯誤處理）
- Task-006: System API（需要 API Key 測試錯誤處理）
- Task-014: Celery 任務（需要任務失敗處理）
- Task-015: Gemini 整合（需要 API 錯誤處理）
- Task-016: WebSocket（需要錯誤訊息推送）

### 參考資源
- [Structured Logging Best Practices](https://www.sumologic.com/blog/structured-logging-best-practices/)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [Error Handling in Microservices](https://microservices.io/patterns/reliability/error-handling.html)
- [Sentry Error Tracking](https://sentry.io/)

---

## 時間記錄

- **發現時間：** 2025-10-20 14:00
- **開始處理：** 2025-10-20 14:30
- **預計完成：** 2025-10-20 17:30
- **預估總耗時：** 3.5 小時

---

## 檢查清單

### 問題分析
- [x] 找到所有相關的設計問題
- [x] 評估影響範圍
- [x] 確認需要修改哪些 spec

### 解決方案
- [x] 提出完整的解決方案
- [x] 列出需要修改的所有檔案
- [x] 評估實作複雜度和風險

### 實作計劃
- [x] 更新所有相關 Spec 文件
- [ ] 更新相關 Task 文件（待 Phase 1 開發時逐步更新）
- [x] 驗證 Spec 完整性
- [x] Commit 並推送

### 驗證（開發後）
- [ ] 所有 Task 的錯誤處理測試通過
- [ ] 結構化日誌正確輸出
- [ ] Trace ID 可以追蹤完整流程
- [ ] 前端可以顯示詳細錯誤資訊

---

## 解決方案實作記錄

### 已完成的修改

**新增檔案（3 個）：**
1. ✅ `tech-specs/backend/logging.md` - 結構化日誌規範
   - JSON 格式日誌
   - Trace ID 追蹤
   - StructuredLogger 實作
2. ✅ `tech-specs/backend/error-codes.md` - 完整錯誤碼體系
   - 涵蓋所有外部 API（Gemini, Stability AI, D-ID, YouTube）
   - 涵蓋系統錯誤（FFmpeg, Redis, Database）
   - 每個錯誤碼都有恢復指南和重試策略
3. ✅ `tech-specs/backend/monitoring.md` - 錯誤監控規範
   - P0/P1/P2 警報規則
   - 配額監控策略
   - 健康檢查端點

**修改檔案（5 個）：**
1. ✅ `tech-specs/backend/business-logic.md`
   - 移除虛擬主播自動 fallback
   - 改為嚴格失敗模式
2. ✅ `tech-specs/backend/integrations.md`
   - 移除 `generate_avatar_with_fallback`
   - 改用 `generate_avatar_strict`，明確拋出異常
3. ✅ `tech-specs/backend/overview.md`
   - 更新日誌架構為結構化日誌
4. ✅ `tech-specs/backend/database.md`
   - Project 資料表加入 `error_info` 欄位
   - 定義 error_info JSON 結構
5. ✅ `tech-specs/frontend/api-integration.md`
   - 統一錯誤處理策略
   - WebSocket 錯誤處理與後端一致
   - 加入錯誤解決方案對照表

**修改統計：**
- 新增行數：約 1,200 行
- 修改行數：約 150 行
- 涵蓋範圍：前後端完整錯誤處理體系

---

## 狀態更新記錄

| 日期 | 狀態 | 說明 |
|------|------|------|
| 2025-10-20 | 🔴 Open | 問題建立，待修改 Spec |
| 2025-10-20 | ✅ Resolved | Spec 修改完成，採用方案 1（全面重構錯誤處理） |

---

## 備註

這是一個在開發前就發現的設計問題，修改 spec 後可以避免大量返工。雖然修改範圍較大，但對長期維護有重大好處。

---

最後更新：2025-10-20
