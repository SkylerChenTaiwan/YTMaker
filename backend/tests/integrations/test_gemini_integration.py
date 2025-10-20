"""
整合測試：需要真實的 Gemini API Key

執行前請設定環境變數：
export GEMINI_API_KEY=your-api-key

或使用 .env.test 檔案
"""

import pytest
import os
from app.integrations.gemini_client import GeminiClient, GeminiAPIError
from app.services.script_service import ScriptGenerationService
from app.models.project import Project
from app.models.prompt_template import PromptTemplate


# 只在有 API Key 時執行整合測試
pytestmark = pytest.mark.skipif(
    not os.getenv("GEMINI_API_KEY"),
    reason="需要 GEMINI_API_KEY 環境變數才能執行整合測試",
)


@pytest.fixture
def gemini_api_key():
    """取得 Gemini API Key"""
    return os.getenv("GEMINI_API_KEY")


@pytest.fixture
def real_gemini_client(gemini_api_key):
    """真實的 Gemini 客戶端"""
    return GeminiClient(api_key=gemini_api_key, model="gemini-2.5-flash")


@pytest.mark.asyncio
@pytest.mark.integration
async def test_real_gemini_api_call(real_gemini_client):
    """測試 9 簡化版：真實的 Gemini API 調用"""
    # 簡單的測試 prompt
    prompt = """請根據以下內容生成一個簡短的 YouTube 影片腳本。

【原始內容】
Python 是一種易學易用的程式語言，非常適合初學者。它有豐富的函式庫和活躍的社群。

【輸出格式要求】
請以 JSON 格式回應，包含以下欄位：
- title: 影片標題
- description: 影片描述（50字以內）
- tags: 3個標籤的陣列
- segments: 段落陣列，每個段落包含：
  - type: "intro" 或 "content" 或 "outro"
  - text: 段落文字（20字以內）
  - duration: 時長（秒，5-20之間的整數）
  - image_description: 圖片描述（英文，10字以內）

請確保至少有 3 個 segments（intro, content, outro）

只輸出 JSON，不要有其他文字。"""

    # 執行
    try:
        script = await real_gemini_client.generate_script(prompt)

        # 基本驗證
        assert "title" in script, "腳本應包含 title"
        assert "description" in script, "腳本應包含 description"
        assert "tags" in script, "腳本應包含 tags"
        assert "segments" in script, "腳本應包含 segments"
        assert isinstance(script["segments"], list), "segments 應該是陣列"
        assert len(script["segments"]) >= 3, f"至少要有 3 個 segments，目前有 {len(script['segments'])}"

        # 驗證第一個 segment 結構
        first_segment = script["segments"][0]
        assert "type" in first_segment, "segment 應包含 type"
        assert "text" in first_segment, "segment 應包含 text"
        assert "duration" in first_segment, "segment 應包含 duration"
        assert "image_description" in first_segment, "segment 應包含 image_description"

        print(f"\n✅ 真實 API 測試成功！")
        print(f"   標題: {script['title']}")
        print(f"   段落數: {len(script['segments'])}")

    except GeminiAPIError as e:
        pytest.fail(f"Gemini API 調用失敗: {e}")


@pytest.mark.asyncio
@pytest.mark.integration
async def test_complete_script_generation_flow(db, gemini_api_key):
    """測試 9：完整腳本生成流程（資料庫 + 真實 API）"""
    # 1. 建立測試專案
    project = Project(
        name="整合測試專案",
        content="測試內容",
        status="INITIALIZED",
        gemini_model="gemini-2.5-flash",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # 2. 建立 Prompt 範本
    prompt_template = PromptTemplate(
        name="整合測試範本",
        content="""請根據以下內容生成一個簡短的 YouTube 影片腳本。

【原始內容】
{content}

【輸出格式要求】
請以 JSON 格式回應，包含以下欄位：
- title: 影片標題
- description: 影片描述（50字以內）
- tags: 3個標籤的陣列
- segments: 段落陣列，每個段落包含：
  - type: "intro" 或 "content" 或 "outro"
  - text: 段落文字（30字以內）
  - duration: 時長（秒，{min_duration}-{max_duration}之間的整數）
  - image_description: 圖片描述（英文，15字以內）

請確保至少有 3 個 segments（intro, content, outro）

只輸出 JSON，不要有其他文字。""",
        is_default=True,
    )
    db.add(prompt_template)
    db.commit()
    db.refresh(prompt_template)

    # 3. 建立 ScriptGenerationService
    service = ScriptGenerationService(db=db, gemini_api_key=gemini_api_key)

    # 4. 生成腳本（使用真實 API）
    content = """Python 是一種易學易用的高階程式語言。它的語法簡潔明瞭，非常適合程式設計初學者入門。
Python 擁有豐富的標準函式庫，涵蓋了從文字處理、網路通訊到圖形介面等各種功能。
近年來，Python 在資料科學、機器學習、網頁開發等領域都有廣泛應用。"""

    try:
        script = await service.generate_script(
            project_id=str(project.id),
            content=content,
            prompt_template_id=str(prompt_template.id),
            model="gemini-2.5-flash",
        )

        # 5. 驗證結果
        assert script is not None, "腳本不應為 None"
        assert "title" in script, "腳本應包含 title"
        assert "segments" in script, "腳本應包含 segments"
        assert len(script["segments"]) >= 3, "至少要有 3 個 segments"

        # 6. 驗證資料庫更新
        db.refresh(project)
        assert project.status == "SCRIPT_GENERATED", f"專案狀態應為 SCRIPT_GENERATED，目前為 {project.status}"
        assert project.script is not None, "專案的 script 欄位不應為 None"
        assert project.script["title"] == script["title"], "儲存的腳本標題應與回傳的一致"

        print(f"\n✅ 完整流程測試成功！")
        print(f"   專案狀態: {project.status}")
        print(f"   腳本標題: {project.script['title']}")
        print(f"   段落數: {len(project.script['segments'])}")

    except GeminiAPIError as e:
        pytest.fail(f"腳本生成失敗: {e}")
    except Exception as e:
        pytest.fail(f"測試失敗: {e}")
