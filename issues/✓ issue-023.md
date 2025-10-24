# [已解決] Issue-023: Prompt 範本品質不佳與 Gemini 模型選擇應從 API 動態載入

**類型：** Design + Integration
**優先級：** P1 (高)
**發現時機：** 開發測試階段
**相關 Task：** 無
**頁面：** `/project/[id]/configure/prompt-model`
**日期：** 2025-10-24
**解決日期：** 2025-10-24

---

## 問題描述

在 Prompt 與模型設定頁面發現兩個嚴重問題：

### 問題 1：Prompt 範本內容品質不佳

當前的預設 Prompt 範本過於簡單且缺乏結構化指引，無法確保 AI 輸出符合影片製作需求：

**當前範本問題：**
- 缺少明確的 JSON schema 定義
- 沒有要求段落類型（intro/content/outro）
- 沒有指定每個段落需要的詳細結構
- 缺少 image_description 欄位的明確要求
- 段落時長要求不夠明確（需要 5-20 秒）
- 沒有 title、description、tags 的明確要求

這將導致 AI 生成的腳本格式不統一，後續無法正確處理和剪輯影片。

### 問題 2：Gemini 模型列表應該從 API 動態載入

當前前端的模型選擇是硬編碼的（只有 `gemini-1.5-pro` 和 `gemini-1.5-flash`），這有以下問題：

1. **模型過時：** Google 經常調整可用模型，舊模型可能會被移除
2. **缺少新模型：** 無法使用新發布的模型（如 `gemini-2.5-flash`、`gemini-2.5-pro`）
3. **不同步：** 後端已經實作了 `/api/v1/gemini/models` 可以從 Google API 取得最新模型列表，但前端沒有使用

**後端已有的支援：**
- ✅ `GET /api/v1/gemini/models` - 列出所有可用模型
- ✅ `GeminiClient.list_models()` - 從 Google API 取得模型
- ✅ 只回傳支援 `generateContent` 的模型

---

## 重現步驟

### 問題 1：Prompt 範本
1. 前往 `/project/{id}/configure/prompt-model`
2. 選擇「預設 YouTube 腳本範本」
3. 查看 Prompt 內容
4. 觀察到 JSON 格式定義不完整、缺少重要欄位說明

### 問題 2：模型選擇
1. 前往 `/project/{id}/configure/prompt-model`
2. 查看模型選擇器
3. 只看到兩個舊模型（gemini-1.5-pro、gemini-1.5-flash）
4. 無法選擇更新的模型（如 gemini-2.5-flash）

---

## 實際結果 vs 預期結果

### 問題 1：Prompt 範本

**實際：**
```
請根據以下內容生成一段 YouTube 影片腳本：

內容：{content}

要求：
1. 影片總長度約 {duration} 分鐘
2. 分成 {num_segments} 個段落
3. 每個段落包含清晰的主題句和詳細說明
4. 語氣輕鬆、易懂、吸引觀眾
5. 最後加上 CTA (Call To Action)

請以 JSON 格式回傳，格式如下：
{
  "segments": [
    {"text": "段落文字", "duration": 秒數},
    ...
  ]
}
```

**預期：**
應該提供完整且詳細的結構化 Prompt，包括：
- 明確的 JSON schema（包含 title, description, tags, segments）
- 每個段落需包含 type, text, duration, image_description
- 明確的段落時長要求（5-20 秒）
- 段落類型說明（intro/content/outro）
- 圖片描述的詳細要求

### 問題 2：模型選擇

**實際：**
- 只有兩個硬編碼的選項
- 使用舊版模型名稱（1.5）

**預期：**
- 從 `/api/v1/gemini/models` 動態載入
- 顯示所有當前可用的模型
- 自動更新，無需修改程式碼

---

## 影響評估

### 影響範圍
- **問題 1：** 所有使用 Prompt 範本生成腳本的功能
- **問題 2：** 模型選擇器、腳本生成功能

### 頻率
- **問題 1：** 每次生成腳本都會受影響
- **問題 2：** 當 Google 調整模型時會導致錯誤

### 嚴重程度
- **問題 1：** 高 - 影響輸出品質，可能導致後續流程失敗
- **問題 2：** 中高 - 長期維護問題，可能導致 API 錯誤

---

## 根因分析

### 問題 1 根因：Prompt 範本設計不完整

**位置：** `backend/scripts/seed_data.py:30-47`

**原因：**
1. 初期設計時過於簡化
2. 沒有參考 `GeminiClient.generate_script()` 的完整 schema
3. 缺少對 AI 輸出格式的嚴格要求

### 問題 2 根因：前端未整合後端 API

**位置：**
- `frontend/src/components/ui/ModelSelector.tsx:13-30` - 硬編碼模型列表
- `frontend/src/app/project/[id]/configure/prompt-model/page.tsx:32` - 硬編碼驗證

**原因：**
1. 後端 API (`/api/v1/gemini/models`) 已實作但前端未使用
2. 前端使用硬編碼陣列而非動態載入
3. 缺少錯誤處理（當 API Key 未設定時）

---

## 解決方案

### 方案 A：全面改善 Prompt 範本與動態模型載入（推薦）

#### Prompt 範本改善

**更新 `backend/scripts/seed_data.py`：**
創建詳細且結構化的預設範本，包含：
1. 完整的 JSON schema 定義
2. 明確的欄位要求（title, description, tags, segments）
3. 段落結構說明（type, text, duration, image_description）
4. 段落時長限制（5-20 秒）
5. 圖片描述的詳細指引

**範例 Prompt：**
```
你是一個專業的 YouTube 影片腳本創作者。請根據以下內容生成一個完整的影片腳本。

---

**內容來源：**
{content}

---

**輸出要求：**

請以 JSON 格式回傳，必須嚴格遵循以下 schema：

{
  "title": "影片標題（吸引人、簡潔、50 字以內）",
  "description": "影片描述（包含關鍵字、150-300 字）",
  "tags": ["標籤1", "標籤2", "標籤3", ...],  // 5-10 個相關標籤
  "segments": [
    {
      "type": "intro" | "content" | "outro",
      "text": "這個段落的旁白文字",
      "duration": 整數（秒數，建議 5-20 秒）,
      "image_description": "這個段落適合搭配的畫面描述（詳細、具體、適合生成圖片）"
    },
    ...
  ]
}

**段落類型說明：**
- intro: 開場段落（1 個），介紹主題、吸引觀眾
- content: 內容段落（多個），詳細說明主題
- outro: 結尾段落（1 個），總結、CTA

**段落時長建議：**
- intro: 5-10 秒
- content: 10-20 秒（每段）
- outro: 5-10 秒

**圖片描述要求：**
- 具體、詳細、視覺化
- 適合用於圖片生成 AI
- 與旁白內容高度相關
- 範例："一個現代化的辦公室場景，一位年輕專業人士在電腦前工作，螢幕顯示圖表和數據，明亮的自然光從窗戶透入"

**風格要求：**
- 語氣：{tone}（預設：輕鬆、專業、易懂）
- 目標觀眾：{target_audience}（預設：一般大眾）
- 總時長：約 {duration} 分鐘
```

#### 動態模型載入

**1. 創建前端 API 函數**

`frontend/src/lib/api/gemini.ts`（新增）:
```typescript
export interface GeminiModel {
  name: string              // e.g. "models/gemini-2.5-flash"
  display_name: string      // e.g. "Gemini 2.5 Flash"
  description: string
  supported_generation_methods: string[]
}

export async function getGeminiModels(): Promise<GeminiModel[]> {
  const response = await fetch('/api/v1/gemini/models')
  if (!response.ok) {
    if (response.status === 400) {
      throw new Error('Gemini API Key 尚未配置')
    }
    throw new Error('無法取得模型列表')
  }
  const data = await response.json()
  return data.data.models
}
```

**2. 更新 ModelSelector 組件**

`frontend/src/components/ui/ModelSelector.tsx`:
- 移除硬編碼的模型陣列
- 新增 `models` prop（從父組件傳入）
- 動態渲染模型列表
- 新增 loading 狀態
- 新增錯誤處理（顯示「請先設定 API Key」）

**3. 更新頁面組件**

`frontend/src/app/project/[id]/configure/prompt-model/page.tsx`:
- 在 `useEffect` 中呼叫 `getGeminiModels()`
- 處理 loading 和錯誤狀態
- 傳遞模型列表到 ModelSelector
- 更新 Zod validation schema 改為動態驗證

**4. 更新資料庫 schema（如需要）**

如果 `gemini_model` 欄位有長度限制，需要調整以支援更長的模型名稱：
- 當前：`VARCHAR` 可能不夠長
- 建議：`VARCHAR(255)` 或 `TEXT`

---

## 詳細步驟

### 步驟 1：改善 Prompt 範本

1. 更新 `backend/scripts/seed_data.py`
2. 重新生成測試資料或手動更新資料庫中的範本

### 步驟 2：前端整合 Gemini Models API

1. 創建 `frontend/src/lib/api/gemini.ts`
2. 更新 `ModelSelector.tsx` 改為接收 models prop
3. 更新 `page.tsx` 載入模型列表
4. 更新 Zod schema 改為動態驗證
5. 新增錯誤處理 UI

### 步驟 3：測試

1. 單元測試：測試 ModelSelector 動態渲染
2. 整合測試：測試 API 正確回傳模型
3. E2E 測試：測試完整流程
4. 錯誤情境：測試 API Key 未設定時的行為

---

## Spec 更新需求

需要更新以下 spec：

1. **`tech-specs/frontend/page-configure-prompt-model.md`**
   - 更新 Prompt 範本格式說明
   - 新增動態模型載入說明
   - 新增錯誤處理流程

2. **`tech-specs/backend/api-gemini.md`**（確認已正確記錄）
   - 確認 `/api/v1/gemini/models` API 規格完整

---

## 測試計劃

### 問題 1：Prompt 範本
- [ ] 更新後的範本能生成完整的 JSON schema
- [ ] AI 輸出包含所有必要欄位
- [ ] 段落時長在 5-20 秒範圍內
- [ ] 圖片描述具體且可用

### 問題 2：模型選擇
- [ ] 頁面載入時成功從 API 取得模型列表
- [ ] 顯示所有可用模型（包含 gemini-2.5-*）
- [ ] 選擇模型後正確儲存
- [ ] API Key 未設定時顯示友善錯誤訊息
- [ ] 模型列表為空時顯示合適的提示

### 整合測試
- [ ] 使用新範本生成腳本成功
- [ ] 選擇不同模型都能正常工作
- [ ] 資料正確儲存到資料庫

---

## 風險評估

### 風險
1. **Prompt 變更可能影響現有專案：** 如果專案已經使用舊範本，變更後可能不相容
2. **API 失敗時用戶無法選擇模型：** 需要 fallback 機制
3. **模型名稱過長可能超過資料庫欄位限制**

### 緩解措施
1. 只更新預設範本，不影響已建立的專案
2. API 失敗時顯示常用的 fallback 模型列表
3. 檢查並更新資料庫 schema（如需要）

---

## 預防措施

### 如何避免類似問題

1. **Prompt 範本設計：**
   - 參考後端 schema 定義
   - 包含完整的欄位說明
   - 提供清晰的範例

2. **API 整合：**
   - 後端 API 實作完成後立即整合到前端
   - 避免硬編碼可變的資料（如模型列表）
   - 及時更新前端以使用最新 API

3. **測試：**
   - 整合測試應包含完整的端到端流程
   - 測試 API 失敗情境
   - 測試資料格式相容性

---

## 相關檔案

**後端：**
- `backend/scripts/seed_data.py` - Prompt 範本定義
- `backend/app/api/v1/gemini.py` - Gemini API 路由
- `backend/app/integrations/gemini_client.py` - Gemini Client 實作

**前端：**
- `frontend/src/app/project/[id]/configure/prompt-model/page.tsx` - 主頁面
- `frontend/src/components/ui/ModelSelector.tsx` - 模型選擇器
- `frontend/src/lib/api/gemini.ts` - Gemini API 函數（待新增）

**資料庫：**
- `backend/app/models/project.py` - Project 模型（可能需要調整欄位長度）
