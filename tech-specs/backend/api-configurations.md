# 配置管理 API

> **關聯文件:** [api-design.md](./api-design.md), [database.md](./database.md)

---

## 1. API 端點總覽

**基礎路徑:** `/api/v1/configurations`

**端點列表:**
- `GET /configurations` - 列出所有配置
- `POST /configurations` - 建立新配置
- `GET /configurations/:id` - 取得單一配置
- `PUT /configurations/:id` - 更新配置
- `DELETE /configurations/:id` - 刪除配置
- `POST /configurations/:id/duplicate` - 複製配置

**總計:** 6 個端點

---

## 2. API 詳細規格

### 2.1 列出所有配置

**端點:** `GET /api/v1/configurations`

**回應範例:**
```json
{
  "data": [
    {
      "id": "config_123",
      "name": "科技頻道標準配置",
      "usage_count": 15,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### 2.2 建立新配置

**端點:** `POST /api/v1/configurations`

**請求 Body:**
```json
{
  "name": "科技頻道標準配置",
  "config": {
    "subtitle": {
      "font_family": "Noto Sans TC",
      "font_size": 48,
      "font_color": "#FFFFFF",
      "position": { "x": 960, "y": 900 },
      "border_enabled": true,
      "shadow_enabled": true
    },
    "logo": {
      "file_path": "/logos/tech_logo.png",
      "position": { "x": 50, "y": 50 },
      "size": 100
    }
  }
}
```

**回應:**
```json
{
  "id": "config_123",
  "name": "科技頻道標準配置",
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

### 2.3 取得單一配置

**端點:** `GET /api/v1/configurations/{id}`

**回應範例:**
```json
{
  "id": "config_123",
  "name": "科技頻道標準配置",
  "config": {
    "subtitle": { ... },
    "logo": { ... }
  },
  "usage_count": 15,
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

### 2.4 更新配置

**端點:** `PUT /api/v1/configurations/{id}`

**請求 Body:**
```json
{
  "name": "更新後的配置名稱",
  "config": {
    "subtitle": {
      "font_size": 52
    }
  }
}
```

---

### 2.5 刪除配置

**端點:** `DELETE /api/v1/configurations/{id}`

**回應:**
```json
{
  "success": true,
  "message": "配置已刪除"
}
```

---

### 2.6 複製配置

**端點:** `POST /api/v1/configurations/{id}/duplicate`

**請求 Body:**
```json
{
  "new_name": "科技頻道配置 - 副本"
}
```

**回應:**
```json
{
  "id": "config_456",
  "name": "科技頻道配置 - 副本",
  "created_at": "2025-01-15T11:00:00Z"
}
```

---

## 總結

**端點數:** 6 個

**功能:**
- ✅ 配置 CRUD
- ✅ 配置複製
- ✅ 使用統計
