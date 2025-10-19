# 影片生成業務邏輯

> **關聯文件:** [api-projects.md](./api-projects.md), [background-jobs.md](./background-jobs.md), [integrations.md](./integrations.md)

---

## 1. 影片生成工作流程

### 整體流程

```
專案建立 (initialized)
    ↓
開始生成 → generate_script (腳本生成)
    ↓
generate_assets (素材生成) - 並行執行:
    ├─ generate_audio (語音合成)
    ├─ generate_images (圖片生成,批次並行)
    └─ generate_avatars (虛擬主播)
    ↓
render_video (影片渲染)
    ↓
generate_thumbnail (縮圖生成)
    ↓
upload_to_youtube (YouTube 上傳)
    ↓
完成 (completed)
```

---

## 2. 業務邏輯實作

### 2.1 ProjectService

```python
# app/services/project_service.py
from celery import chain, group
from app.tasks import (
    generate_script,
    generate_audio,
    generate_images,
    generate_avatars,
    render_video,
    generate_thumbnail,
    upload_to_youtube
)

class ProjectService:
    """專案業務邏輯服務"""

    @staticmethod
    def start_generation(project_id: str) -> str:
        """啟動影片生成流程

        Args:
            project_id: 專案 ID

        Returns:
            Celery task ID
        """
        # 定義任務鏈
        task_chain = chain(
            # 1. 生成腳本
            generate_script.s(project_id),

            # 2. 並行生成素材
            group(
                generate_audio.s(project_id),
                generate_images.s(project_id),
                generate_avatars.s(project_id)
            ),

            # 3. 渲染影片
            render_video.s(project_id),

            # 4. 生成縮圖
            generate_thumbnail.s(project_id),

            # 5. 上傳到 YouTube
            upload_to_youtube.s(project_id)
        )

        # 啟動任務鏈
        result = task_chain.apply_async()

        return result.id
```

---

## 3. 進度管理

### 3.1 進度計算

```python
class ProgressManager:
    """進度管理器"""

    STAGE_WEIGHTS = {
        "script_generating": 20,      # 0-20%
        "audio_generating": 15,        # 20-35%
        "images_generating": 25,       # 35-60%
        "avatars_generating": 10,      # 60-70%
        "rendering": 20,               # 70-90%
        "uploading": 10                # 90-100%
    }

    @staticmethod
    def update_progress(project_id: str, stage: str, sub_progress: int):
        """更新專案進度

        Args:
            project_id: 專案 ID
            stage: 當前階段
            sub_progress: 子階段進度 (0-100)
        """
        # 計算總進度
        total_progress = 0

        # 累加已完成階段的進度
        for s, weight in ProgressManager.STAGE_WEIGHTS.items():
            if s == stage:
                # 當前階段:根據子進度計算
                total_progress += weight * (sub_progress / 100)
                break
            else:
                # 已完成階段:全部計入
                total_progress += weight

        # 更新到資料庫
        db.query(Project).filter(Project.id == project_id).update({
            "progress": int(total_progress),
            "status": stage
        })

        # 發布到 Redis (用於 WebSocket 推送)
        redis_client.publish(
            f"progress:{project_id}",
            json.dumps({
                "stage": stage,
                "progress": int(total_progress),
                "sub_progress": sub_progress
            })
        )
```

---

## 4. 錯誤處理與重試

### 4.1 錯誤處理策略

```python
class VideoGenerationService:
    """影片生成服務"""

    @staticmethod
    async def handle_generation_error(
        project_id: str,
        error: Exception,
        stage: str
    ):
        """處理生成錯誤

        Args:
            project_id: 專案 ID
            error: 錯誤物件
            stage: 發生錯誤的階段
        """
        # 記錄錯誤
        logger.error(
            f"Project {project_id} failed at stage {stage}",
            exc_info=error
        )

        # 更新專案狀態
        db.query(Project).filter(Project.id == project_id).update({
            "status": "failed"
        })

        # 記錄錯誤詳情到資料庫
        error_log = ErrorLog(
            project_id=project_id,
            stage=stage,
            error_message=str(error),
            error_traceback=traceback.format_exc()
        )
        db.add(error_log)
        db.commit()

        # 發送錯誤通知 (WebSocket)
        redis_client.publish(
            f"progress:{project_id}",
            json.dumps({
                "type": "error",
                "stage": stage,
                "message": str(error)
            })
        )
```

---

## 5. 資源清理

### 5.1 清理臨時檔案

```python
class ResourceCleaner:
    """資源清理器"""

    @staticmethod
    def cleanup_project_temp_files(project_id: str):
        """清理專案臨時檔案

        Args:
            project_id: 專案 ID
        """
        temp_dir = f"/tmp/ytmaker/{project_id}"

        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            logger.info(f"Cleaned up temp files for project {project_id}")
```

---

## 總結

### 核心流程
- ✅ 腳本生成 → 素材生成 → 影片渲染 → YouTube 上傳
- ✅ 並行處理加速生成 (語音、圖片、虛擬主播)
- ✅ 即時進度更新
- ✅ 完整的錯誤處理與重試機制

---

**下一步:** 詳見 [background-jobs.md](./background-jobs.md)、[integrations.md](./integrations.md)
