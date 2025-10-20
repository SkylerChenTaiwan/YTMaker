# Celery 背景任務系統

這個項目使用 Celery 處理影片生成相關的背景任務。

## 架構概述

- **Broker & Result Backend:** Redis (localhost:6379/0)
- **任務佇列:** 3 個佇列 (video_generation, batch_processing, maintenance)
- **核心任務:** 6 個 (腳本生成、素材生成、影片渲染、封面生成、YouTube 上傳、批次處理)

## 前置條件

1. **Redis 服務運行中**
   ```bash
   # 使用 Docker 運行 Redis
   docker run -d -p 6379:6379 redis:7-alpine

   # 或使用 Homebrew
   brew services start redis
   ```

2. **安裝依賴**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

## 啟動 Celery

### 1. 啟動 Worker

**啟動所有佇列:**
```bash
celery -A app.celery_app worker --loglevel=info
```

**啟動特定佇列 (建議用於生產環境):**
```bash
# 影片生成 Worker (並行度 2)
celery -A app.celery_app worker -Q video_generation -c 2 --loglevel=info

# 批次處理 Worker (並行度 1)
celery -A app.celery_app worker -Q batch_processing -c 1 --loglevel=info

# 維護任務 Worker (並行度 1)
celery -A app.celery_app worker -Q maintenance -c 1 --loglevel=info
```

### 2. 啟動 Beat (定期任務)

```bash
celery -A app.celery_app beat --loglevel=info
```

### 3. 啟動 Flower (監控工具)

```bash
celery -A app.celery_app flower --port=5555
```

訪問: http://localhost:5555

## 任務列表

### 影片生成任務

1. **generate_script_task**: 生成影片腳本 (使用 Gemini API)
2. **generate_assets_task**: 生成素材 (圖片、虛擬主播)
3. **render_video_task**: 渲染影片 (使用 FFmpeg)
4. **generate_thumbnail_task**: 生成 YouTube 封面
5. **upload_to_youtube_task**: 上傳到 YouTube

### 其他任務

6. **batch_processing_task**: 批次處理多個專案
7. **sync_quotas**: 同步 API 配額 (每小時執行)

## 使用範例

### 1. 調用單一任務

```python
from app.tasks import generate_script_task

# 異步調用
task = generate_script_task.delay(project_id=1)

# 取得任務 ID
task_id = task.id

# 取得結果 (阻塞)
result = task.get(timeout=60)
```

### 2. 任務鏈 (完整影片生成流程)

```python
from celery import chain
from app.tasks import (
    generate_script_task,
    generate_assets_task,
    render_video_task,
    generate_thumbnail_task,
    upload_to_youtube_task,
)

# 建立任務鏈
video_chain = chain(
    generate_script_task.s(project_id=1),
    generate_assets_task.s(),
    render_video_task.s(),
    generate_thumbnail_task.s(),
    upload_to_youtube_task.s()
)

# 執行
result = video_chain.apply_async()
final_result = result.get(timeout=1800)  # 最多 30 分鐘
```

### 3. 批次處理

```python
from app.tasks import batch_processing_task

# 處理整個批次
task = batch_processing_task.delay(batch_id=1)
result = task.get(timeout=5400)  # 最多 90 分鐘
```

### 4. 訂閱進度更新

```python
from app.tasks import subscribe_progress

# 訂閱專案進度
for progress in subscribe_progress(project_id=1):
    print(f"Stage: {progress['stage']}")
    print(f"Progress: {progress['progress']}%")
    print(f"Message: {progress['message']}")

    if progress['progress'] == 100:
        break
```

## 錯誤處理與重試

所有任務都配置了自動重試機制:

- **最多重試次數:** 3 次
- **重試策略:** 指數退避 (2秒、5秒、10秒)
- **可重試錯誤:** 503, 429, 網路逾時
- **不可重試錯誤:** 401, 400, 403

## 進度通知

任務執行時會透過 Redis Pub/Sub 發布進度:

- **Channel:** `progress:{project_id}`
- **格式:** JSON
  ```json
  {
    "project_id": 1,
    "stage": "script_generation",
    "progress": 50,
    "message": "調用 Gemini API...",
    "timestamp": "2025-10-19T10:00:15Z"
  }
  ```

## 狀態持久化

任務狀態會儲存到 `data/projects/{project_id}/project_state.json`，支援斷點續傳。

## 監控指標

在 Flower (http://localhost:5555) 可查看:

- 任務成功率
- 平均執行時間
- 佇列長度
- Worker 狀態 (CPU, Memory)

## 環境變數

在 `.env` 中配置:

```env
# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

## 疑難排解

### Redis 連接失敗

```bash
# 確認 Redis 運行
redis-cli ping  # 應回傳 PONG

# 檢查端口
lsof -i :6379
```

### 任務沒有執行

1. 確認 Worker 運行中
2. 檢查任務路由配置
3. 查看 Flower 確認佇列狀態

### 測試任務

```python
from app.celery_app import debug_task

# 測試 Celery 是否正常運作
debug_task.delay()
```

## 相關文件

- [Celery 官方文檔](https://docs.celeryproject.org/)
- [Task-014: Celery 背景任務系統](/development/phase-1/task-014.md)
- [Background Jobs Spec](/tech-specs/backend/background-jobs.md)
