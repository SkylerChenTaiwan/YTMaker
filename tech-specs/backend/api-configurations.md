# 配置與模板管理 API

## 關聯文件
- [API 總覽與規範](./overview.md)
- [資料模型](./database.md)
- [API 設計 - 專案管理](./api-projects.md)

---

## 1.5 配置與模板管理 API

### 1.5.1 列出配置模板

**端點：** `GET /api/v1/configurations`
**說明：** 取得所有視覺配置模板

**回應：**
```json
{
  "success": true,
  "data": {
    "configurations": [
      {
        "id": "uuid",
        "name": "預設配置",
        "created_at": "2025-01-15T10:30:00Z",
        "last_used_at": "2025-01-15T11:45:00Z",
        "usage_count": 10
      }
    ]
  }
}
```

---

### 1.5.2 建立配置模板

**端點：** `POST /api/v1/configurations`
**說明：** 建立新的視覺配置模板

**請求：**
```json
{
  "name": "配置名稱",
  "configuration": { ... }
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "配置名稱"
  }
}
```

---

### 1.5.3 列出 Prompt 範本

**端點：** `GET /api/v1/prompt-templates`
**說明：** 取得所有 Prompt 範本

**回應：**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "uuid",
        "name": "預設範本",
        "content": "Prompt 內容...",
        "is_default": true,
        "created_at": "2025-01-15T10:30:00Z",
        "usage_count": 20
      }
    ]
  }
}
```

---

### 1.5.4 建立 Prompt 範本

**端點：** `POST /api/v1/prompt-templates`
**說明：** 建立新的 Prompt 範本

**請求：**
```json
{
  "name": "自訂範本",
  "content": "Prompt 內容（包含段落時長要求）..."
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "自訂範本"
  }
}
```

---

### 1.5.5 刪除 Prompt 範本

**端點：** `DELETE /api/v1/prompt-templates/:id`
**說明：** 刪除 Prompt 範本（預設範本不可刪除）

**回應：**
```json
{
  "success": true,
  "message": "範本已刪除"
}
```
