# Task-005: 配置管理 API 實作 (6 個端點)

> **建立日期：** 2025-01-19
> **狀態：** ⏳ 未開始
> **預計時間：** 6 小時
> **優先級：** P0

---

## 關聯文件

### 技術規格
- **API 規格:** `tech-specs/backend/api-configurations.md`
- **資料庫:** `tech-specs/backend/database.md#3.2-3.3`

### 相關任務
- **前置任務:** Task-002 ✅, Task-003 ✅
- **並行任務:** Task-004 (可並行)

---

## 任務目標

實作 6 個配置管理 API 端點：
1. `GET /api/v1/configurations` - 列出所有配置
2. `POST /api/v1/configurations` - 建立新配置
3. `GET /api/v1/configurations/:id` - 取得單一配置
4. `PUT /api/v1/configurations/:id` - 更新配置
5. `DELETE /api/v1/configurations/:id` - 刪除配置
6. `GET /api/v1/prompt-templates` - 列出 Prompt 範本

---

## 實作規格

### Schemas

**檔案：** `app/schemas/configuration.py`

```python
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class SubtitleConfig(BaseModel):
    font_family: str = "Noto Sans TC"
    font_size: int = 48
    font_color: str = "#FFFFFF"
    position: Dict[str, int]  # {"x": 960, "y": 900}
    border_enabled: bool = True
    shadow_enabled: bool = True

class LogoConfig(BaseModel):
    file_path: Optional[str] = None
    position: Dict[str, int]
    size: int = 100

class ConfigData(BaseModel):
    subtitle: SubtitleConfig
    logo: Optional[LogoConfig] = None

class ConfigurationCreate(BaseModel):
    name: str
    config_data: ConfigData

class ConfigurationResponse(BaseModel):
    id: str
    name: str
    config_data: Dict[str, Any]
    created_at: datetime
    usage_count: int

    class Config:
        from_attributes = True
```

---

### Service Layer

**檔案：** `app/services/configuration_service.py`

```python
from sqlalchemy.orm import Session
from app.models.configuration import Configuration
from app.models.prompt_template import PromptTemplate
from app.schemas.configuration import ConfigurationCreate
from app.core.errors import NotFoundError
import uuid
from datetime import datetime

class ConfigurationService:
    def __init__(self, db: Session):
        self.db = db

    def list_configurations(self, limit: int = 50, offset: int = 0):
        total = self.db.query(Configuration).count()
        configs = self.db.query(Configuration).offset(offset).limit(limit).all()
        return {"data": configs, "meta": {"total": total}}

    def create_configuration(self, config_data: ConfigurationCreate):
        config = Configuration(
            id=str(uuid.uuid4()),
            name=config_data.name,
            config_data=config_data.config_data.dict(),
            created_at=datetime.utcnow(),
            usage_count=0
        )
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    def get_configuration(self, config_id: str):
        config = self.db.query(Configuration).filter(Configuration.id == config_id).first()
        if not config:
            raise NotFoundError("Configuration", config_id)
        return config

    def list_prompt_templates(self):
        templates = self.db.query(PromptTemplate).all()
        return templates
```

---

### API 端點

**檔案：** `app/api/v1/endpoints/configurations.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.configuration import ConfigurationCreate, ConfigurationResponse
from app.schemas.response import SuccessResponse
from app.services.configuration_service import ConfigurationService

router = APIRouter()

@router.get("/configurations", response_model=SuccessResponse[list[ConfigurationResponse]])
async def list_configurations(db: Session = Depends(get_db)):
    service = ConfigurationService(db)
    result = service.list_configurations()
    return SuccessResponse(data=result["data"])

@router.post("/configurations", response_model=SuccessResponse[ConfigurationResponse], status_code=201)
async def create_configuration(
    config: ConfigurationCreate,
    db: Session = Depends(get_db)
):
    service = ConfigurationService(db)
    new_config = service.create_configuration(config)
    return SuccessResponse(data=new_config)

@router.get("/configurations/{id}", response_model=SuccessResponse[ConfigurationResponse])
async def get_configuration(id: str, db: Session = Depends(get_db)):
    service = ConfigurationService(db)
    config = service.get_configuration(id)
    return SuccessResponse(data=config)

@router.get("/prompt-templates")
async def list_prompt_templates(db: Session = Depends(get_db)):
    service = ConfigurationService(db)
    templates = service.list_prompt_templates()
    return SuccessResponse(data=templates)
```

---

## 完成檢查清單

- [ ] 6 個端點全部實作
- [ ] 配置驗證邏輯完成
- [ ] 測試通過

---

## 時間分配

- **Schemas:** 1.5 小時
- **Service:** 2 小時
- **API 端點:** 1.5 小時
- **測試:** 1 小時

**總計：** 6 小時
