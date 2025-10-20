# Celery 背景任務系統

這個項目使用 Celery 處理影片生成相關的背景任務，**所有服務會自動啟動，無需手動配置**。

## 🚀 一鍵啟動

只需要一個命令就能啟動所有服務：

```bash
cd backend
uvicorn app.main:app --reload
```

**就這樣！** 應用會自動：
1. ✅ 啟動 Redis 服務
2. ✅ 啟動 Celery Worker
3. ✅ 啟動 Celery Beat (定期任務)
4. ✅ 啟動 FastAPI 應用

## 架構概述

- **Broker & Result Backend:** Redis (自動啟動，localhost:6379)
- **任務佇列:** 3 個佇列 (video_generation, batch_processing, maintenance)
- **核心任務:** 6 個 (腳本生成、素材生成、影片渲染、封面生成、YouTube 上傳、批次處理)
- **進程管理:** 自動管理所有背景服務的生命週期

## 前置條件

### macOS / Linux

只需要安裝 Redis：

```bash
# macOS (使用 Homebrew)
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server

# CentOS/RHEL
sudo yum install redis
```

**注意：** 不需要手動啟動 Redis，應用會自動處理！

### Windows

建議使用 Docker 運行 Redis：

```bash
# 一次性啟動 Redis (會保持在背景)
docker run -d --name ytmaker-redis -p 6379:6379 redis:alpine

# 之後只需要：
uvicorn app.main:app --reload
```

## 檢查狀態

啟動後，訪問以下端點檢查服務狀態：

```bash
curl http://localhost:8000/status
```

回應範例：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "redis": {"running": true, "process": true},
      "worker": {"process": true, "alive": true},
      "beat": {"process": true, "alive": true}
    },
    "message": "所有服務正常運行"
  }
}
```

## 關閉應用

只需要 `Ctrl+C` 停止 uvicorn，所有背景服務會自動安全關閉：

```
🛑 YTMaker 正在關閉...
✓ Celery Beat 已停止
✓ Celery Worker 已停止
✓ Redis 已停止
✅ YTMaker 已安全關閉
```

## 任務列表

### 影片生成任務

1. **generate_script_task**: 生成影片腳本 (使用 Gemini API)
2. **generate_assets_task**: 生成素材 (圖片、虛擬主播)
3. **render_video_task**: 渲染影片 (使用 FFmpeg)
4. **generate_thumbnail_task**: 生成 YouTube 封面
5. **upload_to_youtube_task**: 上傳到 YouTube

### 其他任務

6. **batch_processing_task**: 批次處理多個專案
7. **sync_quotas**: 同步 API 配額 (每小時自動執行)

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

所有任務都配置了自動重試機制：

- **最多重試次數:** 3 次
- **重試策略:** 指數退避 (2秒、5秒、10秒)
- **可重試錯誤:** 503, 429, 網路逾時
- **不可重試錯誤:** 401, 400, 403

## 進度通知

任務執行時會透過 Redis Pub/Sub 發布進度：

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

## 進階配置

### 手動管理 (進階用戶)

如果你想手動控制背景服務：

```python
# 在 Python 中
from app.process_manager import process_manager

# 啟動所有服務
process_manager.start_all()

# 檢查狀態
status = process_manager.get_status()
print(status)

# 停止所有服務
process_manager.stop_all()
```

### 監控工具 (Flower)

想要圖形化監控介面？啟動 Flower：

```bash
# 先確保應用正在運行，然後在另一個終端：
celery -A app.celery_app flower --port=5555
```

訪問: http://localhost:5555

### 自定義配置

在 `.env` 中可以調整：

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

### 問題 1: Redis 連接失敗

**症狀:** 看到錯誤訊息 "啟動 Redis 失敗"

**解決方法:**

1. 確認已安裝 Redis:
   ```bash
   # macOS
   brew install redis

   # Linux
   sudo apt-get install redis-server
   ```

2. 如果使用 Windows，確保 Docker 正在運行:
   ```bash
   docker ps  # 應該看到 redis 容器
   ```

3. 檢查端口是否被佔用:
   ```bash
   lsof -i :6379  # macOS/Linux
   ```

### 問題 2: Worker 沒有處理任務

**症狀:** 任務提交後沒有執行

**解決方法:**

1. 檢查狀態端點:
   ```bash
   curl http://localhost:8000/status
   ```

2. 查看日誌，Worker 應該顯示為 "alive": true

3. 重啟應用 (Ctrl+C 然後重新啟動)

### 問題 3: 應用啟動時卡住

**症狀:** 啟動時長時間無回應

**可能原因:**
- Redis 啟動失敗
- 端口被佔用

**解決方法:**

1. 殺死佔用端口的進程:
   ```bash
   # 找出佔用 6379 端口的進程
   lsof -i :6379

   # 殺死該進程
   kill -9 <PID>
   ```

2. 手動啟動 Redis 測試:
   ```bash
   redis-server --port 6379
   ```

3. 使用 Docker 運行 Redis (最簡單):
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

### 測試背景服務

```python
# 測試 Celery 是否正常運作
from app.celery_app import debug_task

debug_task.delay()
# 檢查日誌應該看到 "Request: ..."
```

## 與舊版對比

### ❌ 舊版 (手動)
```bash
# 需要 3 個終端視窗
Terminal 1: redis-server
Terminal 2: celery -A app.celery_app worker
Terminal 3: uvicorn app.main:app
```

### ✅ 新版 (自動)
```bash
# 只需要 1 個命令
uvicorn app.main:app --reload
```

## 相關文件

- [Celery 官方文檔](https://docs.celeryproject.org/)
- [Task-014: Celery 背景任務系統](/development/phase-1/task-014.md)
- [Background Jobs Spec](/tech-specs/backend/background-jobs.md)

---

**總結:** 現在你只需要 `uvicorn app.main:app --reload` 一個命令，就能啟動完整的 YTMaker 系統！🎉
