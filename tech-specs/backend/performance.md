# 效能優化 (Performance Optimization)

## 關聯文件
- [快取策略](./caching.md)
- [資料模型](./database.md)
- [背景任務](./background-jobs.md)
- [第三方整合](./integrations.md)

---

## 8. 效能優化

### 8.1 資料庫查詢優化

#### 8.1.1 索引設計

**已建立索引：**
- `projects.status`
- `projects.created_at`
- `projects.updated_at`
- `assets.project_id`
- `assets.type`

**索引使用場景：**
```sql
-- 使用 status 索引
SELECT * FROM projects WHERE status = 'COMPLETED';

-- 使用 created_at 索引
SELECT * FROM projects ORDER BY created_at DESC LIMIT 20;

-- 使用 project_id 索引（外鍵）
SELECT * FROM assets WHERE project_id = 'uuid';

-- 組合索引使用
SELECT * FROM projects WHERE status = 'COMPLETED' ORDER BY updated_at DESC;
```

**索引維護：**
- 定期分析查詢效能（使用 EXPLAIN）
- 移除未使用的索引
- 考慮組合索引（如 `status + updated_at`）

---

#### 8.1.2 N+1 問題處理

**問題範例：**
```python
# ❌ N+1 問題
projects = db.query(Project).limit(20).all()
for project in projects:
    assets = project.assets  # 每次迴圈都會查詢一次
```

**解決方案：使用 Eager Loading**
```python
# ✅ 使用 joinedload
from sqlalchemy.orm import joinedload

projects = db.query(Project).options(
    joinedload(Project.assets)
).limit(20).all()

for project in projects:
    assets = project.assets  # 不會觸發額外查詢
```

**使用 selectinload（適合一對多關係）：**
```python
from sqlalchemy.orm import selectinload

projects = db.query(Project).options(
    selectinload(Project.assets)
).limit(20).all()
```

---

#### 8.1.3 分頁查詢

**所有列表 API 都使用分頁：**
```python
def get_projects(limit=20, offset=0):
    projects = db.query(Project).limit(limit).offset(offset).all()
    total = db.query(Project).count()
    return {"projects": projects, "total": total}
```

**優化 count 查詢：**
```python
from sqlalchemy import func

def get_projects_optimized(limit=20, offset=0):
    # 使用子查詢優化 count
    query = db.query(Project)

    projects = query.limit(limit).offset(offset).all()
    total = query.with_entities(func.count(Project.id)).scalar()

    return {"projects": projects, "total": total}
```

---

#### 8.1.4 查詢優化技巧

**只查詢需要的欄位：**
```python
# ❌ 查詢所有欄位
projects = db.query(Project).all()

# ✅ 只查詢需要的欄位
projects = db.query(
    Project.id,
    Project.name,
    Project.status,
    Project.created_at
).all()
```

**使用批次查詢：**
```python
# 批次取得多個專案
project_ids = ['uuid1', 'uuid2', 'uuid3']
projects = db.query(Project).filter(Project.id.in_(project_ids)).all()
```

---

### 8.2 非同步處理

**使用 FastAPI 的 async/await：**
```python
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

app = FastAPI()

# 非同步資料庫引擎
engine = create_async_engine('postgresql+asyncpg://...')

@app.get("/api/v1/projects")
async def list_projects(db: AsyncSession):
    async with db as session:
        result = await session.execute(
            select(Project).limit(20)
        )
        projects = result.scalars().all()
        return {"success": True, "data": projects}
```

**非同步外部 API 調用：**
```python
import httpx
import asyncio

async def fetch_multiple_quotas():
    async with httpx.AsyncClient() as client:
        # 並行調用多個 API
        tasks = [
            client.get("https://api.did.com/quota"),
            client.get("https://api.stability.ai/quota"),
        ]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]
```

---

### 8.3 檔案系統優化

#### 8.3.1 檔案儲存結構

```
data/
├── projects/
│   ├── {project_id}/
│   │   ├── content.txt
│   │   ├── script.json
│   │   ├── assets/
│   │   │   ├── audio.mp3
│   │   │   ├── images/
│   │   │   │   ├── image_01.png
│   │   │   │   └── ...
│   │   │   └── avatars/
│   │   │       ├── intro_avatar.mp4
│   │   │       └── outro_avatar.mp4
│   │   ├── output/
│   │   │   ├── final_video.mp4
│   │   │   └── thumbnail.jpg
│   │   └── logs/
│   │       └── generation.log
```

**設計原則：**
- 按專案 ID 分隔目錄
- 避免單一目錄包含過多檔案
- 使用相對路徑儲存到資料庫

---

#### 8.3.2 檔案清理策略

**定期清理：**
- 中間素材：專案完成後 7 天刪除（可配置）
- 失敗專案：30 天後刪除（可配置）

**實作：**
```python
from celery.schedules import crontab

@app.task
def cleanup_old_files():
    # 清理 7 天前完成的專案的中間素材
    cutoff_date = datetime.now() - timedelta(days=7)
    projects = db.query(Project).filter(
        Project.status == 'COMPLETED',
        Project.updated_at < cutoff_date
    ).all()

    for project in projects:
        # 刪除中間素材
        assets_path = f"data/projects/{project.id}/assets"
        if os.path.exists(assets_path):
            shutil.rmtree(assets_path)

    # 清理 30 天前失敗的專案
    cutoff_date = datetime.now() - timedelta(days=30)
    failed_projects = db.query(Project).filter(
        Project.status == 'FAILED',
        Project.updated_at < cutoff_date
    ).all()

    for project in failed_projects:
        # 刪除整個專案目錄
        project_path = f"data/projects/{project.id}"
        if os.path.exists(project_path):
            shutil.rmtree(project_path)

        # 刪除資料庫記錄
        db.delete(project)

    db.commit()

# 每天凌晨 2 點執行
app.conf.beat_schedule['cleanup-old-files'] = {
    'task': 'tasks.cleanup_old_files',
    'schedule': crontab(hour=2, minute=0),
}
```

---

#### 8.3.3 檔案讀寫優化

**使用緩衝 I/O：**
```python
# 寫入大檔案時使用緩衝
def write_large_file(file_path, data):
    with open(file_path, 'wb', buffering=8192) as f:
        f.write(data)
```

**使用記憶體映射（適合大檔案）：**
```python
import mmap

def process_large_file(file_path):
    with open(file_path, 'r+b') as f:
        with mmap.mmap(f.fileno(), 0) as mmapped_file:
            # 直接操作記憶體映射
            data = mmapped_file.read()
            return data
```

---

### 8.4 並行處理優化

#### 8.4.1 圖片生成並行

**使用 ThreadPoolExecutor：**
```python
from concurrent.futures import ThreadPoolExecutor

def generate_all_images(image_descriptions):
    results = []

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [
            executor.submit(generate_image, desc)
            for desc in image_descriptions
        ]

        for future in futures:
            results.append(future.result())

    return results
```

---

#### 8.4.2 控制並行數量

**避免過度並行：**
```python
import asyncio
from asyncio import Semaphore

async def generate_images_with_limit(prompts, max_concurrent=4):
    semaphore = Semaphore(max_concurrent)

    async def generate_with_semaphore(prompt):
        async with semaphore:
            return await generate_image_async(prompt)

    tasks = [generate_with_semaphore(p) for p in prompts]
    return await asyncio.gather(*tasks)
```

---

### 8.5 記憶體優化

#### 8.5.1 生成器模式

**處理大量資料時使用生成器：**
```python
# ❌ 一次載入所有專案到記憶體
projects = db.query(Project).all()
for project in projects:
    process(project)

# ✅ 使用生成器
def iter_projects(batch_size=100):
    offset = 0
    while True:
        projects = db.query(Project).limit(batch_size).offset(offset).all()
        if not projects:
            break
        for project in projects:
            yield project
        offset += batch_size

for project in iter_projects():
    process(project)
```

---

#### 8.5.2 及時釋放資源

**處理完大檔案後立即關閉：**
```python
import gc

def process_video(video_path):
    # 載入影片
    video = load_video(video_path)

    # 處理
    result = process(video)

    # 立即釋放記憶體
    del video
    gc.collect()

    return result
```

---

### 8.6 效能監控

#### 8.6.1 API 響應時間監控

**使用 middleware 記錄響應時間：**
```python
import time
from fastapi import Request

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)

    # 記錄慢查詢
    if process_time > 1.0:
        log_slow_request(request.url, process_time)

    return response
```

---

#### 8.6.2 資料庫查詢監控

**使用 SQLAlchemy 事件記錄慢查詢：**
```python
from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    context._query_start_time = time.time()

@event.listens_for(Engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total_time = time.time() - context._query_start_time

    if total_time > 0.5:  # 超過 0.5 秒
        log_slow_query(statement, total_time)
```
