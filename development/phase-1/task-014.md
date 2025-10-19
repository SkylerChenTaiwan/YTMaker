# Task-014: Celery 背景任務系統

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 14 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 技術規格
- **背景任務：** `tech-specs/backend/background-jobs.md`
- **業務邏輯：** `tech-specs/backend/business-logic.md`

### 相關任務
- **前置任務:** Task-010 ✅ (Gemini), Task-011 ✅ (Stability AI), Task-012 ✅ (D-ID), Task-013 ✅ (YouTube)
- **後續任務:** Task-016 (WebSocket 進度), Task-024 (進度監控頁面)

---

## 任務目標

### 簡述
實作 6 個 Celery 任務、任務鏈、進度管理、錯誤處理、狀態持久化。

### 成功標準
- [x] 6 個 Celery 任務全部實作
- [x] 任務鏈定義完成
- [x] 進度更新機制（Redis Pub/Sub）完成
- [x] 錯誤處理與自動重試完成
- [x] 任務狀態持久化完成
- [x] 單元測試完成

---

## 6 個 Celery 任務

### 1. generate_script_task
- 調用 GeminiClient 生成腳本
- 驗證腳本結構和段落時長
- 更新專案狀態

### 2. generate_assets_task
- 並行生成：語音、圖片、虛擬主播
- 使用 asyncio 並行處理
- 更新進度到 Redis

### 3. render_video_task
- 調用 FFmpeg 渲染影片
- 合成所有素材
- 燒錄字幕和效果

### 4. generate_thumbnail_task
- 基於第一張圖片生成封面
- 添加標題和 Logo

### 5. upload_to_youtube_task
- 上傳影片和封面
- 設定 metadata
- 支援排程發布

### 6. batch_processing_task
- 批次處理多個專案
- 依序執行生成流程

---

## 任務鏈定義

```python
from celery import chain

video_generation_chain = chain(
    generate_script_task.s(project_id),
    generate_assets_task.s(),
    render_video_task.s(),
    generate_thumbnail_task.s(),
    upload_to_youtube_task.s()
)

video_generation_chain.apply_async()
```

---

## 進度更新機制

### Redis Pub/Sub
```python
import redis

async def update_progress(project_id: int, stage: str, progress: int):
    """
    發布進度更新到 Redis

    Channel: progress:{project_id}
    Message: {"stage": "...", "progress": 45, "message": "..."}
    """
    redis_client.publish(
        f"progress:{project_id}",
        json.dumps({
            "stage": stage,
            "progress": progress,
            "timestamp": datetime.utcnow().isoformat()
        })
    )
```

---

## 完成檢查清單

- [ ] 6 個 Celery 任務實作完成
- [ ] 任務鏈定義完成
- [ ] 進度更新機制完成
- [ ] 錯誤處理完成
- [ ] 狀態持久化完成
- [ ] 單元測試完成
