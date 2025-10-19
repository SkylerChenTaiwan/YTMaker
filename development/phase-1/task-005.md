# Task-005: Configurations API 實作

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 6 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **使用者流程：** `product-design/flows.md#Flow-3` (視覺化配置)
- **使用者流程：** `product-design/flows.md#Flow-8` (Prompt 範本管理)

### 技術規格
- **API 規格：** `tech-specs/backend/api-configurations.md`
- **資料庫設計：** `tech-specs/backend/database.md#configurations`

### 相關任務
- **前置任務:** Task-002 ✅ (資料庫), Task-003 ✅ (API 基礎)
- **後續任務:** Task-022 (前端視覺配置), Task-027 (配置管理頁面)
- **並行任務:** Task-004, 006~009 (可並行開發)

---

## 任務目標

### 簡述
實作視覺配置、Prompt 範本、視覺模板的 CRUD API，支援配置驗證和模板管理。

### 成功標準
- [x] 6 個 API 端點全部實作
- [x] ConfigurationService 業務邏輯完整
- [x] 配置驗證邏輯（YAML schema）完整
- [x] 單元測試覆蓋率 > 80%

---

## API 端點清單 (6 個)

### 1. 視覺配置 CRUD
- `GET /api/v1/configurations` - 列出所有配置
- `POST /api/v1/configurations` - 建立配置
- `GET /api/v1/configurations/:id` - 取得單一配置
- `PUT /api/v1/configurations/:id` - 更新配置
- `DELETE /api/v1/configurations/:id` - 刪除配置

### 2. 模板管理
- `POST /api/v1/configurations/:id/save-as-template` - 儲存為模板

---

## Pydantic Schemas

### ConfigurationCreate
```python
class ConfigurationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    config_data: Dict[str, Any]
    is_template: bool = False
```

### ConfigurationResponse
```python
class ConfigurationResponse(BaseModel):
    id: int
    name: str
    config_data: Dict[str, Any]
    is_template: bool
    created_at: datetime
    updated_at: datetime
```

---

## 配置驗證 Schema

### 字幕配置
```python
class SubtitleConfig(BaseModel):
    font_family: str
    font_size: int = Field(..., ge=20, le=100)
    font_color: str = Field(..., pattern=r'^#[0-9A-Fa-f]{6}$')
    position: Union[str, Dict[str, int]]
    border_enabled: bool = False
    # ... 其他欄位
```

### Logo 配置
```python
class LogoConfig(BaseModel):
    logo_file: Optional[str] = None
    logo_x: int = Field(..., ge=0, le=1920)
    logo_y: int = Field(..., ge=0, le=1080)
    logo_size: int = Field(..., ge=10, le=200)
    logo_opacity: int = Field(..., ge=0, le=100)
```

---

## 主要產出

### 1. API 路由檔案
- `backend/app/api/v1/configurations.py`

### 2. 業務邏輯檔案
- `backend/app/services/config_service.py`

### 3. Schema 檔案
- `backend/app/schemas/configuration.py`

### 4. 驗證檔案
- `backend/app/validators/config_validator.py`

### 5. 測試檔案
- `backend/tests/api/test_configurations.py`
- `backend/tests/services/test_config_service.py`

---

## 驗證檢查

### API 測試
```bash
# 建立配置
curl -X POST http://localhost:8000/api/v1/configurations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Default Config",
    "config_data": {...}
  }'

# 儲存為模板
curl -X POST http://localhost:8000/api/v1/configurations/1/save-as-template
```

### 單元測試
```bash
pytest tests/api/test_configurations.py -v
# 測試覆蓋率 > 80%
```

---

## 完成檢查清單

- [ ] 6 個 API 端點實作完成
- [ ] ConfigurationService 完成
- [ ] 配置驗證邏輯完成
- [ ] 單元測試完成
- [ ] 測試覆蓋率 > 80%
