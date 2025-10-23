# [已解決] Issue-015: API Keys 儲存失敗 - CORS 錯誤

**狀態：** ✅ 已解決
**優先級：** P0 緊急
**類型：** Integration
**發現時機：** 測試
**相關 Task：** 不明確（API Keys 管理功能）
**建立日期：** 2025-10-23

---

## 問題描述

### 簡述
前端嘗試儲存或測試 API Keys 時，所有請求都被 CORS 政策阻擋，導致功能完全無法使用。

### 詳細說明
當用戶在設定頁面嘗試：
1. 測試 API Key（`POST /api/v1/system/api-keys/test`）
2. 儲存 API Key（`POST /api/v1/system/api-keys`）

瀏覽器顯示 CORS 錯誤：
```
Access to XMLHttpRequest at 'http://localhost:8000/api/v1/system/api-keys/test'
from origin 'http://localhost:3001' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### 發現時機
在功能測試階段，嘗試使用 API Keys 管理功能時發現。

---

## 重現步驟

### 前置條件
1. 後端服務運行在 `http://localhost:8000`
2. 前端服務運行在 `http://localhost:3001`
3. 開啟設定頁面的 API Keys 管理區塊

### 詳細步驟
1. 前端在 port 3001 啟動（因 port 3000 被佔用或手動指定）
2. 開啟設定頁面
3. 嘗試新增或測試 API Key
4. 點擊「測試」或「儲存」按鈕

### 實際結果
- 瀏覽器控制台顯示 CORS 錯誤
- 請求被阻擋，回傳 `net::ERR_FAILED`
- API Key 無法儲存或測試
- 用戶無法使用此功能

### 預期結果
- 請求成功送達後端
- 後端正確處理請求
- API Key 可以正常儲存和測試

### 參考 Spec
根據 backend CORS 配置（`backend/app/core/config.py:16`），目前只允許：
- `http://localhost:3000`
- `http://127.0.0.1:3000`

但前端實際運行在 `http://localhost:3001`。

### 錯誤訊息
```
Access to XMLHttpRequest at 'http://localhost:8000/api/v1/system/api-keys/test' from origin 'http://localhost:3001' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.

POST http://localhost:8000/api/v1/system/api-keys/test net::ERR_FAILED
POST http://localhost:8000/api/v1/system/api-keys net::ERR_FAILED
```

---

## 影響評估

### 影響範圍
- **功能影響**：API Keys 管理功能完全無法使用
- **用戶影響**：無法設定和測試第三方 API Keys（Gemini、Stability AI、D-ID 等）
- **系統影響**：所有依賴 API Keys 的功能都無法啟用

### 頻率
每次嘗試使用 API Keys 功能時都會發生（100%）

### 嚴重程度
🔴 **Critical** - 核心功能完全阻斷

### 替代方案
暫時無替代方案。用戶無法透過前端介面設定 API Keys。

---

## 根因分析

### 分析相關程式碼

**後端 CORS 配置** (`backend/app/core/config.py:16`):
```python
ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
```

**CORS Middleware 設定** (`backend/app/main.py:82-88`):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # 只允許 3000 port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 根本原因類型
**配置不一致** - Backend CORS 配置與 Frontend 實際運行端口不匹配

### 問題來源
1. **設計假設**：後端假設前端永遠運行在 port 3000
2. **實際情況**：前端可能運行在其他 port（如 3001、3002 等）
3. **缺乏彈性**：CORS 配置寫死，無法自動適應前端 port 變化

---

## 驗證與測試計劃

**⚠️ 重要：在提出解決方案前，必須先定義如何驗證問題已解決**

### 驗證標準
- ✅ 前端在 port 3001 運行時，可以成功呼叫 API Keys 相關 API
- ✅ 前端在 port 3000 運行時，仍然可以正常運作（向後兼容）
- ✅ 瀏覽器控制台不再出現 CORS 錯誤
- ✅ API Keys 可以成功測試和儲存

### 自動化測試案例

#### 1. 基本驗證測試 - CORS Headers 正確設定
**測試名稱**: `test_cors_allows_frontend_port_3001`
**測試步驟**:
1. 模擬從 `http://localhost:3001` 發送 OPTIONS 請求
2. 檢查回應的 CORS headers

**輸入資料**:
```python
headers = {
    "Origin": "http://localhost:3001",
    "Access-Control-Request-Method": "POST"
}
```

**預期結果**:
- Response 包含 `Access-Control-Allow-Origin: http://localhost:3001`
- Response 包含 `Access-Control-Allow-Credentials: true`
- Response 包含 `Access-Control-Allow-Methods` 包含 POST

**測試類型**: 整合測試

#### 2. 邊界條件測試 - 不同端口都能正常運作
**測試名稱**: `test_cors_allows_multiple_ports`
**測試步驟**:
1. 測試 port 3000
2. 測試 port 3001
3. 測試 port 3002

**輸入資料**:
```python
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
```

**預期結果**:
- 所有 origins 都能通過 CORS 檢查
- 每個 origin 都收到正確的 CORS headers

**測試類型**: 整合測試

#### 3. 回歸測試 - 原有功能不受影響
**測試名稱**: `test_api_keys_crud_still_works`
**測試步驟**:
1. 從允許的 origin 發送 API Keys CRUD 請求
2. 驗證所有操作正常

**輸入資料**:
```python
api_key_data = {
    "service": "gemini",
    "key_name": "test_key",
    "api_key": "test_api_key_value"
}
```

**預期結果**:
- POST `/api/v1/system/api-keys/test` 成功
- POST `/api/v1/system/api-keys` 成功儲存
- GET `/api/v1/system/api-keys` 可以取得列表

**測試類型**: 整合測試

#### 4. 錯誤處理測試 - 不允許的 origin 仍被拒絕
**測試名稱**: `test_cors_rejects_unauthorized_origins`
**測試步驟**:
1. 從不在允許列表的 origin 發送請求
2. 驗證被正確拒絕

**輸入資料**:
```python
unauthorized_origins = [
    "http://evil.com",
    "http://localhost:8080",
    "https://random-domain.com"
]
```

**預期結果**:
- 這些 origins 不會收到 `Access-Control-Allow-Origin` header
- 請求被瀏覽器的 CORS 政策阻擋

**測試類型**: 安全測試

#### 5. E2E 測試 - 前端實際操作流程
**測試名稱**: `test_e2e_api_key_management_from_port_3001`
**測試步驟**:
1. 啟動前端在 port 3001
2. 啟動後端在 port 8000
3. 開啟設定頁面
4. 新增 API Key
5. 測試 API Key
6. 儲存 API Key
7. 驗證列表顯示

**輸入資料**:
- 使用者在 UI 輸入 API Key 資料

**預期結果**:
- 整個流程順利完成
- 無 CORS 錯誤
- API Key 成功儲存到資料庫

**測試類型**: E2E 測試

### 手動驗證步驟
1. **修改前驗證問題存在**:
   - 確認前端運行在 port 3001
   - 嘗試測試/儲存 API Key
   - 確認出現 CORS 錯誤

2. **修改後驗證問題解決**:
   - 重啟後端服務
   - 再次嘗試測試/儲存 API Key
   - 確認請求成功，無 CORS 錯誤
   - 檢查瀏覽器 Network tab，確認回應包含正確的 CORS headers

3. **多端口測試**:
   - 測試前端在 port 3000 運行（原始預設）
   - 測試前端在 port 3001 運行
   - 測試前端在 port 3002 運行
   - 確認都能正常運作

### 回歸測試範圍
- **API Keys 管理功能**：
  - 列表顯示
  - 新增
  - 測試
  - 刪除

- **其他使用相同 CORS 設定的功能**：
  - 專案管理 API
  - 系統設定 API
  - 所有需要跨域請求的功能

---

## 解決方案

### 方案概述
擴展 `ALLOWED_ORIGINS` 配置，新增常用的開發端口 (3001, 3002)，確保前端在不同端口運行時都能正常存取 API。

### 詳細步驟

#### 修改 `backend/app/core/config.py`
```python
# CORS 配置
ALLOWED_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
]
```

### Spec 更新需求
無需更新 spec（這是實作細節，不影響 API 行為）

### 程式碼變更計劃
1. 修改 `backend/app/core/config.py:16`
2. 重啟後端服務
3. 驗證 CORS 設定生效

### 風險評估
- **風險等級**: 極低
- **影響範圍**: 僅擴展允許的 origins，不影響現有功能
- **向後兼容**: 100% 兼容（原有 port 3000 仍然支援）
- **安全考量**: 僅開放 localhost 和 127.0.0.1，仍然安全

---

## 預防措施

### 如何避免類似問題
1. **文件化端口配置**：在 README 中說明前後端預設端口和 CORS 設定
2. **開發指南**：新增開發環境設定檢查清單
3. **錯誤提示優化**：當 CORS 錯誤發生時，後端 log 應該明確指出哪個 origin 被拒絕

### 需要改進的流程
1. **開發環境配置檢查**：
   - 新增啟動腳本，自動檢查前後端端口配置
   - 若檢測到前端使用非預期端口，發出警告

2. **CORS 配置彈性化** (未來改進):
   - 考慮在開發環境使用更寬鬆的 CORS 設定
   - 在 production 環境才使用嚴格的 origin 白名單

3. **測試覆蓋**：
   - 新增 CORS 相關的整合測試
   - 確保未來修改不會破壞 CORS 設定

---

## 實作記錄

### 變更歷史
- 2025-10-23 20:12: 建立 issue，分析根因，制定解決方案與測試計劃
- 2025-10-23 20:12: 實作測試案例（14 個測試，確認失敗 - Red）
- 2025-10-23 20:13: 修改 CORS 配置，新增 port 3001, 3002 支援
- 2025-10-23 20:14: 測試全部通過（Green），問題已解決

### 相關 Commits
- `61fdc56`: test: 新增測試驗證 issue-015 修復（CORS 支援多端口）[issue-015]
- `654d600`: fix: 修正 CORS 配置支援多端口 [issue-015]

### 驗證結果
✅ 所有 CORS 測試通過（15/15）
- port 3000, 3001, 3002 都能正常存取 API
- 未授權的 origins 仍被正確拒絕
- API Keys 功能可正常使用
- 無回歸問題

---

**建立者**: Claude Code
**最後更新**: 2025-10-23
**解決時間**: 2025-10-23 20:14
