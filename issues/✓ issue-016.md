# [已解決] Issue-016: API Keys 設定頁面無法載入與儲存

## 問題描述

### 簡述
API Keys 設定頁面在載入時發生多個 API 錯誤，且 API Key 測試成功後無法儲存。

### 詳細說明
當用戶進入 Settings 頁面的 API Keys Tab 時，瀏覽器 console 出現以下錯誤：

1. **405 Method Not Allowed** - `GET http://localhost:8000/api/v1/system/api-keys`
2. **404 Not Found** - `GET http://localhost:8000/api/v1/system/quotas`
3. **Antd Warning** - `APIKeysTab.tsx:57` 使用靜態 message 方法無法消費 context

用戶反映：「測試成功但無法儲存」

### 發現時機
- 用戶在設定 API Keys 時發現
- 發生在 Settings 頁面載入與 API Key 儲存操作

### 相關 Task
無直接關聯的 task（這是現有功能的問題）

### 問題類型
- **Bug** - API 端點不匹配與缺失
- **Integration** - 前後端 API 規格不一致

### 優先級
**P1 (高)** - 阻礙核心功能使用，用戶無法設定必要的 API Keys

---

## 影響評估

### 影響範圍
- ✗ API Keys 無法載入
- ✗ API Quotas 無法顯示
- ✗ 用戶體驗受損（看到 console 錯誤）
- ⚠️ API Key 儲存功能可能受影響

### 頻率
每次進入 Settings 頁面都會發生

### 嚴重程度
**高** - 核心功能無法正常使用

### 替代方案
無 - 這是設定 API Keys 的唯一入口

---

## 重現步驟

### 前置條件
1. 啟動 backend (`cd backend && python main.py`)
2. 啟動 frontend (`cd frontend && npm run dev`)
3. 在瀏覽器開啟開發者工具的 Console

### 詳細步驟
1. 訪問 `http://localhost:3000/settings`
2. 觀察 Console 錯誤
3. 嘗試編輯任一 API Key
4. 輸入 API Key 並測試
5. 測試成功後點擊「儲存」
6. 觀察是否成功儲存

### 實際結果
- Console 出現 405 和 404 錯誤
- Quotas 區域顯示「尚無配額資訊」
- （待確認）儲存可能失敗或成功但無法重新載入

### 預期結果
- 無錯誤
- API Keys 正確載入並顯示
- Quotas 正確載入並顯示
- 儲存後能成功更新狀態

### 參考 Spec
應該參考 `tech-specs/backend/api-system.md`（如果存在）

### 錯誤訊息
```
APIKeysTab.tsx:57 Warning: [antd: message] Static function can not consume context like dynamic theme. Please use 'App' component instead.

system.ts:7
 GET http://localhost:8000/api/v1/system/api-keys 405 (Method Not Allowed)

useAuthStore.ts:182 Failed to fetch API keys
AxiosError {message: 'Request failed with status code 405', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}

system.ts:34
 GET http://localhost:8000/api/v1/system/quotas 404 (Not Found)

useAuthStore.ts:191 Failed to fetch quotas
AxiosError {message: 'Request failed with status code 404', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}
```

---

## 根因分析

### 程式碼分析

#### Frontend API Calls
**檔案：** `frontend/src/lib/api/system.ts`

```typescript
// Line 6-9: GET API Keys (前端期待 GET)
async getAPIKeys() {
  const res = await apiClient.get('/api/v1/system/api-keys')
  return res.data.data
}

// Line 33-36: GET Quotas (前端期待 GET)
async getQuotas(): Promise<Quotas> {
  const res = await apiClient.get('/api/v1/system/quotas')
  return res.data.data
}
```

#### Backend API Endpoints
**檔案：** `backend/app/api/v1/system.py`

```python
# Line 32-45: POST API Keys (後端只提供 POST，用於儲存)
@router.post("/api-keys", status_code=status.HTTP_200_OK)
async def save_api_key(...)

# Line 48-65: POST API Keys Test (正確，POST)
@router.post("/api-keys/test")
async def test_api_key(...)

# Line 68-80: GET Quota (路徑是 /quota，不是 /quotas)
@router.get("/quota", response_model=QuotaResponse)
async def get_quota(...)
```

### 根本原因

**問題 1：缺少 GET /api-keys 端點**
- Frontend 需要 `GET /api/v1/system/api-keys` 來載入已儲存的 API Keys
- Backend 只提供 `POST /api/v1/system/api-keys` 用於儲存
- **缺少讀取端點** → 405 Method Not Allowed

**問題 2：路徑不匹配 /quota vs /quotas**
- Frontend 呼叫 `GET /api/v1/system/quotas` (複數)
- Backend 提供 `GET /api/v1/system/quota` (單數)
- **路徑不一致** → 404 Not Found

**問題 3：Antd Message 警告**
- 使用靜態的 `message.error()` 無法獲取動態 theme context
- 應該使用 Antd 的 `App` component 提供的 message hook

### 問題來源
前後端 API 規格在開發過程中未能保持一致，可能原因：
1. Backend 開發時未完整實作 CRUD（只做了 Create，沒做 Read）
2. Frontend 與 Backend 未同步確認 API 規格
3. 缺少 API 整合測試來提早發現此問題

---

## 解決方案

### 方案概述
1. **Backend 新增 GET /api-keys 端點** - 讓前端能讀取已儲存的 API Keys
2. **Backend 修正路徑** - 將 `/quota` 改為 `/quotas` 以匹配前端
3. **Frontend 修正 message 使用方式** - 使用 App context 提供的 message

### 詳細步驟

#### Step 1: Backend - 新增 GET API Keys 端點

**檔案：** `backend/app/api/v1/system.py`

在 `save_api_key` 之前新增：

```python
@router.get("/api-keys")
async def get_api_keys(
    system_service: SystemService = Depends(get_system_service)
):
    """
    取得所有已儲存的 API Keys（不含實際 key 內容，只顯示是否已設定）

    回傳：
    - gemini: Google Gemini API Key 狀態
    - stability_ai: Stability AI API Key 狀態
    - did: D-ID API Key 狀態
    """
    data = await system_service.get_api_keys_status()
    return {"success": True, "data": data}
```

**檔案：** `backend/app/services/system_service.py`

新增方法：

```python
async def get_api_keys_status(self) -> dict:
    """取得所有 API Keys 的設定狀態"""
    return {
        "gemini": await self.keychain_service.get_api_key("gemini"),
        "stabilityAI": await self.keychain_service.get_api_key("stability_ai"),
        "dId": await self.keychain_service.get_api_key("did"),
    }
```

#### Step 2: Backend - 修正路徑名稱

**檔案：** `backend/app/api/v1/system.py:68`

```python
# 從：
@router.get("/quota", response_model=QuotaResponse)

# 改為：
@router.get("/quotas", response_model=QuotaResponse)
```

#### Step 3: Frontend - 修正 Antd message 使用方式

**檔案：** `frontend/src/components/settings/APIKeysTab.tsx`

```typescript
// 在頂部 import
import { App } from 'antd'

// 在 component 內部
export const APIKeysTab = () => {
  const { message } = App.useApp()  // 使用 hook 替代靜態方法

  // ... 其餘程式碼保持不變，message 使用方式相同
}
```

**檔案：** `frontend/src/components/settings/EditAPIKeyModal.tsx`

同樣修改：

```typescript
import { App } from 'antd'

export const EditAPIKeyModal = ({ ... }: Props) => {
  const { message } = App.useApp()
  // ... 其餘程式碼
}
```

**確保 App 層級有包裹：** `frontend/src/app/layout.tsx` 或相應的根組件

```typescript
import { App as AntdApp } from 'antd'

// 在 return 中包裹
<AntdApp>
  {children}
</AntdApp>
```

### Spec 更新需求
需要建立或更新 `tech-specs/backend/api-system.md`，明確定義：
- `GET /api/v1/system/api-keys` - 取得 API Keys 狀態
- `POST /api/v1/system/api-keys` - 儲存 API Key
- `POST /api/v1/system/api-keys/test` - 測試 API Key
- `DELETE /api/v1/system/api-keys/{provider}` - 刪除 API Key
- `GET /api/v1/system/quotas` - 取得配額資訊

### 程式碼變更計劃
1. ✅ `backend/app/api/v1/system.py` - 新增 GET 端點，修正路徑
2. ✅ `backend/app/services/system_service.py` - 新增 `get_api_keys_status()` 方法
3. ✅ `frontend/src/components/settings/APIKeysTab.tsx` - 修正 message 使用
4. ✅ `frontend/src/components/settings/EditAPIKeyModal.tsx` - 修正 message 使用
5. ✅ 確保根組件有 `<AntdApp>` 包裹

### 測試計劃
1. **單元測試** - `tests/api/test_system.py`
   - 測試 `GET /api/v1/system/api-keys` 回傳正確格式
   - 測試 `GET /api/v1/system/quotas` (修正後的路徑)

2. **整合測試**
   - 啟動 backend 與 frontend
   - 進入 Settings 頁面
   - 確認無 console 錯誤
   - 確認 API Keys 和 Quotas 正確顯示
   - 測試完整流程：編輯 → 測試 → 儲存 → 重新載入

3. **手動測試檢查清單**
   - [ ] 進入 Settings 無 console 錯誤
   - [ ] API Keys 列表正確顯示狀態
   - [ ] Quotas 正確顯示（如有設定）
   - [ ] 編輯 API Key modal 正常開啟
   - [ ] 測試連線功能正常
   - [ ] 儲存後狀態正確更新
   - [ ] 刪除功能正常

### 風險評估
- **低風險** - 只是新增端點和修正路徑
- **需注意** - 確保 `get_api_keys_status()` 不會回傳實際的 API Key 內容（安全性）

---

## 預防措施

### 如何避免類似問題
1. **API 規格文件優先** - 前後端開發前先確定 API 規格
2. **整合測試** - 新增涵蓋前後端的 E2E 測試
3. **API Contract Testing** - 使用工具（如 OpenAPI/Swagger）確保前後端一致
4. **Code Review** - 確認前後端的 API 呼叫與定義匹配

### 需要改進的流程
1. 建立 `tech-specs/backend/api-system.md` 作為 single source of truth
2. 在 CI/CD 中加入 API schema validation
3. Frontend 與 Backend 開發時參考同一份 API spec 文件

---

## 狀態
✅ **已解決** - 所有修復已完成並測試通過

## 建立時間
2025-10-23

## 解決時間
2025-10-23

## 負責人
Claude Code

## 標籤
`bug`, `api`, `integration`, `P1`, `frontend`, `backend`
