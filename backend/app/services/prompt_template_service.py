import uuid
from datetime import datetime
from typing import List
from sqlalchemy import desc
from sqlalchemy.orm import Session
from app.core.exceptions import AppException, ConflictException
from app.models.project import Project
from app.models.prompt_template import PromptTemplate
from app.schemas.prompt_template import PromptTemplateCreate, PromptTemplateUpdate


class PromptTemplateService:
    def __init__(self, db: Session):
        self.db = db

    def list_templates(self) -> List[PromptTemplate]:
        return self.db.query(PromptTemplate).order_by(desc(PromptTemplate.is_default), desc(PromptTemplate.usage_count)).all()

    def create_template(self, data: PromptTemplateCreate) -> PromptTemplate:
        existing = self.db.query(PromptTemplate).filter(PromptTemplate.name == data.name).first()
        if existing:
            raise AppException(
                message="Prompt 範本名稱已存在",
                error_code="PROMPT_TEMPLATE_NAME_EXISTS",
                status_code=409
            )

        if not self._validate_prompt_content(data.content):
            raise AppException(
                message="Prompt 內容必須包含 {{content}} 佔位符",
                error_code="VALIDATION_ERROR",
                status_code=422,
                details={"field": "content"}
            )

        template = PromptTemplate(id=str(uuid.uuid4()), name=data.name, content=data.content, is_default=False, usage_count=0)
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def get_template(self, template_id: str) -> PromptTemplate:
        template = self.db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
        if not template:
            raise AppException(
                message="Prompt 範本不存在",
                error_code="PROMPT_TEMPLATE_NOT_FOUND",
                status_code=404
            )

        template.usage_count += 1
        self.db.commit()
        self.db.refresh(template)
        return template

    def update_template(self, template_id: str, data: PromptTemplateUpdate) -> PromptTemplate:
        template = self.db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
        if not template:
            raise AppException(
                message="Prompt 範本不存在",
                error_code="PROMPT_TEMPLATE_NOT_FOUND",
                status_code=404
            )

        if data.name and data.name != template.name:
            existing = self.db.query(PromptTemplate).filter(PromptTemplate.name == data.name).first()
            if existing:
                raise AppException(
                    message="Prompt 範本名稱已存在",
                    error_code="PROMPT_TEMPLATE_NAME_EXISTS",
                    status_code=409
                )

        if data.content and not self._validate_prompt_content(data.content):
            raise AppException(
                message="Prompt 內容必須包含 {{content}} 佔位符",
                error_code="VALIDATION_ERROR",
                status_code=422
            )

        if data.name:
            template.name = data.name
        if data.content:
            template.content = data.content
        template.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(template)
        return template

    def delete_template(self, template_id: str) -> None:
        template = self.db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
        if not template:
            raise AppException(
                message="Prompt 範本不存在",
                error_code="PROMPT_TEMPLATE_NOT_FOUND",
                status_code=404
            )

        if template.is_default:
            raise AppException(
                message="預設範本無法刪除",
                error_code="DEFAULT_TEMPLATE_PROTECTED",
                status_code=403
            )

        projects_count = self.db.query(Project).filter(Project.prompt_template_id == template_id).count()
        if projects_count > 0:
            raise AppException(
                message="Prompt 範本正在使用中，無法刪除",
                error_code="PROMPT_TEMPLATE_IN_USE",
                status_code=409,
                details={"projects_count": projects_count}
            )

        self.db.delete(template)
        self.db.commit()

    def _validate_prompt_content(self, content: str) -> bool:
        return "{{content}}" in content
