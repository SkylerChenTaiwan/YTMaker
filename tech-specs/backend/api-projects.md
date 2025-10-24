# 專案管理 API

## 關聯文件
- [API 總覽與規範](./overview.md)
- [資料模型](./database.md)
- [業務邏輯](./business-logic.md)
- [背景任務](./background-jobs.md)

---

## 1.4 專案管理 API

### 1.4.1 列出所有專案

**端點：** `GET /api/v1/projects`
**說明：** 取得專案列表（支援分頁、排序、篩選）

**查詢參數：**
- `limit`（選填）：每頁筆數，預設 20
- `offset`（選填）：偏移量，預設 0
- `sort_by`（選填）：排序欄位（created_at, updated_at），預設 updated_at
- `order`（選填）：排序方向（asc, desc），預設 desc
- `status`（選填）：狀態篩選（all, in_progress, completed, failed），預設 all

**回應：**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "name": "專案名稱",
        "status": "COMPLETED",
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T11:45:00Z",
        "youtube_url": "https://youtube.com/watch?v=..."
      }
    ],
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 1.4.2 建立新專案

**端點：** `POST /api/v1/projects`
**說明：** 建立新專案（步驟 1：上傳文字內容）

**請求：**
```json
{
  "name": "專案名稱",
  "content": "文字內容（500-10000 字）"
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "專案名稱",
    "status": "INITIALIZED",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

---

### 1.4.3 取得單一專案

**端點：** `GET /api/v1/projects/:id`
**說明：** 取得專案詳細資訊

**回應：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "專案名稱",
    "content": "文字內容",
    "status": "COMPLETED",
    "configuration": { ... },
    "prompt_template_id": "uuid",
    "gemini_model": "gemini-1.5-flash",
    "youtube_settings": { ... },
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T11:45:00Z"
  }
}
```

---

### 1.4.4 更新專案配置

**端點：** `PUT /api/v1/projects/:id/configuration`
**說明：** 更新專案的視覺化配置

**請求：**
```json
{
  "subtitle": {
    "font_family": "Noto Sans TC",
    "font_size": 48,
    "font_color": "#FFFFFF",
    "position": { "x": 960, "y": 950 },
    "border_enabled": false,
    "shadow_enabled": true,
    "shadow_color": "#000000",
    "shadow_offset": { "x": 2, "y": 2 },
    "background_enabled": false
  },
  "logo": {
    "file_path": "/path/to/logo.png",
    "position": { "x": 50, "y": 50 },
    "size": 100,
    "opacity": 100
  },
  "overlays": [
    {
      "type": "text",
      "content": "標題文字",
      "position": { "x": 100, "y": 100 },
      "font_size": 36,
      "color": "#FFFFFF"
    }
  ],
  "segment_overrides": {
    "1": {
      "subtitle": { "font_color": "#FF0000" }
    }
  }
}
```

**回應：**
```json
{
  "success": true,
  "message": "配置已更新"
}
```

---

### 1.4.5 更新 Prompt 與模型設定

**端點：** `PUT /api/v1/projects/:id/prompt-model`
**說明：** 更新專案的 Prompt 範本、自訂內容和 Gemini 模型

**請求：**
```json
{
  "prompt_template_id": "uuid",
  "prompt_content": "自訂的 Prompt 內容...",
  "gemini_model": "gemini-1.5-pro"
}
```

**欄位說明：**
- `prompt_template_id` (可選): Prompt 範本 ID
- `prompt_content` (可選): 自訂 Prompt 內容，如果提供則優先使用此內容
- `gemini_model` (必填): Gemini 模型名稱

**邏輯：**
- 如果提供 `prompt_content`，使用自訂內容（優先）
- 如果只提供 `prompt_template_id`，從範本讀取內容
- 生成影片時，使用 `prompt_content`（如有）或從 `prompt_template_id` 讀取

**回應：**
```json
{
  "success": true,
  "message": "Prompt 與模型設定已更新"
}
```

---

### 1.4.6 更新 YouTube 設定

**端點：** `PUT /api/v1/projects/:id/youtube-settings`
**說明：** 更新專案的 YouTube 上傳設定

**請求：**
```json
{
  "title": "影片標題",
  "description": "影片描述",
  "tags": ["標籤1", "標籤2"],
  "privacy": "public",
  "publish_type": "immediate",
  "scheduled_time": null,
  "ai_content_flag": true
}
```

**回應：**
```json
{
  "success": true,
  "message": "YouTube 設定已更新"
}
```

---

### 1.4.7 開始生成影片

**端點：** `POST /api/v1/projects/:id/generate`
**說明：** 開始影片生成流程

**請求：** 無

**回應：**
```json
{
  "success": true,
  "data": {
    "task_id": "celery-task-id",
    "status": "SCRIPT_GENERATING",
    "estimated_time": 1500
  }
}
```

---

### 1.4.8 取得生成進度（WebSocket）

**端點：** `WS /api/v1/projects/:id/progress`
**說明：** 即時接收生成進度更新

**WebSocket 訊息格式（Server → Client）：**
```json
{
  "event": "progress_update",
  "data": {
    "status": "ASSETS_GENERATING",
    "progress": 45,
    "current_stage": "圖片生成中...",
    "substages": {
      "audio": "completed",
      "images": "in_progress",
      "avatar": "pending"
    },
    "estimated_remaining": 600,
    "logs": [
      {
        "level": "info",
        "message": "圖片 #10 生成成功",
        "timestamp": "2025-01-15T11:30:00Z"
      }
    ]
  }
}
```

**錯誤訊息：**
```json
{
  "event": "error",
  "data": {
    "error_code": "GEMINI_API_ERROR",
    "message": "Gemini API 錯誤：API 金鑰無效",
    "timestamp": "2025-01-15T11:30:00Z"
  }
}
```

---

### 1.4.9 取得專案結果

**端點：** `GET /api/v1/projects/:id/result`
**說明：** 取得已完成專案的結果

**回應：**
```json
{
  "success": true,
  "data": {
    "youtube_url": "https://youtube.com/watch?v=...",
    "youtube_video_id": "video-id",
    "status": "published",
    "title": "影片標題",
    "description": "影片描述",
    "tags": ["標籤1", "標籤2"],
    "local_files": {
      "video": "/path/to/final_video.mp4",
      "thumbnail": "/path/to/thumbnail.jpg"
    }
  }
}
```

---

### 1.4.10 刪除專案

**端點：** `DELETE /api/v1/projects/:id`
**說明：** 刪除專案及其所有檔案

**查詢參數：**
- `delete_files`（選填）：是否刪除本地檔案，預設 true

**回應：**
```json
{
  "success": true,
  "message": "專案已刪除"
}
```
