# 統計與配額 API

## 關聯文件
- [API 總覽與規範](./overview.md)
- [第三方整合](./integrations.md)
- [快取策略](./caching.md)

---

## 1.7 統計與配額 API

### 1.7.1 取得統計資料

**端點：** `GET /api/v1/stats`
**說明：** 取得儀表板統計資料

**回應：**
```json
{
  "success": true,
  "data": {
    "total_projects": 50,
    "projects_this_month": 10,
    "api_quotas": {
      "did": {
        "used": 30,
        "total": 90,
        "unit": "minutes"
      },
      "youtube": {
        "used": 2000,
        "total": 10000,
        "unit": "units"
      }
    }
  }
}
```

---

### 1.7.2 取得 API 配額

**端點：** `GET /api/v1/system/quotas`
**說明：** 取得所有外部服務的配額使用情況

**回應：**
```json
{
  "success": true,
  "data": {
    "quotas": {
      "did": {
        "used": 30,
        "total": 90,
        "unit": "minutes",
        "reset_at": "2025-02-01T00:00:00Z"
      },
      "youtube": {
        "used": 2000,
        "total": 10000,
        "unit": "units",
        "reset_at": "2025-01-16T00:00:00Z"
      }
    }
  }
}
```
