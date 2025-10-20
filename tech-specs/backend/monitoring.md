# 後端錯誤監控與警報

> **版本：** 1.0
> **最後更新：** 2025-10-20
> **狀態：** ✅ Approved

---

## 目錄

1. [關鍵錯誤立即通知](#1-關鍵錯誤立即通知)
2. [監控指標](#2-監控指標)
3. [警報規則](#3-警報規則)
4. [監控工具](#4-監控工具)
5. [配額監控](#5-配額監控)
6. [健康檢查](#6-健康檢查)

---

## 1. 關鍵錯誤立即通知

### 1.1 P0 級錯誤（立即處理）

以下錯誤發生時，應**立即通知開發者**（透過日誌警報、Email 或 Webhook）：

| 錯誤類型 | 錯誤碼 | 影響 | 處理時間 |
|---------|--------|------|----------|
| **API Key 無效** | `*_INVALID_API_KEY` | 所有相關功能不可用 | 立即 |
| **配額即將用盡** | `*_QUOTA_EXCEEDED` (< 10%) | 即將無法使用服務 | 1 小時內 |
| **連續失敗** | 任何 API | 可能是系統性問題 | 30 分鐘內 |
| **資料庫連線失敗** | `DATABASE_CONNECTION_FAILED` | 整個系統不可用 | 立即 |
| **Redis 連線失敗** | `REDIS_CONNECTION_FAILED` | 快取和任務佇列不可用 | 立即 |
| **FFmpeg 未安裝** | `FFMPEG_NOT_FOUND` | 所有影片生成失敗 | 立即 |
| **Celery Worker 停止** | `CELERY_WORKER_DOWN` | 所有背景任務停止 | 立即 |
| **磁碟空間不足** | `DISK_SPACE_INSUFFICIENT` (< 10%) | 無法生成新影片 | 1 小時內 |

### 1.2 通知方式

**開發階段：**
- 輸出到控制台（console）
- 記錄到日誌檔案（ERROR 級別）
- 在 WebSocket 推送錯誤訊息

**生產階段（未來可擴展）：**
- Email 通知開發團隊
- Slack/Discord Webhook
- Sentry 自動建立 Issue
- PagerDuty 警報（24/7 監控）

---

## 2. 監控指標

### 2.1 API 呼叫監控

#### Gemini API

| 指標 | 計算方式 | 目標值 | 警告閾值 |
|------|---------|--------|----------|
| **成功率** | 成功次數 / 總次數 | > 95% | < 90% |
| **P50 延遲** | 50% 請求的回應時間 | < 2 秒 | > 5 秒 |
| **P90 延遲** | 90% 請求的回應時間 | < 5 秒 | > 10 秒 |
| **P99 延遲** | 99% 請求的回應時間 | < 10 秒 | > 20 秒 |
| **錯誤率** | 錯誤次數 / 總次數 | < 5% | > 10% |
| **平均重試次數** | 總重試次數 / 總請求次數 | < 0.5 | > 1.0 |

#### Stability AI

| 指標 | 計算方式 | 目標值 | 警告閾值 |
|------|---------|--------|----------|
| **成功率** | 成功次數 / 總次數 | > 90% | < 85% |
| **P50 延遲** | 50% 請求的回應時間 | < 5 秒 | > 10 秒 |
| **P90 延遲** | 90% 請求的回應時間 | < 15 秒 | > 30 秒 |
| **錯誤率** | 錯誤次數 / 總次數 | < 10% | > 15% |
| **部分失敗率** | 部分失敗次數 / 總次數 | < 5% | > 10% |

#### D-ID

| 指標 | 計算方式 | 目標值 | 警告閾值 |
|------|---------|--------|----------|
| **成功率** | 成功次數 / 總次數 | > 90% | < 85% |
| **P50 延遲** | 50% 請求的回應時間 | < 45 秒 | > 90 秒 |
| **P90 延遲** | 90% 請求的回應時間 | < 90 秒 | > 120 秒 |
| **超時率** | 超時次數 / 總次數 | < 5% | > 10% |

#### YouTube API

| 指標 | 計算方式 | 目標值 | 警告閾值 |
|------|---------|--------|----------|
| **上傳成功率** | 成功次數 / 總次數 | > 95% | < 90% |
| **平均上傳時間** | 總上傳時間 / 總次數 | < 5 分鐘 | > 10 分鐘 |
| **Token 刷新成功率** | 成功次數 / 總次數 | > 99% | < 95% |

### 2.2 系統監控

| 指標 | 目標值 | 警告閾值 | 嚴重閾值 |
|------|--------|----------|----------|
| **磁碟空間剩餘** | > 50% | < 20% | < 10% |
| **CPU 使用率** | < 70% | > 80% | > 90% |
| **記憶體使用率** | < 70% | > 80% | > 90% |
| **Celery 佇列長度** | < 10 | > 50 | > 100 |
| **資料庫連線數** | < 50 | > 80 | > 95 |

### 2.3 業務監控

| 指標 | 計算方式 | 目標值 | 警告閾值 |
|------|---------|--------|----------|
| **專案成功率** | 成功專案 / 總專案 | > 90% | < 80% |
| **平均生成時間** | 總生成時間 / 總專案數 | < 10 分鐘 | > 20 分鐘 |
| **每日活躍用戶** | 當日有操作的用戶數 | - | 連續 3 日下降 > 20% |

---

## 3. 警報規則

### 3.1 立即通知（P0）

**觸發條件：**
- API Key 無效（任何服務）
- 資料庫連線失敗
- Redis 連線失敗
- FFmpeg 未安裝或執行失敗
- Celery Worker 停止運行
- 磁碟空間 < 10%
- 連續失敗 > 10 次（任何 API）

**通知方式：**
- ✅ 即時推送（Email/Slack/Webhook）
- ✅ 記錄 ERROR 級別日誌
- ✅ 自動建立 incident（生產環境）

**範例日誌：**
```json
{
  "trace_id": "alert-001",
  "timestamp": "2025-10-20T10:30:15.123Z",
  "level": "error",
  "message": "P0 Alert: API Key Invalid",
  "alert_priority": "P0",
  "error_code": "GEMINI_INVALID_API_KEY",
  "details": {
    "service": "gemini",
    "action_required": "Check GEMINI_API_KEY in environment variables"
  }
}
```

---

### 3.2 1 小時內通知（P1）

**觸發條件：**
- 配額 < 10%（任何服務）
- 連續失敗 > 5 次但 < 10 次
- API 錯誤率 > 10%
- 專案成功率 < 80%
- Celery 佇列長度 > 50

**通知方式：**
- ✅ 每小時彙總通知
- ✅ 記錄 WARNING 級別日誌
- ✅ 在監控儀表板顯示

**範例日誌：**
```json
{
  "trace_id": "alert-002",
  "timestamp": "2025-10-20T10:30:15.123Z",
  "level": "warning",
  "message": "P1 Alert: Quota Low",
  "alert_priority": "P1",
  "details": {
    "service": "d-id",
    "quota_remaining": 8,
    "quota_total": 100,
    "quota_percentage": 8,
    "reset_date": "2025-11-01T00:00:00Z"
  }
}
```

---

### 3.3 每日彙總（P2）

**觸發條件：**
- 配額使用量統計
- API 成功率統計
- 常見錯誤統計
- 系統效能報告

**通知方式：**
- ✅ 每日彙總 Email
- ✅ 記錄 INFO 級別日誌
- ✅ 生成報表

**範例日誌：**
```json
{
  "timestamp": "2025-10-20T23:59:59.999Z",
  "level": "info",
  "message": "Daily Summary Report",
  "report_type": "daily_summary",
  "date": "2025-10-20",
  "statistics": {
    "total_projects": 50,
    "successful_projects": 47,
    "failed_projects": 3,
    "success_rate": 94,
    "average_duration_minutes": 8.5,
    "api_calls": {
      "gemini": {
        "total": 50,
        "success": 49,
        "failed": 1,
        "success_rate": 98
      },
      "stability": {
        "total": 250,
        "success": 235,
        "failed": 15,
        "success_rate": 94
      },
      "d-id": {
        "total": 48,
        "success": 47,
        "failed": 1,
        "success_rate": 98
      }
    },
    "quota_usage": {
      "gemini": {"used": 49, "total": 1000, "percentage": 4.9},
      "stability": {"used": 235, "total": 1000, "percentage": 23.5},
      "d-id": {"used": 47, "total": 100, "percentage": 47},
      "youtube": {"used": 6400, "total": 10000, "percentage": 64}
    }
  }
}
```

---

## 4. 監控工具

### 4.1 開發階段（Phase 1）

**必須實作：**

1. **結構化日誌**
   - ✅ 使用 `StructuredLogger`
   - ✅ 輸出 JSON 格式
   - ✅ 包含 trace_id

2. **本地日誌檔案**
   - ✅ 位置：`logs/app.log`
   - ✅ 輪替：每日輪替，保留 30 天
   - ✅ 可使用 `jq` 搜尋和分析

3. **健康檢查端點**
   - ✅ `GET /api/v1/system/health`
   - ✅ 檢查資料庫、Redis、磁碟空間
   - ✅ 返回系統狀態

4. **配額檢查端點**
   - ✅ `GET /api/v1/system/quota`
   - ✅ 返回各服務的配額使用情況

### 4.2 生產階段（未來可擴展）

**建議工具：**

1. **Sentry**
   - 自動捕獲和聚合錯誤
   - 錯誤趨勢分析
   - 自動建立 Issue

2. **Prometheus + Grafana**
   - 監控 API 呼叫次數、成功率、延遲
   - 視覺化儀表板
   - 自訂警報規則

3. **ELK Stack (Elasticsearch + Logstash + Kibana)**
   - 集中化日誌管理
   - 全文搜尋
   - 日誌視覺化分析

4. **Uptime Monitoring**
   - Pingdom / UptimeRobot
   - 監控服務可用性
   - 外部健康檢查

---

## 5. 配額監控

### 5.1 配額追蹤

**實作方式：**

```python
from app.utils.logging import StructuredLogger
from app.models.system import QuotaUsage

logger = StructuredLogger(__name__)

class QuotaMonitor:
    """配額監控"""

    def __init__(self):
        self.thresholds = {
            "warning": 0.8,   # 80%
            "critical": 0.9   # 90%
        }

    async def check_quota(self, service: str, used: int, total: int):
        """檢查配額使用情況"""
        percentage = used / total

        if percentage >= self.thresholds["critical"]:
            # 嚴重警告
            logger.error("Quota critical", extra={
                "alert_priority": "P1",
                "service": service,
                "quota_used": used,
                "quota_total": total,
                "quota_percentage": percentage * 100
            })

        elif percentage >= self.thresholds["warning"]:
            # 一般警告
            logger.warning("Quota warning", extra={
                "alert_priority": "P2",
                "service": service,
                "quota_used": used,
                "quota_total": total,
                "quota_percentage": percentage * 100
            })

        # 記錄到資料庫
        await QuotaUsage.create(
            service=service,
            used=used,
            total=total,
            percentage=percentage,
            timestamp=datetime.utcnow()
        )
```

### 5.2 配額重置時間

| 服務 | 重置週期 | 重置時間 | 監控頻率 |
|------|---------|---------|----------|
| **Gemini** | 每日 | 00:00 UTC | 每小時 |
| **Stability AI** | 按用量計費 | - | 每小時 |
| **D-ID** | 每月 | 每月 1 號 00:00 UTC | 每小時 |
| **YouTube** | 每日 | 00:00 PST | 每 15 分鐘 |

### 5.3 配額儀表板

**API 端點：** `GET /api/v1/system/quota`

**回應格式：**
```json
{
  "timestamp": "2025-10-20T10:30:15.123Z",
  "quotas": {
    "gemini": {
      "used": 450,
      "total": 1000,
      "percentage": 45,
      "reset_date": "2025-10-21T00:00:00Z",
      "status": "healthy"
    },
    "stability": {
      "used": 680,
      "total": 1000,
      "percentage": 68,
      "status": "healthy"
    },
    "d_id": {
      "used": 85,
      "total": 100,
      "percentage": 85,
      "reset_date": "2025-11-01T00:00:00Z",
      "status": "warning"
    },
    "youtube": {
      "used": 8500,
      "total": 10000,
      "percentage": 85,
      "reset_date": "2025-10-21T08:00:00Z",
      "status": "warning"
    }
  }
}
```

**狀態定義：**
- `healthy`: < 80%
- `warning`: 80% - 90%
- `critical`: > 90%
- `exceeded`: 100%

---

## 6. 健康檢查

### 6.1 系統健康檢查

**API 端點：** `GET /api/v1/system/health`

**檢查項目：**
1. 資料庫連線
2. Redis 連線
3. Celery Worker 狀態
4. 磁碟空間
5. FFmpeg 可用性

**回應格式：**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T10:30:15.123Z",
  "checks": {
    "database": {
      "status": "healthy",
      "latency_ms": 5
    },
    "redis": {
      "status": "healthy",
      "latency_ms": 2
    },
    "celery": {
      "status": "healthy",
      "active_workers": 4,
      "pending_tasks": 3
    },
    "disk": {
      "status": "healthy",
      "free_gb": 150,
      "total_gb": 500,
      "percentage_used": 70
    },
    "ffmpeg": {
      "status": "healthy",
      "version": "4.4.2"
    }
  }
}
```

**狀態定義：**
- `healthy`: 所有檢查通過
- `degraded`: 部分服務異常但不影響核心功能
- `unhealthy`: 核心服務不可用

### 6.2 實作範例

```python
from fastapi import APIRouter
from app.utils.health_check import HealthChecker

router = APIRouter()
health_checker = HealthChecker()

@router.get("/api/v1/system/health")
async def health_check():
    """系統健康檢查"""
    checks = {
        "database": await health_checker.check_database(),
        "redis": await health_checker.check_redis(),
        "celery": await health_checker.check_celery(),
        "disk": await health_checker.check_disk_space(),
        "ffmpeg": await health_checker.check_ffmpeg()
    }

    # 判斷整體狀態
    overall_status = "healthy"
    if any(c["status"] == "unhealthy" for c in checks.values()):
        overall_status = "unhealthy"
    elif any(c["status"] == "degraded" for c in checks.values()):
        overall_status = "degraded"

    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "checks": checks
    }
```

---

## 7. 監控最佳實踐

### 7.1 DO ✅

- ✅ 所有關鍵操作都記錄開始和結束
- ✅ 所有外部 API 呼叫都記錄執行時間
- ✅ 配額使用情況每小時檢查一次
- ✅ 錯誤率每 15 分鐘計算一次
- ✅ 健康檢查端點定期執行（每 5 分鐘）
- ✅ 磁碟空間每小時檢查一次
- ✅ 設定合理的警報閾值（避免過多誤報）

### 7.2 DON'T ❌

- ❌ 不要忽略警告訊息
- ❌ 不要設定過於寬鬆的閾值
- ❌ 不要在沒有通知機制的情況下上線
- ❌ 不要記錄過多無用資訊（日誌爆炸）
- ❌ 不要只監控成功情況，忽略錯誤

---

## 8. 測試建議

### 8.1 監控測試

```python
import pytest
from app.monitoring.quota import QuotaMonitor

@pytest.mark.asyncio
async def test_quota_warning(caplog):
    """測試配額警告"""
    monitor = QuotaMonitor()

    # 模擬配額使用 85%
    await monitor.check_quota("gemini", 850, 1000)

    # 驗證警告日誌
    assert any("Quota warning" in record.message for record in caplog.records)

@pytest.mark.asyncio
async def test_quota_critical(caplog):
    """測試配額嚴重警告"""
    monitor = QuotaMonitor()

    # 模擬配額使用 95%
    await monitor.check_quota("d-id", 95, 100)

    # 驗證錯誤日誌
    assert any("Quota critical" in record.message for record in caplog.records)
```

---

**最後更新：** 2025-10-20
**維護者：** Backend Team
