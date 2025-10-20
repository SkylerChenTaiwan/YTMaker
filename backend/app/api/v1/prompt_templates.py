from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.prompt_template import PromptTemplateCreate, PromptTemplateDetail, PromptTemplateUpdate
from app.services.prompt_template_service import PromptTemplateService

router = APIRouter(prefix="/prompt-templates", tags=["prompt-templates"])


@router.get("", status_code=status.HTTP_200_OK)
async def list_prompt_templates(db: Session = Depends(get_db)):
    """列出所有 Prompt 範本"""
    service = PromptTemplateService(db)
    templates = service.list_templates()
    items = [PromptTemplateDetail.model_validate(template) for template in templates]
    return {"success": True, "data": {"templates": items}}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_prompt_template(data: PromptTemplateCreate, db: Session = Depends(get_db)):
    """建立新的 Prompt 範本"""
    service = PromptTemplateService(db)
    template = service.create_template(data)
    return {"success": True, "data": {"id": template.id, "name": template.name, "message": "Prompt 範本已建立"}}


@router.get("/{template_id}", status_code=status.HTTP_200_OK)
async def get_prompt_template(template_id: str, db: Session = Depends(get_db)):
    """取得單一 Prompt 範本"""
    service = PromptTemplateService(db)
    template = service.get_template(template_id)
    detail = PromptTemplateDetail.model_validate(template)
    return {"success": True, "data": detail}


@router.put("/{template_id}", status_code=status.HTTP_200_OK)
async def update_prompt_template(template_id: str, data: PromptTemplateUpdate, db: Session = Depends(get_db)):
    """更新 Prompt 範本"""
    service = PromptTemplateService(db)
    template = service.update_template(template_id, data)
    return {"success": True, "data": {"id": template.id, "name": template.name, "message": "Prompt 範本已更新"}}


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt_template(template_id: str, db: Session = Depends(get_db)):
    """刪除 Prompt 範本"""
    service = PromptTemplateService(db)
    service.delete_template(template_id)
    return None
