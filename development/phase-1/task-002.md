# Task-002: 資料庫 Schema 設計與實作

> **建立日期：** 2025-01-19
> **狀態：** ⏳ 未開始
> **預計時間：** 6 小時
> **優先級：** P0

---

## 關聯文件

### 技術規格
- **資料庫設計:** `tech-specs/backend/database.md` (完整文件)
- **後端架構:** `tech-specs/backend/overview.md`
- **API 設計:** `tech-specs/backend/api-design.md`

### 相關任務
- **前置任務:** Task-001 ✅
- **後續任務:** Task-003 (API 基礎架構), Task-004 (專案管理 API)
- **並行任務:** 無（必須等 Task-001 完成）

---

## 任務目標

### 簡述
實作所有 10 個 SQLAlchemy 資料模型、建立索引、定義關聯關係、設定 Alembic 遷移腳本。

### 詳細說明
根據 `tech-specs/backend/database.md` 的設計，實作完整的資料庫層：
- 10 個主要資料實體：Project, Configuration, PromptTemplate, VisualTemplate, Script, Asset, BatchTask, Setting, APIKey, YouTubeAuth
- 所有外鍵關聯和 CASCADE 策略
- 適當的索引以優化查詢效能
- Alembic 遷移腳本
- 資料庫初始化和 seeder

### 成功標準
- [ ] 所有 10 個模型定義完成
- [ ] 索引和外鍵正確設定
- [ ] Alembic 遷移可以成功執行
- [ ] 資料庫可以初始化並建立測試資料
- [ ] 模型單元測試通過

---

## 測試要求

### 測試環境設定

**前置條件：**
- Task-001 已完成
- SQLite 可用
- SQLAlchemy 和 Alembic 已安裝

---

### 單元測試

#### 測試 1：Project 模型可以建立

**測試檔案：** `tests/unit/models/test_project.py`

**測試內容：**
```python
def test_create_project(db_session):
    """測試建立專案"""
    project = Project(
        id=str(uuid.uuid4()),
        name="測試專案",
        status=ProjectStatus.INITIALIZED,
        content="這是測試文字內容" * 100,  # 500+ 字
        word_count=500,
        prompt_template_id="template_id",
        gemini_model="gemini-1.5-flash",
        youtube_settings={"title": "測試影片"},
        progress=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db_session.add(project)
    db_session.commit()

    # 驗證
    assert project.id is not None
    assert project.name == "測試專案"
    assert project.status == ProjectStatus.INITIALIZED
```

**驗證點：**
- [ ] 專案成功建立
- [ ] 所有欄位正確儲存
- [ ] 預設值正確

---

#### 測試 2：外鍵關聯正確

**測試內容：**
```python
def test_project_configuration_relationship(db_session):
    """測試專案與配置的關聯"""
    # 建立配置
    config = Configuration(
        id=str(uuid.uuid4()),
        name="測試配置",
        config_data={"subtitle": {"font_size": 48}},
        created_at=datetime.utcnow(),
        usage_count=0
    )
    db_session.add(config)
    db_session.commit()

    # 建立專案並關聯配置
    project = Project(
        id=str(uuid.uuid4()),
        name="測試專案",
        configuration_id=config.id,
        # ... 其他欄位
    )
    db_session.add(project)
    db_session.commit()

    # 驗證關聯
    assert project.configuration.id == config.id
    assert project.configuration.name == "測試配置"
```

---

#### 測試 3：CASCADE 刪除正確

**測試內容：**
```python
def test_project_cascade_delete(db_session):
    """測試專案刪除時相關資料也刪除"""
    # 建立專案
    project = Project(id=str(uuid.uuid4()), ...)
    db_session.add(project)
    db_session.commit()

    # 建立素材
    asset = Asset(
        id=str(uuid.uuid4()),
        project_id=project.id,
        asset_type=AssetType.IMAGE,
        file_path="/path/to/image.png",
        created_at=datetime.utcnow()
    )
    db_session.add(asset)
    db_session.commit()

    # 刪除專案
    db_session.delete(project)
    db_session.commit()

    # 驗證素材也被刪除
    assert db_session.query(Asset).filter_by(id=asset.id).first() is None
```

---

### 整合測試

#### 測試 1：資料庫遷移

**測試內容：**
```bash
# 執行遷移
alembic upgrade head

# 驗證所有表格已建立
sqlite3 data/dev.db ".tables"

# 預期看到所有 10 個表格
```

**驗證點：**
- [ ] projects 表格存在
- [ ] configurations 表格存在
- [ ] prompt_templates 表格存在
- [ ] scripts 表格存在
- [ ] assets 表格存在
- [ ] batch_tasks 表格存在
- [ ] settings 表格存在
- [ ] 所有外鍵約束正確
- [ ] 所有索引已建立

---

## 實作規格

### 需要建立的檔案

#### 1. 資料庫基礎設定

**檔案：** `app/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# 建立資料庫引擎
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite 需要
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """依賴注入用的資料庫 session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

#### 2. Project 模型

**檔案：** `app/models/project.py`

```python
from sqlalchemy import Column, String, Integer, Text, JSON, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import enum
from datetime import datetime

class ProjectStatus(str, enum.Enum):
    INITIALIZED = "initialized"
    SCRIPT_GENERATING = "script_generating"
    ASSETS_GENERATING = "assets_generating"
    RENDERING = "rendering"
    UPLOADING = "uploading"
    COMPLETED = "completed"
    FAILED = "failed"

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    status = Column(Enum(ProjectStatus), nullable=False, default=ProjectStatus.INITIALIZED)
    content = Column(Text, nullable=False)
    word_count = Column(Integer, nullable=False)
    configuration_id = Column(String(36), ForeignKey("configurations.id", ondelete="SET NULL"), nullable=True)
    prompt_template_id = Column(String(36), ForeignKey("prompt_templates.id", ondelete="RESTRICT"), nullable=False)
    gemini_model = Column(String(50), nullable=False, default="gemini-1.5-flash")
    script_id = Column(String(36), ForeignKey("scripts.id", ondelete="CASCADE"), nullable=True)
    youtube_settings = Column(JSON, nullable=False)
    youtube_video_id = Column(String(50), nullable=True)
    progress = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 關聯
    configuration = relationship("Configuration", back_populates="projects")
    prompt_template = relationship("PromptTemplate")
    script = relationship("Script", back_populates="project", uselist=False)
    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")
```

**參考：** `tech-specs/backend/database.md#3.1 Project`

---

#### 3. Configuration 模型

**檔案：** `app/models/configuration.py`

```python
from sqlalchemy import Column, String, JSON, DateTime, Integer
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Configuration(Base):
    __tablename__ = "configurations"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    config_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    usage_count = Column(Integer, nullable=False, default=0)

    # 關聯
    projects = relationship("Project", back_populates="configuration")
```

**參考：** `tech-specs/backend/database.md#3.2 Configuration`

---

#### 4. PromptTemplate 模型

**檔案：** `app/models/prompt_template.py`

```python
from sqlalchemy import Column, String, Text, JSON, DateTime, Boolean
from app.database import Base
from datetime import datetime

class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    template_content = Column(Text, nullable=False)
    variables = Column(JSON, nullable=False)  # ["content", "target_duration", ...]
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    is_default = Column(Boolean, nullable=False, default=False)
```

---

#### 5. Script 模型

**檔案：** `app/models/script.py`

```python
from sqlalchemy import Column, String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Script(Base):
    __tablename__ = "scripts"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    script_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # 關聯
    project = relationship("Project", back_populates="script")
```

---

#### 6. Asset 模型

**檔案：** `app/models/asset.py`

```python
from sqlalchemy import Column, String, JSON, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum
from datetime import datetime

class AssetType(str, enum.Enum):
    AUDIO = "audio"
    IMAGE = "image"
    AVATAR_INTRO = "avatar_intro"
    AVATAR_OUTRO = "avatar_outro"
    VIDEO = "video"
    THUMBNAIL = "thumbnail"

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(Enum(AssetType), nullable=False)
    file_path = Column(String(500), nullable=False)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # 關聯
    project = relationship("Project", back_populates="assets")
```

---

#### 7. BatchTask 模型

**檔案：** `app/models/batch_task.py`

```python
from sqlalchemy import Column, String, JSON, DateTime, Enum, Integer
from app.database import Base
import enum
from datetime import datetime

class BatchTaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class BatchTask(Base):
    __tablename__ = "batch_tasks"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    project_ids = Column(JSON, nullable=False)  # ["proj_id_1", "proj_id_2"]
    status = Column(Enum(BatchTaskStatus), nullable=False, default=BatchTaskStatus.PENDING)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_count = Column(Integer, nullable=False, default=0)
    total_count = Column(Integer, nullable=False)
```

---

#### 8. Setting 模型

**檔案：** `app/models/setting.py`

```python
from sqlalchemy import Column, String, JSON, DateTime
from app.database import Base
from datetime import datetime

class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

#### 9. 索引定義

**檔案：** `app/models/__init__.py`

```python
from sqlalchemy import Index
from app.database import Base
from app.models.project import Project
from app.models.asset import Asset

# 建立索引
Index('idx_projects_status', Project.status)
Index('idx_projects_created_at', Project.created_at.desc())
Index('idx_projects_updated_at', Project.updated_at.desc())
Index('idx_assets_project_id', Asset.project_id)
Index('idx_assets_type', Asset.asset_type)
```

---

#### 10. Alembic 配置

**檔案：** `alembic.ini`

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = sqlite:///./data/dev.db

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

**初始化 Alembic：**
```bash
alembic init alembic
```

**建立遷移：**
```bash
alembic revision --autogenerate -m "Create initial tables"
```

---

#### 11. 資料庫初始化腳本

**檔案：** `app/db_init.py`

```python
from app.database import Base, engine
from app.models import project, configuration, prompt_template, script, asset, batch_task, setting

def init_db():
    """初始化資料庫"""
    Base.metadata.create_all(bind=engine)
    print("✅ 資料庫初始化完成")

if __name__ == "__main__":
    init_db()
```

---

#### 12. 測試資料 Seeder

**檔案：** `app/db_seed.py`

```python
import uuid
from datetime import datetime
from app.database import SessionLocal
from app.models.project import Project, ProjectStatus
from app.models.configuration import Configuration
from app.models.prompt_template import PromptTemplate

def seed_data():
    """建立測試資料"""
    db = SessionLocal()

    try:
        # 建立預設 Prompt Template
        default_template = PromptTemplate(
            id=str(uuid.uuid4()),
            name="預設範本",
            template_content="請將以下內容轉換為 YouTube 腳本...",
            variables=["content", "target_duration"],
            is_default=True,
            created_at=datetime.utcnow()
        )
        db.add(default_template)

        # 建立預設配置
        default_config = Configuration(
            id=str(uuid.uuid4()),
            name="預設配置",
            config_data={
                "subtitle": {
                    "font_size": 48,
                    "font_color": "#FFFFFF"
                }
            },
            created_at=datetime.utcnow(),
            usage_count=0
        )
        db.add(default_config)

        db.commit()
        print("✅ 測試資料建立完成")

    except Exception as e:
        db.rollback()
        print(f"❌ 錯誤: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
```

---

## 開發指引

### 開發步驟

**1. 閱讀規格文件**
```bash
# 仔細閱讀資料庫設計
cat tech-specs/backend/database.md
```

**2. 建立所有模型檔案**
```bash
cd backend/app/models
# 建立所有 10 個模型檔案
touch project.py configuration.py prompt_template.py script.py asset.py \
      batch_task.py setting.py __init__.py
```

**3. 實作模型**
- 按照 spec 定義所有欄位
- 設定外鍵和關聯
- 定義 Enum 類型

**4. 設定 Alembic**
```bash
cd backend
alembic init alembic
# 編輯 alembic/env.py 設定 target_metadata
```

**5. 建立遷移**
```bash
alembic revision --autogenerate -m "Create initial tables"
```

**6. 執行遷移**
```bash
alembic upgrade head
```

**7. 驗證資料庫**
```bash
sqlite3 data/dev.db
.tables  # 應該看到所有表格
.schema projects  # 檢查表格結構
```

**8. 撰寫測試**
- 測試每個模型可以建立
- 測試關聯關係
- 測試 CASCADE 刪除

**9. 執行測試**
```bash
pytest tests/unit/models/ -v
```

---

### 注意事項

**資料庫設計：**
- [ ] 所有欄位類型正確
- [ ] 外鍵 ondelete 策略正確
- [ ] 索引位置正確
- [ ] JSON 欄位使用適當

**Alembic：**
- [ ] 遷移腳本可以 upgrade 和 downgrade
- [ ] 遷移檔案已提交到 Git
- [ ] 遷移歷史清楚

**測試：**
- [ ] 每個模型都有測試
- [ ] 關聯關係已測試
- [ ] CASCADE 刪除已測試

---

## 完成檢查清單

### 開發完成
- [ ] 10 個模型全部實作
- [ ] 索引已建立
- [ ] 外鍵關聯正確
- [ ] Alembic 配置完成
- [ ] 初始化腳本完成
- [ ] Seeder 腳本完成

### 測試完成
- [ ] 所有模型單元測試通過
- [ ] 遷移測試通過
- [ ] 關聯測試通過
- [ ] CASCADE 測試通過

### 文件同步
- [ ] 實作與 spec 一致
- [ ] 模型有清楚註解
- [ ] 遷移腳本有說明

### Git
- [ ] 在 feature/task-002-database-schema 分支
- [ ] Commit 訊息清楚
- [ ] 遷移檔案已提交

---

## 時間分配建議

- **模型定義：** 2 小時
- **Alembic 設定與遷移：** 1 小時
- **索引與關聯：** 1 小時
- **測試撰寫：** 1.5 小時
- **驗證與除錯：** 0.5 小時

**總計：** 6 小時
