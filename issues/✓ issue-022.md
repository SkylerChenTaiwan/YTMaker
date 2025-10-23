# [已解決] Issue-022: Prompt 範本頁面渲染錯誤 - templates.map is not a function

## 問題資訊
- **發現時機：** 測試階段 (瀏覽器執行時)
- **問題類型：** Bug
- **優先級：** P1 (高)
- **相關 Task：** 無
- **發現日期：** 2025-10-24

---

## 問題描述

### 簡述
在 Prompt 範本配置頁面 (`/project/[id]/configure/prompt-model`)，頁面無法正常渲染，瀏覽器控制台顯示錯誤：`TypeError: templates.map is not a function`。

### 詳細說明
當用戶進入 Prompt 範本配置頁面時，頁面崩潰並在控制台顯示多個相同的錯誤訊息。錯誤發生在 `page.tsx:177` 行，該行嘗試對 `templates` 進行 `.map()` 操作，但 `templates` 不是陣列。

錯誤訊息：
```
TypeError: templates.map is not a function
    at PromptModelPage (page.tsx:177:36)
    at renderWithHooks (react-dom.development.js:11121:18)
    ...
```

錯誤發生位置：
```tsx
// page.tsx:177
options={templates.map((t) => ({
  label: t.name,
  value: t.id,
}))}
```

---

## 重現步驟

### 前置條件
1. 後端 API 正在運行
2. 前端開發伺服器正在運行
3. 已創建專案並獲得專案 ID

### 詳細步驟
1. 導航到 `/project/[id]/configure/prompt-model` 頁面
2. 頁面載入，`useEffect` 執行 `getPromptTemplates()` API 呼叫
3. API 返回數據並設置 `templates` 狀態

### 實際結果
頁面崩潰，控制台顯示 `TypeError: templates.map is not a function`

### 預期結果
頁面正常渲染，顯示 Prompt 範本選擇器

### 參考 Spec
- 前端 API 規格：`frontend/src/lib/api/projects.ts`
- 後端 API 規格：`backend/app/api/v1/prompt_templates.py`

### 錯誤訊息
瀏覽器控制台重複顯示：
```
TypeError: templates.map is not a function
```

---

## 影響評估

### 影響範圍
- **影響頁面：** `/project/[id]/configure/prompt-model`
- **影響功能：** Prompt 範本選擇與配置
- **影響用戶：** 所有嘗試配置 Prompt 的用戶

### 頻率
100% 重現（每次進入該頁面都會發生）

### 嚴重程度
**高**
- 完全阻擋用戶配置 Prompt 範本
- 無法繼續專案設定流程
- 頁面完全無法使用

### 替代方案
目前無替代方案，用戶無法進行 Prompt 配置

---

## 根因分析

### 問題根源
**API 響應格式不一致**

#### 後端實際返回格式：
```typescript
// backend/app/api/v1/prompt_templates.py:16
{
  success: true,
  data: {
    templates: [...] // 陣列在這裡
  }
}
```

#### 前端 API 客戶端預期：
```typescript
// frontend/src/lib/api/projects.ts:76-79
export async function getPromptTemplates(): Promise<PromptTemplate[]> {
  const response = await apiClient.get('/api/v1/prompt-templates')
  return response.data  // ❌ 這裡直接返回 data，但 data 是物件，不是陣列
}
```

#### 問題所在：
1. 後端返回 `{ success: true, data: { templates: [...] } }`
2. 前端 `getPromptTemplates` 返回 `response.data`，也就是 `{ templates: [...] }`
3. 頁面中的 `templates` 狀態被設置為 `{ templates: [...] }` 物件
4. 當執行 `templates.map()` 時，因為 `templates` 是物件而非陣列，導致錯誤

### 根本原因類型
- **資料結構不一致**：前端 API 客戶端沒有正確解析後端的響應結構
- **API 契約問題**：前後端對 API 響應格式的理解不一致

---

## 解決方案

### 方案概述
修正前端 `getPromptTemplates` 函數，正確解析後端響應中的 `data.templates` 欄位。

### 詳細步驟

#### 1. 修改前端 API 客戶端
**檔案：** `frontend/src/lib/api/projects.ts:76-79`

**修改前：**
```typescript
export async function getPromptTemplates(): Promise<PromptTemplate[]> {
  const response = await apiClient.get('/api/v1/prompt-templates')
  return response.data
}
```

**修改後：**
```typescript
export async function getPromptTemplates(): Promise<PromptTemplate[]> {
  const response = await apiClient.get('/api/v1/prompt-templates')
  return response.data.templates  // ✅ 正確取得 templates 陣列
}
```

#### 2. 驗證其他 API 是否有相同問題
檢查 `projects.ts` 中的其他 API 函數，確認是否有類似的響應格式問題。

特別注意：
- `getProject()` - 使用 `response.data`，需確認後端格式
- 其他 API 端點的響應格式一致性

### Spec 更新需求
**不需要更新 Spec**
- 後端 API 格式正確，符合 RESTful 最佳實踐
- 問題在於前端實現，不是設計問題

### 程式碼變更計劃
1. ✅ 修改 `frontend/src/lib/api/projects.ts` 中的 `getPromptTemplates()`
2. ✅ 檢查並修正其他可能有相同問題的 API 函數
3. ✅ 測試驗證

### 測試計劃

#### 單元測試
無需新增單元測試（這是資料解析問題，會在整合測試中發現）

#### 整合測試
1. 測試 Prompt 範本頁面載入
2. 驗證範本列表正確顯示
3. 驗證選擇範本功能正常
4. 驗證範本內容正確填充

#### E2E 測試
1. 完整專案設定流程測試
2. 從建立專案 → 配置 Prompt → 配置 YouTube → 生成影片

### 風險評估
**風險：低**
- 修改範圍小且明確
- 不影響其他功能
- 可快速驗證

**注意事項：**
- 確認其他 API 也正確處理響應格式
- 測試完整的專案設定流程

---

## 預防措施

### 如何避免類似問題

#### 1. API 響應格式標準化
建立統一的 API 響應格式文件：
```typescript
// 標準成功響應
{
  success: true,
  data: T  // 實際數據
}

// 標準錯誤響應
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

#### 2. 創建型別安全的 API 客戶端包裝器
```typescript
// 建議創建統一的響應解析器
async function apiRequest<T>(url: string): Promise<T> {
  const response = await apiClient.get(url)
  if (!response.data.success) {
    throw new Error(response.data.error?.message)
  }
  return response.data.data
}
```

#### 3. 加強測試
- 所有 API 都應該有整合測試
- 測試應該驗證實際的 API 響應格式
- 使用真實的後端響應進行測試

#### 4. TypeScript 型別檢查
- 為所有 API 響應定義明確的介面
- 使用 runtime validation（如 Zod）驗證 API 響應

### 需要改進的流程

1. **API 開發流程：**
   - 前後端應使用共享的 API 契約定義（如 OpenAPI/Swagger）
   - 每個 API 變更都應該同步更新文檔

2. **測試流程：**
   - 新增 API 必須包含整合測試
   - 測試應使用真實的 API 響應

3. **Code Review：**
   - Review 時檢查 API 響應格式處理
   - 驗證型別定義與實際響應一致

---

## 相關文件
- `frontend/src/lib/api/projects.ts`
- `frontend/src/app/project/[id]/configure/prompt-model/page.tsx`
- `backend/app/api/v1/prompt_templates.py`

## 相關 Issue
無

## 標籤
`bug` `frontend` `api` `p1` `prompt-templates`
