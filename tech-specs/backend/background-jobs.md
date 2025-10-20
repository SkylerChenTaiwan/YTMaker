# 背景任務 (Background Jobs)

## 關聯文件
- [業務邏輯](./business-logic.md)
- [API 設計 - 專案管理](./api-projects.md)
- [API 設計 - 批次處理](./api-batch.md)
- [第三方整合](./integrations.md)

---

## 6. 背景任務

### 6.1 任務佇列架構

**任務佇列：** Celery
**訊息代理：** Redis
**結果後端：** Redis

**架構圖：**
```
FastAPI Application
    ↓
Celery Worker Pool
    ↓
Redis (Message Broker & Result Backend)
    ↓
Task Execution (Video Generation, Batch Processing, etc.)
```

**Celery 配置：**
```python
# celery_config.py
broker_url = 'redis://localhost:6379/0'
result_backend = 'redis://localhost:6379/0'
task_serializer = 'json'
result_serializer = 'json'
accept_content = ['json']
timezone = 'Asia/Taipei'
enable_utc = True

# Worker 並行設定
worker_concurrency = 4  # 4 個並行 worker
worker_prefetch_multiplier = 1  # 每次只取 1 個任務
```

---

### 6.2 任務列表

#### 6.2.1 影片生成任務

**任務名稱：** `tasks.generate_video`

**輸入：** `project_id`

**流程：**
1. 腳本生成（`tasks.generate_script`）
2. 素材生成（並行）
   - 語音合成（`tasks.generate_audio`）
   - 圖片生成（`tasks.generate_images`）
   - 虛擬主播生成（`tasks.generate_avatar`）
3. 影片渲染（`tasks.render_video`）
4. 封面生成（`tasks.generate_thumbnail`）
5. YouTube 上傳（`tasks.upload_to_youtube`）

**重試機制：**
- 最多 3 次重試
- 指數退避：2秒、5秒、10秒

**失敗處理：**
- 記錄錯誤日誌
- 更新專案狀態為 `FAILED`
- 發送錯誤通知（WebSocket）

**任務實作範例：**
```python
from celery import Celery, group
from celery.exceptions import Retry

app = Celery('ytmaker')

@app.task(bind=True, max_retries=3)
def generate_video(self, project_id):
    try:
        # 步驟 1: 腳本生成
        generate_script(project_id)

        # 步驟 2: 並行生成素材
        asset_tasks = group([
            generate_audio.s(project_id),
            generate_images.s(project_id),
            generate_avatar.s(project_id)
        ])
        asset_results = asset_tasks.apply_async()
        asset_results.get()  # 等待所有素材生成完成

        # 步驟 3: 渲染影片
        render_video(project_id)

        # 步驟 4: 生成封面
        generate_thumbnail(project_id)

        # 步驟 5: 上傳到 YouTube
        upload_to_youtube(project_id)

        # 更新狀態
        update_project_status(project_id, 'COMPLETED')

    except Exception as e:
        # 重試邏輯
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=2 ** self.request.retries)
        else:
            # 標記失敗
            update_project_status(project_id, 'FAILED')
            log_error(project_id, str(e))
            raise
```

---

#### 6.2.2 批次處理任務

**任務名稱：** `tasks.process_batch`

**輸入：** `batch_id`

**流程：**
1. 取得批次任務的所有專案
2. 依序執行 `tasks.generate_video`
3. 更新批次任務進度

**實作範例：**
```python
@app.task
def process_batch(batch_id):
    batch = db.query(BatchTask).get(batch_id)
    projects = batch.projects

    for project in projects:
        try:
            # 執行影片生成
            generate_video.delay(project.id)

            # 等待完成
            while project.status not in ['COMPLETED', 'FAILED']:
                time.sleep(5)
                db.refresh(project)

            # 更新批次進度
            if project.status == 'COMPLETED':
                batch.completed_projects += 1
            else:
                batch.failed_projects += 1

            db.commit()

        except Exception as e:
            batch.failed_projects += 1
            db.commit()
            log_error(batch_id, f"Project {project.id} failed: {str(e)}")

    # 更新批次狀態
    batch.status = 'COMPLETED'
    db.commit()
```

---

#### 6.2.3 配額同步任務

**任務名稱：** `tasks.sync_quotas`

**排程：** 每小時執行一次

**流程：**
1. 調用外部 API 取得配額使用情況
2. 更新快取
3. 若配額 < 10%，發送警告通知

**實作範例：**
```python
from celery.schedules import crontab

# 定期任務配置
app.conf.beat_schedule = {
    'sync-quotas-every-hour': {
        'task': 'tasks.sync_quotas',
        'schedule': crontab(minute=0),  # 每小時執行
    },
}

@app.task
def sync_quotas():
    # 同步 D-ID 配額
    did_quota = did_api.get_quota()
    redis.setex('quota:did', 3600, json.dumps(did_quota))

    # 同步 YouTube 配額
    youtube_quota = youtube_api.get_quota()
    redis.setex('quota:youtube', 3600, json.dumps(youtube_quota))

    # 檢查配額警告
    if did_quota['used'] / did_quota['total'] > 0.9:
        send_notification('D-ID 配額即將用盡，剩餘 {}%'.format(
            (1 - did_quota['used'] / did_quota['total']) * 100
        ))

    if youtube_quota['used'] / youtube_quota['total'] > 0.9:
        send_notification('YouTube 配額即將用盡，剩餘 {}%'.format(
            (1 - youtube_quota['used'] / youtube_quota['total']) * 100
        ))
```

---

### 6.3 任務監控

**工具：** Flower（Celery 監控工具）

**功能：**
- 查看任務狀態
- 查看任務執行時間
- 查看任務失敗原因
- 重試失敗任務

**啟動 Flower：**
```bash
celery -A app.celery_app flower --port=5555
```

**訪問：** `http://localhost:5555`

**監控指標：**
- 任務成功率
- 平均執行時間
- 佇列長度
- Worker 狀態

---

### 6.4 任務優先級

**優先級設定：**
```python
# 高優先級（立即執行）
generate_video.apply_async(args=[project_id], priority=9)

# 中優先級（正常執行）
process_batch.apply_async(args=[batch_id], priority=5)

# 低優先級（背景執行）
sync_quotas.apply_async(priority=1)
```

**佇列分離：**
```python
# 使用不同佇列處理不同類型任務
app.conf.task_routes = {
    'tasks.generate_video': {'queue': 'video_generation'},
    'tasks.process_batch': {'queue': 'batch_processing'},
    'tasks.sync_quotas': {'queue': 'maintenance'},
}
```

**啟動專用 Worker：**
```bash
# 處理影片生成
celery -A app.celery_app worker -Q video_generation -c 2

# 處理批次任務
celery -A app.celery_app worker -Q batch_processing -c 1

# 處理維護任務
celery -A app.celery_app worker -Q maintenance -c 1
```
