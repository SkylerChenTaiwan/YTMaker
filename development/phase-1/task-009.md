# Task-009: Batch API 實作

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 6 小時
> **優先級：** P1 (重要)

---

## 關聯文件

### 產品設計
- **使用者流程：** `product-design/flows.md#Flow-5` (批次處理)

### 技術規格
- **API 規格：** `tech-specs/backend/api-batch.md`
- **資料庫設計：** `tech-specs/backend/database.md#batch_tasks`

### 相關任務
- **前置任務:** Task-002 ✅, Task-003 ✅
- **後續任務:** Task-014 (Celery 批次任務), Task-028 (批次處理頁面)
- **並行任務:** Task-004~008 (可並行開發)

---

## 任務目標

### 簡述
實作批次任務管理 API，支援批次建立、進度查詢、暫停/恢復。

### 成功標準
- [x] 5 個 API 端點全部實作
- [x] BatchService 業務邏輯完整
- [x] 批次任務佇列邏輯完成
- [x] 單元測試覆蓋率 > 80%

---

## API 端點清單 (5 個)

### 1. 批次任務 CRUD
- `GET /api/v1/batch` - 列出批次任務
- `POST /api/v1/batch` - 建立批次任務
- `GET /api/v1/batch/:id` - 取得批次詳情

### 2. 批次控制
- `POST /api/v1/batch/:id/pause` - 暫停批次
- `POST /api/v1/batch/:id/resume` - 恢復批次

---

## Pydantic Schemas

### BatchTaskCreate
```python
class BatchTaskCreate(BaseModel):
    name: str
    files: List[UploadFile]
    template_id: Optional[int]
    youtube_settings: Dict[str, Any]
```

### BatchTaskResponse
```python
class BatchTaskResponse(BaseModel):
    id: int
    name: str
    status: BatchStatus
    total_count: int
    success_count: int
    failed_count: int
    created_at: datetime
```

---

## 主要產出

### 1. API 路由檔案
- `backend/app/api/v1/batch.py`

### 2. 業務邏輯檔案
- `backend/app/services/batch_service.py`

### 3. 測試檔案
- `backend/tests/api/test_batch.py`

---

## 完成檢查清單

- [ ] 5 個 API 端點實作完成
- [ ] BatchService 完成
- [ ] 批次佇列邏輯完成
- [ ] 單元測試完成
- [ ] 測試覆蓋率 > 80%
