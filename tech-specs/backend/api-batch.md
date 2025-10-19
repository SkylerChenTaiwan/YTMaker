# 批次處理 API

## 關聯文件
- [API 總覽與規範](./overview.md)
- [資料模型](./database.md)
- [背景任務](./background-jobs.md)
- [API 設計 - 專案管理](./api-projects.md)

---

## 1.8 批次處理 API

### 1.8.1 建立批次任務

**端點：** `POST /api/v1/batch`
**說明：** 建立批次處理任務

**請求：**
```json
{
  "name": "批次任務名稱",
  "projects": [
    {
      "name": "專案 1",
      "content": "文字內容..."
    },
    {
      "name": "專案 2",
      "content": "文字內容..."
    }
  ],
  "configuration_id": "uuid",
  "prompt_template_id": "uuid",
  "gemini_model": "gemini-1.5-flash",
  "youtube_settings": { ... }
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "batch_id": "uuid",
    "total_projects": 2,
    "status": "QUEUED"
  }
}
```

---

### 1.8.2 取得批次任務列表

**端點：** `GET /api/v1/batch`
**說明：** 取得所有批次任務

**回應：**
```json
{
  "success": true,
  "data": {
    "batches": [
      {
        "id": "uuid",
        "name": "批次任務名稱",
        "total_projects": 10,
        "completed_projects": 7,
        "failed_projects": 1,
        "status": "RUNNING",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

### 1.8.3 取得批次任務詳情

**端點：** `GET /api/v1/batch/:id`
**說明：** 取得批次任務的詳細資訊

**回應：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "批次任務名稱",
    "total_projects": 10,
    "completed_projects": 7,
    "failed_projects": 1,
    "status": "RUNNING",
    "projects": [
      {
        "id": "uuid",
        "name": "專案 1",
        "status": "COMPLETED",
        "progress": 100,
        "youtube_url": "https://youtube.com/watch?v=..."
      },
      {
        "id": "uuid",
        "name": "專案 2",
        "status": "FAILED",
        "progress": 50,
        "error_message": "圖片生成失敗"
      }
    ]
  }
}
```
