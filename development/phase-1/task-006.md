# Task-006: Gemini API 整合 (腳本生成)

> **建立日期:**

 2025-01-19
> **狀態:** ⏳ 未開始
> **預計時間:** 8 小時
> **優先級:** P0

---

## 關聯文件

- **整合規格:** `tech-specs/backend/integrations.md#Gemini`
- **產品設計:** `product-design/overview.md#核心功能`

### 相關任務
- **前置任務:** Task-003 ✅
- **後續任務:** Task-010 (Celery 任務會使用此整合)
- **並行任務:** Task-007, 008, 009

---

## 任務目標

整合 Google Gemini API，實作腳本生成功能，包含 Prompt 範本系統和錯誤處理。

---

## 實作規格

### 1. Gemini Client

**檔案：** `app/integrations/gemini_client.py`

```python
import google.generativeai as genai
from app.config import settings
from app.core.errors import AppException
import json
import logging

logger = logging.getLogger(__name__)

class GeminiClient:
    """Gemini API 客戶端"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        genai.configure(api_key=self.api_key)

    def generate_script(
        self,
        content: str,
        prompt_template: str,
        model_name: str = "gemini-1.5-flash"
    ) -> dict:
        """
        生成影片腳本

        Args:
            content: 原始文字內容
            prompt_template: Prompt 範本
            model_name: 模型名稱

        Returns:
            腳本 JSON 結構
        """
        try:
            # 組合 prompt
            prompt = prompt_template.format(content=content)

            # 呼叫 Gemini API
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)

            # 解析回應
            script_text = response.text

            # 嘗試解析 JSON
            try:
                script_data = json.loads(script_text)
            except json.JSONDecodeError:
                # 如果不是 JSON，嘗試提取
                script_data = self._extract_script_from_text(script_text)

            # 驗證腳本結構
            self._validate_script_structure(script_data)

            return script_data

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise AppException(
                status_code=500,
                error_code="GEMINI_API_ERROR",
                message=f"Failed to generate script: {str(e)}"
            )

    def _extract_script_from_text(self, text: str) -> dict:
        """從文字提取腳本結構"""
        # TODO: 實作文字解析邏輯
        raise AppException(
            status_code=500,
            error_code="SCRIPT_PARSE_ERROR",
            message="Failed to parse script from response"
        )

    def _validate_script_structure(self, script: dict):
        """驗證腳本結構"""
        required_keys = ["title", "intro", "segments", "outro"]
        for key in required_keys:
            if key not in script:
                raise AppException(
                    status_code=500,
                    error_code="INVALID_SCRIPT_STRUCTURE",
                    message=f"Missing required key: {key}"
                )

        # 驗證段落時長（5-20秒）
        for i, segment in enumerate(script["segments"]):
            duration = segment.get("duration", 0)
            if not (5 <= duration <= 20):
                logger.warning(
                    f"Segment {i} duration {duration}s is out of range (5-20s)"
                )
```

---

### 2. Prompt Template Service

**檔案：** `app/services/prompt_service.py`

```python
class PromptService:
    """Prompt 範本服務"""

    DEFAULT_PROMPT = """
請將以下文字內容轉換為結構化的 YouTube 影片腳本。

要求：
1. 包含開場 (intro)、內容段落 (segments)、結尾 (outro)
2. 每個段落時長應在 5-20 秒之間
3. 根據內容長度動態決定段落數量
4. 每個段落需包含圖片描述 (image_description)
5. 生成 YouTube metadata (title, description, tags)

內容：
{content}

請以 JSON 格式輸出，結構如下：
{{
  "title": "影片標題",
  "intro": {{
    "narration": "開場白",
    "duration": 10
  }},
  "segments": [
    {{
      "narration": "段落內容",
      "duration": 15,
      "image_description": "圖片描述"
    }}
  ],
  "outro": {{
    "narration": "結尾",
    "duration": 8
  }},
  "metadata": {{
    "description": "影片描述",
    "tags": ["標籤1", "標籤2"]
  }}
}}
"""

    @staticmethod
    def get_template(template_id: str, db: Session) -> str:
        """取得 Prompt 範本"""
        template = db.query(PromptTemplate).filter(
            PromptTemplate.id == template_id
        ).first()

        if not template:
            return PromptService.DEFAULT_PROMPT

        return template.template_content
```

---

### 3. Script Generation Service

**檔案：** `app/services/script_service.py`

```python
from app.integrations.gemini_client import GeminiClient
from app.models.script import Script
from app.models.project import Project
import uuid
from datetime import datetime

class ScriptService:
    def __init__(self, db: Session):
        self.db = db
        self.gemini_client = GeminiClient()

    async def generate_script(self, project_id: str) -> Script:
        """為專案生成腳本"""
        # 取得專案
        project = self.db.query(Project).filter(Project.id == project_id).first()

        # 取得 Prompt 範本
        prompt = PromptService.get_template(project.prompt_template_id, self.db)

        # 呼叫 Gemini API
        script_data = self.gemini_client.generate_script(
            content=project.content,
            prompt_template=prompt,
            model_name=project.gemini_model
        )

        # 建立 Script 記錄
        script = Script(
            id=str(uuid.uuid4()),
            project_id=project_id,
            script_data=script_data,
            created_at=datetime.utcnow()
        )
        self.db.add(script)

        # 更新專案
        project.script_id = script.id
        project.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(script)

        return script
```

---

## 測試要求

### 單元測試

```python
def test_gemini_client_generate_script(mocker):
    """測試 Gemini 腳本生成"""
    mock_response = mocker.Mock()
    mock_response.text = json.dumps({
        "title": "測試標題",
        "intro": {"narration": "開場", "duration": 10},
        "segments": [
            {"narration": "內容", "duration": 15, "image_description": "圖片"}
        ],
        "outro": {"narration": "結尾", "duration": 8}
    })

    mocker.patch('google.generativeai.GenerativeModel.generate_content', return_value=mock_response)

    client = GeminiClient(api_key="test_key")
    script = client.generate_script("測試內容", "{content}")

    assert script["title"] == "測試標題"
    assert len(script["segments"]) > 0
```

---

## 完成檢查清單

- [ ] Gemini Client 實作完成
- [ ] Prompt 範本系統完成
- [ ] 腳本驗證邏輯完成
- [ ] 錯誤處理完整
- [ ] 重試機制實作
- [ ] 測試通過

---

## 時間分配

- **Gemini Client:** 3 小時
- **Prompt Service:** 2 小時
- **Script Service:** 2 小時
- **測試與驗證:** 1 小時

**總計:** 8 小時
