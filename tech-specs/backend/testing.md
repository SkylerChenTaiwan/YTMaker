# 測試規格

> **關聯文件:** [overview.md](./overview.md), [api-projects.md](./api-projects.md)

---

## 1. 單元測試

### 測試框架

**框架:** pytest

**範例:**

```python
# tests/unit/test_project_service.py
import pytest
from app.services.project_service import ProjectService

def test_create_project(db_session):
    """測試建立專案"""
    service = ProjectService(db_session)

    data = {
        "name": "測試專案",
        "content": "這是測試內容..." * 100
    }

    project = service.create_project(data)

    assert project.id is not None
    assert project.status == "initialized"
    assert project.name == "測試專案"
```

---

## 2. API 測試

### 測試範例

```python
# tests/integration/test_api_projects.py
from fastapi.testclient import TestClient

def test_list_projects(client: TestClient):
    """測試列出專案"""
    response = client.get("/api/v1/projects")

    assert response.status_code == 200
    assert "data" in response.json()

def test_create_project(client: TestClient):
    """測試建立專案"""
    data = {
        "name": "測試專案",
        "content": "內容" * 200,
        "config": {
            "prompt_template_id": "template_default",
            "gemini_model": "gemini-1.5-flash"
        }
    }

    response = client.post("/api/v1/projects", json=data)

    assert response.status_code == 201
    assert response.json()["name"] == "測試專案"
```

---

## 3. 測試覆蓋率

### 目標

- **一般程式碼:** > 80%
- **核心業務邏輯:** > 90%

### 執行測試

```bash
# 執行所有測試
pytest

# 執行測試並顯示覆蓋率
pytest --cov=app --cov-report=html
```

---

## 總結

### 測試策略
- ✅ pytest 單元測試
- ✅ API 整合測試
- ✅ 測試覆蓋率 > 80%
