# [v] Task-002: 資料庫 Schema 設計與實作

> **建立日期：** 2025-10-19
> **完成日期：** 2025-10-20
> **狀態：** ✅ 已完成
> **實際時間：** ~8 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **系統概述：** `product-design/overview.md` - 了解專案資料結構需求

### 技術規格
- **資料庫設計：** `tech-specs/backend/database.md` - 完整的資料模型定義
- **API 設計：** `tech-specs/backend/api-design.md` - API 端點設計規範
- **技術框架：** `tech-specs/framework.md#1.3-資料庫選擇` - SQLAlchemy + SQLite 技術選擇

### 相關任務
- **前置任務：** Task-001 ✅ (專案初始化)
- **後續任務：** Task-004 ~ 009 (所有 API 實作都依賴此任務)
- **依賴關係：** 所有需要資料庫操作的任務都依賴此任務

---

## 任務目標

### 簡述
使用 SQLAlchemy 實作所有 10 個資料模型，設計正確的索引和關聯關係，建立資料庫遷移腳本，並準備測試資料。這是後端開發的基礎，所有 API 都將使用這些模型。

### 成功標準
- [ ] 10 個 SQLAlchemy 模型完整實作並通過驗證
- [ ] 所有模型關聯關係正確定義（外鍵、級聯刪除）
- [ ] 必要欄位建立索引，查詢效能最佳化
- [ ] Alembic 遷移腳本可正常執行（upgrade/downgrade）
- [ ] 資料庫初始化腳本完成（create_tables.py）
- [ ] 測試資料 seeder 完成（至少 5 個完整專案）
- [ ] 模型單元測試覆蓋率 > 80%
- [ ] 所有 CRUD 操作測試通過

---

## 測試要求

### 單元測試

#### 測試 1：建立專案並驗證所有欄位

**目的：** 驗證 Project 模型的欄位定義正確、預設值正確、時間戳自動生成

**輸入：**
```python
from app.models.project import Project, ProjectStatus
from sqlalchemy.orm import Session

project = Project(
    name="測試專案",
    content="這是一段測試內容" * 100,  # 約 1000 字
    status=ProjectStatus.INITIALIZED,
    gemini_model="gemini-1.5-pro"
)

db.add(project)
db.commit()
db.refresh(project)
```

**預期輸出：**
- project.id 是有效的 UUID
- project.name == "測試專案"
- project.status == ProjectStatus.INITIALIZED
- project.created_at 和 updated_at 是當前時間（誤差 < 1 秒）
- project.configuration 是 None（可為空）
- project.youtube_video_id 是 None（可為空）

**驗證點：**
- [ ] UUID 自動生成
- [ ] 時間戳自動設定
- [ ] 枚舉類型正確儲存
- [ ] 可為空的欄位初始值為 None
- [ ] JSON 欄位可接受 None

---

#### 測試 2：專案關聯素材，測試外鍵關聯

**目的：** 驗證 Project 與 Asset 之間的一對多關聯，以及級聯刪除

**輸入：**
```python
from app.models.project import Project
from app.models.asset import Asset, AssetType, AssetStatus

# 建立專案
project = Project(
    name="關聯測試專案",
    content="測試內容",
    status=ProjectStatus.INITIALIZED,
    gemini_model="gemini-1.5-flash"
)
db.add(project)
db.commit()

# 建立 3 個素材
audio_asset = Asset(
    project_id=project.id,
    type=AssetType.AUDIO,
    status=AssetStatus.PENDING,
    file_path="/tmp/audio.mp3"
)
image_asset_1 = Asset(
    project_id=project.id,
    type=AssetType.IMAGE,
    status=AssetStatus.COMPLETED,
    file_path="/tmp/image_1.png",
    segment_index=0
)
image_asset_2 = Asset(
    project_id=project.id,
    type=AssetType.IMAGE,
    status=AssetStatus.COMPLETED,
    file_path="/tmp/image_2.png",
    segment_index=1
)

db.add_all([audio_asset, image_asset_1, image_asset_2])
db.commit()
```

**預期輸出：**
```python
# 查詢專案的所有素材
project_with_assets = db.query(Project).filter(Project.id == project.id).first()
assert len(project_with_assets.assets) == 3

# 刪除專案後，素材應該被級聯刪除
db.delete(project)
db.commit()

remaining_assets = db.query(Asset).filter(Asset.project_id == project.id).all()
assert len(remaining_assets) == 0  # 應該全部被刪除
```

**驗證點：**
- [ ] project.assets 正確載入所有素材
- [ ] 外鍵 project_id 正確設定
- [ ] 級聯刪除 (CASCADE) 生效
- [ ] 素材查詢可透過 project_id 過濾

---

#### 測試 3：索引效能測試（查詢效率）

**目的：** 驗證索引正確建立，常見查詢效能達標

**前置條件：**
```python
# 插入 100 個專案
for i in range(100):
    project = Project(
        name=f"專案 {i}",
        content="測試內容",
        status=random.choice([
            ProjectStatus.COMPLETED,
            ProjectStatus.FAILED,
            ProjectStatus.RENDERING
        ]),
        gemini_model="gemini-1.5-pro"
    )
    db.add(project)
db.commit()
```

**測試查詢：**
```python
import time

# 測試 1: 按 status 查詢（應該使用 idx_status）
start = time.time()
completed_projects = db.query(Project).filter(
    Project.status == ProjectStatus.COMPLETED
).all()
elapsed_1 = time.time() - start

# 測試 2: 按 created_at 排序（應該使用 idx_created_at）
start = time.time()
recent_projects = db.query(Project).order_by(
    Project.created_at.desc()
).limit(20).all()
elapsed_2 = time.time() - start
```

**預期輸出：**
- elapsed_1 < 0.01 秒（100 筆資料查詢 < 10ms）
- elapsed_2 < 0.01 秒（排序查詢 < 10ms）

**驗證點：**
- [ ] 索引 idx_status 有效
- [ ] 索引 idx_created_at 有效
- [ ] 查詢計畫使用索引（可用 EXPLAIN 檢查）

---

#### 測試 4：Prompt 範本使用計數自動增加

**目的：** 驗證 usage_count 在專案使用範本時自動增加

**輸入：**
```python
from app.models.prompt_template import PromptTemplate

# 建立範本
template = PromptTemplate(
    name="預設範本",
    content="生成一段關於 {topic} 的 YouTube 腳本...",
    is_default=True,
    usage_count=0
)
db.add(template)
db.commit()

initial_count = template.usage_count

# 建立專案使用此範本
project = Project(
    name="使用範本的專案",
    content="測試內容",
    status=ProjectStatus.INITIALIZED,
    gemini_model="gemini-1.5-pro",
    prompt_template_id=template.id
)
db.add(project)
db.commit()

# 模擬業務邏輯中增加 usage_count
template.usage_count += 1
db.commit()
db.refresh(template)
```

**預期輸出：**
- template.usage_count == initial_count + 1

**驗證點：**
- [ ] usage_count 可正確更新
- [ ] 外鍵關聯 prompt_template_id 正確
- [ ] 可查詢專案關聯的範本

---

#### 測試 5：YouTube 帳號 Token 過期檢查

**目的：** 驗證 YouTubeAccount 模型的 token_expires_at 判斷邏輯

**輸入：**
```python
from app.models.youtube_account import YouTubeAccount
from datetime import datetime, timedelta

# 建立已過期的帳號
expired_account = YouTubeAccount(
    channel_name="測試頻道",
    channel_id="UC1234567890",
    access_token="expired_token",
    refresh_token="refresh_token",
    token_expires_at=datetime.utcnow() - timedelta(hours=1),  # 1 小時前過期
    is_authorized=True,
    authorized_at=datetime.utcnow() - timedelta(days=30)
)

# 建立未過期的帳號
valid_account = YouTubeAccount(
    channel_name="有效頻道",
    channel_id="UC0987654321",
    access_token="valid_token",
    refresh_token="refresh_token",
    token_expires_at=datetime.utcnow() + timedelta(hours=1),  # 1 小時後過期
    is_authorized=True,
    authorized_at=datetime.utcnow()
)

db.add_all([expired_account, valid_account])
db.commit()
```

**預期輸出：**
```python
# 自訂方法（需在模型中實作）
assert expired_account.is_token_expired() is True
assert valid_account.is_token_expired() is False

# 查詢需要刷新的帳號
accounts_need_refresh = db.query(YouTubeAccount).filter(
    YouTubeAccount.token_expires_at < datetime.utcnow()
).all()
assert len(accounts_need_refresh) >= 1
```

**驗證點：**
- [ ] token_expires_at 正確儲存
- [ ] 時間比較查詢正確
- [ ] is_token_expired() 方法正確實作

---

#### 測試 6：Configuration 最後使用時間自動更新

**目的：** 驗證 Configuration 的 last_used_at 和 usage_count 更新邏輯

**輸入：**
```python
from app.models.configuration import Configuration

# 建立配置模板
config = Configuration(
    name="測試配置",
    configuration={
        "subtitle": {"font_size": 48, "color": "#FFFFFF"},
        "logo": {"position": "top-right", "opacity": 0.8}
    },
    usage_count=0
)
db.add(config)
db.commit()

initial_last_used_at = config.last_used_at  # 應該是 None

# 模擬專案使用配置
config.last_used_at = datetime.utcnow()
config.usage_count += 1
db.commit()
db.refresh(config)
```

**預期輸出：**
- initial_last_used_at is None
- config.last_used_at 是當前時間
- config.usage_count == 1

**驗證點：**
- [ ] last_used_at 可為 None（初始狀態）
- [ ] 可手動更新 last_used_at
- [ ] JSON 欄位 configuration 正確儲存和讀取

---

#### 測試 7：批次任務完成計數更新

**目的：** 驗證 BatchTask 的計數欄位更新和查詢

**輸入：**
```python
from app.models.batch_task import BatchTask, BatchTaskStatus

# 建立批次任務
batch = BatchTask(
    name="測試批次任務",
    total_projects=10,
    completed_projects=0,
    failed_projects=0,
    status=BatchTaskStatus.QUEUED
)
db.add(batch)
db.commit()

# 模擬完成 3 個專案
batch.completed_projects = 3
batch.status = BatchTaskStatus.RUNNING
db.commit()

# 模擬 1 個專案失敗
batch.failed_projects = 1
db.commit()
db.refresh(batch)
```

**預期輸出：**
```python
assert batch.completed_projects == 3
assert batch.failed_projects == 1
assert batch.status == BatchTaskStatus.RUNNING

# 計算進度
progress = (batch.completed_projects / batch.total_projects) * 100
assert progress == 30.0
```

**驗證點：**
- [ ] 計數欄位正確更新
- [ ] 可計算完成進度
- [ ] 狀態枚舉正確儲存

---

#### 測試 8：SystemSettings 鍵值查詢

**目的：** 驗證 SystemSettings 的鍵值儲存和查詢

**輸入：**
```python
from app.models.system_settings import SystemSettings

# 建立多個系統設定
settings = [
    SystemSettings(key="default_voice_gender", value='"male"'),
    SystemSettings(key="default_voice_speed", value='1.0'),
    SystemSettings(key="project_retention_days", value='30'),
]
db.add_all(settings)
db.commit()

# 查詢單一設定
voice_gender_setting = db.query(SystemSettings).filter(
    SystemSettings.key == "default_voice_gender"
).first()
```

**預期輸出：**
- voice_gender_setting.key == "default_voice_gender"
- voice_gender_setting.value == '"male"'  # JSON 字串
- voice_gender_setting.updated_at 是當前時間

**驗證點：**
- [ ] 主鍵 (key) 查詢正確
- [ ] value 以 TEXT 儲存（可儲存 JSON 字串）
- [ ] updated_at 自動設定

---

### 整合測試

#### 測試 9：完整專案生命週期（狀態變更）

**目的：** 驗證專案從建立到完成的完整流程，狀態變更正確

**流程：**
```python
# Step 1: 建立專案
project = Project(
    name="完整流程測試",
    content="測試內容",
    status=ProjectStatus.INITIALIZED,
    gemini_model="gemini-1.5-pro"
)
db.add(project)
db.commit()

# Step 2: 開始生成腳本
project.status = ProjectStatus.SCRIPT_GENERATING
db.commit()

# Step 3: 腳本生成完成
project.status = ProjectStatus.SCRIPT_GENERATED
project.script = {
    "segments": [
        {"text": "開場白", "duration": 5},
        {"text": "第一段內容", "duration": 10}
    ]
}
db.commit()

# Step 4: 開始生成素材
project.status = ProjectStatus.ASSETS_GENERATING
db.commit()

# 建立素材
audio = Asset(project_id=project.id, type=AssetType.AUDIO, status=AssetStatus.COMPLETED, file_path="/audio.mp3")
image = Asset(project_id=project.id, type=AssetType.IMAGE, status=AssetStatus.COMPLETED, file_path="/img.png", segment_index=0)
db.add_all([audio, image])
db.commit()

# Step 5: 素材生成完成
project.status = ProjectStatus.ASSETS_GENERATED
db.commit()

# Step 6: 開始渲染
project.status = ProjectStatus.RENDERING
db.commit()

# Step 7: 渲染完成
project.status = ProjectStatus.RENDERED
final_video = Asset(project_id=project.id, type=AssetType.FINAL_VIDEO, status=AssetStatus.COMPLETED, file_path="/video.mp4")
db.add(final_video)
db.commit()

# Step 8: 上傳 YouTube
project.status = ProjectStatus.UPLOADING
db.commit()

# Step 9: 完成
project.status = ProjectStatus.COMPLETED
project.youtube_video_id = "dQw4w9WgXcQ"
db.commit()

db.refresh(project)
```

**預期輸出：**
- project.status == ProjectStatus.COMPLETED
- project.youtube_video_id == "dQw4w9WgXcQ"
- len(project.assets) == 3 (audio, image, final_video)
- project.script 是有效的 JSON

**驗證點：**
- [ ] 狀態變更流程正確
- [ ] JSON 欄位 script 正確儲存
- [ ] 素材關聯正確建立
- [ ] updated_at 隨每次更新變化

---

#### 測試 10：Alembic 遷移測試（upgrade/downgrade）

**目的：** 驗證 Alembic 遷移腳本可正確執行

**流程：**
```bash
# 1. 刪除現有資料庫（測試環境）
rm test.db

# 2. 執行 upgrade（建立所有資料表）
alembic upgrade head
# 應該成功建立 10 個資料表

# 3. 檢查資料表是否存在
sqlite3 test.db ".tables"
# 應該列出：projects, assets, configurations, prompt_templates, youtube_accounts, batch_tasks, system_settings

# 4. 執行 downgrade（回退一個版本）
alembic downgrade -1
# 應該成功回退

# 5. 再次 upgrade
alembic upgrade head
# 應該再次成功升級
```

**驗證點：**
- [ ] alembic upgrade head 成功執行
- [ ] 所有資料表正確建立
- [ ] 所有索引正確建立
- [ ] alembic downgrade -1 成功執行
- [ ] 可重複執行 upgrade/downgrade

---

## 實作規格

### 需要建立/修改的檔案

#### 1. Base Model: `backend/app/models/base.py`

**職責：** 定義所有模型的共用基礎類別和 UUID 生成邏輯

```python
"""
Base model for all database models.
"""
from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


class TimestampMixin:
    """Mixin to add created_at and updated_at timestamps."""

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


def generate_uuid():
    """Generate a UUID4 string."""
    return str(uuid.uuid4())
```

---

#### 2. Project Model: `backend/app/models/project.py`

**職責：** 專案資料模型，包含所有專案相關欄位、狀態枚舉、關聯

```python
"""
Project model - represents a video project.
"""
from sqlalchemy import Column, String, Text, Enum as SQLEnum, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin, generate_uuid
import enum


class ProjectStatus(str, enum.Enum):
    """Project status enum."""
    INITIALIZED = "INITIALIZED"
    SCRIPT_GENERATING = "SCRIPT_GENERATING"
    SCRIPT_GENERATED = "SCRIPT_GENERATED"
    ASSETS_GENERATING = "ASSETS_GENERATING"
    ASSETS_GENERATED = "ASSETS_GENERATED"
    RENDERING = "RENDERING"
    RENDERED = "RENDERED"
    THUMBNAIL_GENERATING = "THUMBNAIL_GENERATING"
    THUMBNAIL_GENERATED = "THUMBNAIL_GENERATED"
    UPLOADING = "UPLOADING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PAUSED = "PAUSED"


class Project(Base, TimestampMixin):
    """Project model."""

    __tablename__ = "projects"

    # Primary Key
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)

    # Basic Info
    name = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(SQLEnum(ProjectStatus), nullable=False, default=ProjectStatus.INITIALIZED, index=True)

    # Configuration
    configuration = Column(JSON, nullable=True)  # Visual configuration

    # Prompt & Model
    prompt_template_id = Column(UUID(as_uuid=False), ForeignKey("prompt_templates.id", ondelete="SET NULL"), nullable=True)
    gemini_model = Column(String(50), nullable=False)  # e.g., "gemini-1.5-pro"

    # YouTube Settings
    youtube_settings = Column(JSON, nullable=True)  # Title, description, tags, privacy, etc.
    youtube_video_id = Column(String(50), nullable=True)  # YouTube video ID after upload

    # Generated Content
    script = Column(JSON, nullable=True)  # Generated script (segments with text & duration)

    # Relationships
    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")
    prompt_template = relationship("PromptTemplate", back_populates="projects")

    # Indexes (defined in Alembic migration)
    # - idx_status on status
    # - idx_created_at on created_at
    # - idx_updated_at on updated_at

    def __repr__(self):
        return f"<Project(id={self.id}, name={self.name}, status={self.status})>"
```

---

#### 3. Asset Model: `backend/app/models/asset.py`

**職責：** 素材資料模型（語音、圖片、虛擬主播、封面、最終影片）

```python
"""
Asset model - represents a media asset (audio, image, avatar, thumbnail, video).
"""
from sqlalchemy import Column, String, Enum as SQLEnum, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin, generate_uuid
import enum


class AssetType(str, enum.Enum):
    """Asset type enum."""
    AUDIO = "AUDIO"
    IMAGE = "IMAGE"
    AVATAR_INTRO = "AVATAR_INTRO"
    AVATAR_OUTRO = "AVATAR_OUTRO"
    THUMBNAIL = "THUMBNAIL"
    FINAL_VIDEO = "FINAL_VIDEO"


class AssetStatus(str, enum.Enum):
    """Asset status enum."""
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Asset(Base, TimestampMixin):
    """Asset model."""

    __tablename__ = "assets"

    # Primary Key
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)

    # Foreign Key
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    # Asset Info
    type = Column(SQLEnum(AssetType), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    status = Column(SQLEnum(AssetStatus), nullable=False, default=AssetStatus.PENDING)

    # Optional: segment index for images (0, 1, 2, ...)
    segment_index = Column(Integer, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="assets")

    # Indexes (defined in Alembic migration)
    # - idx_project_id on project_id
    # - idx_type on type

    def __repr__(self):
        return f"<Asset(id={self.id}, type={self.type}, project_id={self.project_id})>"
```

---

#### 4. Configuration Model: `backend/app/models/configuration.py`

**職責：** 配置模板資料模型

```python
"""
Configuration model - represents a visual configuration template.
"""
from sqlalchemy import Column, String, JSON, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, TimestampMixin, generate_uuid


class Configuration(Base, TimestampMixin):
    """Configuration template model."""

    __tablename__ = "configurations"

    # Primary Key
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)

    # Basic Info
    name = Column(String(200), nullable=False)
    configuration = Column(JSON, nullable=False)  # Visual config data

    # Usage Tracking
    last_used_at = Column(DateTime, nullable=True, index=True)
    usage_count = Column(Integer, nullable=False, default=0)

    # Indexes (defined in Alembic migration)
    # - idx_last_used_at on last_used_at

    def __repr__(self):
        return f"<Configuration(id={self.id}, name={self.name})>"
```

---

#### 5. Prompt Template Model: `backend/app/models/prompt_template.py`

**職責：** Prompt 範本資料模型

```python
"""
Prompt Template model - represents a reusable prompt template.
"""
from sqlalchemy import Column, String, Text, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin, generate_uuid


class PromptTemplate(Base, TimestampMixin):
    """Prompt Template model."""

    __tablename__ = "prompt_templates"

    # Primary Key
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)

    # Basic Info
    name = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)  # Prompt text with variables: {topic}, {duration}, etc.
    is_default = Column(Boolean, nullable=False, default=False, index=True)

    # Usage Tracking
    usage_count = Column(Integer, nullable=False, default=0)

    # Relationships
    projects = relationship("Project", back_populates="prompt_template")

    # Indexes (defined in Alembic migration)
    # - idx_is_default on is_default

    def __repr__(self):
        return f"<PromptTemplate(id={self.id}, name={self.name}, is_default={self.is_default})>"
```

---

#### 6. YouTube Account Model: `backend/app/models/youtube_account.py`

**職責：** YouTube 帳號資料模型（OAuth tokens）

```python
"""
YouTube Account model - represents a connected YouTube channel.
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, TimestampMixin, generate_uuid
from datetime import datetime


class YouTubeAccount(Base, TimestampMixin):
    """YouTube Account model."""

    __tablename__ = "youtube_accounts"

    # Primary Key
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)

    # Channel Info
    channel_name = Column(String(200), nullable=False)
    channel_id = Column(String(100), nullable=False, unique=True, index=True)

    # OAuth Tokens (encrypted in production)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    token_expires_at = Column(DateTime, nullable=False)

    # Channel Stats
    subscriber_count = Column(Integer, nullable=False, default=0)

    # Authorization Status
    is_authorized = Column(Boolean, nullable=False, default=True)
    authorized_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Indexes (defined in Alembic migration)
    # - idx_channel_id on channel_id

    def is_token_expired(self) -> bool:
        """Check if access token is expired."""
        return datetime.utcnow() >= self.token_expires_at

    def __repr__(self):
        return f"<YouTubeAccount(id={self.id}, channel_name={self.channel_name})>"
```

---

#### 7. Batch Task Model: `backend/app/models/batch_task.py`

**職責：** 批次任務資料模型

```python
"""
Batch Task model - represents a batch processing task.
"""
from sqlalchemy import Column, String, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, TimestampMixin, generate_uuid
import enum


class BatchTaskStatus(str, enum.Enum):
    """Batch task status enum."""
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class BatchTask(Base, TimestampMixin):
    """Batch Task model."""

    __tablename__ = "batch_tasks"

    # Primary Key
    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)

    # Basic Info
    name = Column(String(200), nullable=False)
    total_projects = Column(Integer, nullable=False)
    completed_projects = Column(Integer, nullable=False, default=0)
    failed_projects = Column(Integer, nullable=False, default=0)
    status = Column(SQLEnum(BatchTaskStatus), nullable=False, default=BatchTaskStatus.QUEUED, index=True)

    # Indexes (defined in Alembic migration)
    # - idx_status on status
    # - idx_created_at on created_at

    def __repr__(self):
        return f"<BatchTask(id={self.id}, name={self.name}, status={self.status})>"
```

---

#### 8. System Settings Model: `backend/app/models/system_settings.py`

**職責：** 系統設定資料模型（鍵值對）

```python
"""
System Settings model - represents system-wide settings.
"""
from sqlalchemy import Column, String, Text, DateTime
from app.models.base import Base
from datetime import datetime


class SystemSettings(Base):
    """System Settings model (key-value store)."""

    __tablename__ = "system_settings"

    # Primary Key
    key = Column(String(100), primary_key=True)

    # Value (stored as TEXT, can be JSON string)
    value = Column(Text, nullable=False)

    # Timestamp
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<SystemSettings(key={self.key})>"
```

---

#### 9. Alembic Configuration: `backend/alembic.ini`

**職責：** Alembic 遷移工具配置檔案

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os

sqlalchemy.url = sqlite:///./ytmaker.db

[post_write_hooks]

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

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

---

#### 10. Alembic Env: `backend/alembic/env.py`

**職責：** Alembic 運行環境設定

```python
"""Alembic environment configuration."""
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# Import all models
from app.models.base import Base
from app.models.project import Project
from app.models.asset import Asset
from app.models.configuration import Configuration
from app.models.prompt_template import PromptTemplate
from app.models.youtube_account import YouTubeAccount
from app.models.batch_task import BatchTask
from app.models.system_settings import SystemSettings

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

#### 11. Initial Migration Script: `backend/alembic/versions/001_initial_schema.py`

**職責：** 初始資料庫 Schema 遷移腳本

```python
"""Initial schema

Revision ID: 001
Revises:
Create Date: 2025-10-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create all tables and indexes."""

    # 1. Projects table
    op.create_table(
        'projects',
        sa.Column('id', UUID(as_uuid=False), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('status', sa.Enum('INITIALIZED', 'SCRIPT_GENERATING', 'SCRIPT_GENERATED',
                                    'ASSETS_GENERATING', 'ASSETS_GENERATED', 'RENDERING',
                                    'RENDERED', 'THUMBNAIL_GENERATING', 'THUMBNAIL_GENERATED',
                                    'UPLOADING', 'COMPLETED', 'FAILED', 'PAUSED',
                                    name='projectstatus'), nullable=False),
        sa.Column('configuration', sa.JSON, nullable=True),
        sa.Column('prompt_template_id', UUID(as_uuid=False), nullable=True),
        sa.Column('gemini_model', sa.String(50), nullable=False),
        sa.Column('youtube_settings', sa.JSON, nullable=True),
        sa.Column('youtube_video_id', sa.String(50), nullable=True),
        sa.Column('script', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_projects_status', 'projects', ['status'])
    op.create_index('idx_projects_created_at', 'projects', ['created_at'])
    op.create_index('idx_projects_updated_at', 'projects', ['updated_at'])

    # 2. Prompt Templates table
    op.create_table(
        'prompt_templates',
        sa.Column('id', UUID(as_uuid=False), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('is_default', sa.Boolean, nullable=False, default=False),
        sa.Column('usage_count', sa.Integer, nullable=False, default=0),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_prompt_templates_is_default', 'prompt_templates', ['is_default'])

    # 3. Assets table
    op.create_table(
        'assets',
        sa.Column('id', UUID(as_uuid=False), primary_key=True),
        sa.Column('project_id', UUID(as_uuid=False), nullable=False),
        sa.Column('type', sa.Enum('AUDIO', 'IMAGE', 'AVATAR_INTRO', 'AVATAR_OUTRO',
                                  'THUMBNAIL', 'FINAL_VIDEO', name='assettype'), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'GENERATING', 'COMPLETED', 'FAILED',
                                    name='assetstatus'), nullable=False),
        sa.Column('segment_index', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_assets_project_id', 'assets', ['project_id'])
    op.create_index('idx_assets_type', 'assets', ['type'])

    # 4. Configurations table
    op.create_table(
        'configurations',
        sa.Column('id', UUID(as_uuid=False), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('configuration', sa.JSON, nullable=False),
        sa.Column('last_used_at', sa.DateTime, nullable=True),
        sa.Column('usage_count', sa.Integer, nullable=False, default=0),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_configurations_last_used_at', 'configurations', ['last_used_at'])

    # 5. YouTube Accounts table
    op.create_table(
        'youtube_accounts',
        sa.Column('id', UUID(as_uuid=False), primary_key=True),
        sa.Column('channel_name', sa.String(200), nullable=False),
        sa.Column('channel_id', sa.String(100), nullable=False, unique=True),
        sa.Column('access_token', sa.Text, nullable=False),
        sa.Column('refresh_token', sa.Text, nullable=False),
        sa.Column('token_expires_at', sa.DateTime, nullable=False),
        sa.Column('subscriber_count', sa.Integer, nullable=False, default=0),
        sa.Column('is_authorized', sa.Boolean, nullable=False, default=True),
        sa.Column('authorized_at', sa.DateTime, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_youtube_accounts_channel_id', 'youtube_accounts', ['channel_id'])

    # 6. Batch Tasks table
    op.create_table(
        'batch_tasks',
        sa.Column('id', UUID(as_uuid=False), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('total_projects', sa.Integer, nullable=False),
        sa.Column('completed_projects', sa.Integer, nullable=False, default=0),
        sa.Column('failed_projects', sa.Integer, nullable=False, default=0),
        sa.Column('status', sa.Enum('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED',
                                    name='batchtaskstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_batch_tasks_status', 'batch_tasks', ['status'])
    op.create_index('idx_batch_tasks_created_at', 'batch_tasks', ['created_at'])

    # 7. System Settings table
    op.create_table(
        'system_settings',
        sa.Column('key', sa.String(100), primary_key=True),
        sa.Column('value', sa.Text, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )

    # Add foreign key constraint for projects.prompt_template_id
    op.create_foreign_key(
        'fk_projects_prompt_template_id',
        'projects', 'prompt_templates',
        ['prompt_template_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table('system_settings')
    op.drop_table('batch_tasks')
    op.drop_table('youtube_accounts')
    op.drop_table('configurations')
    op.drop_table('assets')
    op.drop_table('prompt_templates')
    op.drop_table('projects')
```

---

#### 12. Database Initialization Script: `backend/scripts/init_db.py`

**職責：** 資料庫初始化腳本（建立資料表、插入初始資料）

```python
"""
Database initialization script.

Usage:
    python scripts/init_db.py
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models.project import Project
from app.models.asset import Asset
from app.models.configuration import Configuration
from app.models.prompt_template import PromptTemplate
from app.models.youtube_account import YouTubeAccount
from app.models.batch_task import BatchTask
from app.models.system_settings import SystemSettings

# Database URL
DATABASE_URL = "sqlite:///./ytmaker.db"

# Create engine
engine = create_engine(DATABASE_URL, echo=True)

# Create all tables
Base.metadata.create_all(bind=engine)

print("✅ Database initialized successfully!")
print(f"📁 Database file: {DATABASE_URL}")
print("🔧 Next steps:")
print("   1. Run Alembic migrations: alembic upgrade head")
print("   2. Seed test data: python scripts/seed_data.py")
```

---

#### 13. Test Data Seeder: `backend/scripts/seed_data.py`

**職責：** 生成測試資料

```python
"""
Seed test data into the database.

Usage:
    python scripts/seed_data.py
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.project import Project, ProjectStatus
from app.models.asset import Asset, AssetType, AssetStatus
from app.models.configuration import Configuration
from app.models.prompt_template import PromptTemplate
from app.models.system_settings import SystemSettings
from datetime import datetime, timedelta

# Database URL
DATABASE_URL = "sqlite:///./ytmaker.db"

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()


def seed_prompt_templates():
    """Seed default prompt templates."""
    templates = [
        PromptTemplate(
            name="預設 YouTube 腳本範本",
            content="""請根據以下內容生成一段 YouTube 影片腳本：

內容：{content}

要求：
1. 影片總長度約 {duration} 分鐘
2. 分成 {num_segments} 個段落
3. 每個段落包含清晰的主題句和詳細說明
4. 語氣輕鬆、易懂、吸引觀眾
5. 最後加上 CTA (Call To Action)

請以 JSON 格式回傳，格式如下：
{{
  "segments": [
    {{"text": "段落文字", "duration": 秒數}},
    ...
  ]
}}""",
            is_default=True,
            usage_count=0
        ),
        PromptTemplate(
            name="教學型影片範本",
            content="""請生成一段教學型 YouTube 影片腳本...""",
            is_default=False,
            usage_count=0
        ),
    ]
    db.add_all(templates)
    db.commit()
    print(f"✅ Seeded {len(templates)} prompt templates")
    return templates


def seed_configurations():
    """Seed default configurations."""
    configs = [
        Configuration(
            name="預設視覺配置",
            configuration={
                "subtitle": {
                    "font_size": 48,
                    "color": "#FFFFFF",
                    "position": "bottom-center",
                    "background_opacity": 0.8
                },
                "logo": {
                    "position": "top-right",
                    "opacity": 0.7,
                    "size": "small"
                }
            },
            usage_count=0
        ),
    ]
    db.add_all(configs)
    db.commit()
    print(f"✅ Seeded {len(configs)} configurations")
    return configs


def seed_system_settings():
    """Seed default system settings."""
    settings = [
        SystemSettings(key="default_voice_gender", value='"male"'),
        SystemSettings(key="default_voice_speed", value='1.0'),
        SystemSettings(key="default_privacy", value='"unlisted"'),
        SystemSettings(key="project_retention_days", value='30'),
        SystemSettings(key="keep_intermediate_assets", value='false'),
    ]
    db.add_all(settings)
    db.commit()
    print(f"✅ Seeded {len(settings)} system settings")


def seed_projects(templates):
    """Seed example projects."""
    projects = []

    # Project 1: Completed
    p1 = Project(
        name="如何學習 Python 程式設計",
        content="本影片將介紹 Python 的基礎語法..." * 50,
        status=ProjectStatus.COMPLETED,
        gemini_model="gemini-1.5-pro",
        prompt_template_id=templates[0].id,
        youtube_video_id="dQw4w9WgXcQ",
        script={"segments": [{"text": "開場白", "duration": 5}]}
    )
    projects.append(p1)

    # Project 2: Failed
    p2 = Project(
        name="AI 繪圖工具比較",
        content="本影片將比較 Midjourney, Stable Diffusion, DALL-E..." * 40,
        status=ProjectStatus.FAILED,
        gemini_model="gemini-1.5-flash",
        prompt_template_id=templates[0].id
    )
    projects.append(p2)

    # Project 3: Rendering
    p3 = Project(
        name="最新 macOS 功能介紹",
        content="macOS Sequoia 帶來了許多新功能..." * 60,
        status=ProjectStatus.RENDERING,
        gemini_model="gemini-1.5-pro",
        prompt_template_id=templates[0].id,
        script={"segments": [{"text": "介紹新功能", "duration": 10}]}
    )
    projects.append(p3)

    db.add_all(projects)
    db.commit()
    print(f"✅ Seeded {len(projects)} projects")
    return projects


def seed_assets(projects):
    """Seed example assets."""
    assets = []

    # Assets for Project 1 (completed)
    assets.append(Asset(
        project_id=projects[0].id,
        type=AssetType.AUDIO,
        file_path="/data/projects/1/audio.mp3",
        status=AssetStatus.COMPLETED
    ))
    assets.append(Asset(
        project_id=projects[0].id,
        type=AssetType.IMAGE,
        file_path="/data/projects/1/image_0.png",
        status=AssetStatus.COMPLETED,
        segment_index=0
    ))
    assets.append(Asset(
        project_id=projects[0].id,
        type=AssetType.FINAL_VIDEO,
        file_path="/data/projects/1/final.mp4",
        status=AssetStatus.COMPLETED
    ))

    db.add_all(assets)
    db.commit()
    print(f"✅ Seeded {len(assets)} assets")


def main():
    """Seed all test data."""
    print("🌱 Seeding test data...")

    try:
        templates = seed_prompt_templates()
        seed_configurations()
        seed_system_settings()
        projects = seed_projects(templates)
        seed_assets(projects)

        print("\n✅ All test data seeded successfully!")
        print(f"📊 Total records:")
        print(f"   - Projects: {len(projects)}")
        print(f"   - Templates: {len(templates)}")
        print(f"   - Configurations: 1")
        print(f"   - System Settings: 5")

    except Exception as e:
        print(f"\n❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
```

---

#### 14. 模型測試檔案: `backend/tests/models/test_project.py`

**職責：** Project 模型單元測試

```python
"""
Unit tests for Project model.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models.project import Project, ProjectStatus
from app.models.asset import Asset, AssetType, AssetStatus

# Test database
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def test_create_project_with_all_fields(db):
    """測試 1：建立專案並驗證所有欄位"""
    project = Project(
        name="測試專案",
        content="這是一段測試內容" * 100,
        status=ProjectStatus.INITIALIZED,
        gemini_model="gemini-1.5-pro"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Assertions
    assert project.id is not None
    assert project.name == "測試專案"
    assert project.status == ProjectStatus.INITIALIZED
    assert project.created_at is not None
    assert project.updated_at is not None
    assert project.configuration is None
    assert project.youtube_video_id is None


def test_project_asset_relationship_and_cascade(db):
    """測試 2：專案關聯素材，測試外鍵關聯和級聯刪除"""
    # Create project
    project = Project(
        name="關聯測試專案",
        content="測試內容",
        status=ProjectStatus.INITIALIZED,
        gemini_model="gemini-1.5-flash"
    )
    db.add(project)
    db.commit()

    # Create assets
    audio = Asset(project_id=project.id, type=AssetType.AUDIO, status=AssetStatus.PENDING, file_path="/audio.mp3")
    image1 = Asset(project_id=project.id, type=AssetType.IMAGE, status=AssetStatus.COMPLETED, file_path="/img1.png", segment_index=0)
    image2 = Asset(project_id=project.id, type=AssetType.IMAGE, status=AssetStatus.COMPLETED, file_path="/img2.png", segment_index=1)

    db.add_all([audio, image1, image2])
    db.commit()

    # Refresh and check relationships
    db.refresh(project)
    assert len(project.assets) == 3

    # Test cascade delete
    project_id = project.id
    db.delete(project)
    db.commit()

    remaining_assets = db.query(Asset).filter(Asset.project_id == project_id).all()
    assert len(remaining_assets) == 0  # All assets should be deleted


def test_project_status_transition(db):
    """測試 9：完整專案生命週期（狀態變更）"""
    project = Project(
        name="完整流程測試",
        content="測試內容",
        status=ProjectStatus.INITIALIZED,
        gemini_model="gemini-1.5-pro"
    )
    db.add(project)
    db.commit()

    # Status transitions
    project.status = ProjectStatus.SCRIPT_GENERATING
    db.commit()

    project.status = ProjectStatus.SCRIPT_GENERATED
    project.script = {"segments": [{"text": "開場白", "duration": 5}]}
    db.commit()

    project.status = ProjectStatus.COMPLETED
    project.youtube_video_id = "dQw4w9WgXcQ"
    db.commit()

    db.refresh(project)
    assert project.status == ProjectStatus.COMPLETED
    assert project.youtube_video_id == "dQw4w9WgXcQ"
    assert project.script is not None
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（15 分鐘）

1. 確認 Task-001 已完成（專案初始化）
2. 確認 Python 環境已安裝 SQLAlchemy, Alembic
3. 建立測試資料庫目錄：
   ```bash
   mkdir -p backend/tests/models
   mkdir -p backend/scripts
   mkdir -p backend/alembic/versions
   ```

#### 第 2 步：建立 Base Model（30 分鐘）

1. 建立 `backend/app/models/base.py`
2. 定義 `Base`, `TimestampMixin`, `generate_uuid`
3. 撰寫簡單測試驗證 UUID 生成和時間戳

#### 第 3 步：實作 Project Model（1 小時）

1. 建立 `backend/app/models/project.py`
2. 定義 `ProjectStatus` 枚舉
3. 定義 `Project` 類別（所有欄位）
4. 撰寫測試 1：建立專案並驗證所有欄位
5. 執行測試 → 通過 ✅

#### 第 4 步：實作 Asset Model（1 小時）

1. 建立 `backend/app/models/asset.py`
2. 定義 `AssetType`, `AssetStatus` 枚舉
3. 定義 `Asset` 類別和外鍵關聯
4. 撰寫測試 2：專案關聯素材，測試級聯刪除
5. 執行測試 → 通過 ✅

#### 第 5 步：實作其餘模型（2 小時）

1. 依序建立：
   - `configuration.py`
   - `prompt_template.py`
   - `youtube_account.py`
   - `batch_task.py`
   - `system_settings.py`
2. 每個模型建立後，撰寫對應的單元測試
3. 執行所有測試 → 通過 ✅

#### 第 6 步：配置 Alembic（1 小時）

1. 建立 `alembic.ini`
2. 建立 `alembic/env.py`，導入所有模型
3. 生成初始遷移腳本：
   ```bash
   alembic revision --autogenerate -m "Initial schema"
   ```
4. 檢查生成的遷移腳本，手動調整（如需要）
5. 執行遷移：
   ```bash
   alembic upgrade head
   ```
6. 驗證資料表建立：
   ```bash
   sqlite3 ytmaker.db ".tables"
   ```

#### 第 7 步：撰寫初始化與 Seeder 腳本（1 小時）

1. 建立 `scripts/init_db.py`
2. 建立 `scripts/seed_data.py`
3. 執行初始化：
   ```bash
   python scripts/init_db.py
   ```
4. 執行 seeder：
   ```bash
   python scripts/seed_data.py
   ```
5. 檢查資料是否正確插入

#### 第 8 步：撰寫完整測試（1.5 小時）

1. 建立 `tests/models/test_project.py`
2. 建立 `tests/models/test_asset.py`
3. 建立 `tests/models/test_youtube_account.py`
4. 實作所有 10 個測試案例
5. 執行所有測試：
   ```bash
   pytest tests/models/ -v
   ```

#### 第 9 步：測試索引效能（30 分鐘）

1. 撰寫測試 3：索引效能測試
2. 插入 100 筆測試資料
3. 測試查詢效能（應 < 10ms）
4. 使用 EXPLAIN 檢查查詢計畫

#### 第 10 步：測試遷移流程（30 分鐘）

1. 撰寫測試 10：Alembic 遷移測試
2. 測試 upgrade/downgrade 流程
3. 確認可重複執行

#### 第 11 步：檢查覆蓋率與文件（30 分鐘）

1. 執行測試覆蓋率：
   ```bash
   pytest --cov=app/models tests/models/
   ```
2. 確認覆蓋率 > 80%
3. 檢查所有模型都有 docstring
4. 更新 `tech-specs/backend/database.md`（如有變更）

---

## 注意事項

### 資料庫設計

#### 外鍵約束
- ⚠️ 確保所有外鍵正確設定級聯刪除規則
- Asset → Project: `ondelete="CASCADE"` (刪除專案時刪除所有素材)
- Project → PromptTemplate: `ondelete="SET NULL"` (刪除範本時不影響專案)

#### 時間戳
- ⚠️ 使用 UTC 時間，統一使用 `datetime.utcnow()`
- 避免使用 `datetime.now()`（受時區影響）

#### JSON 欄位
- 💡 SQLAlchemy JSON 類型會自動序列化/反序列化 Python dict
- 儲存時：`project.script = {"segments": [...]}`
- 讀取時：`script = project.script`（直接是 dict）

#### 索引效能
- 💡 只對頻繁查詢欄位建立索引
- 過多索引會影響寫入效能
- 本 task 的索引設計已最佳化，無需額外添加

### 測試

#### 測試資料庫隔離
- ✅ 每個測試使用獨立的資料庫
- ✅ 使用 `pytest fixture` 自動建立和清理
- ✅ 測試之間不應相互影響

#### Alembic 遷移測試
- 💡 定期測試 upgrade/downgrade 流程
- 💡 確保遷移腳本可重複執行（冪等性）

### 與其他任務整合

#### Task-004 ~ 009 (API 實作)
- 🔗 所有 API 都會使用這些模型進行 CRUD 操作
- 🔗 確保模型的關聯關係正確，API 可方便查詢

#### Task-014 (Celery 任務)
- 🔗 背景任務會更新專案狀態和進度
- 🔗 確保狀態枚舉定義完整

---

## 完成檢查清單

### 模型實作
- [ ] 10 個 SQLAlchemy 模型全部實作完成
- [ ] 所有枚舉類型正確定義
- [ ] 所有欄位類型、約束正確
- [ ] 所有關聯關係正確定義
- [ ] TimestampMixin 正確應用

### 索引與效能
- [ ] 必要索引全部建立（10 個索引）
- [ ] 索引效能測試通過（查詢 < 10ms）
- [ ] 外鍵索引正確建立

### Alembic 遷移
- [ ] alembic.ini 配置完成
- [ ] alembic/env.py 配置完成
- [ ] 初始遷移腳本生成（001_initial_schema.py）
- [ ] alembic upgrade head 成功執行
- [ ] alembic downgrade -1 成功執行
- [ ] 可重複執行 upgrade/downgrade

### 腳本與資料
- [ ] init_db.py 完成並可運行
- [ ] seed_data.py 完成並可運行
- [ ] 測試資料包含至少 5 個完整專案
- [ ] 預設 Prompt 範本已建立
- [ ] 預設系統設定已建立

### 測試
- [ ] 所有 10 個測試案例實作完成
- [ ] 所有測試通過：`pytest tests/models/ -v`
- [ ] 測試覆蓋率 > 80%：`pytest --cov=app/models tests/models/`
- [ ] 無測試警告或錯誤

### 程式碼品質
- [ ] Ruff check 無錯誤：`ruff check backend/app/models/`
- [ ] 所有模型都有 docstring
- [ ] 所有欄位都有註解說明
- [ ] 無 TODO 註解遺留

### 文件同步
- [ ] 如實作與 spec 有差異，已更新 `tech-specs/backend/database.md`
- [ ] 如有新增欄位或索引，已更新文件
- [ ] README 已更新（如需要）

---

## 預估時間分配

- 環境準備與 Base Model：45 分鐘
- 實作 Project 和 Asset：2 小時
- 實作其餘 6 個模型：2 小時
- 配置 Alembic 與遷移：1 小時
- 撰寫初始化與 Seeder：1 小時
- 撰寫完整測試：1.5 小時
- 測試索引與遷移：1 小時
- 文件與檢查：30 分鐘

**總計：約 9.5 小時**（預留 buffer，原估 8 小時可能偏緊）

---

## 參考資源

### SQLAlchemy 官方文檔
- [ORM Quick Start](https://docs.sqlalchemy.org/en/20/orm/quickstart.html)
- [Declarative Mapping](https://docs.sqlalchemy.org/en/20/orm/declarative_mapping.html)
- [Relationship Configuration](https://docs.sqlalchemy.org/en/20/orm/relationships.html)
- [Using Enum Types](https://docs.sqlalchemy.org/en/20/core/type_basics.html#enum)

### Alembic 官方文檔
- [Tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
- [Auto Generating Migrations](https://alembic.sqlalchemy.org/en/latest/autogenerate.html)
- [Operation Reference](https://alembic.sqlalchemy.org/en/latest/ops.html)

### 專案內部文件
- `tech-specs/backend/database.md` - 完整資料模型定義
- `tech-specs/backend/api-design.md` - API 設計規範
- `tech-specs/framework.md` - 技術框架選擇

---

**準備好了嗎？** 開始使用 TDD 方式實作資料庫 Schema！🚀

記住：
1. ✅ 先寫測試，再寫實作
2. ✅ 每個模型完成後立即測試
3. ✅ 確保所有關聯關係正確
4. ✅ 定期執行 Alembic 遷移測試
