# Task-003: API 基礎架構與錯誤處理

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 5 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 技術規格
- **API 設計：** `tech-specs/backend/api-design.md`
- **錯誤處理：** `tech-specs/backend/api-design.md#錯誤處理`
- **安全性：** `tech-specs/backend/security.md`

### 相關任務
- **前置任務：** Task-001 ✅ (專案初始化), Task-002 ✅ (資料庫設計)
- **後續任務：** Task-004 ~ 009 (所有 API 端點實作)
- **依賴關係：** 所有 API 端點都依賴此基礎架構

---

## 任務目標

### 簡述
建立 FastAPI 基礎設定，實作全局錯誤處理機制、中間件、CORS 配置、請求/回應日誌，以及健康檢查端點。

### 成功標準
- [x] FastAPI 應用初始化與配置完成
- [x] 統一錯誤處理機制實作
- [x] 請求/回應日誌中間件完成
- [x] CORS 配置正確
- [x] 健康檢查端點實作
- [x] 錯誤回應格式統一
- [x] 單元測試覆蓋率 > 80%

---

## 主要產出

### 1. FastAPI 應用初始化
```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="YTMaker API",
    version="1.0.0",
    description="YouTube 影片自動化生產系統 API"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. 統一錯誤處理

#### ErrorResponse Schema
```python
# app/schemas/error.py
class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime
    path: str
```

#### 全局異常處理器
- ValidationError 處理（400）
- NotFoundError 處理（404）
- UnauthorizedError 處理（401）
- InternalServerError 處理（500）

### 3. 中間件

#### 日誌中間件
- 記錄所有請求/回應
- 記錄處理時間
- 記錄錯誤詳情

#### 錯誤處理中間件
- 捕獲未處理的異常
- 格式化錯誤回應

### 4. 健康檢查端點

#### GET /health
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }
```

#### GET /api/v1/health
```python
@app.get("/api/v1/health")
async def api_health_check():
    # 檢查資料庫連線
    # 檢查 Redis 連線
    return {
        "status": "healthy",
        "database": "connected",
        "redis": "connected",
        "timestamp": datetime.utcnow().isoformat()
    }
```

---

## 錯誤回應格式

### 驗證錯誤 (400)
```json
{
  "error": "ValidationError",
  "message": "請求資料驗證失敗",
  "details": {
    "field": "email",
    "issue": "Invalid email format"
  },
  "timestamp": "2025-10-19T10:30:00Z",
  "path": "/api/v1/projects"
}
```

### 未找到 (404)
```json
{
  "error": "NotFound",
  "message": "找不到指定的專案",
  "details": {
    "project_id": "123"
  },
  "timestamp": "2025-10-19T10:30:00Z",
  "path": "/api/v1/projects/123"
}
```

### 內部錯誤 (500)
```json
{
  "error": "InternalServerError",
  "message": "伺服器內部錯誤",
  "details": null,
  "timestamp": "2025-10-19T10:30:00Z",
  "path": "/api/v1/projects"
}
```

---

## CORS 配置

### 開發環境
- 允許來源：`http://localhost:3000`
- 允許憑證：是
- 允許方法：所有
- 允許標頭：所有

### 生產環境
- 允許來源：Electron 應用（自動偵測）
- 允許憑證：是
- 允許方法：GET, POST, PUT, DELETE, PATCH
- 允許標頭：Content-Type, Authorization

---

## 日誌配置

### 日誌格式
```
[2025-10-19 10:30:00] INFO: GET /api/v1/projects - 200 - 45ms
[2025-10-19 10:30:05] ERROR: POST /api/v1/projects - 400 - ValidationError: ...
```

### 日誌級別
- DEBUG: 開發環境
- INFO: 正常請求
- WARNING: 異常但可處理
- ERROR: 錯誤和異常

---

## 驗證檢查

### 健康檢查測試
```bash
curl http://localhost:8000/health
# 應返回 {"status": "healthy", ...}

curl http://localhost:8000/api/v1/health
# 應返回包含資料庫和 Redis 狀態的回應
```

### 錯誤處理測試
```bash
# 測試 404
curl http://localhost:8000/api/v1/nonexistent
# 應返回統一的 404 錯誤格式

# 測試驗證錯誤（實作 API 後測試）
```

### 單元測試
```bash
pytest tests/api/test_error_handling.py
pytest tests/middleware/
# 所有測試應通過
```

---

## 注意事項

1. **錯誤訊息：** 不洩漏敏感資訊（如堆疊追蹤）給前端
2. **日誌安全：** 不記錄敏感資料（API Keys, Tokens）
3. **CORS：** 生產環境需要正確配置允許的來源
4. **效能：** 中間件不應顯著影響回應時間（< 5ms overhead）

---

## 完成檢查清單

- [ ] FastAPI 應用初始化完成
- [ ] ErrorResponse schema 定義完成
- [ ] 全局異常處理器實作完成
- [ ] 日誌中間件實作完成
- [ ] CORS 配置完成
- [ ] 健康檢查端點實作完成
- [ ] 錯誤回應格式統一
- [ ] 單元測試完成
- [ ] 測試覆蓋率 > 80%
- [ ] 日誌輸出正確
