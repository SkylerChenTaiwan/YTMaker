# Issue-024: Prompt 設定更新 API 端點 404 錯誤

**優先級：** P0 (緊急 - 阻斷功能)
**類型：** Bug
**發現時機：** 用戶測試
**相關 Task：** N/A
**建立日期：** 2025-10-24

---

## 問題描述

### 簡述
在專案設定流程中,選擇 Prompt 範本和 Gemini 模型後按下「下一步」時,前端發送 API 請求失敗,出現 404 錯誤。

### 詳細說明
- **錯誤訊息：** `PUT http://localhost:8000/api/v1/projects/{id}/prompt-settings 404 (Not Found)`
- **發生位置：** `frontend/src/lib/api/projects.ts:98`
- **錯誤對象：** AxiosError with status code 404

### 發現時機
用戶在完成專案的第一步後,在第二步「Prompt 設定」頁面選擇範本和模型,點擊「下一步」按鈕時發生。

---

## 重現步驟

### 前置條件
- Backend 和 Frontend 都在運行
- 已建立專案並進入 Prompt 設定步驟

### 詳細步驟
1. 進入專案設定流程
2. 完成第一步 (內容輸入)
3. 進入第二步 (Prompt 設定)
4. 選擇 Prompt 範本
5. 選擇 Gemini 模型
6. 點擊「下一步」按鈕

### 實際結果
- HTTP 404 錯誤
- 前端顯示 "Failed to save" 錯誤訊息
- 無法進入下一步

### 預期結果
- 成功保存 Prompt 設定
- 順利進入下一步 (YouTube 設定)

### 參考 Spec
- `tech-specs/backend/api-projects.md` - 專案 API 規格
- `tech-specs/frontend/page-project-settings.md` - 專案設定頁面規格

---

## 影響評估

### 影響範圍
- **受影響功能：** 專案設定流程 - Prompt 設定步驟
- **受影響用戶：** 所有用戶
- **影響程度：** 完全阻斷,無法完成專案設定

### 頻率
- 100% 重現

### 嚴重程度
- **P0 緊急**
- 核心功能完全無法使用
- 阻斷用戶繼續使用系統

### 替代方案
- 目前無替代方案
- 必須修復才能使用此功能

---

## 根因分析

### 程式碼分析

**前端 API 呼叫 (frontend/src/lib/api/projects.ts:94-103):**
```typescript
export async function updatePromptSettings(
  projectId: string,
  data: PromptSettings
): Promise<Project> {
  const response = await apiClient.put(
    `/api/v1/projects/${projectId}/prompt-settings`,  // ❌ 錯誤的路徑
    data
  )
  return response.data
}
```

**後端路由定義 (backend/app/api/v1/projects.py:117-127):**
```python
@router.put("/{project_id}/prompt-model", response_model=MessageResponse)  # ✅ 實際的路徑
def update_prompt_model(
    data: PromptModelUpdate,
    project_id: str = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """更新 Prompt 範本與 Gemini 模型"""
    service = ProjectService(db)
    service.update_prompt_model(project_id, data)
    return MessageResponse(success=True, message="Prompt 與模型設定已更新")
```

### 根本原因類型
- **API 不一致 (API Mismatch)**

### 問題來源
前端和後端的 API 端點命名不一致:
- 前端使用: `/prompt-settings`
- 後端定義: `/prompt-model`

這導致前端發送的請求無法匹配到後端的路由,返回 404 錯誤。

---

## 解決方案

### 方案概述
統一前後端的 API 端點命名。由於 `prompt-model` 更準確地描述了功能 (更新 Prompt 範本和模型),因此將前端的 API 路徑改為與後端一致。

### 詳細步驟

#### 1. 修改前端 API 呼叫
**檔案:** `frontend/src/lib/api/projects.ts`

**變更:**
```typescript
// 修改前:
`/api/v1/projects/${projectId}/prompt-settings`

// 修改後:
`/api/v1/projects/${projectId}/prompt-model`
```

**同時更新:**
- 函數名稱從 `updatePromptSettings` 改為 `updatePromptModel`
- interface 名稱從 `PromptSettings` 改為 `PromptModelSettings` (保持一致性)

#### 2. 更新前端頁面呼叫
**檔案:** `frontend/src/app/(main)/project/[projectId]/settings/page.tsx`

**變更:**
```typescript
// 修改前:
import { updatePromptSettings } from '@/lib/api/projects'
await updatePromptSettings(projectId, {
  prompt_template_id: selectedTemplate,
  prompt_content: promptContent,
  gemini_model: selectedModel,
})

// 修改後:
import { updatePromptModel } from '@/lib/api/projects'
await updatePromptModel(projectId, {
  prompt_template_id: selectedTemplate,
  prompt_content: promptContent,
  gemini_model: selectedModel,
})
```

### Spec 更新需求
需要檢查並更新以下 spec 文件 (如有不一致):
- `tech-specs/backend/api-projects.md` - 確保 API 端點文件正確
- `tech-specs/frontend/page-project-settings.md` - 確保前端呼叫 API 的文件正確

### 程式碼變更計劃
1. 修改 `frontend/src/lib/api/projects.ts`
2. 修改 `frontend/src/app/(main)/project/[projectId]/settings/page.tsx`
3. 檢查是否有其他地方使用此 API
4. 更新 TypeScript 型別定義 (interface 名稱)

### 測試計劃
1. **手動測試:**
   - 啟動 frontend 和 backend
   - 建立新專案
   - 完成第一步後進入 Prompt 設定
   - 選擇範本和模型
   - 點擊下一步,確認成功保存
   - 檢查 Network tab 確認 API 呼叫成功 (200 OK)

2. **驗證測試:**
   - 確認資料庫中的專案記錄已更新
   - 確認可以順利進入下一步
   - 確認 console 無錯誤訊息

### 風險評估
- **風險等級：** 低
- **影響範圍：** 僅此一個 API 端點
- **回滾方案：** 可簡單回滾 git commit
- **副作用：** 無,只是修正路徑錯誤

---

## 預防措施

### 如何避免類似問題
1. **建立 API 文件優先原則:**
   - 先在 spec 中定義 API 端點
   - 後端根據 spec 實作
   - 前端根據 spec 呼叫
   - 雙方都參照同一份文件

2. **使用 OpenAPI/Swagger:**
   - 後端生成 OpenAPI schema
   - 前端使用工具自動生成 API client
   - 減少人為命名不一致

3. **整合測試:**
   - 新增 E2E 測試覆蓋完整流程
   - 在開發階段就能發現 API 不一致

4. **Code Review 重點:**
   - API 端點命名
   - 前後端一致性檢查

### 需要改進的流程
1. 在 spec 中明確定義所有 API 端點路徑
2. 實作前先檢查 spec,確保一致
3. 新增 API 時使用 checklist 確認前後端一致

---

## 相關資訊

### 相關檔案
- `frontend/src/lib/api/projects.ts`
- `frontend/src/app/(main)/project/[projectId]/settings/page.tsx`
- `backend/app/api/v1/projects.py`

### 相關 Commits
- (待補充修復 commit)

### 相關 Issues
- N/A

---

## 進度記錄

- [x] 問題確認
- [ ] 根因分析
- [ ] 解決方案設計
- [ ] 程式碼修改
- [ ] 測試驗證
- [ ] 文件更新
- [ ] Code Review
- [ ] 部署上線

**最後更新：** 2025-10-24
