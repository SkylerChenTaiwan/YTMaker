import uuid
from datetime import datetime
from typing import List
from sqlalchemy import desc
from sqlalchemy.orm import Session
from app.core.exceptions import AppException, ConflictException
from app.models.configuration import Configuration
from app.models.project import Project
from app.schemas.configuration import ConfigurationCreate, ConfigurationUpdate
from app.validators.config_validator import validate_configuration_data


class ConfigurationService:
    def __init__(self, db: Session):
        self.db = db

    def list_configurations(self) -> List[Configuration]:
        return self.db.query(Configuration).order_by(desc(Configuration.last_used_at), desc(Configuration.created_at)).all()

    def create_configuration(self, data: ConfigurationCreate) -> Configuration:
        existing = self.db.query(Configuration).filter(Configuration.name == data.name).first()
        if existing:
            raise AppException(
                message="配置名稱已存在",
                error_code="CONFIGURATION_NAME_EXISTS",
                status_code=409,
                details={"field": "name", "value": data.name}
            )

        validation_errors = validate_configuration_data(data.configuration)
        if validation_errors:
            raise AppException(
                message="配置資料驗證失敗",
                error_code="VALIDATION_ERROR",
                status_code=422,
                details={"errors": validation_errors}
            )

        configuration = Configuration(id=str(uuid.uuid4()), name=data.name, configuration=data.configuration, usage_count=0, last_used_at=None)
        self.db.add(configuration)
        self.db.commit()
        self.db.refresh(configuration)
        return configuration

    def get_configuration(self, configuration_id: str) -> Configuration:
        configuration = self.db.query(Configuration).filter(Configuration.id == configuration_id).first()
        if not configuration:
            raise AppException(
                message="配置不存在",
                error_code="CONFIGURATION_NOT_FOUND",
                status_code=404,
                details={"configuration_id": configuration_id}
            )

        configuration.usage_count += 1
        configuration.last_used_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(configuration)
        return configuration

    def update_configuration(self, configuration_id: str, data: ConfigurationUpdate) -> Configuration:
        configuration = self.db.query(Configuration).filter(Configuration.id == configuration_id).first()
        if not configuration:
            raise AppException(
                message="配置不存在",
                error_code="CONFIGURATION_NOT_FOUND",
                status_code=404
            )

        if data.name and data.name != configuration.name:
            existing = self.db.query(Configuration).filter(Configuration.name == data.name).first()
            if existing:
                raise AppException(
                    message="配置名稱已存在",
                    error_code="CONFIGURATION_NAME_EXISTS",
                    status_code=409
                )

        if data.configuration:
            validation_errors = validate_configuration_data(data.configuration)
            if validation_errors:
                raise AppException(
                    message="配置資料驗證失敗",
                    error_code="VALIDATION_ERROR",
                    status_code=422,
                    details={"errors": validation_errors}
                )

        if data.name:
            configuration.name = data.name
        if data.configuration:
            configuration.configuration = data.configuration
        configuration.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(configuration)
        return configuration

    def delete_configuration(self, configuration_id: str) -> None:
        configuration = self.db.query(Configuration).filter(Configuration.id == configuration_id).first()
        if not configuration:
            raise AppException(
                message="配置不存在",
                error_code="CONFIGURATION_NOT_FOUND",
                status_code=404
            )

        # Note: Project.configuration is a JSON field, not a foreign key
        # So we can't check if a configuration is in use via database constraints
        # This could be enhanced later by searching JSON content if needed

        self.db.delete(configuration)
        self.db.commit()
