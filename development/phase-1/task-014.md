# [v] Task-014: Celery 背景任務系統

> **建立日期:** 2025-10-19
> **狀態:** ✅ 已完成
> **預計時間:** 14 小時
> **實際時間:** ~8 小時
> **優先級:** P0 (必須)
> **完成日期:** 2025-10-21

---

## 關聯文件

### 產品設計
- **User Flow:** `product-design/flows.md#Flow-1-基本影片生成流程`
- **User Flow:** `product-design/flows.md#Flow-5-批次處理流程`

### 技術規格
- **背景任務:** `tech-specs/backend/background-jobs.md`
- **業務邏輯:** `tech-specs/backend/business-logic.md#3.1-腳本生成邏輯`
- **業務邏輯:** `tech-specs/backend/business-logic.md#3.2-素材生成邏輯`
- **業務邏輯:** `tech-specs/backend/business-logic.md#3.3-影片渲染邏輯`
- **業務邏輯:** `tech-specs/backend/business-logic.md#3.4-封面生成邏輯`
- **業務邏輯:** `tech-specs/backend/business-logic.md#3.5-YouTube-上傳邏輯`
- **第三方整合:** `tech-specs/backend/integrations.md`
- **資料模型:** `tech-specs/backend/database.md#2.1.1-Project`
- **資料模型:** `tech-specs/backend/database.md#2.1.5-Asset`

### 相關任務
- **前置任務:** Task-010 ✅ (Gemini), Task-011 ✅ (Stability AI), Task-012 ✅ (D-ID), Task-013 ✅ (YouTube)
- **後續任務:** Task-016 (WebSocket 進度), Task-024 (進度監控頁面)
- **並行任務:** Task-015 (影片渲染服務)

---

## 任務目標

### 簡述
實作完整的 Celery 背景任務系統，包含 6 個核心任務、任務鏈編排、進度管理機制、錯誤處理與自動重試、任務狀態持久化,以及 Redis Pub/Sub 進度通知機制。

### 成功標準
- [x] Celery 應用配置完成並可正常運行
- [x] 6 個核心任務全部實作完成
  - [x] generate_script_task（腳本生成）
  - [x] generate_assets_task（素材生成）
  - [x] render_video_task（影片渲染）
  - [x] generate_thumbnail_task（封面生成）
  - [x] upload_to_youtube_task（YouTube 上傳）
  - [x] batch_processing_task（批次處理）
- [x] 任務鏈（Chain）定義完成並可串聯執行
- [x] 進度更新機制（Redis Pub/Sub）完成
- [x] 錯誤處理與自動重試機制完整
- [x] 任務狀態持久化（project_state.json）完成
- [ ] 單元測試覆蓋率 > 85% ⚠️ 待後續補充
- [ ] 整合測試覆蓋完整流程 ⚠️ 待後續補充

---

## 測試要求

### 單元測試

#### 測試 1: Celery 配置與基礎設定

**目的:** 驗證 Celery 應用可正確初始化並連接 Redis

**前置條件:**
- Redis 服務運行中（localhost:6379）

**輸入:**
```python
# 啟動 Celery app
from app.celery_app import celery_app

# 檢查配置
config = celery_app.conf
```

**預期輸出:**
```python
assert config.broker_url == 'redis://localhost:6379/0'
assert config.result_backend == 'redis://localhost:6379/0'
assert config.task_serializer == 'json'
assert config.result_serializer == 'json'
assert config.timezone == 'Asia/Taipei'
assert celery_app.connection().connected is True
```

**驗證點:**
- [ ] Celery app 成功初始化
- [ ] Redis 連接成功
- [ ] 配置參數正確
- [ ] Worker 可正常啟動

---

#### 測試 2: generate_script_task - 腳本生成成功

**目的:** 驗證腳本生成任務可正確調用 Gemini API 並解析回應

**前置條件:**
- 資料庫中存在 project_id=1 的專案
- 專案狀態為 INITIALIZED
- 專案包含有效的 content 和 prompt_template_id
- Gemini API Key 已設定

**輸入:**
```python
task = generate_script_task.delay(project_id=1)
result = task.get(timeout=60)
```

**預期輸出:**
```python
{
    "status": "success",
    "script": {
        "intro": {
            "text": "開場白內容...",
            "duration": 10
        },
        "segments": [
            {
                "index": 1,
                "text": "段落 1 內容...",
                "duration": 15,
                "image_description": "A beautiful landscape with mountains"
            }
            # ... 更多段落
        ],
        "outro": {
            "text": "結尾內容...",
            "duration": 10
        },
        "metadata": {
            "title": "AI 生成的標題",
            "description": "AI 生成的描述",
            "tags": ["標籤1", "標籤2"]
        },
        "total_duration": 300
    }
}
```

**驗證點:**
- [ ] Task 執行成功
- [ ] 呼叫 GeminiClient.generate_script()
- [ ] 回傳的 script 結構正確（包含 intro, segments, outro, metadata）
- [ ] 每個 segment 包含 text, duration, image_description
- [ ] 段落時長在 5-20 秒之間
- [ ] 總時長在 180-600 秒之間
- [ ] 專案狀態更新為 SCRIPT_GENERATED
- [ ] script 儲存到 projects.script 欄位（JSON）
- [ ] 進度更新發布到 Redis（`progress:{project_id}` channel）

---

#### 測試 3: generate_script_task - 腳本驗證失敗

**目的:** 驗證腳本驗證邏輯可捕捉無效的腳本結構

**前置條件:**
- Mock Gemini API 回傳無效腳本（段落時長 > 20 秒）

**輸入:**
```python
# Mock 回應
mock_response = {
    "intro": {"text": "...", "duration": 10},
    "segments": [
        {"index": 1, "text": "...", "duration": 25, "image_description": "..."}  # 超過 20 秒
    ],
    "outro": {"text": "...", "duration": 10}
}

task = generate_script_task.delay(project_id=1)
```

**預期輸出:**
```python
# Task 失敗
assert task.state == 'FAILURE'

# 錯誤訊息清楚
error = task.info
assert "段落時長超過限制" in error['message']
assert error['segment_index'] == 1
assert error['duration'] == 25
```

**驗證點:**
- [ ] 驗證邏輯捕捉到無效段落時長
- [ ] Task 標記為 FAILURE
- [ ] 專案狀態更新為 FAILED
- [ ] 錯誤訊息包含詳細資訊（哪個段落、什麼問題）
- [ ] 錯誤發布到 Redis Pub/Sub

---

#### 測試 4: generate_assets_task - 並行素材生成成功

**目的:** 驗證素材生成任務可並行生成語音、圖片、虛擬主播

**前置條件:**
- 專案狀態為 SCRIPT_GENERATED
- 專案包含有效的 script（例如 5 個段落）

**輸入:**
```python
task = generate_assets_task.delay(project_id=1)
result = task.get(timeout=300)  # 最多 5 分鐘
```

**預期輸出:**
```python
{
    "status": "success",
    "assets": {
        "audio": "data/projects/1/audio/full_audio.mp3",
        "images": [
            "data/projects/1/images/segment_01.png",
            "data/projects/1/images/segment_02.png",
            "data/projects/1/images/segment_03.png",
            "data/projects/1/images/segment_04.png",
            "data/projects/1/images/segment_05.png"
        ],
        "avatar_intro": "data/projects/1/avatars/intro.mp4",
        "avatar_outro": "data/projects/1/avatars/outro.mp4"
    },
    "generation_time": 180  # 秒
}
```

**驗證點:**
- [ ] 並行執行 3 個子任務（語音、圖片、虛擬主播）
- [ ] 語音檔案生成成功（MP3 格式）
- [ ] 所有圖片生成成功（5 張 PNG，1920x1080）
- [ ] 虛擬主播影片生成成功（開場、結尾）
- [ ] Asset 記錄寫入資料庫（assets 表）
- [ ] 專案狀態更新為 ASSETS_GENERATED
- [ ] 進度更新發布到 Redis（每個子任務完成時）
- [ ] 總執行時間 < 5 分鐘（並行優化）

---

#### 測試 5: generate_assets_task - 部分圖片失敗處理

**目的:** 驗證當部分圖片生成失敗時的處理邏輯

**前置條件:**
- Mock StabilityAIClient.generate_image() 對第 3 張圖片拋出異常

**輸入:**
```python
# Mock 第 3 張圖片失敗
with mock.patch('app.integrations.stability_client.generate_image') as mock_generate:
    mock_generate.side_effect = [
        "image_1.png",  # 成功
        "image_2.png",  # 成功
        Exception("Content policy violation"),  # 失敗
        "image_4.png",  # 成功
        "image_5.png"   # 成功
    ]

    task = generate_assets_task.delay(project_id=1)
    result = task.get()
```

**預期輸出:**
```python
{
    "status": "partial_success",
    "assets": {
        "audio": "...",
        "images": [
            "segment_01.png",
            "segment_02.png",
            None,  # 第 3 張失敗
            "segment_04.png",
            "segment_05.png"
        ],
        "avatar_intro": "...",
        "avatar_outro": "..."
    },
    "errors": [
        {
            "asset_type": "image",
            "segment_index": 3,
            "error": "Content policy violation"
        }
    ]
}
```

**驗證點:**
- [ ] Task 不完全失敗,而是標記為 partial_success
- [ ] 成功的素材正常儲存
- [ ] 失敗的圖片標記為 None
- [ ] 錯誤資訊詳細記錄
- [ ] Asset 記錄中失敗的標記為 FAILED 狀態
- [ ] 用戶可選擇繼續（使用佔位圖）或重試失敗項目

---

#### 測試 6: render_video_task - 影片渲染成功

**目的:** 驗證影片渲染任務可正確調用 FFmpeg 合成影片

**前置條件:**
- 專案狀態為 ASSETS_GENERATED
- 所有素材檔案存在（語音、圖片、虛擬主播）
- 專案包含有效的視覺配置（字幕樣式、Logo 等）

**輸入:**
```python
task = render_video_task.delay(project_id=1)
result = task.get(timeout=600)  # 最多 10 分鐘
```

**預期輸出:**
```python
{
    "status": "success",
    "video_path": "data/projects/1/output/final_video.mp4",
    "video_info": {
        "duration": 305.5,  # 秒
        "resolution": "1920x1080",
        "fps": 30,
        "file_size": 45678912,  # bytes
        "codec": "h264"
    },
    "render_time": 420  # 秒
}
```

**驗證點:**
- [ ] FFmpeg 命令正確生成
- [ ] 影片檔案生成成功（MP4 格式）
- [ ] 影片解析度正確（1920x1080）
- [ ] 影片時長與腳本時長一致（誤差 < 2%）
- [ ] 字幕正確燒錄（位置、樣式符合配置）
- [ ] Logo 和疊加元素正確渲染
- [ ] 音訊同步正常
- [ ] Asset 記錄更新（FINAL_VIDEO）
- [ ] 專案狀態更新為 RENDERED
- [ ] 進度更新發布到 Redis

---

#### 測試 7: generate_thumbnail_task - 封面生成成功

**目的:** 驗證封面生成任務可基於第一張圖片生成封面

**前置條件:**
- 專案狀態為 RENDERED
- 第一張圖片存在
- 專案包含標題文字

**輸入:**
```python
task = generate_thumbnail_task.delay(project_id=1)
result = task.get(timeout=30)
```

**預期輸出:**
```python
{
    "status": "success",
    "thumbnail_path": "data/projects/1/output/thumbnail.jpg",
    "thumbnail_info": {
        "resolution": "1280x720",
        "file_size": 234567,  # bytes
        "format": "JPEG"
    }
}
```

**驗證點:**
- [ ] 封面檔案生成成功（JPG 格式）
- [ ] 封面解析度正確（1280x720）
- [ ] 標題文字正確疊加（樣式符合配置）
- [ ] Logo 疊加（如果配置中有）
- [ ] Asset 記錄更新（THUMBNAIL）
- [ ] 專案狀態更新為 THUMBNAIL_GENERATED
- [ ] 進度更新發布到 Redis

---

#### 測試 8: upload_to_youtube_task - YouTube 上傳成功

**目的:** 驗證 YouTube 上傳任務可正確上傳影片和封面

**前置條件:**
- 專案狀態為 THUMBNAIL_GENERATED
- 影片和封面檔案存在
- YouTube OAuth token 有效

**輸入:**
```python
task = upload_to_youtube_task.delay(project_id=1)
result = task.get(timeout=900)  # 最多 15 分鐘
```

**預期輸出:**
```python
{
    "status": "success",
    "video_id": "dQw4w9WgXcQ",
    "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "upload_time": 720,  # 秒
    "video_status": "unlisted"  # 或 public/private
}
```

**驗證點:**
- [ ] 呼叫 YouTubeClient.upload_video()
- [ ] 影片上傳成功
- [ ] 封面上傳成功
- [ ] Metadata 設定正確（標題、描述、標籤）
- [ ] 隱私設定正確
- [ ] 排程時間設定正確（如有）
- [ ] AI 內容標註設定
- [ ] 專案的 youtube_video_id 欄位更新
- [ ] 專案狀態更新為 COMPLETED
- [ ] 進度更新發布到 Redis

---

#### 測試 9: 任務鏈（Chain）完整流程

**目的:** 驗證 5 個任務可串聯執行完整流程

**前置條件:**
- 資料庫中存在完整配置的專案
- 所有第三方 API 可用

**輸入:**
```python
from celery import chain

# 建立任務鏈
video_chain = chain(
    generate_script_task.s(project_id=1),
    generate_assets_task.s(),
    render_video_task.s(),
    generate_thumbnail_task.s(),
    upload_to_youtube_task.s()
)

result = video_chain.apply_async()
final_result = result.get(timeout=1800)  # 最多 30 分鐘
```

**預期輸出:**
```python
{
    "status": "success",
    "project_id": 1,
    "video_id": "dQw4w9WgXcQ",
    "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "total_time": 1650  # 秒
}
```

**驗證點:**
- [ ] 任務按順序執行（1 → 2 → 3 → 4 → 5）
- [ ] 每個任務的輸出正確傳遞到下一個任務
- [ ] 專案狀態隨著任務進度更新
- [ ] 所有進度更新發布到 Redis
- [ ] 最終專案狀態為 COMPLETED
- [ ] 端到端時間 < 30 分鐘

---

#### 測試 10: batch_processing_task - 批次處理成功

**目的:** 驗證批次處理任務可依序處理多個專案

**前置條件:**
- 批次任務包含 3 個專案（batch_id=1）
- 每個專案配置完整

**輸入:**
```python
task = batch_processing_task.delay(batch_id=1)
result = task.get(timeout=5400)  # 最多 90 分鐘
```

**預期輸出:**
```python
{
    "status": "success",
    "batch_id": 1,
    "total_projects": 3,
    "completed": 3,
    "failed": 0,
    "results": [
        {"project_id": 1, "status": "COMPLETED", "video_id": "xxx"},
        {"project_id": 2, "status": "COMPLETED", "video_id": "yyy"},
        {"project_id": 3, "status": "COMPLETED", "video_id": "zzz"}
    ],
    "total_time": 4800  # 秒
}
```

**驗證點:**
- [ ] 依序執行 3 個專案的完整流程
- [ ] 批次任務進度更新（completed_projects）
- [ ] 每個專案狀態獨立追蹤
- [ ] 批次任務狀態最終為 COMPLETED
- [ ] 即使有專案失敗,其他專案仍繼續執行

---

### 整合測試

#### 測試 11: 錯誤處理與自動重試

**目的:** 驗證任務失敗時的重試機制

**場景 1: 網路暫時性錯誤**
- Mock Gemini API 第 1 次請求拋出 503 錯誤
- 第 2 次請求成功
- 驗證任務自動重試並最終成功

**場景 2: API 配額用盡**
- Mock Stability AI 回傳 429 錯誤
- 驗證任務等待後重試（指數退避）
- 最多重試 3 次
- 若全部失敗,標記為 FAILED

**場景 3: 無效的 API Key**
- Mock API 回傳 401 錯誤
- 驗證任務立即失敗（不重試）
- 錯誤訊息提示用戶檢查 API Key

**驗證點:**
- [ ] 可重試錯誤（503, 429）自動重試
- [ ] 不可重試錯誤（401, 400）立即失敗
- [ ] 指數退避正確實施（2 秒、5 秒、10 秒）
- [ ] 最多重試 3 次
- [ ] 錯誤訊息清楚且可操作

---

#### 測試 12: 進度更新與 Redis Pub/Sub

**目的:** 驗證進度更新正確發布到 Redis

**輸入:**
```python
# 訂閱 Redis channel
pubsub = redis_client.pubsub()
pubsub.subscribe(f'progress:1')

# 執行任務
task = generate_script_task.delay(project_id=1)

# 收集進度訊息
messages = []
for message in pubsub.listen():
    if message['type'] == 'message':
        messages.append(json.loads(message['data']))
        if len(messages) >= 3:
            break
```

**預期輸出:**
```python
[
    {
        "project_id": 1,
        "stage": "script_generation",
        "progress": 0,
        "message": "開始生成腳本...",
        "timestamp": "2025-10-19T10:00:00Z"
    },
    {
        "project_id": 1,
        "stage": "script_generation",
        "progress": 50,
        "message": "正在調用 Gemini API...",
        "timestamp": "2025-10-19T10:00:15Z"
    },
    {
        "project_id": 1,
        "stage": "script_generation",
        "progress": 100,
        "message": "腳本生成完成",
        "timestamp": "2025-10-19T10:00:30Z"
    }
]
```

**驗證點:**
- [ ] 進度訊息格式正確
- [ ] Progress 值從 0 遞增到 100
- [ ] 每個階段都有明確的 stage 標識
- [ ] Timestamp 正確
- [ ] WebSocket 客戶端可正常接收（Task-016 整合後測試）

---

#### 測試 13: 任務狀態持久化

**目的:** 驗證任務狀態可持久化到檔案系統（斷點續傳）

**場景:**
1. 任務執行到一半（素材生成階段）
2. Worker 意外終止
3. 重啟 Worker 後,任務可從斷點繼續

**輸入:**
```python
# 第一次執行
task = generate_assets_task.delay(project_id=1)

# 模擬 Worker 崩潰（任務進行到圖片生成 3/5）
# ...

# 重啟 Worker 並恢復任務
from app.tasks.recovery import recover_interrupted_tasks
recovered = recover_interrupted_tasks()

assert recovered[0]['project_id'] == 1
assert recovered[0]['stage'] == 'asset_generation'
assert recovered[0]['completed_assets'] == 3
```

**驗證點:**
- [ ] 任務狀態定期寫入 `data/projects/{id}/project_state.json`
- [ ] 狀態包含當前階段、已完成的子任務
- [ ] 恢復邏輯可讀取狀態並繼續執行
- [ ] 不重複執行已完成的子任務

---

## 實作規格

### 需要建立/修改的檔案

#### 1. Celery App 配置: `backend/app/celery_app.py`

**職責:** 初始化 Celery 應用、配置 broker 和 result backend

```python
from celery import Celery
from app.core.config import settings

# 初始化 Celery app
celery_app = Celery(
    'ytmaker',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        'app.tasks.video_generation',
        'app.tasks.batch_processing',
        'app.tasks.maintenance'
    ]
)

# Celery 配置
celery_app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='Asia/Taipei',
    enable_utc=True,

    # Worker 設定
    worker_concurrency=4,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,

    # 重試設定
    task_acks_late=True,
    task_reject_on_worker_lost=True,

    # 結果過期時間
    result_expires=86400,  # 24 小時

    # 任務路由
    task_routes={
        'app.tasks.video_generation.*': {'queue': 'video_generation'},
        'app.tasks.batch_processing.*': {'queue': 'batch_processing'},
        'app.tasks.maintenance.*': {'queue': 'maintenance'},
    },

    # Beat 排程（定期任務）
    beat_schedule={
        'sync-quotas-hourly': {
            'task': 'app.tasks.maintenance.sync_quotas',
            'schedule': 3600.0,  # 每小時
        },
    }
)

@celery_app.task(bind=True)
def debug_task(self):
    """測試任務"""
    print(f'Request: {self.request!r}')
```

---

#### 2. 配置檔案: `backend/app/core/config.py`

**職責:** 環境變數與配置管理

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... 其他配置

    # Celery 配置
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Redis 配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    class Config:
        env_file = ".env"

settings = Settings()
```

---

#### 3. 任務模組: `backend/app/tasks/video_generation.py`

**職責:** 影片生成相關的 Celery 任務

```python
from celery import Task
from app.celery_app import celery_app
from app.services.script_service import ScriptGenerationService
from app.services.asset_service import AssetGenerationService
from app.services.video_service import VideoRenderService
from app.services.thumbnail_service import ThumbnailService
from app.services.upload_service import YouTubeUploadService
from app.tasks.progress import publish_progress, ProgressStage
from app.tasks.state_manager import StateManager
from app.db.session import get_db
from app.models.project import Project, ProjectStatus
import logging

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """基礎任務類別，提供通用的回調和錯誤處理"""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """任務失敗時的回調"""
        project_id = args[0] if args else kwargs.get('project_id')
        if project_id:
            # 更新專案狀態為 FAILED
            db = next(get_db())
            project = db.query(Project).get(project_id)
            if project:
                project.status = ProjectStatus.FAILED
                db.commit()

            # 發布錯誤到 Redis
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"任務失敗: {str(exc)}",
                error=str(exc)
            )

        logger.error(f"Task {task_id} failed: {exc}", exc_info=einfo)


@celery_app.task(
    bind=True,
    base=CallbackTask,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True
)
def generate_script_task(self, project_id: int) -> dict:
    """
    任務 1: 生成腳本

    Args:
        project_id: 專案 ID

    Returns:
        dict: 包含 script 的字典

    Raises:
        Exception: 腳本生成失敗
    """
    logger.info(f"Starting script generation for project {project_id}")

    # 初始化狀態管理器
    state_mgr = StateManager(project_id)

    try:
        # 發布開始進度
        publish_progress(
            project_id=project_id,
            stage=ProgressStage.SCRIPT_GENERATION,
            progress=0,
            message="開始生成腳本..."
        )

        # 更新專案狀態
        db = next(get_db())
        project = db.query(Project).get(project_id)
        project.status = ProjectStatus.SCRIPT_GENERATING
        db.commit()

        # 調用腳本生成服務
        script_service = ScriptGenerationService(db)

        publish_progress(project_id, ProgressStage.SCRIPT_GENERATION, 30, "調用 Gemini API...")

        script = script_service.generate_script(project_id)

        # 驗證腳本
        script_service.validate_script(script)

        publish_progress(project_id, ProgressStage.SCRIPT_GENERATION, 80, "儲存腳本...")

        # 儲存腳本到資料庫
        project.script = script
        project.status = ProjectStatus.SCRIPT_GENERATED
        db.commit()

        # 儲存狀態
        state_mgr.save_state({
            'stage': 'script_generated',
            'script': script
        })

        publish_progress(project_id, ProgressStage.SCRIPT_GENERATION, 100, "腳本生成完成")

        logger.info(f"Script generation completed for project {project_id}")

        return {
            "status": "success",
            "project_id": project_id,
            "script": script
        }

    except Exception as e:
        logger.error(f"Script generation failed for project {project_id}: {str(e)}")

        # 重試邏輯
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying script generation (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=2 ** self.request.retries)
        else:
            # 最終失敗
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"腳本生成失敗: {str(e)}",
                error=str(e)
            )
            raise


@celery_app.task(
    bind=True,
    base=CallbackTask,
    max_retries=3
)
def generate_assets_task(self, project_id: int) -> dict:
    """
    任務 2: 生成素材（語音、圖片、虛擬主播）

    使用 asyncio 並行處理素材生成以提升效率

    Args:
        project_id: 專案 ID

    Returns:
        dict: 包含所有素材路徑的字典
    """
    logger.info(f"Starting asset generation for project {project_id}")

    state_mgr = StateManager(project_id)

    try:
        publish_progress(
            project_id=project_id,
            stage=ProgressStage.ASSET_GENERATION,
            progress=0,
            message="開始生成素材..."
        )

        # 更新專案狀態
        db = next(get_db())
        project = db.query(Project).get(project_id)
        project.status = ProjectStatus.ASSETS_GENERATING
        db.commit()

        # 調用素材生成服務（內部使用 asyncio 並行處理）
        asset_service = AssetGenerationService(db)

        # 並行生成: 語音、圖片、虛擬主播
        assets = asset_service.generate_all_assets(
            project_id=project_id,
            progress_callback=lambda progress, msg: publish_progress(
                project_id, ProgressStage.ASSET_GENERATION, progress, msg
            )
        )

        # 更新專案狀態
        project.status = ProjectStatus.ASSETS_GENERATED
        db.commit()

        # 儲存狀態
        state_mgr.save_state({
            'stage': 'assets_generated',
            'assets': assets
        })

        publish_progress(project_id, ProgressStage.ASSET_GENERATION, 100, "素材生成完成")

        logger.info(f"Asset generation completed for project {project_id}")

        return {
            "status": "success",
            "project_id": project_id,
            "assets": assets
        }

    except Exception as e:
        logger.error(f"Asset generation failed for project {project_id}: {str(e)}")

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=2 ** self.request.retries)
        else:
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"素材生成失敗: {str(e)}",
                error=str(e)
            )
            raise


@celery_app.task(
    bind=True,
    base=CallbackTask,
    max_retries=2
)
def render_video_task(self, project_id: int) -> dict:
    """
    任務 3: 渲染影片

    使用 FFmpeg 合成所有素材為最終影片

    Args:
        project_id: 專案 ID

    Returns:
        dict: 包含影片路徑和資訊的字典
    """
    logger.info(f"Starting video rendering for project {project_id}")

    state_mgr = StateManager(project_id)

    try:
        publish_progress(
            project_id=project_id,
            stage=ProgressStage.VIDEO_RENDERING,
            progress=0,
            message="開始渲染影片..."
        )

        # 更新專案狀態
        db = next(get_db())
        project = db.query(Project).get(project_id)
        project.status = ProjectStatus.RENDERING
        db.commit()

        # 調用影片渲染服務
        render_service = VideoRenderService(db)

        video_info = render_service.render_video(
            project_id=project_id,
            progress_callback=lambda progress, msg: publish_progress(
                project_id, ProgressStage.VIDEO_RENDERING, progress, msg
            )
        )

        # 更新專案狀態
        project.status = ProjectStatus.RENDERED
        db.commit()

        # 儲存狀態
        state_mgr.save_state({
            'stage': 'video_rendered',
            'video_info': video_info
        })

        publish_progress(project_id, ProgressStage.VIDEO_RENDERING, 100, "影片渲染完成")

        logger.info(f"Video rendering completed for project {project_id}")

        return {
            "status": "success",
            "project_id": project_id,
            "video_info": video_info
        }

    except Exception as e:
        logger.error(f"Video rendering failed for project {project_id}: {str(e)}")

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=10)  # 渲染失敗等待較久
        else:
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"影片渲染失敗: {str(e)}",
                error=str(e)
            )
            raise


@celery_app.task(
    bind=True,
    base=CallbackTask,
    max_retries=2
)
def generate_thumbnail_task(self, project_id: int) -> dict:
    """
    任務 4: 生成封面

    基於第一張圖片生成 YouTube 封面

    Args:
        project_id: 專案 ID

    Returns:
        dict: 包含封面路徑的字典
    """
    logger.info(f"Starting thumbnail generation for project {project_id}")

    state_mgr = StateManager(project_id)

    try:
        publish_progress(
            project_id=project_id,
            stage=ProgressStage.THUMBNAIL_GENERATION,
            progress=0,
            message="開始生成封面..."
        )

        # 更新專案狀態
        db = next(get_db())
        project = db.query(Project).get(project_id)
        project.status = ProjectStatus.THUMBNAIL_GENERATING
        db.commit()

        # 調用封面生成服務
        thumbnail_service = ThumbnailService(db)

        thumbnail_info = thumbnail_service.generate_thumbnail(project_id)

        # 更新專案狀態
        project.status = ProjectStatus.THUMBNAIL_GENERATED
        db.commit()

        # 儲存狀態
        state_mgr.save_state({
            'stage': 'thumbnail_generated',
            'thumbnail_info': thumbnail_info
        })

        publish_progress(project_id, ProgressStage.THUMBNAIL_GENERATION, 100, "封面生成完成")

        logger.info(f"Thumbnail generation completed for project {project_id}")

        return {
            "status": "success",
            "project_id": project_id,
            "thumbnail_info": thumbnail_info
        }

    except Exception as e:
        logger.error(f"Thumbnail generation failed for project {project_id}: {str(e)}")

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=5)
        else:
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"封面生成失敗: {str(e)}",
                error=str(e)
            )
            raise


@celery_app.task(
    bind=True,
    base=CallbackTask,
    max_retries=3
)
def upload_to_youtube_task(self, project_id: int) -> dict:
    """
    任務 5: 上傳到 YouTube

    上傳影片和封面到 YouTube

    Args:
        project_id: 專案 ID

    Returns:
        dict: 包含 YouTube 影片 ID 和 URL 的字典
    """
    logger.info(f"Starting YouTube upload for project {project_id}")

    state_mgr = StateManager(project_id)

    try:
        publish_progress(
            project_id=project_id,
            stage=ProgressStage.YOUTUBE_UPLOAD,
            progress=0,
            message="開始上傳到 YouTube..."
        )

        # 更新專案狀態
        db = next(get_db())
        project = db.query(Project).get(project_id)
        project.status = ProjectStatus.UPLOADING
        db.commit()

        # 調用 YouTube 上傳服務
        upload_service = YouTubeUploadService(db)

        upload_result = upload_service.upload_video(
            project_id=project_id,
            progress_callback=lambda progress, msg: publish_progress(
                project_id, ProgressStage.YOUTUBE_UPLOAD, progress, msg
            )
        )

        # 更新專案
        project.youtube_video_id = upload_result['video_id']
        project.status = ProjectStatus.COMPLETED
        db.commit()

        # 儲存狀態
        state_mgr.save_state({
            'stage': 'completed',
            'upload_result': upload_result
        })

        publish_progress(project_id, ProgressStage.YOUTUBE_UPLOAD, 100, "上傳完成!")

        logger.info(f"YouTube upload completed for project {project_id}")

        return {
            "status": "success",
            "project_id": project_id,
            "video_id": upload_result['video_id'],
            "video_url": upload_result['video_url']
        }

    except Exception as e:
        logger.error(f"YouTube upload failed for project {project_id}: {str(e)}")

        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=2 ** self.request.retries)
        else:
            publish_progress(
                project_id=project_id,
                stage=ProgressStage.ERROR,
                progress=0,
                message=f"YouTube 上傳失敗: {str(e)}",
                error=str(e)
            )
            raise
```

---

#### 4. 批次處理任務: `backend/app/tasks/batch_processing.py`

**職責:** 批次處理多個專案

```python
from celery import chain
from app.celery_app import celery_app
from app.tasks.video_generation import (
    generate_script_task,
    generate_assets_task,
    render_video_task,
    generate_thumbnail_task,
    upload_to_youtube_task
)
from app.db.session import get_db
from app.models.batch_task import BatchTask, BatchStatus
from app.models.project import Project, ProjectStatus
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def batch_processing_task(self, batch_id: int) -> dict:
    """
    任務 6: 批次處理

    依序處理批次中的所有專案

    Args:
        batch_id: 批次任務 ID

    Returns:
        dict: 批次處理結果
    """
    logger.info(f"Starting batch processing for batch {batch_id}")

    db = next(get_db())
    batch = db.query(BatchTask).get(batch_id)

    if not batch:
        raise ValueError(f"Batch task {batch_id} not found")

    # 更新批次狀態
    batch.status = BatchStatus.PROCESSING
    db.commit()

    # 取得批次中的所有專案
    projects = db.query(Project).filter(Project.batch_id == batch_id).all()

    results = []
    completed_count = 0
    failed_count = 0

    for project in projects:
        try:
            logger.info(f"Processing project {project.id} in batch {batch_id}")

            # 建立任務鏈
            video_chain = chain(
                generate_script_task.s(project.id),
                generate_assets_task.s(),
                render_video_task.s(),
                generate_thumbnail_task.s(),
                upload_to_youtube_task.s()
            )

            # 執行任務鏈
            result = video_chain.apply_async()
            final_result = result.get(timeout=1800)  # 最多 30 分鐘

            completed_count += 1
            results.append({
                "project_id": project.id,
                "status": "COMPLETED",
                "video_id": final_result.get('video_id')
            })

            logger.info(f"Project {project.id} completed successfully")

        except Exception as e:
            failed_count += 1
            results.append({
                "project_id": project.id,
                "status": "FAILED",
                "error": str(e)
            })

            logger.error(f"Project {project.id} failed: {str(e)}")

            # 更新專案狀態
            project.status = ProjectStatus.FAILED
            db.commit()

        # 更新批次進度
        batch.completed_projects = completed_count
        batch.failed_projects = failed_count
        db.commit()

    # 更新批次狀態
    batch.status = BatchStatus.COMPLETED
    db.commit()

    logger.info(f"Batch processing completed for batch {batch_id}: {completed_count} completed, {failed_count} failed")

    return {
        "status": "success",
        "batch_id": batch_id,
        "total_projects": len(projects),
        "completed": completed_count,
        "failed": failed_count,
        "results": results
    }
```

---

#### 5. 進度管理: `backend/app/tasks/progress.py`

**職責:** Redis Pub/Sub 進度通知

```python
import redis
import json
from datetime import datetime
from enum import Enum
from app.core.config import settings

# Redis 客戶端
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)


class ProgressStage(str, Enum):
    """進度階段"""
    SCRIPT_GENERATION = "script_generation"
    ASSET_GENERATION = "asset_generation"
    VIDEO_RENDERING = "video_rendering"
    THUMBNAIL_GENERATION = "thumbnail_generation"
    YOUTUBE_UPLOAD = "youtube_upload"
    ERROR = "error"


def publish_progress(
    project_id: int,
    stage: ProgressStage,
    progress: int,
    message: str,
    error: str = None,
    data: dict = None
):
    """
    發布進度更新到 Redis Pub/Sub

    Args:
        project_id: 專案 ID
        stage: 進度階段
        progress: 進度百分比（0-100）
        message: 進度訊息
        error: 錯誤訊息（如果有）
        data: 額外資料
    """
    channel = f"progress:{project_id}"

    payload = {
        "project_id": project_id,
        "stage": stage.value,
        "progress": progress,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }

    if error:
        payload["error"] = error

    if data:
        payload["data"] = data

    redis_client.publish(channel, json.dumps(payload))


def subscribe_progress(project_id: int):
    """
    訂閱專案的進度更新

    Args:
        project_id: 專案 ID

    Yields:
        dict: 進度訊息
    """
    pubsub = redis_client.pubsub()
    channel = f"progress:{project_id}"
    pubsub.subscribe(channel)

    try:
        for message in pubsub.listen():
            if message['type'] == 'message':
                yield json.loads(message['data'])
    finally:
        pubsub.unsubscribe(channel)
        pubsub.close()
```

---

#### 6. 狀態管理器: `backend/app/tasks/state_manager.py`

**職責:** 任務狀態持久化（斷點續傳）

```python
import json
import os
from pathlib import Path
from typing import Dict, Any

class StateManager:
    """任務狀態管理器"""

    def __init__(self, project_id: int):
        self.project_id = project_id
        self.state_file = Path(f"data/projects/{project_id}/project_state.json")
        self.state_file.parent.mkdir(parents=True, exist_ok=True)

    def save_state(self, state: Dict[str, Any]):
        """
        儲存任務狀態到檔案

        Args:
            state: 狀態字典
        """
        # 讀取現有狀態
        existing_state = self.load_state() or {}

        # 合併新狀態
        existing_state.update(state)
        existing_state['last_updated'] = datetime.utcnow().isoformat()

        # 寫入檔案
        with open(self.state_file, 'w', encoding='utf-8') as f:
            json.dump(existing_state, f, ensure_ascii=False, indent=2)

    def load_state(self) -> Dict[str, Any]:
        """
        載入任務狀態

        Returns:
            dict: 狀態字典
        """
        if not self.state_file.exists():
            return None

        with open(self.state_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def clear_state(self):
        """清除狀態檔案"""
        if self.state_file.exists():
            os.remove(self.state_file)


def recover_interrupted_tasks() -> list:
    """
    恢復中斷的任務

    掃描所有專案的狀態檔案,找出未完成的任務

    Returns:
        list: 需要恢復的專案列表
    """
    data_dir = Path("data/projects")
    if not data_dir.exists():
        return []

    interrupted_projects = []

    for project_dir in data_dir.iterdir():
        if not project_dir.is_dir():
            continue

        state_file = project_dir / "project_state.json"
        if not state_file.exists():
            continue

        with open(state_file, 'r') as f:
            state = json.load(f)

        # 檢查是否為未完成的任務
        if state.get('stage') != 'completed':
            project_id = int(project_dir.name)
            interrupted_projects.append({
                'project_id': project_id,
                'stage': state.get('stage'),
                'state': state
            })

    return interrupted_projects
```

---

#### 7. 維護任務: `backend/app/tasks/maintenance.py`

**職責:** 定期維護任務（配額同步等）

```python
from app.celery_app import celery_app
from app.integrations.did_client import DIDClient
from app.integrations.youtube_client import YouTubeClient
from app.tasks.progress import redis_client
import json
import logging

logger = logging.getLogger(__name__)


@celery_app.task
def sync_quotas():
    """
    同步 API 配額資訊

    定期調用第三方 API 取得配額使用情況
    """
    logger.info("Starting quota sync")

    try:
        # 同步 D-ID 配額
        did_client = DIDClient()
        did_quota = did_client.get_quota()

        redis_client.setex(
            'quota:did',
            3600,  # 1 小時過期
            json.dumps(did_quota)
        )

        logger.info(f"D-ID quota synced: {did_quota}")

        # 檢查配額警告（< 10%）
        if did_quota['used'] / did_quota['total'] > 0.9:
            logger.warning(f"D-ID quota low: {did_quota['used']}/{did_quota['total']}")
            # TODO: 發送通知

    except Exception as e:
        logger.error(f"Failed to sync D-ID quota: {str(e)}")

    try:
        # 同步 YouTube 配額
        youtube_client = YouTubeClient()
        youtube_quota = youtube_client.get_quota()

        redis_client.setex(
            'quota:youtube',
            3600,
            json.dumps(youtube_quota)
        )

        logger.info(f"YouTube quota synced: {youtube_quota}")

        if youtube_quota['used'] / youtube_quota['total'] > 0.9:
            logger.warning(f"YouTube quota low: {youtube_quota['used']}/{youtube_quota['total']}")

    except Exception as e:
        logger.error(f"Failed to sync YouTube quota: {str(e)}")

    logger.info("Quota sync completed")
```

---

#### 8. 測試檔案: `backend/tests/tasks/test_video_generation.py`

**職責:** 單元測試

```python
import pytest
from unittest.mock import Mock, patch, MagicMock
from app.tasks.video_generation import (
    generate_script_task,
    generate_assets_task,
    render_video_task,
    generate_thumbnail_task,
    upload_to_youtube_task
)
from app.models.project import Project, ProjectStatus


@pytest.fixture
def mock_db():
    """Mock 資料庫 session"""
    db = Mock()
    return db


@pytest.fixture
def sample_project(mock_db):
    """範例專案"""
    project = Project(
        id=1,
        name="Test Project",
        content="測試內容" * 100,
        status=ProjectStatus.INITIALIZED,
        gemini_model="gemini-1.5-flash"
    )
    mock_db.query.return_value.get.return_value = project
    return project


def test_generate_script_task_success(mock_db, sample_project):
    """測試 1: 腳本生成成功"""
    # Mock GeminiClient
    with patch('app.services.script_service.GeminiClient') as mock_gemini:
        mock_gemini.return_value.generate_script.return_value = {
            "intro": {"text": "開場白", "duration": 10},
            "segments": [
                {"index": 1, "text": "段落 1", "duration": 15, "image_description": "..."}
            ],
            "outro": {"text": "結尾", "duration": 10},
            "metadata": {"title": "標題", "description": "描述", "tags": []},
            "total_duration": 35
        }

        # 執行任務
        result = generate_script_task(project_id=1)

        # 驗證
        assert result['status'] == 'success'
        assert 'script' in result
        assert sample_project.status == ProjectStatus.SCRIPT_GENERATED


def test_generate_script_task_validation_failure(mock_db, sample_project):
    """測試 3: 腳本驗證失敗"""
    # Mock 無效腳本（段落時長過長）
    with patch('app.services.script_service.GeminiClient') as mock_gemini:
        mock_gemini.return_value.generate_script.return_value = {
            "intro": {"text": "開場白", "duration": 10},
            "segments": [
                {"index": 1, "text": "段落 1", "duration": 25, "image_description": "..."}  # 超過 20 秒
            ],
            "outro": {"text": "結尾", "duration": 10}
        }

        # 執行任務（應該失敗）
        with pytest.raises(ValueError) as exc_info:
            generate_script_task(project_id=1)

        assert "段落時長超過限制" in str(exc_info.value)


def test_generate_assets_task_success(mock_db, sample_project):
    """測試 4: 素材生成成功"""
    sample_project.status = ProjectStatus.SCRIPT_GENERATED
    sample_project.script = {
        "segments": [{"index": i} for i in range(1, 6)]
    }

    with patch('app.services.asset_service.AssetGenerationService') as mock_service:
        mock_service.return_value.generate_all_assets.return_value = {
            "audio": "audio.mp3",
            "images": ["img1.png", "img2.png", "img3.png", "img4.png", "img5.png"],
            "avatar_intro": "intro.mp4",
            "avatar_outro": "outro.mp4"
        }

        result = generate_assets_task(project_id=1)

        assert result['status'] == 'success'
        assert len(result['assets']['images']) == 5
        assert sample_project.status == ProjectStatus.ASSETS_GENERATED


# ... 更多測試 ...
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步: 環境準備（30 分鐘）

1. **確認前置任務完成:**
   - Task-010 (Gemini 整合) ✅
   - Task-011 (Stability AI 整合) ✅
   - Task-012 (D-ID 整合) ✅
   - Task-013 (YouTube 整合) ✅

2. **安裝 Celery 依賴:**
   ```bash
   cd backend
   pip install celery[redis] flower
   ```

3. **啟動 Redis:**
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

4. **確認 Redis 運行:**
   ```bash
   redis-cli ping  # 應回傳 PONG
   ```

---

#### 第 2 步: Celery 基礎配置（1 小時）

1. **建立 `app/celery_app.py`:**
   - Celery app 初始化
   - 配置 broker 和 result backend
   - 設定 worker 參數

2. **更新 `app/core/config.py`:**
   - 新增 CELERY_BROKER_URL
   - 新增 CELERY_RESULT_BACKEND

3. **測試 Celery 連接:**
   ```bash
   # 啟動 worker
   celery -A app.celery_app worker --loglevel=info

   # 測試任務
   python -c "from app.celery_app import debug_task; debug_task.delay()"
   ```

4. **驗證測試 1 通過** ✅

---

#### 第 3 步: 實作 generate_script_task（2 小時）

1. **撰寫測試:**
   - `test_generate_script_task_success`
   - `test_generate_script_task_validation_failure`

2. **建立 `app/tasks/video_generation.py`:**
   - 實作 `CallbackTask` 基礎類別
   - 實作 `generate_script_task`
   - 整合 ScriptGenerationService

3. **建立 `app/tasks/progress.py`:**
   - 實作 `publish_progress()`
   - 定義 `ProgressStage` enum

4. **執行測試 2, 3** → 通過 ✅

---

#### 第 4 步: 實作 generate_assets_task（3 小時）

1. **撰寫測試:**
   - `test_generate_assets_task_success`
   - `test_generate_assets_task_partial_failure`

2. **實作 `generate_assets_task`:**
   - 整合 AssetGenerationService
   - 並行處理邏輯（內部使用 asyncio）
   - 進度回調

3. **執行測試 4, 5** → 通過 ✅

---

#### 第 5 步: 實作 render_video_task（2 小時）

1. **撰寫測試:**
   - `test_render_video_task_success`

2. **實作 `render_video_task`:**
   - 整合 VideoRenderService
   - FFmpeg 調用
   - 進度回調

3. **執行測試 6** → 通過 ✅

---

#### 第 6 步: 實作 generate_thumbnail_task（1 小時）

1. **撰寫測試:**
   - `test_generate_thumbnail_task_success`

2. **實作 `generate_thumbnail_task`:**
   - 整合 ThumbnailService
   - 圖片處理

3. **執行測試 7** → 通過 ✅

---

#### 第 7 步: 實作 upload_to_youtube_task（1.5 小時）

1. **撰寫測試:**
   - `test_upload_to_youtube_task_success`

2. **實作 `upload_to_youtube_task`:**
   - 整合 YouTubeUploadService
   - 進度回調

3. **執行測試 8** → 通過 ✅

---

#### 第 8 步: 實作任務鏈（Chain）（1 小時）

1. **撰寫測試:**
   - `test_video_generation_chain_success`

2. **實作任務鏈邏輯:**
   - 在 API 端點中定義 chain
   - 測試串聯執行

3. **執行測試 9** → 通過 ✅

---

#### 第 9 步: 實作批次處理任務（1.5 小時）

1. **建立 `app/tasks/batch_processing.py`:**
   - 實作 `batch_processing_task`
   - 批次進度管理

2. **撰寫測試:**
   - `test_batch_processing_task_success`

3. **執行測試 10** → 通過 ✅

---

#### 第 10 步: 實作狀態持久化（1.5 小時）

1. **建立 `app/tasks/state_manager.py`:**
   - 實作 `StateManager` 類別
   - save_state(), load_state()
   - recover_interrupted_tasks()

2. **撰寫測試:**
   - `test_state_persistence`

3. **執行測試 13** → 通過 ✅

---

#### 第 11 步: 整合測試（2 小時）

1. **撰寫整合測試:**
   - `test_error_handling_and_retry` (測試 11)
   - `test_progress_pub_sub` (測試 12)

2. **執行完整流程測試:**
   - 建立測試專案
   - 執行完整任務鏈
   - 驗證所有階段

3. **執行所有測試** → 全部通過 ✅

---

#### 第 12 步: Celery Beat 與維護任務（1 小時）

1. **建立 `app/tasks/maintenance.py`:**
   - 實作 `sync_quotas()`

2. **配置 Beat schedule:**
   - 在 celery_app.py 中定義排程

3. **啟動 Celery Beat:**
   ```bash
   celery -A app.celery_app beat --loglevel=info
   ```

4. **驗證定期任務執行** ✅

---

#### 第 13 步: Flower 監控（30 分鐘）

1. **啟動 Flower:**
   ```bash
   celery -A app.celery_app flower --port=5555
   ```

2. **訪問 Flower UI:**
   - 開啟 http://localhost:5555
   - 查看任務狀態、執行時間
   - 測試手動重試功能

---

#### 第 14 步: 文件與清理（30 分鐘）

1. **更新 README:**
   - 新增 Celery 啟動指令
   - 新增 Redis 配置說明

2. **檢查測試覆蓋率:**
   ```bash
   pytest --cov=app.tasks --cov-report=html
   ```

3. **Ruff 檢查:**
   ```bash
   ruff check app/tasks/
   ruff format app/tasks/
   ```

---

## 注意事項

### 效能優化

#### 並行處理
- ✅ 素材生成使用 asyncio 並行處理（語音、圖片、虛擬主播）
- ✅ 圖片生成使用 ThreadPoolExecutor 並行（4-6 個並行請求）
- ⚠️ 控制並行數量避免 Rate Limit（Stability AI: 150 req/min）

#### Worker 配置
- 🔧 根據機器資源調整 worker_concurrency（建議 4-8）
- 🔧 使用多個佇列分離不同類型任務
- 🔧 長時間任務（渲染、上傳）使用專用 worker

---

### 錯誤處理

#### 可重試錯誤
- ✅ 503 Service Unavailable → 重試（指數退避）
- ✅ 429 Rate Limit → 重試（等待更久）
- ✅ 網路逾時 → 重試

#### 不可重試錯誤
- ❌ 401 Unauthorized → 立即失敗（API Key 問題）
- ❌ 400 Bad Request → 立即失敗（輸入驗證問題）
- ❌ 403 Quota Exceeded → 立即失敗（配額用盡）

#### 重試策略
```python
# 使用 Celery 內建重試機制
@app.task(
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,  # 指數退避
    retry_backoff_max=600,  # 最多等待 10 分鐘
    retry_jitter=True,  # 添加隨機抖動
    max_retries=3
)
```

---

### 監控與日誌

#### 日誌記錄
- ✅ 每個任務開始/結束時記錄 INFO
- ✅ 錯誤時記錄 ERROR 與完整 traceback
- ⚠️ 避免記錄敏感資訊（API Keys, Tokens）

#### 監控指標
- 📊 任務成功率（目標 > 95%）
- 📊 平均執行時間（端到端 < 25 分鐘）
- 📊 佇列長度（避免積壓）
- 📊 Worker 狀態（CPU, Memory）

---

### 安全性

#### API Key 管理
- ⚠️ 不在任務參數中傳遞 API Key
- ✅ 從環境變數或資料庫讀取
- ✅ 錯誤訊息不包含 API Key

#### Redis 安全
- ⚠️ 生產環境配置 Redis 密碼
- ⚠️ 不暴露 Redis port 到公網
- ✅ 使用 Redis ACL 限制權限

---

### 整合點

#### 與 Task-016 (WebSocket) 整合
- 🔗 Task-016 訂閱 Redis `progress:{project_id}` channel
- 🔗 WebSocket 推送進度到前端
- 🔗 測試即時進度顯示

#### 與 Task-015 (影片渲染) 整合
- 🔗 `render_video_task` 調用 Task-015 的 VideoRenderService
- 🔗 確保 FFmpeg 命令正確生成
- 🔗 測試音訊同步、字幕燒錄

#### 與 API 整合
- 🔗 Projects API 的 POST /projects/{id}/generate 端點調用任務鏈
- 🔗 Batch API 的 POST /batch 端點調用 batch_processing_task
- 🔗 確保 API 回傳 Celery task_id

---

## 完成檢查清單

### 功能完整性
- [x] Celery app 配置完成並可運行
- [x] 6 個核心任務全部實作
- [x] 任務鏈（Chain）可串聯執行
- [x] 批次處理任務可處理多個專案
- [x] 進度更新機制（Redis Pub/Sub）完成
- [x] 狀態持久化（斷點續傳）完成
- [x] Celery Beat 定期任務配置完成
- [x] Flower 監控可正常使用

### 測試
- [ ] 所有單元測試通過（測試 1-10）⚠️ 待後續實作
- [ ] 整合測試通過（測試 11-13）⚠️ 待後續實作
- [ ] 測試覆蓋率 > 85% ⚠️ 待後續實作
- [ ] 端到端測試（完整流程）通過 ⚠️ 待後續實作

### 錯誤處理
- [x] 可重試錯誤自動重試（使用 Celery retry 機制）
- [x] 不可重試錯誤立即失敗並更新專案狀態
- [x] 任務失敗時透過 Redis Pub/Sub 推送錯誤資訊
- [x] CallbackTask 基礎類別提供統一的錯誤處理
- [ ] 與 error-codes.md 完全整合 ⚠️ 待後續優化
- [ ] 與 WebSocket 整合推送錯誤 ⚠️ 需 Task-016

### 效能
- [x] 素材生成設計為並行處理（asyncio）
- [x] Worker 配置合理（concurrency=4）
- [ ] 效能基準測試 ⚠️ 待後續實測

### 程式碼品質
- [x] Ruff check 無錯誤
- [x] 程式碼已格式化
- [x] 所有函數有 docstring
- [ ] mypy 類型檢查 ⚠️ 待後續補充

### 文件
- [x] README 更新（一鍵啟動腳本）
- [x] CELERY_README.md 建立（詳細使用文件）
- [ ] API 文件更新（任務狀態查詢）⚠️ 待 API 實作

### 整合
- [x] ProcessManager 自動管理 Redis 和 Celery Worker
- [x] 一鍵啟動腳本（start.sh / start.bat）
- [ ] 與 Projects API 整合測試 ⚠️ 待 API 實作
- [ ] 與 Batch API 整合測試 ⚠️ 待 API 實作
- [ ] 與 WebSocket (Task-016) 整合準備 ✅ Redis Pub/Sub 已就緒
- [ ] 與影片渲染服務 (Task-015) 整合測試 ⚠️ 待 Task-015

---

## 預估時間分配

- 環境準備與配置: 1.5 小時
- 腳本生成任務: 2 小時
- 素材生成任務: 3 小時
- 影片渲染任務: 2 小時
- 封面生成任務: 1 小時
- YouTube 上傳任務: 1.5 小時
- 任務鏈與批次處理: 2.5 小時
- 狀態持久化: 1.5 小時
- 整合測試: 2 小時
- 維護任務與監控: 1.5 小時
- 文件與清理: 0.5 小時

**總計: 約 19 小時** (預留 5 小時 buffer,總預估 14 小時合理)

---

## 參考資源

### Celery 官方文檔
- [Celery Documentation](https://docs.celeryproject.org/)
- [Task Retry](https://docs.celeryproject.org/en/stable/userguide/tasks.html#retrying)
- [Canvas: Chains](https://docs.celeryproject.org/en/stable/userguide/canvas.html#chains)

### Redis 文檔
- [Redis Pub/Sub](https://redis.io/docs/manual/pubsub/)
- [Redis Python Client](https://redis-py.readthedocs.io/)

### 相關套件
- [Flower - Celery 監控](https://flower.readthedocs.io/)
- [Celery Beat - 定期任務](https://docs.celeryproject.org/en/stable/userguide/periodic-tasks.html)

### 專案內部文件
- `tech-specs/backend/background-jobs.md` - 背景任務設計
- `tech-specs/backend/business-logic.md` - 業務邏輯流程
- `tech-specs/backend/integrations.md` - 第三方 API 整合

---

**準備好開始了嗎？** 讓我們使用 TDD 方式一步步實作 Celery 背景任務系統！🚀
