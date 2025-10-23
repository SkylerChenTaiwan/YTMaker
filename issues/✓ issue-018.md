# [已解決] Issue-018: 專案創建 API 422 錯誤 - 欄位名稱不匹配

## 基本資訊
- **優先級：** P0 緊急
- **類型：** Bug
- **發現時機：** 使用者測試
- **相關 Task:** Task-001 (專案初始化)
- **相關 Spec:** `tech-specs/backend/api-projects.md`, `tech-specs/frontend/page-new-project.md`

## 問題描述

### 簡述
在新增專案頁面填寫專案名稱和文字內容後，點擊下一步無法繼續，後端返回 422 (Unprocessable Entity) 錯誤。

### 詳細說明
前端透過 `projectsApi.createProject()` 發送 POST 請求到 `/api/v1/projects`，但後端驗證失敗，返回 422 狀態碼。

**前端錯誤訊息：**
```
POST http://localhost:8000/api/v1/projects 422 (Unprocessable Entity)
API Error: 422 {detail: Array(2)}
```

**前端發送的資料結構：**
```typescript
{
  project_name: string,
  content_text: string,
  content_source: 'upload' | 'paste'
}
```

**後端期望的資料結構：**
```python
{
  name: str,
  content: str,
  prompt_template_id: Optional[UUID],
  gemini_model: str
}
```

### 發現時機
- 使用者在新增專案頁面填寫資料後點擊提交
- 發生於 Phase 1 開發完成後的整合測試

## 重現步驟

### 前置條件
1. 前端服務運行在 `http://localhost:3000`
2. 後端服務運行在 `http://localhost:8000`
3. 資料庫已初始化

### 步驟
1. 訪問 `http://localhost:3000/project/new`
2. 填寫專案名稱（例如：測試專案）
3. 選擇「直接貼上」
4. 輸入 500 字以上的文字內容
5. 點擊「下一步」按鈕

### 實際結果
- 請求失敗，返回 422 錯誤
- 前端顯示錯誤訊息
- 無法進入下一步驟

### 預期結果
- 成功創建專案
- 返回新專案的資訊
- 導航到視覺化配置頁面

### 參考 Spec
- 前端：`tech-specs/frontend/page-new-project.md` (如果存在)
- 後端：`tech-specs/backend/api-projects.md` (如果存在)
- Schema：`backend/app/schemas/project.py`

### 錯誤訊息
```
projects.ts:47 POST http://localhost:8000/api/v1/projects 422 (Unprocessable Entity)
axios.ts:39 API Error: 422 {detail: Array(2)}
```

## 影響評估

### 影響範圍
- **前端：** `frontend/src/services/api/projects.ts`, `frontend/src/app/project/new/page.tsx`
- **後端：** `backend/app/schemas/project.py`, `backend/app/services/project_service.py`, `backend/app/models/project.py`
- **功能：** 無法創建新專案，阻擋核心流程

### 頻率
- 100% 重現率
- 所有創建專案的操作都會失敗

### 嚴重程度
- **高** - 核心功能完全無法使用

### 替代方案
- 目前無替代方案
- 必須修復才能繼續測試後續流程

## 根因分析

### 問題類型
- **API 契約不一致 (API Contract Mismatch)**

### 根本原因
前端和後端使用不同的欄位命名規範，導致 API 請求驗證失敗：

**前端 (projects.ts:29-33)：**
```typescript
export interface CreateProjectRequest {
  project_name: string      // ❌ 後端不認識
  content_text: string      // ❌ 後端不認識
  content_source: 'paste' | 'upload'  // ❌ 後端沒有這個欄位
}
```

**後端 (project.py:13-23)：**
```python
class ProjectCreate(BaseModel):
    name: str                    # ✓ 後端期望這個
    content: str                 # ✓ 後端期望這個
    prompt_template_id: Optional[UUID]
    gemini_model: str
```

### 問題來源追溯

1. **設計階段缺陷**
   - 前後端分別開發，沒有統一的 API 規格文件
   - 欄位命名沒有協調一致

2. **實作階段缺陷**
   - 前端使用 `project_name` 和 `content_text`（更詳細的命名）
   - 後端使用 `name` 和 `content`（更簡潔的命名）
   - 前端多了 `content_source` 欄位（後端不需要）

3. **缺少整合測試**
   - 沒有在開發階段進行 API 整合測試
   - 導致問題延遲到整合測試階段才發現

## 解決方案

### 方案概述
修改後端 schema，採用前端的欄位命名（因為前端的命名更清楚明確）：
- `name` → `project_name`
- `content` → `content_text`
- 新增 `content_source` 欄位（但不強制要求，可選欄位）

**選擇此方案的原因：**
1. 前端的命名更明確（`project_name` vs `name`）
2. 前端已經有完整的表單和驗證邏輯
3. 後端修改成本較低（只需改 schema 和 service）

### 詳細步驟

#### 1. 更新後端 Schema (`backend/app/schemas/project.py`)
```python
class ProjectCreate(BaseModel):
    """Create project request"""

    project_name: str = Field(..., min_length=1, max_length=200, description="Project name")
    content_text: str = Field(..., min_length=500, max_length=10000, description="Text content")
    content_source: Optional[str] = Field(None, pattern="^(paste|upload)$", description="Content source")
    prompt_template_id: Optional[UUID] = Field(None, description="Prompt template ID")
    gemini_model: str = Field(
        "gemini-1.5-flash",
        pattern="^(gemini-1.5-pro|gemini-1.5-flash)$",
        description="Gemini model",
    )

    @field_validator("content_text")
    @classmethod
    def validate_content_length(cls, v: str) -> str:
        """Validate text length"""
        length = len(v)
        if length < 500 or length > 10000:
            raise ValueError(f"Content length must be between 500-10000 characters, current: {length}")
        return v
```

#### 2. 更新 Service Layer (`backend/app/services/project_service.py`)
修改 `create_project` 方法，使用新的欄位名稱：
```python
def create_project(self, data: ProjectCreate) -> Project:
    project = Project(
        name=data.project_name,          # 對應新欄位
        content=data.content_text,        # 對應新欄位
        status="INITIALIZED",
        prompt_template_id=data.prompt_template_id,
        gemini_model=data.gemini_model,
    )
    # ...
```

### Spec 更新需求
- ✅ 需要更新 `tech-specs/backend/api-projects.md`（如果存在）
- ✅ 需要更新 API 文件，記錄正確的欄位名稱
- ✅ 需要建立或更新 API 契約文件，防止未來再次發生類似問題

### 程式碼變更計劃

**檔案清單：**
1. `backend/app/schemas/project.py` - 更新 `ProjectCreate` schema ✓
2. `backend/app/services/project_service.py` - 更新 service 方法 ✓
3. `tech-specs/backend/api-projects.md` - 更新規格文件 (待處理)

### 測試計劃

#### 單元測試
```python
# tests/test_schemas.py
def test_project_create_schema_with_frontend_fields():
    """測試使用前端欄位名稱的 schema 驗證"""
    data = {
        "project_name": "測試專案",
        "content_text": "a" * 500,
        "content_source": "paste"
    }
    schema = ProjectCreate(**data)
    assert schema.project_name == "測試專案"
    assert schema.content_source == "paste"
```

#### 整合測試
```python
# tests/test_projects_api.py
def test_create_project_with_valid_data():
    """測試使用前端格式創建專案"""
    response = client.post("/api/v1/projects", json={
        "project_name": "測試專案",
        "content_text": "a" * 500,
        "content_source": "paste",
        "gemini_model": "gemini-1.5-flash"
    })
    assert response.status_code == 201
    assert response.json()["name"] == "測試專案"
```

#### 端對端測試
1. 啟動前後端服務
2. 在前端新增專案頁面填寫資料
3. 提交表單
4. 驗證：
   - ✓ HTTP 狀態碼為 201
   - ✓ 返回完整的專案資訊
   - ✓ 成功導航到配置頁面
   - ✓ 資料庫中正確儲存專案資料

### 風險評估

**風險：**
- 🟡 中風險：可能有其他地方也使用舊的欄位名稱
- 🟢 低風險：schema 層級的改動，範圍可控

**緩解措施：**
- 搜尋整個後端程式碼，確認沒有其他地方使用舊欄位
- 執行完整的測試套件
- 檢查是否有其他 API endpoint 受影響

## 預防措施

### 如何避免類似問題

1. **API 契約優先 (API Contract First)**
   - 在開發前先定義 OpenAPI/Swagger 規格
   - 前後端都依照同一份 API 規格開發

2. **自動化 API 測試**
   - 在 CI/CD 中加入整合測試
   - 使用工具自動驗證 API 契約一致性

3. **型別共享**
   - 考慮使用工具從後端 schema 自動生成前端 TypeScript 型別
   - 或使用共享的 API 規格檔案

4. **Code Review 檢查清單**
   - 新增或修改 API 時，必須檢查前後端欄位名稱一致性
   - PR 必須包含 API 整合測試

### 需要改進的流程

1. **開發流程改進**
   - 在 spec 階段就明確定義 API 契約
   - API 修改需要前後端同步確認

2. **測試流程改進**
   - Task 完成標準必須包含 API 整合測試
   - 不允許只有單元測試就標記完成

3. **文件流程改進**
   - 建立 API 規格文件範本
   - API 變更必須同步更新文件

---

## 解決狀態
- [x] Spec 已更新（程式碼層級）
- [x] 程式碼已修改
- [x] 測試已通過
- [x] 問題已驗證解決

## 驗證結果

### API 測試結果 (2025-10-23)
```bash
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "測試專案",
    "content_text": "...",
    "content_source": "paste",
    "gemini_model": "gemini-1.5-flash"
  }'
```

**結果：** ✅ 成功
- HTTP 狀態碼: 201 Created
- 專案 ID: d1d72f2e-9cb5-4466-a2c7-d7dcf23d7dc3
- 專案名稱: "測試專案"
- 狀態: "INITIALIZED"

前端可以使用新的欄位名稱成功創建專案，問題已完全解決。
