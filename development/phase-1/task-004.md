# Task-004: Projects API 實作

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 12 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **使用者流程：** `product-design/flows.md#Flow-1` (基本影片生成)
- **使用者流程：** `product-design/flows.md#Flow-6` (斷點續傳)

### 技術規格
- **API 規格：** `tech-specs/backend/api-projects.md`
- **資料庫設計：** `tech-specs/backend/database.md#projects`
- **業務邏輯：** `tech-specs/backend/business-logic.md`

### 相關任務
- **前置任務:**  Task-002 ✅ (資料庫), Task-003 ✅ (API 基礎)
- **後續任務:** Task-014 (Celery 任務), Task-024 (前端進度頁面)
- **並行任務:** Task-005 ~ 009 (其他 API 模塊，可並行開發)

---

## 任務目標

### 簡述
實作專案管理的完整 API，包含 CRUD 操作、生成控制、進度查詢、素材管理等 12 個端點。

### 成功標準
- [x] 12 個 API 端點全部實作
- [x] ProjectService 業務邏輯完整
- [x] Pydantic schemas 定義完整
- [x] 請求驗證正確
- [x] 錯誤處理完整
- [x] 單元測試覆蓋率 > 85%
- [x] API 文件（OpenAPI）完整

---

## API 端點清單 (12 個)

### 1. 專案 CRUD
- `GET /api/v1/projects` - 列出所有專案（分頁、篩選、排序）
- `POST /api/v1/projects` - 建立新專案
- `GET /api/v1/projects/:id` - 取得單一專案
- `PUT /api/v1/projects/:id` - 更新專案
- `DELETE /api/v1/projects/:id` - 刪除專案

### 2. 生成控制
- `POST /api/v1/projects/:id/generate` - 開始生成影片
- `POST /api/v1/projects/:id/cancel` - 取消生成
- `POST /api/v1/projects/:id/pause` - 暫停生成
- `POST /api/v1/projects/:id/resume` - 恢復生成

### 3. 進度與素材
- `GET /api/v1/projects/:id/progress` - 取得生成進度（WebSocket）
- `GET /api/v1/projects/:id/assets` - 列出專案素材
- `GET /api/v1/projects/:id/result` - 取得生成結果

---

## Pydantic Schemas

### ProjectCreate
```python
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    content_text: Optional[str] = Field(None, min_length=500, max_length=10000)
    content_file: Optional[UploadFile] = None
```

### ProjectUpdate
```python
class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    status: Optional[ProjectStatus] = None
    youtube_metadata: Optional[Dict[str, Any]] = None
```

### ProjectResponse
```python
class ProjectResponse(BaseModel):
    id: int
    name: str
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    youtube_url: Optional[str] = None
    progress: Optional[int] = None
```

### ProjectListQuery
```python
class ProjectListQuery(BaseModel):
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
    status: Optional[ProjectStatus] = None
    sort_by: str = Field("updated_at", pattern="^(created_at|updated_at|name)$")
    order: str = Field("desc", pattern="^(asc|desc)$")
```

---

## ProjectService 業務邏輯

### 核心方法
```python
class ProjectService:
    async def create_project(self, data: ProjectCreate) -> Project
    async def get_project(self, project_id: int) -> Project
    async def update_project(self, project_id: int, data: ProjectUpdate) -> Project
    async def delete_project(self, project_id: int) -> None
    async def list_projects(self, query: ProjectListQuery) -> List[Project]
    async def start_generation(self, project_id: int) -> None
    async def cancel_generation(self, project_id: int) -> None
    async def pause_generation(self, project_id: int) -> None
    async def resume_generation(self, project_id: int) -> None
    async def get_progress(self, project_id: int) -> Dict[str, Any]
    async def get_assets(self, project_id: int) -> List[Asset]
    async def get_result(self, project_id: int) -> ProjectResult
```

---

## 主要產出

### 1. API 路由檔案
- `backend/app/api/v1/projects.py` - 12 個端點定義

### 2. 業務邏輯檔案
- `backend/app/services/project_service.py` - ProjectService 類別

### 3. Schema 檔案
- `backend/app/schemas/project.py` - 所有 Project 相關 schemas

### 4. 測試檔案
- `backend/tests/api/test_projects.py` - API 端點測試
- `backend/tests/services/test_project_service.py` - 業務邏輯測試

---

## 錯誤處理

### 常見錯誤
- `400 BadRequest` - 驗證失敗（文字長度、檔案格式）
- `404 NotFound` - 專案不存在
- `409 Conflict` - 專案狀態衝突（如已在生成中）
- `500 InternalServerError` - 檔案系統錯誤、資料庫錯誤

### 錯誤訊息範例
```json
{
  "error": "ValidationError",
  "message": "文字長度必須在 500-10000 字之間",
  "details": {"current_length": 350, "required": "500-10000"},
  "timestamp": "2025-10-19T10:30:00Z",
  "path": "/api/v1/projects"
}
```

---

## 驗證檢查

### API 測試
```bash
# 建立專案
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "content_text": "..."}'

# 列出專案
curl http://localhost:8000/api/v1/projects?limit=10&offset=0

# 開始生成
curl -X POST http://localhost:8000/api/v1/projects/1/generate
```

### 單元測試
```bash
pytest tests/api/test_projects.py -v
pytest tests/services/test_project_service.py -v
# 所有測試應通過，覆蓋率 > 85%
```

---

## 注意事項

1. **檔案上傳：** 使用 `UploadFile` 處理檔案上傳，驗證檔案類型（.txt, .md）
2. **狀態管理：** 確保狀態轉換邏輯正確（INITIALIZED → GENERATING → COMPLETED）
3. **並行控制：** 同一專案不能同時有多個生成任務
4. **資源清理：** 刪除專案時同時刪除相關檔案和資料庫記錄

---

## 完成檢查清單

- [ ] 12 個 API 端點實作完成
- [ ] ProjectService 業務邏輯完成
- [ ] 所有 Pydantic schemas 定義完成
- [ ] 請求驗證邏輯正確
- [ ] 錯誤處理完整
- [ ] 單元測試完成
- [ ] 測試覆蓋率 > 85%
- [ ] OpenAPI 文件生成正確
- [ ] 與前端 API 整合測試通過
