# [已解決] Issue-017: 前端 API 端點 404 錯誤

> **建立日期:** 2025-10-23
> **優先級:** P1 (高)
> **問題類型:** Integration
> **相關 Task:** Task-027 (配置與模板管理頁面)

---

## 問題簡述

前端在整合測試時發現兩個 404 錯誤：
1. `GET http://localhost:3000/favicon.ico 404` - 前端開發伺服器缺少 favicon
2. `GET http://localhost:8000/api/v1/configurations/templates 404` - 後端 API 路由不存在

---

## 問題詳述

### 發現時機
整合測試階段，用戶在瀏覽模板管理頁面時發現

### 相關檔案
- 前端 API 客戶端：`frontend/src/lib/api/configurationsApi.ts`
- 前端元件：`frontend/src/components/templates/VisualTemplatesTab.tsx`
- 後端路由：`backend/app/api/v1/configurations.py`
- Spec：`tech-specs/backend/api-configurations.md`

---

## 重現步驟

### 前置條件
- 前端開發伺服器運行：`npm run dev` (port 3000)
- 後端 API 伺服器運行：`uvicorn app.main:app --reload` (port 8000)

### 詳細步驟
1. 訪問模板管理頁面：`http://localhost:3000/templates`
2. 頁面載入視覺配置模板 Tab
3. 前端呼叫 API：`GET http://localhost:8000/api/v1/configurations/templates`
4. 收到 404 Not Found 錯誤

### 實際結果
```
configurationsApi.ts:49
GET http://localhost:8000/api/v1/configurations/templates 404 (Not Found)
```

### 預期結果
- API 應該成功回傳視覺模板列表
- 前端正確顯示模板卡片

### 參考 Spec
- `tech-specs/backend/api-configurations.md` 行 14：定義 `GET /api/v1/configurations` 端點
- Task-027 行 1372-1376：前端 API 定義呼叫 `/api/v1/configurations/templates`

---

## 影響評估

### 影響範圍
- **前端頁面：** 模板管理頁面無法載入視覺模板列表
- **功能影響：** 用戶無法查看、使用、刪除視覺配置模板
- **用戶體驗：** 頁面會一直顯示 loading 或錯誤狀態

### 頻率
每次訪問模板管理頁面都會發生

### 嚴重程度
高 - 影響核心功能

### 替代方案
暫時無法使用視覺模板功能，必須直接從配置頁面管理

---

## 根因分析

### 問題來源

**1. API 設計不一致**

檢查 spec (`tech-specs/backend/api-configurations.md`)：
- 行 14：定義 `GET /api/v1/configurations` - 列出所有配置模板
- 行 65：定義 `GET /api/v1/prompt-templates` - 列出 Prompt 範本
- **沒有定義** `/api/v1/configurations/templates` 端點

檢查後端實作 (`backend/app/api/v1/configurations.py`)：
- 只實作了 `/configurations` 和子路由 `/{configuration_id}`
- **沒有實作** `/configurations/templates` 端點

檢查前端 API 客戶端 (`frontend/src/lib/api/configurationsApi.ts`)：
- 行 48-53：`getVisualTemplates()` 呼叫 `/api/v1/configurations/templates`
- 這個端點不存在於 spec 和後端實作中

**2. 概念混淆**

分析發現有概念上的混淆：
- **視覺配置 (Configuration)** 和 **視覺模板 (Visual Template)** 被當作不同的資源
- 但根據 spec 和資料庫設計，它們應該是同一個資源
- `Configuration` 資料表就是用來存儲視覺配置模板的

**3. Task-027 文件錯誤**

Task-027 第 1372-1376 行定義的 API 與 spec 不一致：
```typescript
// Task-027 的定義 (錯誤)
export async function getVisualTemplates() {
  return apiClient.get('/api/v1/configurations/templates')
}
```

應該根據 spec 改為：
```typescript
// 正確的定義
export async function getVisualTemplates() {
  return apiClient.get('/api/v1/configurations')
}
```

### 根本原因類型
- **設計問題：** Spec 與 Task 文件不一致
- **實作問題：** 前端實作未遵循 spec

---

## 解決方案

### 方案概述
修正前端 API 客戶端，使其符合後端 spec 定義

### 詳細步驟

**1. 修正前端 API 客戶端**

修改 `frontend/src/lib/api/configurationsApi.ts`：
- `getVisualTemplates()` 改為呼叫 `/api/v1/configurations`
- `deleteVisualTemplate()` 改為呼叫 `/api/v1/configurations/${id}`
- 保持回傳格式一致，確保前端元件不需修改

**2. 新增 favicon.ico**

在 `frontend/public/` 目錄下新增 `favicon.ico` 文件（次要問題）

**3. 驗證修復**

- 啟動前後端服務
- 訪問模板管理頁面
- 確認視覺模板列表正確載入
- 確認刪除功能正常

### Spec 更新需求
不需要更新 spec，spec 本身是正確的

需要更新的是：
- Task-027 文件（標記問題並記錄修正）

### 程式碼變更計劃

**檔案：** `frontend/src/lib/api/configurationsApi.ts`

**變更前 (行 47-53)：**
```typescript
// 列出視覺配置模板
export async function getVisualTemplates(): Promise<ApiResponse<{ templates: VisualTemplate[] }>> {
  const response = await apiClient.get<ApiResponse<{ templates: VisualTemplate[] }>>(
    '/api/v1/configurations/templates'
  )
  return response.data
}
```

**變更後：**
```typescript
// 列出視覺配置模板
export async function getVisualTemplates(): Promise<ApiResponse<{ templates: VisualTemplate[] }>> {
  const response = await apiClient.get<ApiResponse<{ configurations: Configuration[] }>>(
    '/api/v1/configurations'
  )
  // 轉換 configurations 為 templates 格式以保持前端元件不變
  return {
    ...response.data,
    data: {
      templates: response.data.data?.configurations.map(config => ({
        id: config.id,
        name: config.name,
        description: '', // configurations 沒有 description 欄位
        thumbnail_url: null, // configurations 沒有 thumbnail_url 欄位
        configuration_data: config.configuration_data,
        created_at: config.created_at,
        usage_count: config.usage_count
      })) || []
    }
  }
}
```

**檔案：** `frontend/src/lib/api/configurationsApi.ts`

**變更前 (行 56-59)：**
```typescript
// 刪除視覺模板
export async function deleteVisualTemplate(id: string): Promise<ApiResponse<{ message: string }>> {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/api/v1/configurations/templates/${id}`)
  return response.data
}
```

**變更後：**
```typescript
// 刪除視覺模板
export async function deleteVisualTemplate(id: string): Promise<ApiResponse<{ message: string }>> {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/api/v1/configurations/${id}`)
  return response.data
}
```

**檔案：** `frontend/public/favicon.ico`

新增一個簡單的 favicon 文件（可以使用專案 logo 或預設圖示）

### 測試計劃

**1. 單元測試**
```bash
npm test -- configurationsApi
```
驗證 API 客戶端函數正確呼叫端點

**2. 整合測試**
```bash
npm test -- VisualTemplatesTab
```
驗證前端元件可正確載入模板列表

**3. E2E 測試**
```bash
npm run e2e -- --grep "模板管理"
```
驗證完整的模板管理流程

**4. 手動測試**
- 訪問 `http://localhost:3000/templates`
- 確認視覺模板列表正確顯示
- 嘗試刪除一個模板
- 確認無 404 錯誤

### 風險評估

**風險：** 低

- 變更範圍小，只修改前端 API 客戶端
- 後端無需改動
- 有完整的測試覆蓋

**潛在影響：**
- 前端元件依賴 `VisualTemplate` 型別的 `description` 和 `thumbnail_url` 欄位
- 需要提供預設值或調整元件處理方式

**緩解措施：**
- 在 API 客戶端層做資料轉換
- 保持前端元件介面不變
- 如果需要 `description` 和 `thumbnail_url`，可以考慮在資料庫擴充 `Configuration` 模型

---

## 預防措施

### 如何避免類似問題

1. **嚴格遵循 Spec**
   - 開發前仔細閱讀 spec
   - 實作時對照 spec 檢查端點
   - 不自行創造未定義的 API 端點

2. **前後端 API 定義統一**
   - 考慮使用 OpenAPI/Swagger 定義 API
   - 從 API 定義自動生成前端客戶端
   - 後端實作與 OpenAPI 定義一致性檢查

3. **早期整合測試**
   - 不要等到最後才做整合測試
   - 實作完 API 客戶端立即測試
   - 使用 mock server 驗證 API 契約

4. **Code Review**
   - Review 時檢查 API 呼叫是否符合 spec
   - 對照後端路由定義

### 需要改進的流程

1. **Task 文件生成**
   - `/detail-task` 命令在生成實作規格時，應該更仔細地檢查 spec
   - API 端點定義必須 100% 對應後端 spec

2. **開發檢查清單**
   - 在 Task 文件中新增「API 端點核對」檢查項
   - 實作前必須確認所有 API 端點在後端 spec 中有定義

3. **自動化測試**
   - 新增 API 契約測試
   - 前端呼叫的每個端點都應該有對應的 mock 測試

---

## 相關記錄

- **相關 Task:** Task-027 (配置與模板管理頁面)
- **相關 Issue:** 無
- **相關 Commit:** 待修復後記錄

---

## 附加資訊

### 錯誤訊息完整記錄

**主控台 (前端開發伺服器)：**
```
GET http://localhost:3000/favicon.ico 404 (Not Found)
```

**模板管理頁：**
```
configurationsApi.ts:49
GET http://localhost:8000/api/v1/configurations/templates 404 (Not Found)

configurationsApi.ts:49
GET http://localhost:8000/api/v1/configurations/templates 404 (Not Found)
```

### 環境資訊
- **前端：** Next.js 14, React 18, Ant Design 5
- **後端：** FastAPI, Python 3.9
- **開發環境：** macOS
- **瀏覽器：** (用戶未提供，但錯誤格式看起來是 Chrome DevTools)

---

**修復完成後，請：**
1. 標記此 issue 為 `[已解決]`
2. 重新命名檔案為 `✓ issue-017.md`
3. 更新 Task-027 記錄此問題與修復
4. Commit 並 push 到 remote
