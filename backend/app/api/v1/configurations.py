from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.configuration import ConfigurationCreate, ConfigurationDetail, ConfigurationListItem, ConfigurationUpdate
from app.services.config_service import ConfigurationService

router = APIRouter(prefix="/configurations", tags=["configurations"])


@router.get("", status_code=status.HTTP_200_OK)
async def list_configurations(db: Session = Depends(get_db)):
    """列出所有視覺配置模板"""
    service = ConfigurationService(db)
    configurations = service.list_configurations()
    items = [ConfigurationListItem.model_validate(config) for config in configurations]
    return {"success": True, "data": {"configurations": items}}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_configuration(data: ConfigurationCreate, db: Session = Depends(get_db)):
    """建立新的視覺配置模板"""
    service = ConfigurationService(db)
    configuration = service.create_configuration(data)
    return {"success": True, "data": {"id": configuration.id, "name": configuration.name, "created_at": configuration.created_at, "message": "配置已建立"}}


@router.get("/{configuration_id}", status_code=status.HTTP_200_OK)
async def get_configuration(configuration_id: str, db: Session = Depends(get_db)):
    """取得單一配置的完整內容"""
    service = ConfigurationService(db)
    configuration = service.get_configuration(configuration_id)
    detail = ConfigurationDetail.model_validate(configuration)
    return {"success": True, "data": detail}


@router.put("/{configuration_id}", status_code=status.HTTP_200_OK)
async def update_configuration(configuration_id: str, data: ConfigurationUpdate, db: Session = Depends(get_db)):
    """更新配置"""
    service = ConfigurationService(db)
    configuration = service.update_configuration(configuration_id, data)
    return {"success": True, "data": {"id": configuration.id, "name": configuration.name, "message": "配置已更新"}}


@router.delete("/{configuration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_configuration(configuration_id: str, db: Session = Depends(get_db)):
    """刪除配置"""
    service = ConfigurationService(db)
    service.delete_configuration(configuration_id)
    return None
