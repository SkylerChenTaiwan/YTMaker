"""
Prompt Template Service - Prompt 範本業務邏輯

提供 Prompt 範本的 CRUD 操作：
- 列出所有範本
- 建立範本
- 取得單一範本
- 更新範本
- 刪除範本
"""
import uuid
from datetime import datetime
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.prompt_template import PromptTemplate
from app.schemas.prompt_template import PromptTemplateCreate, PromptTemplateUpdate


class PromptTemplateService:
    """Prompt Template business logic service."""

    def __init__(self, db: Session):
        self.db = db

    def list_templates(self) -> List[PromptTemplate]:
        """
        列出所有 Prompt 範本

        預設範本排在最前面，其次按 usage_count 降序排列
        """
        templates = (
            self.db.query(PromptTemplate)
            .order_by(desc(PromptTemplate.is_default), desc(PromptTemplate.usage_count))
            .all()
        )
        return templates

    def create_template(self, data: PromptTemplateCreate) -> PromptTemplate:
        """
        建立新 Prompt 範本

        1. 檢查名稱是否重複
        2. 驗證 Prompt 內容（必須包含 {{content}} 佔位符）
        3. 建立資料庫記錄

        Args:
            data: Prompt 範本建立請求

        Returns:
            PromptTemplate: 建立的範本物件

        Raises:
            HTTPException: 409 如果名稱重複
            HTTPException: 422 如果 Prompt 內容驗證失敗
        """
        # 檢查名稱是否存在
        existing = self.db.query(PromptTemplate).filter(PromptTemplate.name == data.name).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "success": False,
                    "error": {
                        "code": "PROMPT_TEMPLATE_NAME_EXISTS",
                        "message": "Prompt 範本名稱已存在",
                    },
                },
            )

        # 驗證 Prompt 內容必須包含 {{content}} 佔位符
        if not self._validate_prompt_content(data.content):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Prompt 內容必須包含 {{content}} 佔位符",
                        "details": {"field": "content"},
                    },
                },
            )

        # 建立範本
        template = PromptTemplate(
            id=str(uuid.uuid4()),
            name=data.name,
            content=data.content,
            is_default=False,  # 用戶建立的範本不是預設範本
            usage_count=0,
        )

        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)

        return template

    def get_template(self, template_id: str) -> PromptTemplate:
        """
        取得單一 Prompt 範本

        會更新 usage_count

        Args:
            template_id: 範本 ID

        Returns:
            PromptTemplate: 範本物件

        Raises:
            HTTPException: 404 如果範本不存在
        """
        template = self.db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "error": {
                        "code": "PROMPT_TEMPLATE_NOT_FOUND",
                        "message": "Prompt 範本不存在",
                    },
                },
            )

        # 更新使用統計
        template.usage_count += 1
        self.db.commit()
        self.db.refresh(template)

        return template

    def update_template(self, template_id: str, data: PromptTemplateUpdate) -> PromptTemplate:
        """
        更新 Prompt 範本

        可以更新 name 和 content

        Args:
            template_id: 範本 ID
            data: 更新資料

        Returns:
            PromptTemplate: 更新後的範本物件

        Raises:
            HTTPException: 404 如果範本不存在
            HTTPException: 409 如果名稱重複
            HTTPException: 422 如果 Prompt 內容驗證失敗
        """
        template = self.db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "error": {
                        "code": "PROMPT_TEMPLATE_NOT_FOUND",
                        "message": "Prompt 範本不存在",
                    },
                },
            )

        # 檢查名稱重複（如果要更新名稱）
        if data.name and data.name != template.name:
            existing = (
                self.db.query(PromptTemplate).filter(PromptTemplate.name == data.name).first()
            )

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "success": False,
                        "error": {
                            "code": "PROMPT_TEMPLATE_NAME_EXISTS",
                            "message": "Prompt 範本名稱已存在",
                        },
                    },
                )

        # 驗證 Prompt 內容（如果要更新內容）
        if data.content and not self._validate_prompt_content(data.content):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Prompt 內容必須包含 {{content}} 佔位符",
                    },
                },
            )

        # 更新欄位
        if data.name:
            template.name = data.name
        if data.content:
            template.content = data.content

        template.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(template)

        return template

    def delete_template(self, template_id: str) -> None:
        """
        刪除 Prompt 範本

        1. 檢查是否為預設範本（不可刪除）
        2. 檢查是否有專案使用

        Args:
            template_id: 範本 ID

        Raises:
            HTTPException: 404 如果範本不存在
            HTTPException: 403 如果是預設範本
            HTTPException: 409 如果範本正在使用
        """
        template = self.db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "error": {
                        "code": "PROMPT_TEMPLATE_NOT_FOUND",
                        "message": "Prompt 範本不存在",
                    },
                },
            )

        # 檢查是否為預設範本
        if template.is_default:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "success": False,
                    "error": {
                        "code": "DEFAULT_TEMPLATE_PROTECTED",
                        "message": "預設範本無法刪除",
                    },
                },
            )

        # 檢查是否有專案使用此範本
        projects_count = (
            self.db.query(Project).filter(Project.prompt_template_id == template_id).count()
        )

        if projects_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "success": False,
                    "error": {
                        "code": "PROMPT_TEMPLATE_IN_USE",
                        "message": "Prompt 範本正在使用中,無法刪除",
                        "details": {"projects_count": projects_count},
                    },
                },
            )

        self.db.delete(template)
        self.db.commit()

    def _validate_prompt_content(self, content: str) -> bool:
        """
        驗證 Prompt 內容格式

        必須包含 {{content}} 佔位符

        Args:
            content: Prompt 內容

        Returns:
            bool: 是否有效
        """
        return "{{content}}" in content
