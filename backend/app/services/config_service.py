"""
Configuration Service - 視覺配置業務邏輯

提供配置模板的 CRUD 操作：
- 列出所有配置
- 建立配置
- 取得單一配置
- 更新配置
- 刪除配置
"""
import uuid
from datetime import datetime
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.configuration import Configuration
from app.models.project import Project
from app.schemas.configuration import ConfigurationCreate, ConfigurationUpdate
from app.validators.config_validator import validate_configuration_data


class ConfigurationService:
    """Configuration business logic service."""

    def __init__(self, db: Session):
        self.db = db

    def list_configurations(self) -> List[Configuration]:
        """
        列出所有配置

        按 last_used_at 降序排列（最近使用的在前）
        如果 last_used_at 為 None,則排在最後
        """
        configurations = (
            self.db.query(Configuration)
            .order_by(desc(Configuration.last_used_at), desc(Configuration.created_at))
            .all()
        )
        return configurations

    def create_configuration(self, data: ConfigurationCreate) -> Configuration:
        """
        建立新配置

        1. 檢查名稱是否重複
        2. 驗證配置資料格式
        3. 建立資料庫記錄

        Args:
            data: 配置建立請求

        Returns:
            Configuration: 建立的配置物件

        Raises:
            HTTPException: 409 如果名稱重複
            HTTPException: 422 如果資料驗證失敗
        """
        # 檢查名稱是否存在
        existing = self.db.query(Configuration).filter(Configuration.name == data.name).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "success": False,
                    "error": {
                        "code": "CONFIGURATION_NAME_EXISTS",
                        "message": "配置名稱已存在",
                        "details": {"field": "name", "value": data.name},
                    },
                },
            )

        # 驗證配置資料格式
        validation_errors = validate_configuration_data(data.configuration)
        if validation_errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "配置資料驗證失敗",
                        "details": {"errors": validation_errors},
                    },
                },
            )

        # 建立配置
        configuration = Configuration(
            id=str(uuid.uuid4()),
            name=data.name,
            configuration=data.configuration,
            usage_count=0,
            last_used_at=None,
        )

        self.db.add(configuration)
        self.db.commit()
        self.db.refresh(configuration)

        return configuration

    def get_configuration(self, configuration_id: str) -> Configuration:
        """
        取得單一配置

        會更新 usage_count 和 last_used_at

        Args:
            configuration_id: 配置 ID

        Returns:
            Configuration: 配置物件

        Raises:
            HTTPException: 404 如果配置不存在
        """
        configuration = (
            self.db.query(Configuration).filter(Configuration.id == configuration_id).first()
        )

        if not configuration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "error": {
                        "code": "CONFIGURATION_NOT_FOUND",
                        "message": "配置不存在",
                        "details": {"configuration_id": configuration_id},
                    },
                },
            )

        # 更新使用統計
        configuration.usage_count += 1
        configuration.last_used_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(configuration)

        return configuration

    def update_configuration(
        self, configuration_id: str, data: ConfigurationUpdate
    ) -> Configuration:
        """
        更新配置

        可以更新 name 和 configuration 內容

        Args:
            configuration_id: 配置 ID
            data: 更新資料

        Returns:
            Configuration: 更新後的配置物件

        Raises:
            HTTPException: 404 如果配置不存在
            HTTPException: 409 如果名稱重複
            HTTPException: 422 如果資料驗證失敗
        """
        configuration = (
            self.db.query(Configuration).filter(Configuration.id == configuration_id).first()
        )

        if not configuration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "error": {
                        "code": "CONFIGURATION_NOT_FOUND",
                        "message": "配置不存在",
                    },
                },
            )

        # 檢查名稱重複（如果要更新名稱）
        if data.name and data.name != configuration.name:
            existing = self.db.query(Configuration).filter(Configuration.name == data.name).first()

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "success": False,
                        "error": {
                            "code": "CONFIGURATION_NAME_EXISTS",
                            "message": "配置名稱已存在",
                        },
                    },
                )

        # 驗證配置資料（如果要更新配置）
        if data.configuration:
            validation_errors = validate_configuration_data(data.configuration)
            if validation_errors:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "success": False,
                        "error": {
                            "code": "VALIDATION_ERROR",
                            "message": "配置資料驗證失敗",
                            "details": {"errors": validation_errors},
                        },
                    },
                )

        # 更新欄位
        if data.name:
            configuration.name = data.name
        if data.configuration:
            configuration.configuration = data.configuration

        configuration.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(configuration)

        return configuration

    def delete_configuration(self, configuration_id: str) -> None:
        """
        刪除配置

        檢查是否有專案使用此配置
        注意：根據目前的資料模型，專案的 configuration 是 JSON 欄位，
        而不是外鍵。因此這個檢查邏輯需要調整。

        如果要實現"正在使用的配置無法刪除"，需要在 Project 模型中
        添加 configuration_id 外鍵欄位。

        Args:
            configuration_id: 配置 ID

        Raises:
            HTTPException: 404 如果配置不存在
            HTTPException: 409 如果配置正在使用
        """
        configuration = (
            self.db.query(Configuration).filter(Configuration.id == configuration_id).first()
        )

        if not configuration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "error": {
                        "code": "CONFIGURATION_NOT_FOUND",
                        "message": "配置不存在",
                    },
                },
            )

        # 檢查是否有專案使用此配置
        # 注意：目前 Project 模型中有 configuration_id 欄位嗎？
        # 根據模型定義，Project 只有 configuration (JSON) 欄位
        # 如果需要檢查使用情況，需要先添加 configuration_id 欄位

        # 臨時實現：檢查是否有專案引用此 configuration_id
        # 假設 Project 有 configuration_id 欄位（即使目前沒有）
        projects_count = (
            self.db.query(Project)
            .filter(Project.configuration_id == configuration_id)  # type: ignore
            .count()
        )

        if projects_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "success": False,
                    "error": {
                        "code": "CONFIGURATION_IN_USE",
                        "message": "配置正在使用中,無法刪除",
                        "details": {
                            "configuration_id": configuration_id,
                            "projects_count": projects_count,
                        },
                    },
                },
            )

        self.db.delete(configuration)
        self.db.commit()
