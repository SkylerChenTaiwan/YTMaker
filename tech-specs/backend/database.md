# 資料庫設計

> **關聯文件:** [overview.md](./overview.md), [framework.md](../framework.md)

---

## 1. 資料庫選擇

### SQLite

**理由:**
- ✅ 本地端應用,無需獨立資料庫伺服器
- ✅ 零配置,易於部署
- ✅ 單檔案儲存,易於備份和遷移
- ✅ 支援 ACID 事務
- ✅ 輕量、快速

**檔案位置:**
- 開發環境: `backend/data/dev.db`
- 生產環境: `{user_data_dir}/ytmaker/production.db`

**ORM:** SQLAlchemy 2.x

---

## 2. 資料模型總覽

**總計:** 10 個主要資料實體

1. **Project** (專案)
2. **Configuration** (視覺配置)
3. **PromptTemplate** (Prompt 範本)
4. **VisualTemplate** (視覺配置模板)
5. **Script** (生成的腳本)
6. **Asset** (素材檔案)
7. **BatchTask** (批次任務)
8. **Setting** (系統設定)
9. **APIKey** (API 金鑰)
10. **YouTubeAuth** (YouTube 授權)

---

## 3. 詳細資料模型

### 3.1 Project (專案)

**描述:** 核心資料模型,代表一個影片生成專案

**欄位定義:**

| 欄位名稱 | 類型 | 必填 | 說明 | 預設值 |
|---------|------|------|------|-------|
| id | string (UUID) | 是 | 專案唯一識別碼 | 自動生成 |
| name | string(100) | 是 | 專案名稱 | - |
| status | enum | 是 | 專案狀態 | initialized |
| content | text | 是 | 原始文字內容 | - |
| word_count | integer | 是 | 字數統計 | 自動計算 |
| configuration_id | string (FK) | 否 | 視覺配置 ID | null |
| prompt_template_id | string (FK) | 是 | Prompt 範本 ID | - |
| gemini_model | string | 是 | Gemini 模型 | gemini-1.5-flash |
| script_id | string (FK) | 否 | 生成的腳本 ID | null |
| youtube_settings | JSON | 是 | YouTube 設定 | - |
| youtube_video_id | string | 否 | YouTube 影片 ID | null |
| progress | integer | 是 | 生成進度 (0-100) | 0 |
| created_at | datetime | 是 | 建立時間 | 自動生成 |
| updated_at | datetime | 是 | 更新時間 | 自動更新 |

**狀態列舉 (status):**
- `initialized`: 已初始化
- `script_generating`: 腳本生成中
- `assets_generating`: 素材生成中
- `rendering`: 影片渲染中
- `uploading`: 上傳中
- `completed`: 已完成
- `failed`: 失敗

**SQLAlchemy 模型:**

```python
from sqlalchemy import Column, String, Integer, Text, JSON, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
import enum

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
    configuration_id = Column(String(36), ForeignKey("configurations.id"), nullable=True)
    prompt_template_id = Column(String(36), ForeignKey("prompt_templates.id"), nullable=False)
    gemini_model = Column(String(50), nullable=False, default="gemini-1.5-flash")
    script_id = Column(String(36), ForeignKey("scripts.id"), nullable=True)
    youtube_settings = Column(JSON, nullable=False)
    youtube_video_id = Column(String(50), nullable=True)
    progress = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    # 關聯
    configuration = relationship("Configuration", back_populates="projects")
    prompt_template = relationship("PromptTemplate")
    script = relationship("Script", back_populates="project")
    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")
```

---

### 3.2 Configuration (視覺配置)

**欄位定義:**

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| id | string (UUID) | 是 | 配置唯一識別碼 |
| name | string(100) | 是 | 配置名稱 |
| config_data | JSON | 是 | 配置內容 |
| created_at | datetime | 是 | 建立時間 |
| usage_count | integer | 是 | 使用次數 |

**config_data JSON 結構:**

```json
{
  "subtitle": {
    "font_family": "Noto Sans TC",
    "font_size": 48,
    "font_color": "#FFFFFF",
    "position": { "x": 960, "y": 900 },
    "border_enabled": true,
    "shadow_enabled": true
  },
  "logo": {
    "file_path": "/path/to/logo.png",
    "position": { "x": 50, "y": 50 },
    "size": 100
  }
}
```

**SQLAlchemy 模型:**

```python
class Configuration(Base):
    __tablename__ = "configurations"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    config_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False)
    usage_count = Column(Integer, nullable=False, default=0)

    # 關聯
    projects = relationship("Project", back_populates="configuration")
```

---

### 3.3 PromptTemplate (Prompt 範本)

**欄位定義:**

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| id | string (UUID) | 是 | 範本唯一識別碼 |
| name | string(100) | 是 | 範本名稱 |
| template_content | text | 是 | Prompt 範本內容 |
| variables | JSON | 是 | 範本變數定義 |
| created_at | datetime | 是 | 建立時間 |
| is_default | boolean | 是 | 是否為預設範本 |

**template_content 範例:**

```
請將以下文字內容轉換為 YouTube 影片腳本:

{content}

要求:
- 腳本長度: {target_duration} 分鐘
- 風格: {tone}
- 目標觀眾: {target_audience}
```

**SQLAlchemy 模型:**

```python
class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    template_content = Column(Text, nullable=False)
    variables = Column(JSON, nullable=False)  # ["content", "target_duration", "tone"]
    created_at = Column(DateTime, nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)
```

---

### 3.4 Script (生成的腳本)

**欄位定義:**

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| id | string (UUID) | 是 | 腳本唯一識別碼 |
| project_id | string (FK) | 是 | 所屬專案 ID |
| script_data | JSON | 是 | 腳本內容 |
| created_at | datetime | 是 | 建立時間 |

**script_data JSON 結構:**

```json
{
  "title": "2025 科技趨勢分析",
  "intro": {
    "narration": "大家好,今天我們來聊聊...",
    "duration": 10,
    "avatar_type": "intro"
  },
  "segments": [
    {
      "narration": "第一個趨勢是 AI...",
      "duration": 30,
      "image_prompts": [
        { "prompt": "futuristic AI technology", "duration": 5 },
        { "prompt": "neural network visualization", "duration": 5 }
      ]
    }
  ],
  "outro": {
    "narration": "感謝收看,我們下次見!",
    "duration": 8,
    "avatar_type": "outro"
  }
}
```

**SQLAlchemy 模型:**

```python
class Script(Base):
    __tablename__ = "scripts"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    script_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False)

    # 關聯
    project = relationship("Project", back_populates="script")
```

---

### 3.5 Asset (素材檔案)

**欄位定義:**

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| id | string (UUID) | 是 | 素材唯一識別碼 |
| project_id | string (FK) | 是 | 所屬專案 ID |
| asset_type | enum | 是 | 素材類型 |
| file_path | string | 是 | 檔案路徑 |
| metadata | JSON | 否 | 素材元資料 |
| created_at | datetime | 是 | 建立時間 |

**asset_type 列舉:**
- `audio`: 語音檔案
- `image`: 圖片
- `avatar_intro`: 虛擬主播開場
- `avatar_outro`: 虛擬主播結尾
- `video`: 最終影片
- `thumbnail`: 縮圖

**SQLAlchemy 模型:**

```python
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
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    asset_type = Column(Enum(AssetType), nullable=False)
    file_path = Column(String(500), nullable=False)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False)

    # 關聯
    project = relationship("Project", back_populates="assets")
```

---

### 3.6 BatchTask (批次任務)

**欄位定義:**

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| id | string (UUID) | 是 | 批次任務唯一識別碼 |
| name | string(100) | 是 | 批次任務名稱 |
| project_ids | JSON | 是 | 專案 ID 列表 |
| status | enum | 是 | 批次任務狀態 |
| created_at | datetime | 是 | 建立時間 |
| completed_count | integer | 是 | 已完成專案數 |
| total_count | integer | 是 | 總專案數 |

**SQLAlchemy 模型:**

```python
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
    created_at = Column(DateTime, nullable=False)
    completed_count = Column(Integer, nullable=False, default=0)
    total_count = Column(Integer, nullable=False)
```

---

### 3.7 Setting (系統設定)

**欄位定義:**

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| key | string(100) | 是 | 設定鍵 (主鍵) |
| value | JSON | 是 | 設定值 |
| updated_at | datetime | 是 | 更新時間 |

**SQLAlchemy 模型:**

```python
class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, nullable=False)
```

---

## 4. 索引設計

### projects 表

```sql
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
```

**理由:**
- `status` - 頻繁篩選專案狀態
- `created_at`, `updated_at` - 排序和分頁查詢

### assets 表

```sql
CREATE INDEX idx_assets_project_id ON assets(project_id);
CREATE INDEX idx_assets_type ON assets(asset_type);
```

**理由:**
- `project_id` - 查詢專案的所有素材
- `asset_type` - 查詢特定類型的素材

---

## 5. 外鍵約束

```python
# Project → Configuration (多對一)
configuration_id = Column(String(36), ForeignKey("configurations.id", ondelete="SET NULL"))

# Project → PromptTemplate (多對一)
prompt_template_id = Column(String(36), ForeignKey("prompt_templates.id", ondelete="RESTRICT"))

# Project → Script (一對一)
script_id = Column(String(36), ForeignKey("scripts.id", ondelete="CASCADE"))

# Asset → Project (多對一)
project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"))
```

**CASCADE 策略:**
- 刪除 Project → 自動刪除相關 Assets, Script
- 刪除 Configuration → 不影響 Project (設為 NULL)
- 刪除 PromptTemplate → 限制刪除 (RESTRICT)

---

## 6. 資料庫遷移

### 使用 Alembic

**初始化:**
```bash
alembic init migrations
```

**建立遷移腳本:**
```bash
alembic revision --autogenerate -m "Create initial tables"
```

**執行遷移:**
```bash
alembic upgrade head
```

---

## 7. 查詢優化

### Eager Loading (避免 N+1 查詢)

```python
# ❌ 壞的做法 (N+1 查詢)
projects = db.query(Project).all()
for project in projects:
    print(project.configuration.name)  # 每次都查詢一次資料庫

# ✅ 好的做法 (Eager Loading)
from sqlalchemy.orm import joinedload

projects = db.query(Project).options(
    joinedload(Project.configuration),
    joinedload(Project.script),
    joinedload(Project.assets)
).all()

for project in projects:
    print(project.configuration.name)  # 不會額外查詢
```

---

## 8. 資料備份與還原

### 備份 SQLite 資料庫

```bash
# 簡單備份
cp data/production.db data/backup/production_$(date +%Y%m%d).db

# 使用 SQLite dump
sqlite3 data/production.db .dump > backup/production_$(date +%Y%m%d).sql
```

### 還原

```bash
# 從備份還原
cp data/backup/production_20240115.db data/production.db

# 從 SQL dump 還原
sqlite3 data/production.db < backup/production_20240115.sql
```

---

## 總結

### 資料模型統計
- **總實體數:** 10 個
- **關聯關係:** 6 個 (外鍵)
- **索引數量:** 5 個

### 設計原則
- ✅ 規範化設計,減少資料冗餘
- ✅ 適當的索引,提升查詢效能
- ✅ CASCADE 策略,確保資料一致性
- ✅ JSON 欄位,靈活儲存複雜結構
- ✅ Enum 類型,確保狀態值有效性

---

**下一步:** 詳見 [api-design.md](./api-design.md)、[api-projects.md](./api-projects.md)
