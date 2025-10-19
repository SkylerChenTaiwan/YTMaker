# 測試規格 (Testing Specification)

## 關聯文件
- [API 設計 - 專案管理](./api-projects.md)
- [業務邏輯](./business-logic.md)
- [資料模型](./database.md)
- [第三方整合](./integrations.md)

---

## 10. 測試規格

### 10.1 單元測試

**框架：** pytest

**測試覆蓋率目標：**
- 一般程式碼：> 80%
- 核心業務邏輯：> 90%

**測試範圍：**
- API 端點
- 業務邏輯函數
- 資料庫操作
- 工具函數

---

### 10.1.1 API 端點測試

**測試範例：**
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_project_success():
    response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": "這是一段測試文字..." * 100  # 500+ 字
    })
    assert response.status_code == 201
    assert response.json()["success"] is True
    assert response.json()["data"]["status"] == "INITIALIZED"

def test_create_project_content_too_short():
    response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": "太短了"
    })
    assert response.status_code == 422
    assert "文字長度必須在 500-10000 字之間" in response.json()["error"]["message"]

def test_create_project_content_too_long():
    response = client.post("/api/v1/projects", json={
        "name": "測試專案",
        "content": "很長的文字..." * 10000  # > 10000 字
    })
    assert response.status_code == 422

def test_get_project_not_found():
    response = client.get("/api/v1/projects/non-existent-id")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PROJECT_NOT_FOUND"

def test_list_projects_with_pagination():
    response = client.get("/api/v1/projects?limit=10&offset=0")
    assert response.status_code == 200
    assert "projects" in response.json()["data"]
    assert "total" in response.json()["data"]
    assert len(response.json()["data"]["projects"]) <= 10
```

---

### 10.1.2 業務邏輯測試

**測試範例：**
```python
from app.services.script_generator import ScriptGenerator
from app.models import PromptTemplate

@pytest.fixture
def script_generator():
    return ScriptGenerator()

@pytest.fixture
def sample_content():
    return "這是一段測試文字..." * 100

@pytest.fixture
def sample_prompt_template():
    return PromptTemplate(
        name="測試範本",
        content="將以下文字轉換為影片腳本：{content}"
    )

def test_validate_content_success(script_generator, sample_content):
    # 測試內容驗證
    assert script_generator.validate_content(sample_content) is True

def test_validate_content_too_short(script_generator):
    short_content = "太短"
    with pytest.raises(ValueError, match="文字長度必須在 500-10000 字之間"):
        script_generator.validate_content(short_content)

def test_validate_content_invalid_encoding(script_generator):
    # 測試無效編碼
    invalid_content = "測試\x00文字"
    with pytest.raises(ValueError, match="文字編碼必須為 UTF-8"):
        script_generator.validate_content(invalid_content)

def test_build_prompt(script_generator, sample_content, sample_prompt_template):
    prompt = script_generator.build_prompt(sample_content, sample_prompt_template)
    assert sample_content in prompt
    assert "將以下文字轉換為影片腳本" in prompt

def test_validate_script_structure(script_generator):
    valid_script = {
        "intro": {"text": "開場白", "duration": 10},
        "segments": [
            {"index": 1, "text": "段落1", "duration": 15, "image_description": "desc"}
        ],
        "outro": {"text": "結尾", "duration": 10},
        "metadata": {"title": "標題", "description": "描述", "tags": ["tag1"]},
        "total_duration": 35
    }
    assert script_generator.validate_script_structure(valid_script) is True

def test_validate_script_missing_field(script_generator):
    invalid_script = {
        "intro": {"text": "開場白", "duration": 10},
        # 缺少 segments
        "outro": {"text": "結尾", "duration": 10},
    }
    with pytest.raises(ValueError, match="腳本結構不完整"):
        script_generator.validate_script_structure(invalid_script)

def test_validate_script_duration_too_short(script_generator):
    invalid_script = {
        "intro": {"text": "開場白", "duration": 5},
        "segments": [
            {"index": 1, "text": "段落1", "duration": 5, "image_description": "desc"}
        ],
        "outro": {"text": "結尾", "duration": 5},
        "metadata": {"title": "標題", "description": "描述", "tags": ["tag1"]},
        "total_duration": 15  # < 180 秒
    }
    with pytest.raises(ValueError, match="影片總時長必須在 180-600 秒之間"):
        script_generator.validate_script_structure(invalid_script)
```

---

### 10.1.3 資料庫操作測試

**測試範例：**
```python
from app.models import Project, Asset
from app.database import get_db

@pytest.fixture
def db():
    # 使用測試資料庫
    return get_test_db()

def test_create_project(db):
    project = Project(
        name="測試專案",
        content="測試內容...",
        status="INITIALIZED"
    )
    db.add(project)
    db.commit()

    # 驗證儲存成功
    saved_project = db.query(Project).filter_by(name="測試專案").first()
    assert saved_project is not None
    assert saved_project.status == "INITIALIZED"

def test_project_asset_relationship(db):
    # 建立專案
    project = Project(name="測試專案", content="內容...", status="INITIALIZED")
    db.add(project)
    db.commit()

    # 新增素材
    asset = Asset(
        project_id=project.id,
        type="IMAGE",
        file_path="/path/to/image.png",
        status="COMPLETED",
        segment_index=1
    )
    db.add(asset)
    db.commit()

    # 驗證關聯
    saved_project = db.query(Project).get(project.id)
    assert len(saved_project.assets) == 1
    assert saved_project.assets[0].type == "IMAGE"

def test_query_projects_by_status(db):
    # 建立多個專案
    for i, status in enumerate(["INITIALIZED", "COMPLETED", "FAILED"]):
        project = Project(
            name=f"專案{i}",
            content="內容...",
            status=status
        )
        db.add(project)
    db.commit()

    # 查詢已完成的專案
    completed_projects = db.query(Project).filter_by(status="COMPLETED").all()
    assert len(completed_projects) == 1
```

---

### 10.2 整合測試

**測試範圍：**
- API 整合（FastAPI + SQLAlchemy）
- 資料庫整合
- 外部 API Mock 測試

**測試範例：**
```python
def test_generate_video_flow(client, db, mock_external_apis):
    # 步驟 1: 建立專案
    response = client.post("/api/v1/projects", json={
        "name": "整合測試專案",
        "content": "測試內容..." * 100
    })
    assert response.status_code == 201
    project_id = response.json()["data"]["id"]

    # 步驟 2: 更新配置
    response = client.put(f"/api/v1/projects/{project_id}/configuration", json={
        "subtitle": {
            "font_family": "Noto Sans TC",
            "font_size": 48
        }
    })
    assert response.status_code == 200

    # 步驟 3: 開始生成
    response = client.post(f"/api/v1/projects/{project_id}/generate")
    assert response.status_code == 200
    assert "task_id" in response.json()["data"]

    # 步驟 4: 驗證狀態變更
    project = db.query(Project).get(project_id)
    assert project.status in ["SCRIPT_GENERATING", "SCRIPT_GENERATED"]

def test_batch_processing_flow(client, db):
    # 建立批次任務
    response = client.post("/api/v1/batch", json={
        "name": "批次測試",
        "projects": [
            {"name": "專案1", "content": "內容..." * 100},
            {"name": "專案2", "content": "內容..." * 100}
        ],
        "configuration_id": None,
        "prompt_template_id": None,
        "gemini_model": "gemini-1.5-flash"
    })
    assert response.status_code == 201
    batch_id = response.json()["data"]["batch_id"]

    # 驗證批次任務已建立
    batch = db.query(BatchTask).get(batch_id)
    assert batch.total_projects == 2
    assert batch.status == "QUEUED"
```

---

### 10.3 Mock 資料設計

**外部 API Mock：**
```python
import pytest
from unittest.mock import Mock, patch

@pytest.fixture
def mock_gemini_api(mocker):
    mock_response = {
        "intro": {"text": "開場白", "duration": 10},
        "segments": [
            {
                "index": 1,
                "text": "段落1",
                "duration": 15,
                "image_description": "A beautiful landscape"
            }
        ],
        "outro": {"text": "結尾", "duration": 10},
        "metadata": {
            "title": "測試標題",
            "description": "測試描述",
            "tags": ["tag1", "tag2"]
        },
        "total_duration": 35
    }

    mocker.patch(
        'app.services.gemini.generate_script',
        return_value=mock_response
    )

    return mock_response

@pytest.fixture
def mock_stability_ai(mocker):
    # Mock 圖片生成 API
    mock_image_data = b'\x89PNG\r\n\x1a\n...'  # PNG header

    mocker.patch(
        'app.services.stability_ai.generate_image',
        return_value=mock_image_data
    )

    return mock_image_data

@pytest.fixture
def mock_did_api(mocker):
    # Mock D-ID API
    mock_video_url = "https://api.d-id.com/talks/video_123.mp4"

    mocker.patch(
        'app.services.did.generate_avatar',
        return_value=mock_video_url
    )

    return mock_video_url

@pytest.fixture
def mock_youtube_api(mocker):
    # Mock YouTube 上傳 API
    mock_video_id = "test_video_id_123"

    mocker.patch(
        'app.services.youtube.upload_video',
        return_value=mock_video_id
    )

    return mock_video_id

@pytest.fixture
def mock_external_apis(mock_gemini_api, mock_stability_ai, mock_did_api, mock_youtube_api):
    # 組合所有外部 API mock
    return {
        'gemini': mock_gemini_api,
        'stability_ai': mock_stability_ai,
        'did': mock_did_api,
        'youtube': mock_youtube_api
    }
```

---

### 10.4 測試資料工廠

**使用 Factory Boy 建立測試資料：**
```python
import factory
from app.models import Project, Asset, PromptTemplate

class PromptTemplateFactory(factory.Factory):
    class Meta:
        model = PromptTemplate

    name = factory.Sequence(lambda n: f"範本{n}")
    content = "將以下文字轉換為影片腳本：{content}"
    is_default = False

class ProjectFactory(factory.Factory):
    class Meta:
        model = Project

    name = factory.Sequence(lambda n: f"專案{n}")
    content = "測試內容..." * 100
    status = "INITIALIZED"
    gemini_model = "gemini-1.5-flash"

class AssetFactory(factory.Factory):
    class Meta:
        model = Asset

    project = factory.SubFactory(ProjectFactory)
    type = "IMAGE"
    file_path = "/path/to/asset.png"
    status = "COMPLETED"

# 使用範例
def test_with_factory(db):
    # 快速建立測試資料
    project = ProjectFactory()
    asset = AssetFactory(project=project)

    db.add(project)
    db.add(asset)
    db.commit()

    # 驗證
    assert db.query(Project).count() == 1
    assert db.query(Asset).count() == 1
```

---

### 10.5 測試執行

**執行所有測試：**
```bash
pytest
```

**執行特定測試檔案：**
```bash
pytest tests/test_api_projects.py
```

**執行特定測試函數：**
```bash
pytest tests/test_api_projects.py::test_create_project_success
```

**查看覆蓋率報告：**
```bash
pytest --cov=app --cov-report=html
```

**執行標記的測試：**
```bash
# 只執行單元測試
pytest -m unit

# 只執行整合測試
pytest -m integration

# 跳過慢速測試
pytest -m "not slow"
```

---

### 10.6 持續整合 (CI)

**GitHub Actions 配置範例：**
```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run tests
        run: |
          pytest --cov=app --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```
