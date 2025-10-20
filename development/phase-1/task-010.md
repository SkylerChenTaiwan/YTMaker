# Task-010: Gemini API 整合（腳本生成）

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 10 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **產品概述：** `product-design/overview.md#核心功能-1-自動腳本生成`
- **使用者流程：** `product-design/flows.md#Flow-1` (腳本生成階段，步驟 9)

### 技術規格
- **第三方整合：** `tech-specs/backend/integrations.md#7.1-Google-Gemini-API`
- **業務邏輯：** `tech-specs/backend/business-logic.md#3.1-腳本生成邏輯`
- **API 設計：** `tech-specs/backend/api-design.md#錯誤處理`
- **資料模型：** `tech-specs/backend/database.md#2.1.1-Project`

### 相關任務
- **前置任務:** Task-003 ✅ (API 基礎架構), Task-006 ✅ (System API - API Keys 管理)
- **後續任務:** Task-014 (Celery 任務 - 會調用此服務), Task-023 (Prompt 設定頁面)
- **並行任務:** Task-011, 012, 013 (其他第三方整合，可並行開發)

---

## 任務目標

### 簡述
整合 Google Gemini API，實作完整的腳本生成服務，包含：
1. **GeminiClient** - 封裝 Gemini API 調用邏輯
2. **ScriptGenerationService** - 腳本生成業務邏輯
3. **PromptTemplateEngine** - Prompt 模板變數替換引擎
4. **腳本驗證邏輯** - 驗證生成的腳本結構與段落時長
5. **完整的錯誤處理與重試機制**

### 成功標準
- [ ] GeminiClient 類別完整實作，支援 gemini-1.5-pro 和 gemini-1.5-flash 模型
- [ ] ScriptGenerationService 完成腳本生成、驗證、儲存流程
- [ ] PromptTemplateEngine 支援變數替換與模板渲染
- [ ] 腳本驗證邏輯完成（結構驗證、段落時長檢查）
- [ ] 錯誤處理與重試機制完整（429, 500, 503, Timeout）
- [ ] 單元測試覆蓋率 > 85%
- [ ] 整合測試通過（需要真實 API Key）

---

## 測試要求

### 單元測試

#### 測試 1：成功生成腳本（使用 Mock）

**目的：** 驗證 GeminiClient 可以正確調用 Gemini API 並解析回應

**測試設置：**
```python
# Mock Gemini API 回應
mock_gemini_response = {
    "title": "如何學習 Python 程式設計",
    "description": "本影片將介紹 Python 程式設計的基礎知識...",
    "tags": ["Python", "程式設計", "教學"],
    "segments": [
        {
            "type": "intro",
            "text": "歡迎來到我的頻道，今天我們要聊聊 Python 程式設計",
            "duration": 10,
            "image_description": "A welcoming scene with Python logo"
        },
        {
            "type": "content",
            "text": "Python 是一種易學易用的程式語言，適合初學者入門",
            "duration": 15,
            "image_description": "Python code on a computer screen"
        },
        {
            "type": "content",
            "text": "它有豐富的函式庫，可以用於資料分析、網頁開發、機器學習等領域",
            "duration": 18,
            "image_description": "Various Python applications visualization"
        },
        {
            "type": "outro",
            "text": "感謝觀看，別忘了訂閱我的頻道",
            "duration": 8,
            "image_description": "Outro scene with subscribe button"
        }
    ]
}
```

**輸入：**
```python
content = "Python 是一種易學易用的程式語言..." (500字文章)
prompt_template = "你是一個專業的 YouTube 影片腳本撰寫助手。請根據以下內容生成一個結構化的影片腳本。\n\n【原始內容】\n{content}\n\n【輸出格式要求】..."
model = "gemini-1.5-flash"
```

**預期輸出：**
```python
script = {
    "title": "如何學習 Python 程式設計",
    "description": "本影片將介紹...",
    "tags": ["Python", "程式設計", "教學"],
    "segments": [
        {"type": "intro", "text": "...", "duration": 10, "image_description": "..."},
        {"type": "content", "text": "...", "duration": 15, "image_description": "..."},
        {"type": "content", "text": "...", "duration": 18, "image_description": "..."},
        {"type": "outro", "text": "...", "duration": 8, "image_description": "..."}
    ]
}
```

**驗證點：**
- [ ] GeminiClient 正確調用 `genai.GenerativeModel`
- [ ] 回傳的腳本包含 `title`, `description`, `tags`, `segments`
- [ ] `segments` 至少包含 3 個元素（intro, content, outro）
- [ ] 每個 segment 都有 `type`, `text`, `duration`, `image_description`
- [ ] `duration` 是整數且 > 0

---

#### 測試 2：腳本結構驗證（必要欄位檢查）

**目的：** 驗證 ScriptGenerationService 可以檢測腳本結構錯誤

**輸入 1：缺少 `segments` 欄位**
```python
invalid_script = {
    "title": "測試標題",
    "description": "測試描述",
    "tags": ["tag1"]
    # 缺少 segments
}
```

**預期輸出：**
```python
ValidationError: "缺少必要欄位：segments"
```

**輸入 2：segment 缺少 `duration` 欄位**
```python
invalid_script = {
    "title": "測試標題",
    "description": "測試描述",
    "tags": ["tag1"],
    "segments": [
        {
            "type": "intro",
            "text": "開場白",
            "image_description": "..."
            # 缺少 duration
        }
    ]
}
```

**預期輸出：**
```python
ValidationError: "段落 0 缺少必要欄位：duration"
```

**驗證點：**
- [ ] 驗證函數正確檢測缺少的欄位
- [ ] 錯誤訊息清楚指出問題位置
- [ ] 驗證失敗時拋出 `ValidationError`

---

#### 測試 3：段落時長驗證（5-20 秒範圍檢查）

**目的：** 驗證系統可以檢測段落時長是否符合要求

**輸入：**
```python
script_with_invalid_durations = {
    "title": "測試標題",
    "description": "測試描述",
    "tags": ["tag1"],
    "segments": [
        {"type": "intro", "text": "...", "duration": 3, "image_description": "..."},  # 太短
        {"type": "content", "text": "...", "duration": 15, "image_description": "..."},  # 正常
        {"type": "content", "text": "...", "duration": 25, "image_description": "..."},  # 太長
        {"type": "outro", "text": "...", "duration": 10, "image_description": "..."}  # 正常
    ]
}
```

**預期輸出：**
```python
warnings = [
    "段落 0 時長 3 秒，建議範圍 5-20 秒",
    "段落 2 時長 25 秒，建議範圍 5-20 秒"
]
```

**驗證點：**
- [ ] 正確檢測出所有不符合範圍的段落
- [ ] 警告訊息包含段落編號和實際時長
- [ ] 符合範圍的段落不產生警告
- [ ] 回傳的警告列表長度正確

---

#### 測試 4：Prompt 模板引擎（變數替換）

**目的：** 驗證 PromptTemplateEngine 可以正確替換變數

**輸入：**
```python
template = """你是一個專業的 YouTube 影片腳本撰寫助手。

【原始內容】
{content}

【輸出格式要求】
1. 將內容拆分為多個段落
2. 每個段落時長控制在 {min_duration}-{max_duration} 秒
3. 生成 YouTube metadata
"""

variables = {
    "content": "這是一篇關於 Python 的文章...",
    "min_duration": 5,
    "max_duration": 20
}
```

**預期輸出：**
```python
rendered_prompt = """你是一個專業的 YouTube 影片腳本撰寫助手。

【原始內容】
這是一篇關於 Python 的文章...

【輸出格式要求】
1. 將內容拆分為多個段落
2. 每個段落時長控制在 5-20 秒
3. 生成 YouTube metadata
"""
```

**驗證點：**
- [ ] `{content}` 被正確替換
- [ ] `{min_duration}` 和 `{max_duration}` 被正確替換
- [ ] 替換後的字串沒有遺留的 `{...}` 標記
- [ ] 不存在的變數不會導致錯誤（或根據設計拋出錯誤）

---

#### 測試 5：API 錯誤處理與重試（401 Unauthorized）

**目的：** 驗證當 API Key 無效時，系統不會重試並正確拋出錯誤

**測試設置：**
```python
# Mock Gemini API 回傳 401 錯誤
mock_response = Mock()
mock_response.status_code = 401
mock_response.json.return_value = {
    "error": {
        "code": 401,
        "message": "API key not valid"
    }
}
```

**輸入：**
```python
content = "測試內容"
prompt_template = "..."
model = "gemini-1.5-flash"
# API Key 無效
```

**預期行為：**
- 調用 Gemini API 1 次
- 收到 401 錯誤後**不重試**
- 拋出 `GeminiAPIError` 並包含清楚的錯誤訊息

**預期輸出：**
```python
GeminiAPIError: "Gemini API 錯誤：API 金鑰無效"
```

**驗證點：**
- [ ] API 只被調用 1 次（沒有重試）
- [ ] 錯誤訊息清楚指出是 API Key 問題
- [ ] 錯誤類型為 `GeminiAPIError`
- [ ] 錯誤訊息不洩漏敏感資訊（API Key）

---

#### 測試 6：API 錯誤處理與重試（429 Rate Limit）

**目的：** 驗證當遇到 429 Rate Limit 時，系統會自動重試

**測試設置：**
```python
# Mock Gemini API：
# - 第 1 次調用回傳 429
# - 第 2 次調用回傳 429
# - 第 3 次調用成功
mock_responses = [
    Mock(status_code=429, json=lambda: {"error": {"code": 429, "message": "Rate limit exceeded"}}),
    Mock(status_code=429, json=lambda: {"error": {"code": 429, "message": "Rate limit exceeded"}}),
    Mock(status_code=200, json=lambda: valid_script_response)
]
```

**輸入：**
```python
content = "測試內容"
prompt_template = "..."
model = "gemini-1.5-flash"
```

**預期行為：**
- 第 1 次調用失敗 → 等待 2 秒後重試
- 第 2 次調用失敗 → 等待 4 秒後重試
- 第 3 次調用成功 → 回傳腳本

**預期輸出：**
```python
script = { ... }  # 成功生成的腳本
```

**驗證點：**
- [ ] API 被調用 3 次
- [ ] 每次重試間隔符合指數退避（2秒、4秒）
- [ ] 最終成功回傳腳本
- [ ] 日誌記錄了重試過程

---

#### 測試 7：API 錯誤處理與重試（500 Server Error，重試失敗）

**目的：** 驗證當 API 伺服器錯誤持續發生時，系統會重試 3 次後拋出錯誤

**測試設置：**
```python
# Mock Gemini API：所有調用都回傳 500
mock_responses = [
    Mock(status_code=500, json=lambda: {"error": {"code": 500, "message": "Internal server error"}}),
    Mock(status_code=500, json=lambda: {"error": {"code": 500, "message": "Internal server error"}}),
    Mock(status_code=500, json=lambda: {"error": {"code": 500, "message": "Internal server error"}})
]
```

**輸入：**
```python
content = "測試內容"
prompt_template = "..."
model = "gemini-1.5-flash"
```

**預期行為：**
- 第 1 次調用失敗 → 等待 2 秒後重試
- 第 2 次調用失敗 → 等待 5 秒後重試
- 第 3 次調用失敗 → 拋出錯誤

**預期輸出：**
```python
GeminiAPIError: "Gemini API 錯誤：伺服器錯誤（已重試 3 次）"
```

**驗證點：**
- [ ] API 被調用 3 次（最大重試次數）
- [ ] 每次重試間隔符合設定（2秒、5秒）
- [ ] 最終拋出 `GeminiAPIError`
- [ ] 錯誤訊息包含重試次數
- [ ] 日誌記錄了所有重試過程

---

### 整合測試

#### 測試 8：Gemini API 失敗應自動重試

**目的：** 驗證 Gemini API 暫時失敗時，系統會自動重試並最終成功

**測試設置：**
```python
# Mock Gemini API 返回 503 (服務暫時不可用)
with responses.RequestsMock() as rsps:
    # 前兩次調用失敗
    rsps.add(
        responses.POST,
        'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
        status=503,
        json={'error': 'Service temporarily unavailable'}
    )
    rsps.add(
        responses.POST,
        'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
        status=503,
        json={'error': 'Service temporarily unavailable'}
    )
    # 第三次調用成功
    rsps.add(
        responses.POST,
        'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
        status=200,
        json=valid_script_response
    )
```

**輸入：**
```python
content = "測試內容..."
prompt_template = "..."
model = "gemini-1.5-flash"
```

**預期行為：**
1. 第一次調用 Gemini API → 503 錯誤
2. 等待 2 秒後重試
3. 第二次調用 → 503 錯誤
4. 等待 4 秒後重試
5. 第三次調用 → 成功回傳腳本

**驗證點：**
- [ ] API 被調用 3 次
- [ ] 重試間隔符合指數退避策略（2秒、4秒）
- [ ] 最終成功生成腳本
- [ ] 日誌記錄了重試過程（WARNING level）
- [ ] 回傳的腳本結構正確

---

#### 測試 9：完整腳本生成流程（需要真實 API Key）

**目的：** 驗證完整的腳本生成流程，從輸入文字到儲存腳本到資料庫

**前置條件：**
- 資料庫已初始化
- 有效的 Gemini API Key
- 已有一個 Project 記錄（status = INITIALIZED）
- 已有一個 PromptTemplate 記錄（預設範本）

**輸入：**
```python
project_id = "uuid-test-project"
content = """
Python 是一種易學易用的高階程式語言。它的語法簡潔明瞭，
非常適合程式設計初學者入門。Python 擁有豐富的標準函式庫，
涵蓋了從文字處理、網路通訊到圖形介面等各種功能。

近年來，Python 在資料科學、機器學習、網頁開發等領域都有
廣泛應用。許多知名公司如 Google、Facebook、Instagram 都
使用 Python 作為主要開發語言之一。

對於想學習程式設計的新手來說，Python 是一個絕佳的選擇。
它不僅容易上手，而且功能強大，可以讓你快速實現各種想法。
"""  # 約 200 字，可擴充到 500-1000 字

prompt_template_id = "uuid-default-template"
gemini_model = "gemini-1.5-flash"
```

**執行步驟：**
1. 調用 `ScriptGenerationService.generate_script()`
2. 服務內部流程：
   - 載入 Prompt 範本
   - 變數替換（插入 content）
   - 調用 GeminiClient
   - 驗證腳本結構
   - 驗證段落時長
   - 更新 Project 狀態為 SCRIPT_GENERATED
   - 儲存腳本到 `projects.script` 欄位

**預期輸出：**
```python
# 資料庫中的 Project 記錄已更新
project = db.query(Project).filter(Project.id == project_id).first()

assert project.status == "SCRIPT_GENERATED"
assert project.script is not None
assert "title" in project.script
assert "segments" in project.script
assert len(project.script["segments"]) >= 3
```

**驗證點：**
- [ ] Gemini API 成功調用（真實 API）
- [ ] 回傳的腳本結構正確
- [ ] 段落時長大部分符合 5-20 秒範圍（允許少數例外）
- [ ] 腳本成功儲存到資料庫
- [ ] Project 狀態更新為 SCRIPT_GENERATED
- [ ] 整個流程耗時 < 3 分鐘

---

## 實作規格

### 需要建立/修改的檔案

#### 1. Gemini 客戶端：`backend/app/integrations/gemini_client.py`

**職責：** 封裝 Gemini API 調用邏輯，處理錯誤與重試

**類別與方法：**

```python
from typing import Dict, Any, Optional
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import logging

logger = logging.getLogger(__name__)


class GeminiAPIError(Exception):
    """Gemini API 相關錯誤"""
    pass


class GeminiClient:
    """
    Google Gemini API 客戶端

    支援模型：
    - gemini-1.5-pro (更高品質，較慢)
    - gemini-1.5-flash (較快速，成本較低)
    """

    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        """
        初始化 Gemini 客戶端

        Args:
            api_key: Gemini API Key
            model: 模型名稱
        """
        self.api_key = api_key
        self.model = model

        # 配置 Gemini
        genai.configure(api_key=self.api_key)
        self.generative_model = genai.GenerativeModel(self.model)

        logger.info(f"GeminiClient initialized with model: {model}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ConnectionError, TimeoutError)),
        reraise=True
    )
    async def generate_script(
        self,
        prompt: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        生成結構化腳本

        Args:
            prompt: 完整的 Prompt（已經過變數替換）
            **kwargs: 額外的生成參數（temperature, max_tokens 等）

        Returns:
            結構化腳本 JSON:
            {
                "title": str,
                "description": str,
                "tags": List[str],
                "segments": [
                    {
                        "type": "intro" | "content" | "outro",
                        "text": str,
                        "duration": int,  # 秒
                        "image_description": str
                    }
                ]
            }

        Raises:
            GeminiAPIError: API 調用失敗
            ValidationError: 回應格式不正確
        """
        try:
            # 預設參數
            generation_config = {
                'temperature': kwargs.get('temperature', 0.7),
                'max_output_tokens': kwargs.get('max_output_tokens', 4000),
            }

            logger.info(f"Calling Gemini API with model: {self.model}")

            # 調用 Gemini API
            response = self.generative_model.generate_content(
                prompt,
                generation_config=generation_config
            )

            # 解析回應
            script_text = response.text

            logger.info("Gemini API call successful")

            # 嘗試解析為 JSON
            import json
            try:
                script = json.loads(script_text)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Gemini response as JSON: {e}")
                raise GeminiAPIError(f"Gemini 回應格式錯誤：無法解析為 JSON")

            return script

        except genai.types.GoogleAPIError as e:
            # Google API 錯誤
            if e.status_code == 401:
                # API Key 無效，不重試
                logger.error("Gemini API Key invalid")
                raise GeminiAPIError("Gemini API 錯誤：API 金鑰無效") from e
            elif e.status_code == 429:
                # Rate Limit，重試
                logger.warning("Gemini API rate limit exceeded, retrying...")
                raise ConnectionError("Rate limit exceeded") from e
            elif e.status_code in [500, 503]:
                # 伺服器錯誤，重試
                logger.warning(f"Gemini API server error {e.status_code}, retrying...")
                raise ConnectionError(f"Server error: {e.status_code}") from e
            else:
                logger.error(f"Gemini API error: {e}")
                raise GeminiAPIError(f"Gemini API 錯誤：{str(e)}") from e

        except Exception as e:
            logger.error(f"Unexpected error calling Gemini API: {e}")
            raise GeminiAPIError(f"Gemini API 調用失敗：{str(e)}") from e
```

---

#### 2. 腳本生成服務：`backend/app/services/script_service.py`

**職責：** 腳本生成業務邏輯，包含驗證、儲存

**類別與方法：**

```python
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.prompt_template import PromptTemplate
from app.integrations.gemini_client import GeminiClient, GeminiAPIError
from app.utils.prompt_template import PromptTemplateEngine
import logging

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """腳本驗證錯誤"""
    pass


class ScriptGenerationService:
    """
    腳本生成服務

    處理流程：
    1. 載入 Prompt 範本
    2. 變數替換
    3. 調用 Gemini API
    4. 驗證腳本結構
    5. 驗證段落時長
    6. 儲存腳本到資料庫
    """

    def __init__(self, db: Session, gemini_api_key: str):
        self.db = db
        self.gemini_api_key = gemini_api_key
        self.template_engine = PromptTemplateEngine()

    async def generate_script(
        self,
        project_id: str,
        content: str,
        prompt_template_id: str,
        model: str = "gemini-1.5-flash"
    ) -> Dict[str, Any]:
        """
        生成腳本並驗證

        Args:
            project_id: 專案 ID
            content: 原始文字內容
            prompt_template_id: Prompt 範本 ID
            model: Gemini 模型名稱

        Returns:
            生成的腳本 JSON

        Raises:
            ValidationError: 驗證失敗
            GeminiAPIError: API 調用失敗
        """
        logger.info(f"Starting script generation for project {project_id}")

        # 1. 載入 Prompt 範本
        prompt_template = self.db.query(PromptTemplate).filter(
            PromptTemplate.id == prompt_template_id
        ).first()

        if not prompt_template:
            raise ValidationError(f"找不到 Prompt 範本：{prompt_template_id}")

        # 2. 變數替換
        variables = {
            "content": content,
            "min_duration": 5,
            "max_duration": 20
        }

        prompt = self.template_engine.render(prompt_template.content, variables)

        logger.info(f"Prompt template rendered, length: {len(prompt)} chars")

        # 3. 調用 Gemini API
        gemini_client = GeminiClient(api_key=self.gemini_api_key, model=model)

        try:
            script = await gemini_client.generate_script(prompt)
        except GeminiAPIError as e:
            logger.error(f"Gemini API call failed: {e}")
            raise

        # 4. 驗證腳本結構
        self.validate_script_structure(script)

        # 5. 驗證段落時長
        warnings = self.validate_segment_duration(script["segments"])

        if warnings:
            logger.warning(f"Script duration warnings: {warnings}")
            # 注意：這裡只記錄警告，不阻止流程

        # 6. 儲存腳本到資料庫
        project = self.db.query(Project).filter(Project.id == project_id).first()

        if not project:
            raise ValidationError(f"找不到專案：{project_id}")

        project.script = script
        project.status = "SCRIPT_GENERATED"

        self.db.commit()

        logger.info(f"Script generated and saved for project {project_id}")

        return script

    def validate_script_structure(self, script: Dict[str, Any]) -> None:
        """
        驗證腳本結構

        必須包含：
        - title (str)
        - description (str)
        - tags (List[str])
        - segments (List[Dict])

        每個 segment 必須包含：
        - type (str): "intro" | "content" | "outro"
        - text (str)
        - duration (int)
        - image_description (str)

        Raises:
            ValidationError: 結構不正確
        """
        required_fields = ["title", "description", "tags", "segments"]

        for field in required_fields:
            if field not in script:
                raise ValidationError(f"腳本缺少必要欄位：{field}")

        if not isinstance(script["segments"], list):
            raise ValidationError("segments 必須是陣列")

        if len(script["segments"]) < 3:
            raise ValidationError(f"segments 必須至少有 3 個（目前：{len(script['segments'])}）")

        # 驗證每個 segment
        segment_required_fields = ["type", "text", "duration", "image_description"]

        for i, segment in enumerate(script["segments"]):
            for field in segment_required_fields:
                if field not in segment:
                    raise ValidationError(f"段落 {i} 缺少必要欄位：{field}")

            # 驗證 type
            if segment["type"] not in ["intro", "content", "outro"]:
                raise ValidationError(f"段落 {i} 的 type 必須是 intro/content/outro")

            # 驗證 duration 是正整數
            if not isinstance(segment["duration"], int) or segment["duration"] <= 0:
                raise ValidationError(f"段落 {i} 的 duration 必須是正整數")

    def validate_segment_duration(self, segments: List[Dict]) -> List[str]:
        """
        驗證段落時長（5-20 秒範圍）

        Args:
            segments: 段落列表

        Returns:
            warnings: 不符合要求的段落清單（警告，不阻止流程）
        """
        warnings = []

        for i, segment in enumerate(segments):
            duration = segment["duration"]

            if duration < 5 or duration > 20:
                warnings.append(
                    f"段落 {i} 時長 {duration} 秒，建議範圍 5-20 秒"
                )

        return warnings
```

---

#### 3. Prompt 模板引擎：`backend/app/utils/prompt_template.py`

**職責：** 變數替換與模板渲染

```python
from typing import Dict, Any


class PromptTemplateEngine:
    """
    Prompt 模板引擎

    支援簡單的變數替換：{variable_name}
    """

    def render(self, template: str, variables: Dict[str, Any]) -> str:
        """
        渲染模板（變數替換）

        Args:
            template: 模板字串（包含 {variable_name}）
            variables: 變數字典

        Returns:
            渲染後的字串

        Example:
            >>> template = "請根據以下內容生成腳本：\\n{content}\\n每段時長 {min_duration}-{max_duration} 秒"
            >>> variables = {"content": "...", "min_duration": 5, "max_duration": 20}
            >>> engine.render(template, variables)
            "請根據以下內容生成腳本：\\n...\\n每段時長 5-20 秒"
        """
        result = template

        for key, value in variables.items():
            placeholder = f"{{{key}}}"
            result = result.replace(placeholder, str(value))

        return result
```

---

#### 4. Pydantic Schemas：`backend/app/schemas/script.py`

**職責：** Request/Response 資料驗證

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any


class SegmentSchema(BaseModel):
    """段落 Schema"""
    type: str = Field(..., description="段落類型 (intro/content/outro)")
    text: str = Field(..., description="段落文字")
    duration: int = Field(..., gt=0, description="段落時長（秒）")
    image_description: str = Field(..., description="圖片描述")


class ScriptSchema(BaseModel):
    """腳本 Schema"""
    title: str = Field(..., description="影片標題")
    description: str = Field(..., description="影片描述")
    tags: List[str] = Field(..., description="影片標籤")
    segments: List[SegmentSchema] = Field(..., description="段落列表")

    class Config:
        from_attributes = True


class GenerateScriptRequest(BaseModel):
    """生成腳本請求"""
    content: str = Field(..., min_length=500, max_length=10000, description="原始文字內容")
    prompt_template_id: str = Field(..., description="Prompt 範本 ID")
    gemini_model: str = Field(default="gemini-1.5-flash", description="Gemini 模型")


class GenerateScriptResponse(BaseModel):
    """生成腳本回應"""
    success: bool = True
    data: Dict[str, Any] = Field(..., description="生成的腳本")
```

---

#### 5. 測試檔案：`backend/tests/integrations/test_gemini_client.py`

**職責：** GeminiClient 單元測試

```python
import pytest
from unittest.mock import Mock, patch
from app.integrations.gemini_client import GeminiClient, GeminiAPIError


@pytest.fixture
def gemini_client():
    """Gemini 客戶端 fixture"""
    return GeminiClient(api_key="test-api-key", model="gemini-1.5-flash")


@pytest.fixture
def mock_valid_script():
    """Mock 有效腳本回應"""
    return {
        "title": "如何學習 Python 程式設計",
        "description": "本影片將介紹 Python 程式設計的基礎知識",
        "tags": ["Python", "程式設計", "教學"],
        "segments": [
            {
                "type": "intro",
                "text": "歡迎來到我的頻道",
                "duration": 10,
                "image_description": "A welcoming scene with Python logo"
            },
            {
                "type": "content",
                "text": "Python 是一種易學易用的程式語言",
                "duration": 15,
                "image_description": "Python code on a computer screen"
            },
            {
                "type": "outro",
                "text": "感謝觀看",
                "duration": 8,
                "image_description": "Outro scene with subscribe button"
            }
        ]
    }


@pytest.mark.asyncio
async def test_generate_script_success(gemini_client, mock_valid_script):
    """測試 1：成功生成腳本（使用 Mock）"""
    # Mock genai.GenerativeModel
    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_response = Mock()
        mock_response.text = json.dumps(mock_valid_script)

        mock_model.return_value.generate_content.return_value = mock_response

        # 執行
        script = await gemini_client.generate_script(prompt="Test prompt")

        # 驗證
        assert script["title"] == "如何學習 Python 程式設計"
        assert len(script["segments"]) == 3
        assert script["segments"][0]["type"] == "intro"
        assert script["segments"][0]["duration"] == 10


@pytest.mark.asyncio
async def test_generate_script_401_unauthorized(gemini_client):
    """測試 5：API 錯誤處理與重試（401 Unauthorized）"""
    # Mock genai API 回傳 401
    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_error = genai.types.GoogleAPIError("API key not valid")
        mock_error.status_code = 401

        mock_model.return_value.generate_content.side_effect = mock_error

        # 執行並驗證拋出錯誤
        with pytest.raises(GeminiAPIError) as exc_info:
            await gemini_client.generate_script(prompt="Test prompt")

        assert "API 金鑰無效" in str(exc_info.value)

        # 驗證只調用 1 次（沒有重試）
        assert mock_model.return_value.generate_content.call_count == 1


# ... 更多測試 ...
```

---

#### 6. 測試檔案：`backend/tests/services/test_script_service.py`

**職責：** ScriptGenerationService 單元測試

```python
import pytest
from unittest.mock import Mock, patch
from app.services.script_service import ScriptGenerationService, ValidationError


@pytest.fixture
def script_service(db_session):
    """ScriptGenerationService fixture"""
    return ScriptGenerationService(db=db_session, gemini_api_key="test-api-key")


def test_validate_script_structure_missing_field(script_service):
    """測試 2：腳本結構驗證（缺少必要欄位）"""
    invalid_script = {
        "title": "測試標題",
        "description": "測試描述",
        "tags": ["tag1"]
        # 缺少 segments
    }

    with pytest.raises(ValidationError) as exc_info:
        script_service.validate_script_structure(invalid_script)

    assert "缺少必要欄位：segments" in str(exc_info.value)


def test_validate_segment_duration_warnings(script_service):
    """測試 3：段落時長驗證（5-20 秒範圍檢查）"""
    segments = [
        {"type": "intro", "text": "...", "duration": 3, "image_description": "..."},  # 太短
        {"type": "content", "text": "...", "duration": 15, "image_description": "..."},  # 正常
        {"type": "content", "text": "...", "duration": 25, "image_description": "..."},  # 太長
        {"type": "outro", "text": "...", "duration": 10, "image_description": "..."}  # 正常
    ]

    warnings = script_service.validate_segment_duration(segments)

    assert len(warnings) == 2
    assert "段落 0" in warnings[0]
    assert "段落 2" in warnings[1]


# ... 更多測試 ...
```

---

## 開發指引

### TDD 開發流程（step-by-step）

#### 第 1 步：環境準備（10 分鐘）

1. 確認 Task-003 (API 基礎) 和 Task-006 (System API) 已完成
2. 確認測試環境可運行：`pytest`
3. 安裝 Gemini SDK：`pip install google-generativeai`
4. 安裝重試庫：`pip install tenacity`
5. 閱讀 `tech-specs/backend/integrations.md#7.1-Google-Gemini-API`

#### 第 2 步：撰寫第一個測試（20 分鐘）

1. 建立 `tests/integrations/test_gemini_client.py`
2. 撰寫「測試 1：成功生成腳本（使用 Mock）」
3. 執行測試 → 失敗（預期，因為還沒實作）

#### 第 3 步：實作 GeminiClient 基礎架構（40 分鐘）

1. 建立 `app/integrations/__init__.py`
2. 建立 `app/integrations/gemini_client.py`
3. 實作 `GeminiClient` 類別：
   - `__init__` 方法
   - `generate_script` 方法（基本版本，無錯誤處理）
4. 執行測試 1 → 通過 ✅

#### 第 4 步：撰寫錯誤處理測試（30 分鐘）

1. 撰寫「測試 5：API 錯誤處理與重試（401 Unauthorized）」
2. 撰寫「測試 6：API 錯誤處理與重試（429 Rate Limit）」
3. 撰寫「測試 7：API 錯誤處理與重試（500 Server Error）」
4. 執行測試 → 失敗

#### 第 5 步：實作錯誤處理與重試機制（60 分鐘）

1. 在 `GeminiClient` 中添加錯誤處理：
   - 401 Unauthorized → 不重試，直接拋出錯誤
   - 429 Rate Limit → 重試（指數退避）
   - 500/503 Server Error → 重試
2. 使用 `tenacity` 實作重試裝飾器
3. 執行測試 5, 6, 7 → 通過 ✅

#### 第 6 步：實作 Prompt 模板引擎（30 分鐘）

1. 建立 `app/utils/prompt_template.py`
2. 實作 `PromptTemplateEngine` 類別
3. 撰寫「測試 4：Prompt 模板引擎（變數替換）」
4. 執行測試 → 通過 ✅

#### 第 7 步：實作 ScriptGenerationService（90 分鐘）

1. 建立 `app/services/script_service.py`
2. 實作 `ScriptGenerationService` 類別：
   - `generate_script` 方法（完整流程）
   - `validate_script_structure` 方法
   - `validate_segment_duration` 方法
3. 撰寫「測試 2：腳本結構驗證」
4. 撰寫「測試 3：段落時長驗證」
5. 執行測試 → 通過 ✅

#### 第 8 步：建立 Pydantic Schemas（20 分鐘）

1. 建立 `app/schemas/script.py`
2. 實作所有 Schema 類別
3. 執行 Pydantic 驗證測試

#### 第 9 步：整合測試（需要真實 API Key）（40 分鐘）

1. 設定環境變數：`export GEMINI_API_KEY=your-key`
2. 撰寫「測試 8：完整腳本生成流程」
3. 執行整合測試 → 通過 ✅

#### 第 10 步：重構與優化（30 分鐘）

1. 檢查程式碼重複
2. 提取共用邏輯
3. 改善錯誤訊息
4. 再次執行所有測試

#### 第 11 步：文件與檢查（20 分鐘）

1. 檢查所有函數都有 docstring
2. 檢查測試覆蓋率：`pytest --cov=app/integrations --cov=app/services`
3. 執行 linter：`ruff check .`
4. 格式化程式碼：`ruff format .`

---

### 注意事項

#### 安全性

- ⚠️ **絕對不要**在日誌中記錄 API Key（即使是錯誤日誌）
- ⚠️ API Key 必須使用環境變數或 Keychain 儲存
- ⚠️ 錯誤訊息不應洩漏 API Key 或 Prompt 內容

#### 效能

- 💡 Gemini Flash 比 Pro 快 2-3 倍，優先使用
- 💡 設定合理的 timeout（建議 60 秒）
- 💡 使用 async/await 避免阻塞

#### 測試

- ✅ 單元測試使用 Mock，不調用真實 API
- ✅ 整合測試使用真實 API（需要 API Key）
- ✅ 測試應該可以獨立執行（不依賴順序）

#### Gemini API 特性

- 🔗 回傳的是純文字，需要明確要求 JSON 格式
- 🔗 建議在 Prompt 中包含輸出範例
- 🔗 `temperature=0.7` 平衡創意與準確性
- 🔗 `max_output_tokens=4000` 確保完整腳本

#### 與其他模組整合

- 🔗 Task-014（Celery 任務）會調用 `ScriptGenerationService`
- 🔗 Task-023（Prompt 設定頁面）會使用 PromptTemplate 資料模型
- 🔗 Task-011（圖片生成）會使用腳本中的 `image_description`

---

## 完成檢查清單

### 功能完整性

- [ ] GeminiClient 類別實作完成
- [ ] 支援 gemini-1.5-pro 和 gemini-1.5-flash 模型
- [ ] ScriptGenerationService 完成腳本生成流程
- [ ] PromptTemplateEngine 支援變數替換
- [ ] 腳本結構驗證完成
- [ ] 段落時長驗證完成

### 錯誤處理（參考 `error-codes.md`）

- [ ] 所有 Gemini API 錯誤都使用對應的錯誤碼：
  - `GEMINI_INVALID_API_KEY`：401 Unauthorized，不重試
  - `GEMINI_QUOTA_EXCEEDED`：配額用盡，不重試
  - `GEMINI_RATE_LIMIT`：429 Rate Limit，指數退避重試（最多 3 次）
  - `GEMINI_SERVER_ERROR`：500/503，固定延遲重試（最多 3 次）
  - `GEMINI_TIMEOUT`：請求超時，重試 1 次
  - `GEMINI_CONTENT_POLICY`：內容違反政策，不重試
  - `GEMINI_NETWORK_ERROR`：網路錯誤，重試（最多 3 次）
  - `GEMINI_INVALID_REQUEST`：請求參數錯誤，不重試
- [ ] 所有錯誤都拋出 `GeminiAPIError`，包含：
  - `reason`：錯誤碼
  - `is_retryable`：是否可重試
  - `details`：詳細錯誤資訊（status_code, response, quota_info）
- [ ] 所有錯誤都記錄結構化日誌（使用 `StructuredLogger`）
- [ ] JSON 解析錯誤處理並拋出 `GEMINI_INVALID_REQUEST`

### 測試

- [ ] 所有單元測試通過（7 個測試）
- [ ] 整合測試通過（1 個測試）
- [ ] 測試覆蓋率 > 85%
- [ ] 測試可獨立執行

### 程式碼品質

- [ ] Ruff check 無錯誤：`ruff check .`
- [ ] 程式碼已格式化：`ruff format .`
- [ ] 無 type 錯誤（如使用 mypy）
- [ ] 所有函數都有 docstring

### 文件

- [ ] 函數都有清楚的 docstring
- [ ] 複雜邏輯有註解
- [ ] README 已更新（如需要）

### 整合

- [ ] 在本地環境手動測試腳本生成流程
- [ ] 使用真實 API Key 測試（Gemini Flash 和 Pro）
- [ ] 檢查生成的腳本結構正確
- [ ] 驗證資料庫儲存正確

### Spec 同步

- [ ] 如果實作與 spec 有差異，已更新 `tech-specs/backend/integrations.md`
- [ ] 如果有新的依賴套件，已更新 `requirements.txt`

---

## 預估時間分配

- 閱讀與準備：10 分鐘
- 撰寫測試（單元測試）：50 分鐘
- 實作 GeminiClient：100 分鐘
- 實作 PromptTemplateEngine：30 分鐘
- 實作 ScriptGenerationService：90 分鐘
- 整合測試（真實 API）：40 分鐘
- 重構優化：30 分鐘
- 文件檢查：20 分鐘
- **Buffer：** 130 分鐘

**總計：約 8.5 小時**（預留 1.5 小時 buffer = 10 小時）

---

## 參考資源

### Gemini API 官方文檔

- [Gemini API 快速入門](https://ai.google.dev/tutorials/python_quickstart)
- [API 參考](https://ai.google.dev/api/python/google/generativeai)
- [錯誤處理](https://ai.google.dev/api/python/google/generativeai/types/GoogleAPIError)

### 相關套件文檔

- [google-generativeai](https://pypi.org/project/google-generativeai/) - Gemini Python SDK
- [tenacity](https://tenacity.readthedocs.io/) - 重試機制
- [pydantic](https://docs.pydantic.dev/) - 資料驗證

### 專案內部文件

- `tech-specs/backend/integrations.md#7.1-Google-Gemini-API` - Gemini 整合規格
- `tech-specs/backend/business-logic.md#3.1-腳本生成邏輯` - 業務邏輯
- `tech-specs/backend/api-design.md#錯誤處理` - API 設計規範
- `product-design/flows.md#Flow-1` - 用戶流程

---

## Prompt 範本參考

### 預設 Prompt 範本

```text
你是一個專業的 YouTube 影片腳本撰寫助手。請根據以下內容生成一個結構化的影片腳本。

【原始內容】
{content}

【輸出格式要求】
1. 將內容拆分為多個段落（開場 + 內容段落 + 結尾）
2. 每個段落時長控制在 {min_duration}-{max_duration} 秒
3. 為每個段落生成圖片描述（用於 AI 圖片生成，需要英文）
4. 生成 YouTube metadata（標題、描述、標籤）

【輸出 JSON 格式】（請嚴格遵守此格式，只輸出 JSON，不要有額外文字）
{
  "title": "影片標題（吸引人、簡潔、符合內容）",
  "description": "影片描述（200-300 字，包含關鍵字）",
  "tags": ["標籤1", "標籤2", "標籤3"],
  "segments": [
    {
      "type": "intro",
      "text": "開場白文字（熱情、吸引觀眾）",
      "duration": 10,
      "image_description": "A welcoming scene with..."
    },
    {
      "type": "content",
      "text": "段落 1 內容",
      "duration": 15,
      "image_description": "Description in English..."
    },
    {
      "type": "content",
      "text": "段落 2 內容",
      "duration": 18,
      "image_description": "Description in English..."
    },
    {
      "type": "outro",
      "text": "結尾文字（感謝觀看、訂閱呼籲）",
      "duration": 8,
      "image_description": "Outro scene with..."
    }
  ]
}

【重要提醒】
- 每個段落的 duration 必須在 {min_duration}-{max_duration} 秒之間
- image_description 必須用英文撰寫，描述具體的視覺場景
- 段落數量不限，根據內容決定（通常 10-20 個段落）
- 保持段落之間的邏輯連貫性
```

---

**準備好了嗎？** 開始使用 TDD 方式實作這個 task！🚀
