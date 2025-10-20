import logging
from typing import Any

from sqlalchemy.orm import Session

from app.integrations.gemini_client import GeminiAPIError, GeminiClient
from app.models.project import Project
from app.models.prompt_template import PromptTemplate
from app.utils.prompt_template import PromptTemplateEngine

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
        model: str = "gemini-2.5-flash",
    ) -> dict[str, Any]:
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
        prompt_template = (
            self.db.query(PromptTemplate).filter(PromptTemplate.id == prompt_template_id).first()
        )

        if not prompt_template:
            raise ValidationError(f"找不到 Prompt 範本：{prompt_template_id}")

        # 2. 變數替換
        variables = {"content": content, "min_duration": 5, "max_duration": 20}

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

    def validate_script_structure(self, script: dict[str, Any]) -> None:
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

    def validate_segment_duration(self, segments: list[dict]) -> list[str]:
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
                warnings.append(f"段落 {i} 時長 {duration} 秒，建議範圍 5-20 秒")

        return warnings
