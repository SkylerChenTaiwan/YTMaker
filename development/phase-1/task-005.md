# Task-005: Configurations API 實作

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 6 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **使用者流程:** `product-design/flows.md#Flow-1` (基本影片生成 - 步驟 3-4 視覺配置與 Prompt 設定)
- **使用者流程:** `product-design/flows.md#Flow-3` (視覺化配置)
- **使用者流程:** `product-design/flows.md#Flow-8` (Prompt 範本管理)

### 技術規格
- **API 規格:** `tech-specs/backend/api-configurations.md` (完整 API 端點定義)
- **API 設計規範:** `tech-specs/backend/api-design.md` (RESTful 設計原則、錯誤處理)
- **資料庫設計:** `tech-specs/backend/database.md#configurations` (Configuration 和 PromptTemplate 資料模型)
- **技術框架:** `tech-specs/framework.md#後端技術棧` (FastAPI、Pydantic、SQLAlchemy)

### 相關任務
- **前置任務:** Task-002 ✅ (資料庫 Schema), Task-003 ✅ (API 基礎架構)
- **後續任務:** Task-022 (前端視覺配置頁面), Task-027 (配置管理頁面)
- **並行任務:** Task-004, 006~009 (可並行開發)

---

## 任務目標

### 簡述
實作視覺配置模板和 Prompt 範本的完整 CRUD API，支援配置資料驗證、模板管理、使用統計追蹤功能。

### 成功標準
- [ ] 11 個 API 端點全部實作完成且測試通過
  - 視覺配置 CRUD: 5 個端點
  - Prompt 範本 CRUD: 5 個端點
  - 模板轉換: 1 個端點
- [ ] ConfigurationService 和 PromptTemplateService 業務邏輯完整
- [ ] 配置資料驗證邏輯（Pydantic schemas）完整
- [ ] 使用次數統計自動更新
- [ ] 單元測試覆蓋率 > 85%
- [ ] API 文件（Swagger）完整

---

## 測試要求

### 單元測試

#### 測試 1: 成功列出所有視覺配置模板

**目的:** 驗證可以取得所有已儲存的視覺配置模板列表

**前置條件:**
資料庫中存在以下配置:
```python
Configuration(
    id="uuid-1",
    name="預設配置",
    configuration={"subtitle": {...}, "logo": {...}},
    last_used_at="2025-01-15T11:45:00Z",
    usage_count=10
)
Configuration(
    id="uuid-2",
    name="科技風格",
    configuration={"subtitle": {...}, "logo": {...}},
    last_used_at="2025-01-16T09:30:00Z",
    usage_count=5
)
```

**輸入:**
```http
GET /api/v1/configurations
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "configurations": [
      {
        "id": "uuid-1",
        "name": "預設配置",
        "created_at": "2025-01-15T10:30:00Z",
        "last_used_at": "2025-01-15T11:45:00Z",
        "usage_count": 10
      },
      {
        "id": "uuid-2",
        "name": "科技風格",
        "created_at": "2025-01-16T08:00:00Z",
        "last_used_at": "2025-01-16T09:30:00Z",
        "usage_count": 5
      }
    ]
  }
}
```

**驗證點:**
- [ ] 回傳 200 狀態碼
- [ ] 包含所有配置（按 last_used_at 降序排列）
- [ ] 每個配置包含 id, name, created_at, last_used_at, usage_count
- [ ] 不包含完整的 configuration 內容（僅列表用）

---

#### 測試 2: 成功建立新的視覺配置模板

**目的:** 驗證可以建立新的視覺配置模板並儲存到資料庫

**輸入:**
```http
POST /api/v1/configurations
Content-Type: application/json

{
  "name": "簡約風格",
  "configuration": {
    "subtitle": {
      "font_family": "Arial",
      "font_size": 48,
      "font_color": "#FFFFFF",
      "position": "bottom",
      "border_enabled": true,
      "border_color": "#000000",
      "border_width": 2
    },
    "logo": {
      "logo_file": null,
      "logo_x": 50,
      "logo_y": 50,
      "logo_size": 100,
      "logo_opacity": 80
    },
    "overlay_elements": []
  }
}
```

**預期輸出:**
```json
Status: 201 Created
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "name": "簡約風格",
    "created_at": "2025-01-20T14:00:00Z",
    "message": "配置已建立"
  }
}
```

**驗證點:**
- [ ] 回傳 201 狀態碼
- [ ] 資料庫中新增了配置記錄
- [ ] configuration 欄位正確儲存為 JSON
- [ ] created_at 自動設定為當前時間
- [ ] usage_count 初始化為 0
- [ ] last_used_at 初始化為 null

---

#### 測試 3: 配置名稱重複時建立失敗

**目的:** 驗證不允許建立同名配置

**前置條件:**
資料庫中已存在名為 "預設配置" 的配置

**輸入:**
```http
POST /api/v1/configurations
Content-Type: application/json

{
  "name": "預設配置",
  "configuration": {...}
}
```

**預期輸出:**
```json
Status: 409 Conflict
{
  "success": false,
  "error": {
    "code": "CONFIGURATION_NAME_EXISTS",
    "message": "配置名稱已存在",
    "details": {
      "field": "name",
      "value": "預設配置"
    }
  }
}
```

**驗證點:**
- [ ] 回傳 409 狀態碼
- [ ] 錯誤訊息清楚說明問題
- [ ] 未新增重複的配置記錄

---

#### 測試 4: 配置資料格式驗證失敗

**目的:** 驗證配置資料必須符合定義的 schema

**輸入:**
```http
POST /api/v1/configurations
Content-Type: application/json

{
  "name": "錯誤配置",
  "configuration": {
    "subtitle": {
      "font_size": 200,  // 超出範圍 (max: 100)
      "font_color": "FFFFFF"  // 缺少 #
    }
  }
}
```

**預期輸出:**
```json
Status: 422 Unprocessable Entity
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "配置資料驗證失敗",
    "details": {
      "errors": [
        {
          "field": "configuration.subtitle.font_size",
          "message": "字體大小必須在 20-100 之間"
        },
        {
          "field": "configuration.subtitle.font_color",
          "message": "顏色格式必須為 #RRGGBB"
        }
      ]
    }
  }
}
```

**驗證點:**
- [ ] 回傳 422 狀態碼
- [ ] 列出所有驗證錯誤
- [ ] 每個錯誤包含欄位路徑和錯誤訊息
- [ ] 未新增無效的配置記錄

---

#### 測試 5: 成功取得單一配置的完整內容

**目的:** 驗證可以取得配置的完整 configuration 資料

**前置條件:**
資料庫中存在配置 id="uuid-1"

**輸入:**
```http
GET /api/v1/configurations/uuid-1
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "name": "預設配置",
    "configuration": {
      "subtitle": {...},
      "logo": {...},
      "overlay_elements": [...]
    },
    "created_at": "2025-01-15T10:30:00Z",
    "last_used_at": "2025-01-15T11:45:00Z",
    "usage_count": 11
  }
}
```

**驗證點:**
- [ ] 回傳 200 狀態碼
- [ ] 包含完整的 configuration 物件
- [ ] usage_count 自動加 1（因為被讀取使用）
- [ ] last_used_at 更新為當前時間

---

#### 測試 6: 配置不存在時回傳 404

**目的:** 驗證請求不存在的配置時正確處理

**輸入:**
```http
GET /api/v1/configurations/non-existent-uuid
```

**預期輸出:**
```json
Status: 404 Not Found
{
  "success": false,
  "error": {
    "code": "CONFIGURATION_NOT_FOUND",
    "message": "配置不存在",
    "details": {
      "configuration_id": "non-existent-uuid"
    }
  }
}
```

**驗證點:**
- [ ] 回傳 404 狀態碼
- [ ] 錯誤訊息清楚
- [ ] 包含請求的 configuration_id

---

#### 測試 7: 成功更新配置

**目的:** 驗證可以更新現有配置的名稱和內容

**前置條件:**
資料庫中存在配置 id="uuid-1"

**輸入:**
```http
PUT /api/v1/configurations/uuid-1
Content-Type: application/json

{
  "name": "預設配置（已更新）",
  "configuration": {
    "subtitle": {
      "font_size": 52
    }
  }
}
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "name": "預設配置（已更新）",
    "message": "配置已更新"
  }
}
```

**驗證點:**
- [ ] 回傳 200 狀態碼
- [ ] 資料庫中配置已更新
- [ ] updated_at 更新為當前時間
- [ ] usage_count 不變（更新不算使用）

---

#### 測試 8: 成功刪除配置

**目的:** 驗證可以刪除配置

**前置條件:**
資料庫中存在配置 id="uuid-2"，且未被任何專案使用

**輸入:**
```http
DELETE /api/v1/configurations/uuid-2
```

**預期輸出:**
```json
Status: 204 No Content
```

**驗證點:**
- [ ] 回傳 204 狀態碼
- [ ] 資料庫中配置已刪除
- [ ] 無 response body

---

#### 測試 9: 配置正在使用時無法刪除

**目的:** 驗證防止刪除正在使用的配置

**前置條件:**
- 資料庫中存在配置 id="uuid-1"
- 存在專案 project_id="proj-1" 使用此配置

**輸入:**
```http
DELETE /api/v1/configurations/uuid-1
```

**預期輸出:**
```json
Status: 409 Conflict
{
  "success": false,
  "error": {
    "code": "CONFIGURATION_IN_USE",
    "message": "配置正在使用中，無法刪除",
    "details": {
      "configuration_id": "uuid-1",
      "projects_count": 1
    }
  }
}
```

**驗證點:**
- [ ] 回傳 409 狀態碼
- [ ] 配置未被刪除
- [ ] 錯誤訊息說明有多少專案使用此配置

---

#### 測試 10: 成功列出所有 Prompt 範本

**目的:** 驗證可以取得所有 Prompt 範本列表

**前置條件:**
資料庫中存在以下 Prompt 範本:
```python
PromptTemplate(
    id="prompt-1",
    name="預設範本",
    content="請將以下內容改寫為 YouTube 腳本...",
    is_default=True,
    usage_count=25
)
PromptTemplate(
    id="prompt-2",
    name="科技評測範本",
    content="請以科技評測風格改寫...",
    is_default=False,
    usage_count=10
)
```

**輸入:**
```http
GET /api/v1/prompt-templates
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "prompt-1",
        "name": "預設範本",
        "content": "請將以下內容改寫為 YouTube 腳本...",
        "is_default": true,
        "created_at": "2025-01-10T10:00:00Z",
        "usage_count": 25
      },
      {
        "id": "prompt-2",
        "name": "科技評測範本",
        "content": "請以科技評測風格改寫...",
        "is_default": false,
        "created_at": "2025-01-15T14:30:00Z",
        "usage_count": 10
      }
    ]
  }
}
```

**驗證點:**
- [ ] 回傳 200 狀態碼
- [ ] 包含所有 Prompt 範本
- [ ] 預設範本排在最前面
- [ ] 包含完整的 content 內容（與 Configuration 不同）

---

#### 測試 11: 成功建立 Prompt 範本

**目的:** 驗證可以建立新的 Prompt 範本

**輸入:**
```http
POST /api/v1/prompt-templates
Content-Type: application/json

{
  "name": "教學影片範本",
  "content": "請將以下內容改寫為教學風格的 YouTube 腳本。要求：\n1. 開場吸引人\n2. 每個段落 10-15 秒\n3. 結尾呼籲訂閱\n\n內容：{{content}}"
}
```

**預期輸出:**
```json
Status: 201 Created
{
  "success": true,
  "data": {
    "id": "new-prompt-uuid",
    "name": "教學影片範本",
    "message": "Prompt 範本已建立"
  }
}
```

**驗證點:**
- [ ] 回傳 201 狀態碼
- [ ] 資料庫中新增了 Prompt 範本
- [ ] is_default 自動設定為 false
- [ ] usage_count 初始化為 0
- [ ] created_at 自動設定

---

#### 測試 12: Prompt 範本名稱重複時建立失敗

**目的:** 驗證不允許建立同名 Prompt 範本

**前置條件:**
資料庫中已存在名為 "預設範本" 的 Prompt

**輸入:**
```http
POST /api/v1/prompt-templates
Content-Type: application/json

{
  "name": "預設範本",
  "content": "..."
}
```

**預期輸出:**
```json
Status: 409 Conflict
{
  "success": false,
  "error": {
    "code": "PROMPT_TEMPLATE_NAME_EXISTS",
    "message": "Prompt 範本名稱已存在"
  }
}
```

**驗證點:**
- [ ] 回傳 409 狀態碼
- [ ] 未新增重複的範本

---

#### 測試 13: Prompt 內容驗證（必須包含變數佔位符）

**目的:** 驗證 Prompt 必須包含 {{content}} 佔位符

**輸入:**
```http
POST /api/v1/prompt-templates
Content-Type: application/json

{
  "name": "錯誤範本",
  "content": "請改寫為 YouTube 腳本"
}
```

**預期輸出:**
```json
Status: 422 Unprocessable Entity
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Prompt 內容必須包含 {{content}} 佔位符",
    "details": {
      "field": "content"
    }
  }
}
```

**驗證點:**
- [ ] 回傳 422 狀態碼
- [ ] 錯誤訊息說明缺少佔位符
- [ ] 未新增無效的範本

---

#### 測試 14: 成功更新 Prompt 範本

**目的:** 驗證可以更新 Prompt 範本的名稱和內容

**前置條件:**
資料庫中存在非預設範本 id="prompt-2"

**輸入:**
```http
PUT /api/v1/prompt-templates/prompt-2
Content-Type: application/json

{
  "name": "科技評測範本（v2）",
  "content": "更新後的 Prompt 內容... {{content}}"
}
```

**預期輸出:**
```json
Status: 200 OK
{
  "success": true,
  "data": {
    "id": "prompt-2",
    "name": "科技評測範本（v2）",
    "message": "Prompt 範本已更新"
  }
}
```

**驗證點:**
- [ ] 回傳 200 狀態碼
- [ ] 資料庫中範本已更新
- [ ] updated_at 更新為當前時間

---

#### 測試 15: 預設範本無法刪除

**目的:** 驗證預設範本受保護，無法刪除

**前置條件:**
資料庫中存在預設範本 id="prompt-1", is_default=True

**輸入:**
```http
DELETE /api/v1/prompt-templates/prompt-1
```

**預期輸出:**
```json
Status: 403 Forbidden
{
  "success": false,
  "error": {
    "code": "DEFAULT_TEMPLATE_PROTECTED",
    "message": "預設範本無法刪除"
  }
}
```

**驗證點:**
- [ ] 回傳 403 狀態碼
- [ ] 預設範本未被刪除
- [ ] 錯誤訊息清楚

---

#### 測試 16: 成功刪除非預設 Prompt 範本

**目的:** 驗證可以刪除非預設範本

**前置條件:**
資料庫中存在非預設範本 id="prompt-2", is_default=False

**輸入:**
```http
DELETE /api/v1/prompt-templates/prompt-2
```

**預期輸出:**
```json
Status: 204 No Content
```

**驗證點:**
- [ ] 回傳 204 狀態碼
- [ ] 資料庫中範本已刪除

---

### 整合測試

#### 測試 17: 完整的配置模板生命週期

**目的:** 驗證從建立到使用到刪除的完整流程

**流程:**
1. 建立新配置 → 201 Created
2. 列出所有配置 → 看到新配置
3. 取得單一配置（模擬使用） → usage_count +1
4. 再次取得 → usage_count +1
5. 更新配置名稱 → 200 OK
6. 刪除配置 → 204 No Content
7. 嘗試取得已刪除配置 → 404 Not Found

**驗證點:**
- [ ] 所有步驟按預期執行
- [ ] usage_count 正確累加
- [ ] last_used_at 正確更新
- [ ] 刪除後無法存取

---

#### 測試 18: Prompt 範本與專案整合

**目的:** 驗證 Prompt 範本可以被專案正確使用

**前置條件:**
- 存在 Prompt 範本 id="prompt-1"
- Task-004 的 Projects API 已實作

**流程:**
1. 建立專案，使用 prompt_template_id="prompt-1"
2. 檢查 Prompt 範本的 usage_count → 應增加
3. 嘗試刪除 Prompt 範本 → 應失敗（正在使用）
4. 刪除專案
5. 再次嘗試刪除 Prompt 範本 → 應成功

**驗證點:**
- [ ] 專案可以關聯 Prompt 範本
- [ ] 使用中的範本無法刪除
- [ ] 無專案使用後可以刪除

---

## 實作規格

### 需要建立/修改的檔案

#### 1. API Router: `backend/app/api/v1/configurations.py`

**職責:** 處理視覺配置相關的 HTTP 請求

**端點與方法:**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.schemas.configuration import (
    ConfigurationCreate,
    ConfigurationUpdate,
    ConfigurationResponse,
    ConfigurationListResponse
)
from app.services.config_service import ConfigurationService
from app.database import get_db

router = APIRouter(prefix="/configurations", tags=["configurations"])

@router.get("", response_model=ConfigurationListResponse)
async def list_configurations(
    db: Session = Depends(get_db)
):
    """
    列出所有視覺配置模板

    回傳按 last_used_at 降序排列的配置列表
    """
    service = ConfigurationService(db)
    configurations = service.list_configurations()
    return {"success": True, "data": {"configurations": configurations}}

@router.post("", response_model=ConfigurationResponse, status_code=status.HTTP_201_CREATED)
async def create_configuration(
    data: ConfigurationCreate,
    db: Session = Depends(get_db)
):
    """
    建立新的視覺配置模板

    - **name**: 配置名稱（必須唯一）
    - **configuration**: 配置內容（JSON 格式，包含 subtitle, logo, overlay_elements）
    """
    service = ConfigurationService(db)
    configuration = service.create_configuration(data)
    return {
        "success": True,
        "data": {
            "id": str(configuration.id),
            "name": configuration.name,
            "created_at": configuration.created_at,
            "message": "配置已建立"
        }
    }

@router.get("/{configuration_id}", response_model=ConfigurationResponse)
async def get_configuration(
    configuration_id: str,
    db: Session = Depends(get_db)
):
    """
    取得單一配置的完整內容

    會自動更新 usage_count 和 last_used_at
    """
    service = ConfigurationService(db)
    configuration = service.get_configuration(configuration_id)
    return {"success": True, "data": configuration}

@router.put("/{configuration_id}", response_model=ConfigurationResponse)
async def update_configuration(
    configuration_id: str,
    data: ConfigurationUpdate,
    db: Session = Depends(get_db)
):
    """
    更新配置

    可以更新 name 和 configuration 內容
    """
    service = ConfigurationService(db)
    configuration = service.update_configuration(configuration_id, data)
    return {
        "success": True,
        "data": {
            "id": str(configuration.id),
            "name": configuration.name,
            "message": "配置已更新"
        }
    }

@router.delete("/{configuration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_configuration(
    configuration_id: str,
    db: Session = Depends(get_db)
):
    """
    刪除配置

    如果配置正在被專案使用，將回傳 409 錯誤
    """
    service = ConfigurationService(db)
    service.delete_configuration(configuration_id)
    return None
```

---

#### 2. API Router: `backend/app/api/v1/prompt_templates.py`

**職責:** 處理 Prompt 範本相關的 HTTP 請求

**端點與方法:**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.schemas.prompt_template import (
    PromptTemplateCreate,
    PromptTemplateUpdate,
    PromptTemplateResponse,
    PromptTemplateListResponse
)
from app.services.prompt_template_service import PromptTemplateService
from app.database import get_db

router = APIRouter(prefix="/prompt-templates", tags=["prompt-templates"])

@router.get("", response_model=PromptTemplateListResponse)
async def list_prompt_templates(
    db: Session = Depends(get_db)
):
    """
    列出所有 Prompt 範本

    預設範本排在最前面
    """
    service = PromptTemplateService(db)
    templates = service.list_templates()
    return {"success": True, "data": {"templates": templates}}

@router.post("", response_model=PromptTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt_template(
    data: PromptTemplateCreate,
    db: Session = Depends(get_db)
):
    """
    建立新的 Prompt 範本

    - **name**: 範本名稱（必須唯一）
    - **content**: Prompt 內容（必須包含 {{content}} 佔位符）
    """
    service = PromptTemplateService(db)
    template = service.create_template(data)
    return {
        "success": True,
        "data": {
            "id": str(template.id),
            "name": template.name,
            "message": "Prompt 範本已建立"
        }
    }

@router.get("/{template_id}", response_model=PromptTemplateResponse)
async def get_prompt_template(
    template_id: str,
    db: Session = Depends(get_db)
):
    """
    取得單一 Prompt 範本

    會自動更新 usage_count
    """
    service = PromptTemplateService(db)
    template = service.get_template(template_id)
    return {"success": True, "data": template}

@router.put("/{template_id}", response_model=PromptTemplateResponse)
async def update_prompt_template(
    template_id: str,
    data: PromptTemplateUpdate,
    db: Session = Depends(get_db)
):
    """
    更新 Prompt 範本

    可以更新 name 和 content
    """
    service = PromptTemplateService(db)
    template = service.update_template(template_id, data)
    return {
        "success": True,
        "data": {
            "id": str(template.id),
            "name": template.name,
            "message": "Prompt 範本已更新"
        }
    }

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt_template(
    template_id: str,
    db: Session = Depends(get_db)
):
    """
    刪除 Prompt 範本

    預設範本無法刪除（回傳 403）
    正在使用的範本無法刪除（回傳 409）
    """
    service = PromptTemplateService(db)
    service.delete_template(template_id)
    return None
```

---

#### 3. Service: `backend/app/services/config_service.py`

**職責:** 視覺配置業務邏輯

**方法:**

```python
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status
from datetime import datetime
from typing import List, Optional
import uuid

from app.models.configuration import Configuration
from app.models.project import Project
from app.schemas.configuration import ConfigurationCreate, ConfigurationUpdate
from app.validators.config_validator import validate_configuration_data

class ConfigurationService:
    def __init__(self, db: Session):
        self.db = db

    def list_configurations(self) -> List[Configuration]:
        """
        列出所有配置

        按 last_used_at 降序排列（最近使用的在前）
        """
        configurations = (
            self.db.query(Configuration)
            .order_by(desc(Configuration.last_used_at))
            .all()
        )
        return configurations

    def create_configuration(self, data: ConfigurationCreate) -> Configuration:
        """
        建立新配置

        1. 檢查名稱是否重複
        2. 驗證配置資料格式
        3. 建立資料庫記錄
        """
        # 檢查名稱是否存在
        existing = self.db.query(Configuration).filter(
            Configuration.name == data.name
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "CONFIGURATION_NAME_EXISTS",
                    "message": "配置名稱已存在",
                    "details": {
                        "field": "name",
                        "value": data.name
                    }
                }
            )

        # 驗證配置資料格式
        validation_errors = validate_configuration_data(data.configuration)
        if validation_errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": "配置資料驗證失敗",
                    "details": {
                        "errors": validation_errors
                    }
                }
            )

        # 建立配置
        configuration = Configuration(
            id=str(uuid.uuid4()),
            name=data.name,
            configuration=data.configuration,
            created_at=datetime.utcnow(),
            usage_count=0,
            last_used_at=None
        )

        self.db.add(configuration)
        self.db.commit()
        self.db.refresh(configuration)

        return configuration

    def get_configuration(self, configuration_id: str) -> Configuration:
        """
        取得單一配置

        會更新 usage_count 和 last_used_at
        """
        configuration = self.db.query(Configuration).filter(
            Configuration.id == configuration_id
        ).first()

        if not configuration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "CONFIGURATION_NOT_FOUND",
                    "message": "配置不存在",
                    "details": {
                        "configuration_id": configuration_id
                    }
                }
            )

        # 更新使用統計
        configuration.usage_count += 1
        configuration.last_used_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(configuration)

        return configuration

    def update_configuration(
        self,
        configuration_id: str,
        data: ConfigurationUpdate
    ) -> Configuration:
        """
        更新配置
        """
        configuration = self.db.query(Configuration).filter(
            Configuration.id == configuration_id
        ).first()

        if not configuration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "CONFIGURATION_NOT_FOUND",
                    "message": "配置不存在"
                }
            )

        # 檢查名稱重複（如果要更新名稱）
        if data.name and data.name != configuration.name:
            existing = self.db.query(Configuration).filter(
                Configuration.name == data.name
            ).first()

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "CONFIGURATION_NAME_EXISTS",
                        "message": "配置名稱已存在"
                    }
                )

        # 驗證配置資料（如果要更新配置）
        if data.configuration:
            validation_errors = validate_configuration_data(data.configuration)
            if validation_errors:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "code": "VALIDATION_ERROR",
                        "message": "配置資料驗證失敗",
                        "details": {"errors": validation_errors}
                    }
                )

        # 更新欄位
        if data.name:
            configuration.name = data.name
        if data.configuration:
            configuration.configuration = data.configuration

        configuration.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(configuration)

        return configuration

    def delete_configuration(self, configuration_id: str) -> None:
        """
        刪除配置

        檢查是否有專案使用此配置
        """
        configuration = self.db.query(Configuration).filter(
            Configuration.id == configuration_id
        ).first()

        if not configuration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "CONFIGURATION_NOT_FOUND",
                    "message": "配置不存在"
                }
            )

        # 檢查是否有專案使用此配置
        projects_count = self.db.query(Project).filter(
            Project.configuration_id == configuration_id
        ).count()

        if projects_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "CONFIGURATION_IN_USE",
                    "message": "配置正在使用中，無法刪除",
                    "details": {
                        "configuration_id": configuration_id,
                        "projects_count": projects_count
                    }
                }
            )

        self.db.delete(configuration)
        self.db.commit()
```

---

#### 4. Service: `backend/app/services/prompt_template_service.py`

**職責:** Prompt 範本業務邏輯

**方法:**

```python
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status
from datetime import datetime
from typing import List
import uuid
import re

from app.models.prompt_template import PromptTemplate
from app.models.project import Project
from app.schemas.prompt_template import PromptTemplateCreate, PromptTemplateUpdate

class PromptTemplateService:
    def __init__(self, db: Session):
        self.db = db

    def list_templates(self) -> List[PromptTemplate]:
        """
        列出所有 Prompt 範本

        預設範本排在最前面
        """
        templates = (
            self.db.query(PromptTemplate)
            .order_by(desc(PromptTemplate.is_default), desc(PromptTemplate.usage_count))
            .all()
        )
        return templates

    def create_template(self, data: PromptTemplateCreate) -> PromptTemplate:
        """
        建立新 Prompt 範本

        1. 檢查名稱是否重複
        2. 驗證 Prompt 內容（必須包含 {{content}} 佔位符）
        3. 建立資料庫記錄
        """
        # 檢查名稱是否存在
        existing = self.db.query(PromptTemplate).filter(
            PromptTemplate.name == data.name
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "PROMPT_TEMPLATE_NAME_EXISTS",
                    "message": "Prompt 範本名稱已存在"
                }
            )

        # 驗證 Prompt 內容必須包含 {{content}} 佔位符
        if not self._validate_prompt_content(data.content):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": "Prompt 內容必須包含 {{content}} 佔位符",
                    "details": {
                        "field": "content"
                    }
                }
            )

        # 建立範本
        template = PromptTemplate(
            id=str(uuid.uuid4()),
            name=data.name,
            content=data.content,
            is_default=False,  # 用戶建立的範本不是預設範本
            created_at=datetime.utcnow(),
            usage_count=0
        )

        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)

        return template

    def get_template(self, template_id: str) -> PromptTemplate:
        """
        取得單一 Prompt 範本

        會更新 usage_count
        """
        template = self.db.query(PromptTemplate).filter(
            PromptTemplate.id == template_id
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "PROMPT_TEMPLATE_NOT_FOUND",
                    "message": "Prompt 範本不存在"
                }
            )

        # 更新使用統計
        template.usage_count += 1
        self.db.commit()
        self.db.refresh(template)

        return template

    def update_template(
        self,
        template_id: str,
        data: PromptTemplateUpdate
    ) -> PromptTemplate:
        """
        更新 Prompt 範本
        """
        template = self.db.query(PromptTemplate).filter(
            PromptTemplate.id == template_id
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "PROMPT_TEMPLATE_NOT_FOUND",
                    "message": "Prompt 範本不存在"
                }
            )

        # 檢查名稱重複（如果要更新名稱）
        if data.name and data.name != template.name:
            existing = self.db.query(PromptTemplate).filter(
                PromptTemplate.name == data.name
            ).first()

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "PROMPT_TEMPLATE_NAME_EXISTS",
                        "message": "Prompt 範本名稱已存在"
                    }
                )

        # 驗證 Prompt 內容（如果要更新內容）
        if data.content and not self._validate_prompt_content(data.content):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": "Prompt 內容必須包含 {{content}} 佔位符"
                }
            )

        # 更新欄位
        if data.name:
            template.name = data.name
        if data.content:
            template.content = data.content

        template.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(template)

        return template

    def delete_template(self, template_id: str) -> None:
        """
        刪除 Prompt 範本

        1. 檢查是否為預設範本（不可刪除）
        2. 檢查是否有專案使用
        """
        template = self.db.query(PromptTemplate).filter(
            PromptTemplate.id == template_id
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "PROMPT_TEMPLATE_NOT_FOUND",
                    "message": "Prompt 範本不存在"
                }
            )

        # 檢查是否為預設範本
        if template.is_default:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "DEFAULT_TEMPLATE_PROTECTED",
                    "message": "預設範本無法刪除"
                }
            )

        # 檢查是否有專案使用此範本
        projects_count = self.db.query(Project).filter(
            Project.prompt_template_id == template_id
        ).count()

        if projects_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "PROMPT_TEMPLATE_IN_USE",
                    "message": "Prompt 範本正在使用中，無法刪除",
                    "details": {
                        "projects_count": projects_count
                    }
                }
            )

        self.db.delete(template)
        self.db.commit()

    def _validate_prompt_content(self, content: str) -> bool:
        """
        驗證 Prompt 內容格式

        必須包含 {{content}} 佔位符
        """
        return "{{content}}" in content
```

---

#### 5. Schemas: `backend/app/schemas/configuration.py`

**職責:** Configuration 的 Request/Response 資料驗證

```python
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Dict, Any, List, Optional

class SubtitleConfig(BaseModel):
    """字幕配置 schema"""
    font_family: str = Field(..., description="字體名稱")
    font_size: int = Field(..., ge=20, le=100, description="字體大小")
    font_color: str = Field(..., pattern=r'^#[0-9A-Fa-f]{6}$', description="字體顏色")
    position: str = Field(..., description="位置 (top/center/bottom)")
    border_enabled: bool = Field(False, description="是否顯示邊框")
    border_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    border_width: Optional[int] = Field(None, ge=1, le=10)
    shadow_enabled: bool = Field(False, description="是否顯示陰影")
    shadow_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    shadow_offset_x: Optional[int] = Field(None, ge=-20, le=20)
    shadow_offset_y: Optional[int] = Field(None, ge=-20, le=20)

class LogoConfig(BaseModel):
    """Logo 配置 schema"""
    logo_file: Optional[str] = Field(None, description="Logo 檔案路徑")
    logo_x: int = Field(..., ge=0, le=1920, description="X 座標")
    logo_y: int = Field(..., ge=0, le=1080, description="Y 座標")
    logo_size: int = Field(..., ge=10, le=200, description="Logo 大小")
    logo_opacity: int = Field(..., ge=0, le=100, description="透明度")

class OverlayElement(BaseModel):
    """疊加元素 schema"""
    type: str = Field(..., description="元素類型 (text/shape/image)")
    x: int = Field(..., ge=0, le=1920)
    y: int = Field(..., ge=0, le=1080)
    width: Optional[int] = Field(None, ge=1, le=1920)
    height: Optional[int] = Field(None, ge=1, le=1080)
    content: Optional[str] = Field(None)
    style: Optional[Dict[str, Any]] = Field(None)

class ConfigurationData(BaseModel):
    """配置資料的完整 schema"""
    subtitle: SubtitleConfig
    logo: LogoConfig
    overlay_elements: List[OverlayElement] = []

class ConfigurationCreate(BaseModel):
    """建立配置的請求 schema"""
    name: str = Field(..., min_length=1, max_length=200, description="配置名稱")
    configuration: Dict[str, Any] = Field(..., description="配置內容")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "預設配置",
                "configuration": {
                    "subtitle": {
                        "font_family": "Arial",
                        "font_size": 48,
                        "font_color": "#FFFFFF",
                        "position": "bottom",
                        "border_enabled": True
                    },
                    "logo": {
                        "logo_x": 50,
                        "logo_y": 50,
                        "logo_size": 100,
                        "logo_opacity": 80
                    },
                    "overlay_elements": []
                }
            }
        }

class ConfigurationUpdate(BaseModel):
    """更新配置的請求 schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    configuration: Optional[Dict[str, Any]] = None

class ConfigurationListItem(BaseModel):
    """配置列表項目 schema（不含完整 configuration）"""
    id: str
    name: str
    created_at: datetime
    last_used_at: Optional[datetime]
    usage_count: int

    class Config:
        from_attributes = True

class ConfigurationDetail(BaseModel):
    """配置詳細資料 schema（含完整 configuration）"""
    id: str
    name: str
    configuration: Dict[str, Any]
    created_at: datetime
    last_used_at: Optional[datetime]
    usage_count: int

    class Config:
        from_attributes = True

class ConfigurationListResponse(BaseModel):
    """列出配置的回應 schema"""
    success: bool = True
    data: Dict[str, List[ConfigurationListItem]]

class ConfigurationResponse(BaseModel):
    """單一配置的回應 schema"""
    success: bool = True
    data: ConfigurationDetail
```

---

#### 6. Schemas: `backend/app/schemas/prompt_template.py`

**職責:** PromptTemplate 的 Request/Response 資料驗證

```python
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import List, Optional, Dict

class PromptTemplateCreate(BaseModel):
    """建立 Prompt 範本的請求 schema"""
    name: str = Field(..., min_length=1, max_length=200, description="範本名稱")
    content: str = Field(..., min_length=10, description="Prompt 內容")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "預設範本",
                "content": "請將以下內容改寫為 YouTube 腳本...\n\n內容：{{content}}"
            }
        }

class PromptTemplateUpdate(BaseModel):
    """更新 Prompt 範本的請求 schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=10)

class PromptTemplateDetail(BaseModel):
    """Prompt 範本詳細資料 schema"""
    id: str
    name: str
    content: str
    is_default: bool
    created_at: datetime
    usage_count: int

    class Config:
        from_attributes = True

class PromptTemplateListResponse(BaseModel):
    """列出 Prompt 範本的回應 schema"""
    success: bool = True
    data: Dict[str, List[PromptTemplateDetail]]

class PromptTemplateResponse(BaseModel):
    """單一 Prompt 範本的回應 schema"""
    success: bool = True
    data: PromptTemplateDetail
```

---

#### 7. Validator: `backend/app/validators/config_validator.py`

**職責:** 配置資料格式驗證

```python
from typing import Dict, Any, List
from pydantic import ValidationError
from app.schemas.configuration import ConfigurationData

def validate_configuration_data(config_data: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    驗證配置資料格式

    使用 Pydantic schema 進行驗證

    Returns:
        List[Dict]: 驗證錯誤列表，空列表表示驗證通過
    """
    errors = []

    try:
        # 使用 Pydantic schema 驗證
        ConfigurationData(**config_data)
    except ValidationError as e:
        # 轉換 Pydantic 錯誤為自訂格式
        for error in e.errors():
            field_path = ".".join(str(loc) for loc in error["loc"])
            errors.append({
                "field": f"configuration.{field_path}",
                "message": error["msg"]
            })

    return errors
```

---

#### 8. 測試檔案: `backend/tests/api/test_configurations.py`

**職責:** Configuration API 測試

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import get_db
from app.models.configuration import Configuration

client = TestClient(app)

@pytest.fixture
def db_session():
    """測試用資料庫 session"""
    # 設定測試資料庫
    # ... (依賴 Task-002 的測試資料庫設定)
    pass

@pytest.fixture
def sample_configuration(db_session):
    """建立測試用配置"""
    config = Configuration(
        id="test-uuid-1",
        name="測試配置",
        configuration={
            "subtitle": {
                "font_family": "Arial",
                "font_size": 48,
                "font_color": "#FFFFFF",
                "position": "bottom"
            },
            "logo": {
                "logo_x": 50,
                "logo_y": 50,
                "logo_size": 100,
                "logo_opacity": 80
            },
            "overlay_elements": []
        },
        usage_count=5
    )
    db_session.add(config)
    db_session.commit()
    return config

def test_list_configurations(db_session, sample_configuration):
    """測試 1：列出所有配置"""
    response = client.get("/api/v1/configurations")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["configurations"]) >= 1
    assert data["data"]["configurations"][0]["name"] == "測試配置"

def test_create_configuration_success():
    """測試 2：成功建立配置"""
    payload = {
        "name": "新配置",
        "configuration": {
            "subtitle": {
                "font_family": "Arial",
                "font_size": 48,
                "font_color": "#FFFFFF",
                "position": "bottom",
                "border_enabled": True
            },
            "logo": {
                "logo_x": 100,
                "logo_y": 100,
                "logo_size": 120,
                "logo_opacity": 90
            },
            "overlay_elements": []
        }
    }

    response = client.post("/api/v1/configurations", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "新配置"

def test_create_configuration_duplicate_name(sample_configuration):
    """測試 3：重複名稱建立失敗"""
    payload = {
        "name": "測試配置",  # 與 sample_configuration 重複
        "configuration": {...}
    }

    response = client.post("/api/v1/configurations", json=payload)

    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CONFIGURATION_NAME_EXISTS"

def test_create_configuration_invalid_data():
    """測試 4：配置資料驗證失敗"""
    payload = {
        "name": "錯誤配置",
        "configuration": {
            "subtitle": {
                "font_size": 200,  # 超出範圍
                "font_color": "FFFFFF"  # 缺少 #
            }
        }
    }

    response = client.post("/api/v1/configurations", json=payload)

    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert len(data["error"]["details"]["errors"]) > 0

def test_get_configuration_success(sample_configuration):
    """測試 5：成功取得配置"""
    original_usage_count = sample_configuration.usage_count

    response = client.get(f"/api/v1/configurations/{sample_configuration.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == sample_configuration.id
    assert data["data"]["usage_count"] == original_usage_count + 1

def test_get_configuration_not_found():
    """測試 6：配置不存在"""
    response = client.get("/api/v1/configurations/non-existent-id")

    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "CONFIGURATION_NOT_FOUND"

def test_update_configuration_success(sample_configuration):
    """測試 7：成功更新配置"""
    payload = {
        "name": "更新後的配置"
    }

    response = client.put(
        f"/api/v1/configurations/{sample_configuration.id}",
        json=payload
    )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["name"] == "更新後的配置"

def test_delete_configuration_success(db_session):
    """測試 8：成功刪除配置"""
    # 建立一個沒有專案使用的配置
    config = Configuration(id="delete-test", name="待刪除", configuration={})
    db_session.add(config)
    db_session.commit()

    response = client.delete(f"/api/v1/configurations/{config.id}")

    assert response.status_code == 204

def test_delete_configuration_in_use(sample_configuration, db_session):
    """測試 9：配置正在使用時無法刪除"""
    # 建立一個使用此配置的專案
    from app.models.project import Project
    project = Project(
        id="test-project",
        name="測試專案",
        configuration_id=sample_configuration.id,
        # ... 其他必要欄位
    )
    db_session.add(project)
    db_session.commit()

    response = client.delete(f"/api/v1/configurations/{sample_configuration.id}")

    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "CONFIGURATION_IN_USE"

# ... 更多測試（Prompt Templates 的測試類似）
```

---

#### 9. 測試檔案: `backend/tests/api/test_prompt_templates.py`

**職責:** PromptTemplate API 測試

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.prompt_template import PromptTemplate

client = TestClient(app)

def test_list_prompt_templates():
    """測試 10：列出所有 Prompt 範本"""
    response = client.get("/api/v1/prompt-templates")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    # 預設範本應該排在最前面
    if len(data["data"]["templates"]) > 1:
        assert data["data"]["templates"][0]["is_default"] is True

def test_create_prompt_template_success():
    """測試 11：成功建立 Prompt 範本"""
    payload = {
        "name": "教學範本",
        "content": "請改寫為教學風格... {{content}}"
    }

    response = client.post("/api/v1/prompt-templates", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True

def test_create_prompt_template_duplicate_name():
    """測試 12：重複名稱失敗"""
    # 先建立一個範本
    client.post("/api/v1/prompt-templates", json={
        "name": "重複測試",
        "content": "... {{content}}"
    })

    # 嘗試建立同名範本
    response = client.post("/api/v1/prompt-templates", json={
        "name": "重複測試",
        "content": "... {{content}}"
    })

    assert response.status_code == 409

def test_create_prompt_template_missing_placeholder():
    """測試 13：缺少佔位符驗證失敗"""
    payload = {
        "name": "錯誤範本",
        "content": "這個 Prompt 沒有佔位符"
    }

    response = client.post("/api/v1/prompt-templates", json=payload)

    assert response.status_code == 422
    data = response.json()
    assert "{{content}}" in data["error"]["message"]

def test_delete_default_template_forbidden(db_session):
    """測試 15：預設範本無法刪除"""
    # 建立一個預設範本
    template = PromptTemplate(
        id="default-template",
        name="預設",
        content="... {{content}}",
        is_default=True
    )
    db_session.add(template)
    db_session.commit()

    response = client.delete(f"/api/v1/prompt-templates/{template.id}")

    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "DEFAULT_TEMPLATE_PROTECTED"

# ... 更多測試
```

---

## API 端點清單

### 視覺配置 API (5 個端點)

| 方法 | 端點 | 說明 | 狀態碼 |
|------|------|------|--------|
| GET | `/api/v1/configurations` | 列出所有配置 | 200 |
| POST | `/api/v1/configurations` | 建立配置 | 201 |
| GET | `/api/v1/configurations/:id` | 取得單一配置 | 200, 404 |
| PUT | `/api/v1/configurations/:id` | 更新配置 | 200, 404, 409 |
| DELETE | `/api/v1/configurations/:id` | 刪除配置 | 204, 404, 409 |

### Prompt 範本 API (5 個端點)

| 方法 | 端點 | 說明 | 狀態碼 |
|------|------|------|--------|
| GET | `/api/v1/prompt-templates` | 列出所有範本 | 200 |
| POST | `/api/v1/prompt-templates` | 建立範本 | 201, 409, 422 |
| GET | `/api/v1/prompt-templates/:id` | 取得單一範本 | 200, 404 |
| PUT | `/api/v1/prompt-templates/:id` | 更新範本 | 200, 404, 409, 422 |
| DELETE | `/api/v1/prompt-templates/:id` | 刪除範本 | 204, 403, 404, 409 |

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）
1. 確認 Task-002（資料庫）和 Task-003（API 基礎）已完成
2. 確認測試環境可運行：`pytest`
3. 閱讀 `tech-specs/backend/api-configurations.md`
4. 閱讀 `tech-specs/backend/database.md` 的 Configuration 和 PromptTemplate 模型

#### 第 2 步：建立測試框架（20 分鐘）
1. 建立 `tests/api/test_configurations.py`
2. 建立 `tests/api/test_prompt_templates.py`
3. 設定測試資料庫 fixtures
4. 撰寫「測試 1：列出所有配置」（先寫測試）
5. 執行測試 → 失敗（預期，因為還沒實作）

#### 第 3 步：實作 Schemas（30 分鐘）
1. 建立 `app/schemas/configuration.py`
   - ConfigurationCreate
   - ConfigurationUpdate
   - ConfigurationListItem
   - ConfigurationDetail
   - SubtitleConfig, LogoConfig, OverlayElement
2. 建立 `app/schemas/prompt_template.py`
   - PromptTemplateCreate
   - PromptTemplateUpdate
   - PromptTemplateDetail
3. 測試 schemas 驗證邏輯（單獨的 schema 測試）

#### 第 4 步：實作 Validator（20 分鐘）
1. 建立 `app/validators/config_validator.py`
2. 實作 `validate_configuration_data()` 函數
3. 撰寫 validator 單元測試
4. 測試通過 ✅

#### 第 5 步：實作 ConfigurationService（60 分鐘）
1. 建立 `app/services/config_service.py`
2. 實作方法（按順序）：
   - `list_configurations()` → 測試 1 通過
   - `create_configuration()` → 測試 2, 3, 4 通過
   - `get_configuration()` → 測試 5, 6 通過
   - `update_configuration()` → 測試 7 通過
   - `delete_configuration()` → 測試 8, 9 通過
3. 每實作一個方法，立即運行對應測試
4. 所有測試通過 ✅

#### 第 6 步：實作 Configuration API Router（30 分鐘）
1. 建立 `app/api/v1/configurations.py`
2. 實作 5 個端點
3. 在 `app/main.py` 註冊 router:
   ```python
   from app.api.v1 import configurations
   app.include_router(configurations.router, prefix="/api/v1")
   ```
4. 執行所有 Configuration 測試 → 通過 ✅

#### 第 7 步：實作 PromptTemplateService（50 分鐘）
1. 建立 `app/services/prompt_template_service.py`
2. 實作方法（按順序）：
   - `list_templates()` → 測試 10 通過
   - `create_template()` → 測試 11, 12, 13 通過
   - `get_template()` → 測試通過
   - `update_template()` → 測試 14 通過
   - `delete_template()` → 測試 15, 16 通過
3. 每實作一個方法，立即運行測試
4. 所有測試通過 ✅

#### 第 8 步：實作 PromptTemplate API Router（30 分鐘）
1. 建立 `app/api/v1/prompt_templates.py`
2. 實作 5 個端點
3. 在 `app/main.py` 註冊 router
4. 執行所有 PromptTemplate 測試 → 通過 ✅

#### 第 9 步：整合測試（40 分鐘）
1. 撰寫「測試 17：完整配置生命週期」
2. 撰寫「測試 18：Prompt 範本與專案整合」
3. 執行所有測試 → 通過 ✅

#### 第 10 步：重構與優化（30 分鐘）
1. 檢查程式碼重複，提取共用邏輯
2. 改善錯誤訊息
3. 優化資料庫查詢（使用 joinedload 減少 N+1 問題）
4. 再次執行所有測試

#### 第 11 步：文件與檢查（30 分鐘）
1. 更新 Swagger 文檔註釋（已在 router 中添加）
2. 檢查測試覆蓋率：`pytest --cov=app/services --cov=app/api`
3. 執行 linter：`ruff check .`
4. 格式化程式碼：`ruff format .`
5. 手動測試 API（使用 Postman 或 curl）

---

### 注意事項

#### 資料驗證
- ✅ 使用 Pydantic schemas 進行嚴格的資料驗證
- ✅ 配置資料必須符合定義的 schema（字體大小、顏色格式等）
- ✅ Prompt 內容必須包含 `{{content}}` 佔位符
- ✅ 名稱必須唯一

#### 業務邏輯
- ✅ 取得配置時自動更新 usage_count 和 last_used_at
- ✅ 預設 Prompt 範本無法刪除
- ✅ 正在使用的配置/範本無法刪除
- ✅ 列表按使用統計排序（Configuration 按 last_used_at，Prompt 按 is_default 和 usage_count）

#### 錯誤處理
- ✅ 使用統一的錯誤格式（參考 `tech-specs/backend/api-design.md`）
- ✅ 明確的錯誤碼和錯誤訊息
- ✅ 驗證錯誤包含詳細的欄位資訊

#### 效能
- 💡 Configuration 列表不回傳完整的 configuration 內容（減少資料傳輸）
- 💡 使用索引優化查詢（last_used_at, is_default）
- 💡 考慮添加分頁（如果配置/範本數量很多）

#### 測試
- ✅ 每個測試使用獨立的資料庫 transaction
- ✅ 測試後自動清理資料
- ✅ 測試覆蓋所有錯誤情境

#### 與其他模組整合
- 🔗 Task-004（Projects API）會使用 configuration_id 和 prompt_template_id
- 🔗 Task-022（前端視覺配置頁面）會呼叫這些 API
- 🔗 Task-027（配置管理頁面）會呼叫這些 API

---

### 完成檢查清單

#### 功能完整性
- [ ] 11 個 API 端點全部實作完成
  - [ ] Configuration CRUD: 5 個端點
  - [ ] PromptTemplate CRUD: 5 個端點
- [ ] ConfigurationService 完整實作
- [ ] PromptTemplateService 完整實作
- [ ] 配置資料驗證邏輯完整
- [ ] 使用統計自動更新

#### 測試
- [ ] 所有單元測試通過（16 個測試）
- [ ] 整合測試通過（2 個測試）
- [ ] 測試覆蓋率 > 85%
- [ ] 測試可獨立執行

#### 程式碼品質
- [ ] Ruff check 無錯誤：`ruff check .`
- [ ] 程式碼已格式化：`ruff format .`
- [ ] 無 type 錯誤（如使用 mypy）
- [ ] 無安全性警告

#### 文件
- [ ] API 文件完整（Swagger/OpenAPI）
- [ ] 所有函數都有 docstring
- [ ] 錯誤碼文件已更新

#### 整合
- [ ] 在本地環境手動測試所有端點
- [ ] 使用 Postman/curl 測試 API
- [ ] 檢查資料庫記錄正確建立/更新/刪除
- [ ] 驗證錯誤處理正確

#### Spec 同步
- [ ] 如果實作與 spec 有差異，已更新相關 spec 文件
- [ ] 如果有新的依賴套件，已更新 `requirements.txt`

---

## 預估時間分配

| 階段 | 時間 |
|------|------|
| 環境準備與閱讀文件 | 10 分鐘 |
| 建立測試框架 | 20 分鐘 |
| 實作 Schemas | 30 分鐘 |
| 實作 Validator | 20 分鐘 |
| 實作 ConfigurationService | 60 分鐘 |
| 實作 Configuration API Router | 30 分鐘 |
| 實作 PromptTemplateService | 50 分鐘 |
| 實作 PromptTemplate API Router | 30 分鐘 |
| 整合測試 | 40 分鐘 |
| 重構優化 | 30 分鐘 |
| 文件檢查 | 30 分鐘 |

**總計：約 5.5 小時**（預留 0.5 小時 buffer = 6 小時）

---

## 參考資源

### FastAPI 官方文檔
- [Request Body](https://fastapi.tiangolo.com/tutorial/body/)
- [Response Model](https://fastapi.tiangolo.com/tutorial/response-model/)
- [Handling Errors](https://fastapi.tiangolo.com/tutorial/handling-errors/)

### Pydantic 文檔
- [Validators](https://docs.pydantic.dev/latest/concepts/validators/)
- [Field Types](https://docs.pydantic.dev/latest/concepts/types/)

### SQLAlchemy 文檔
- [Querying](https://docs.sqlalchemy.org/en/20/orm/queryguide/)
- [Session Basics](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)

### 專案內部文件
- `tech-specs/backend/api-configurations.md` - API 端點規格
- `tech-specs/backend/database.md` - 資料模型設計
- `tech-specs/backend/api-design.md` - API 設計規範
- `tech-specs/framework.md` - 技術框架選擇

---

**準備好了嗎？** 開始使用 TDD 方式實作 Configurations API！🚀
