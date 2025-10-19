# Task-010: Gemini API 整合（腳本生成）

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 10 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 產品設計
- **產品概述：** `product-design/overview.md#核心功能-1-自動腳本生成`
- **使用者流程：** `product-design/flows.md#Flow-1` (腳本生成階段)

### 技術規格
- **第三方整合：** `tech-specs/backend/integrations.md#Gemini API`
- **業務邏輯：** `tech-specs/backend/business-logic.md#腳本生成服務`

### 相關任務
- **前置任務:** Task-003 ✅ (API 基礎), Task-006 ✅ (System API)
- **後續任務:** Task-014 (Celery 任務), Task-023 (Prompt 設定頁面)
- **並行任務:** Task-011, 012, 013 (可並行開發)

---

## 任務目標

### 簡述
整合 Google Gemini API，實作腳本生成服務、Prompt 模板系統、腳本驗證邏輯。

### 成功標準
- [x] GeminiClient 類別完整實作
- [x] 支援 gemini-1.5-pro 和 gemini-1.5-flash 模型
- [x] ScriptGenerationService 業務邏輯完整
- [x] Prompt 模板引擎完成
- [x] 錯誤處理與重試機制完整
- [x] 腳本驗證邏輯（段落時長檢查）完成
- [x] 單元測試與 Mock 完成

---

## 主要產出

### 1. Gemini 客戶端
```python
# backend/app/integrations/gemini_client.py
class GeminiClient:
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model

    async def generate_script(
        self,
        content: str,
        prompt_template: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        生成結構化腳本

        Returns:
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
        """
        pass
```

### 2. 腳本生成服務
```python
# backend/app/services/script_service.py
class ScriptGenerationService:
    async def generate_script(
        self,
        project_id: int,
        content: str,
        prompt_template_id: int,
        model: str
    ) -> Script:
        """
        生成腳本並驗證
        """
        # 1. 載入 Prompt 範本
        # 2. 變數替換（content, 段落時長要求）
        # 3. 調用 Gemini API
        # 4. 驗證腳本結構
        # 5. 驗證段落時長（5-20 秒）
        # 6. 儲存腳本到資料庫
        pass

    def validate_script(self, script: Dict) -> bool:
        """驗證腳本格式和段落時長"""
        pass
```

### 3. Prompt 模板引擎
```python
# backend/app/utils/prompt_template.py
class PromptTemplateEngine:
    def render(
        self,
        template: str,
        variables: Dict[str, Any]
    ) -> str:
        """
        變數替換

        範例：
            template = "請根據以下內容生成腳本：\n{content}\n每段時長 5-20 秒"
            variables = {"content": "..."}
            → "請根據以下內容生成腳本：\n...\n每段時長 5-20 秒"
        """
        pass
```

---

## Prompt 範本格式

### 預設範本
```
你是一個專業的 YouTube 影片腳本撰寫助手。請根據以下內容生成一個結構化的影片腳本。

【原始內容】
{content}

【輸出格式要求】
1. 將內容拆分為多個段落（開場 + 內容段落 + 結尾）
2. 每個段落時長控制在 5-20 秒
3. 為每個段落生成圖片描述（用於 AI 圖片生成）
4. 生成 YouTube metadata（標題、描述、標籤）

【輸出 JSON 格式】
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...],
  "segments": [
    {
      "type": "intro",
      "text": "開場白文字",
      "duration": 15,
      "image_description": "圖片描述"
    },
    ...
  ]
}
```

---

## 錯誤處理與重試

### 重試機制
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
async def call_gemini_api(self, prompt: str) -> Dict:
    # API 調用
    pass
```

### 錯誤類型處理
- `401 Unauthorized` - API Key 無效（不重試，拋出錯誤）
- `429 Rate Limit` - 配額不足（等待後重試）
- `500 Internal Error` - 伺服器錯誤（重試）
- `Timeout` - 超時（重試）

---

## 腳本驗證邏輯

### 結構驗證
```python
def validate_script_structure(script: Dict) -> bool:
    # 必須包含 title, description, tags, segments
    # segments 必須有至少 3 個（intro, content, outro）
    # 每個 segment 必須有 type, text, duration, image_description
    pass
```

### 段落時長驗證
```python
def validate_segment_duration(segments: List[Dict]) -> List[str]:
    """
    檢查每個段落時長是否在 5-20 秒範圍內

    Returns:
        warnings: 不符合要求的段落清單
    """
    warnings = []
    for i, seg in enumerate(segments):
        if seg["duration"] < 5 or seg["duration"] > 20:
            warnings.append(
                f"段落 {i+1} 時長 {seg['duration']} 秒，建議範圍 5-20 秒"
            )
    return warnings
```

---

## 測試策略

### Mock Gemini API
```python
@pytest.fixture
def mock_gemini_response():
    return {
        "title": "測試影片標題",
        "description": "測試描述",
        "tags": ["test", "video"],
        "segments": [
            {
                "type": "intro",
                "text": "歡迎來到我的頻道",
                "duration": 10,
                "image_description": "A welcoming scene"
            }
            # ... 更多段落
        ]
    }
```

---

## 驗證檢查

### 單元測試
```bash
pytest tests/integrations/test_gemini_client.py -v
pytest tests/services/test_script_service.py -v
# 測試覆蓋率 > 80%
```

### 整合測試
```bash
# 需要真實的 Gemini API Key
pytest tests/integration/test_script_generation.py --api-key=YOUR_KEY
```

---

## 完成檢查清單

- [ ] GeminiClient 類別實作完成
- [ ] 支援 pro 和 flash 模型切換
- [ ] ScriptGenerationService 完成
- [ ] Prompt 模板引擎完成
- [ ] 錯誤處理與重試完成
- [ ] 腳本驗證邏輯完成
- [ ] 單元測試完成（含 Mock）
- [ ] 整合測試完成
- [ ] 測試覆蓋率 > 80%
