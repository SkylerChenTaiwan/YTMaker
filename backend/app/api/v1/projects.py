"""
Projects API endpoints
"""
from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.project import (
    GenerateResponse,
    MessageResponse,
    ProjectConfigurationUpdate,
    ProjectCreate,
    ProjectListQuery,
    ProjectListResponse,
    ProjectResponse,
    PromptModelUpdate,
    ResultResponse,
    YouTubeSettingsUpdate,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


# ===== 1. 專案 CRUD =====


@router.get("", response_model=ProjectListResponse)
def list_projects(
    limit: int = Query(20, ge=1, le=100, description="每頁筆數"),
    offset: int = Query(0, ge=0, description="偏移量"),
    sort_by: str = Query("updated_at", pattern="^(created_at|updated_at|name)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    status: Optional[str] = Query(None, description="狀態篩選"),
    db: Session = Depends(get_db),
):
    """
    列出所有專案

    支援功能:
    - 分頁 (limit, offset)
    - 排序 (sort_by, order)
    - 篩選 (status)
    """
    service = ProjectService(db)
    query_params = ProjectListQuery(
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        order=order,
        status=status,
    )
    return service.list_projects(query_params)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
):
    """
    建立新專案

    驗證:
    - 文字長度 500-10000 字
    - Prompt 範本存在 (如果有提供)
    - Gemini 模型有效
    """
    service = ProjectService(db)
    return service.create_project(data)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """取得單一專案詳細資訊"""
    service = ProjectService(db)
    return service.get_project(project_id)


@router.delete("/{project_id}", response_model=MessageResponse)
def delete_project(
    project_id: str = Path(..., description="專案 ID"),
    delete_files: bool = Query(True, description="是否刪除本地檔案"),
    db: Session = Depends(get_db),
):
    """
    刪除專案及相關檔案

    - 刪除資料庫記錄 (projects, assets)
    - 可選刪除本地檔案
    """
    service = ProjectService(db)
    service.delete_project(project_id, delete_files=delete_files)
    return MessageResponse(success=True, message="專案已刪除")


# ===== 2. 配置與設定 =====


@router.put("/{project_id}/configuration", response_model=MessageResponse)
def update_configuration(
    data: ProjectConfigurationUpdate,
    project_id: str = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """更新專案的視覺化配置"""
    service = ProjectService(db)
    service.update_configuration(project_id, data)
    return MessageResponse(success=True, message="配置已更新")


@router.put("/{project_id}/prompt-model", response_model=MessageResponse)
def update_prompt_model(
    data: PromptModelUpdate,
    project_id: str = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """更新 Prompt 範本與 Gemini 模型"""
    service = ProjectService(db)
    service.update_prompt_model(project_id, data)
    return MessageResponse(success=True, message="Prompt 與模型設定已更新")


@router.put("/{project_id}/youtube-settings", response_model=MessageResponse)
def update_youtube_settings(
    data: YouTubeSettingsUpdate,
    project_id: str = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """更新 YouTube 上傳設定"""
    service = ProjectService(db)
    service.update_youtube_settings(project_id, data)
    return MessageResponse(success=True, message="YouTube 設定已更新")


# ===== 3. 生成控制 =====


@router.post("/{project_id}/generate", response_model=GenerateResponse)
def start_generation(
    project_id: str = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """
    開始生成影片

    狀態檢查:
    - 只有 INITIALIZED, FAILED, PAUSED 狀態可開始
    - 其他狀態回傳 409 Conflict
    """
    service = ProjectService(db)
    return service.start_generation(project_id)


@router.post("/{project_id}/cancel", response_model=MessageResponse)
def cancel_generation(
    project_id: str = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """取消生成"""
    service = ProjectService(db)
    service.cancel_generation(project_id)
    return MessageResponse(success=True, message="已取消生成")


@router.post("/{project_id}/pause", response_model=MessageResponse)
def pause_generation(
    project_id: str = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """暫停生成"""
    service = ProjectService(db)
    service.pause_generation(project_id)
    return MessageResponse(success=True, message="已暫停生成")


@router.post("/{project_id}/resume", response_model=GenerateResponse)
def resume_generation(
    project_id: str = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """恢復生成(斷點續傳)"""
    service = ProjectService(db)
    return service.resume_generation(project_id)


# ===== 4. 結果查詢 =====


@router.get("/{project_id}/result", response_model=ResultResponse)
def get_result(
    project_id: str = Path(..., description="專案 ID"),
    db: Session = Depends(get_db),
):
    """取得生成結果 (YouTube URL, 本地檔案)"""
    service = ProjectService(db)
    return service.get_result(project_id)
