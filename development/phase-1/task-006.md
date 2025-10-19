# Task-006: System API 實作

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 5 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **使用者流程：** `product-design/flows.md#Flow-0` (首次啟動)
- **使用者流程：** `product-design/flows.md#Flow-9` (系統設定)

### 技術規格
- **API 規格：** `tech-specs/backend/api-system.md`
- **認證授權：** `tech-specs/backend/auth.md`

### 相關任務
- **前置任務:** Task-002 ✅, Task-003 ✅
- **後續任務:** Task-020 (首次設定頁面), Task-026 (系統設定頁面)
- **並行任務:** Task-004, 005, 007~009 (可並行開發)

---

## 任務目標

### 簡述
實作系統管理 API，包含 API Keys 管理、系統設定、配額查詢、健康檢查。

### 成功標準
- [x] 4 個 API 端點全部實作
- [x] Keychain 整合完成（macOS/Linux/Windows）
- [x] SystemService 業務邏輯完整
- [x] 配額監控邏輯完成
- [x] 單元測試覆蓋率 > 80%

---

## API 端點清單 (4 個)

### 1. API Keys 管理
- `POST /api/v1/system/api-keys` - 設定 API Key
- `POST /api/v1/system/api-keys/test` - 測試 API 連線

### 2. 系統查詢
- `GET /api/v1/system/settings` - 取得系統設定
- `GET /api/v1/system/quota` - 查詢 API 配額

---

## Pydantic Schemas

### APIKeyCreate
```python
class APIKeyCreate(BaseModel):
    service_name: Literal["gemini", "stability_ai", "did", "youtube"]
    api_key: str = Field(..., min_length=10)
```

### QuotaResponse
```python
class QuotaResponse(BaseModel):
    did_remaining: int  # 剩餘分鐘數
    did_total: int = 90
    youtube_remaining: int  # 剩餘 units
    youtube_total: int = 10000
```

---

## Keychain 整合

### macOS - Keychain
```python
import keyring
keyring.set_password("ytmaker", "gemini_api_key", api_key)
api_key = keyring.get_password("ytmaker", "gemini_api_key")
```

### Linux - Secret Service
```python
# 使用 keyring 套件統一處理
```

### Windows - Credential Manager
```python
# 使用 keyring 套件統一處理
```

---

## 主要產出

### 1. API 路由檔案
- `backend/app/api/v1/system.py`

### 2. 業務邏輯檔案
- `backend/app/services/system_service.py`

### 3. 安全模組
- `backend/app/security/keychain.py`

### 4. 測試檔案
- `backend/tests/api/test_system.py`
- `backend/tests/security/test_keychain.py`

---

## 驗證檢查

### API 測試
```bash
# 設定 API Key
curl -X POST http://localhost:8000/api/v1/system/api-keys \
  -d '{"service_name": "gemini", "api_key": "..."}'

# 測試連線
curl -X POST http://localhost:8000/api/v1/system/api-keys/test \
  -d '{"service_name": "gemini"}'

# 查詢配額
curl http://localhost:8000/api/v1/system/quota
```

---

## 完成檢查清單

- [ ] 4 個 API 端點實作完成
- [ ] Keychain 整合完成
- [ ] API Key 加密儲存
- [ ] 配額監控邏輯完成
- [ ] 單元測試完成
- [ ] 測試覆蓋率 > 80%
