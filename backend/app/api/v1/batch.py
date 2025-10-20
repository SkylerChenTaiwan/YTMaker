"""
Batch Task API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.batch import BatchTaskCreate
from app.schemas.common import MessageResponse
from app.services.batch_service import BatchService

router = APIRouter(prefix="/batch", tags=["batch"])


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_batch_task(
    data: BatchTaskCreate,
    db: Session = Depends(get_db),
):
    """
    建立批次任務

    - **name**: 批次任務名稱
    - **projects**: 專案列表（至少 1 個）
    - **configuration_id**: 視覺配置 ID（選填）
    - **prompt_template_id**: Prompt 範本 ID（選填）
    - **gemini_model**: Gemini 模型名稱
    - **youtube_settings**: YouTube 設定（選填）
    """
    batch_service = BatchService(db)
    result = await batch_service.create_batch_task(data)
    return result


@router.get("", response_model=dict)
async def list_batch_tasks(
    db: Session = Depends(get_db),
):
    """
    取得所有批次任務列表

    按建立時間降序排列
    """
    batch_service = BatchService(db)
    result = await batch_service.list_batch_tasks()
    return result


@router.get("/{batch_id}", response_model=dict)
async def get_batch_task(
    batch_id: str = Path(..., description="批次任務 ID"),
    db: Session = Depends(get_db),
):
    """
    取得批次任務詳情

    包含所有專案的狀態和進度
    """
    batch_service = BatchService(db)
    result = await batch_service.get_batch_task(batch_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {"code": "BATCH_NOT_FOUND", "message": "批次任務不存在"},
            },
        )

    return result


@router.post("/{batch_id}/pause", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def pause_batch_task(
    batch_id: str = Path(..., description="批次任務 ID"),
    db: Session = Depends(get_db),
):
    """
    暫停批次任務

    停止處理新的專案，但不影響正在執行的專案
    """
    batch_service = BatchService(db)
    result = await batch_service.pause_batch_task(batch_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {"code": "BATCH_NOT_FOUND", "message": "批次任務不存在"},
            },
        )

    return MessageResponse(success=True, message="批次任務已暫停")


@router.post("/{batch_id}/resume", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def resume_batch_task(
    batch_id: str = Path(..., description="批次任務 ID"),
    db: Session = Depends(get_db),
):
    """
    恢復批次任務

    繼續處理剩餘的專案
    """
    batch_service = BatchService(db)
    result = await batch_service.resume_batch_task(batch_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {"code": "BATCH_NOT_FOUND", "message": "批次任務不存在"},
            },
        )

    return MessageResponse(success=True, message="批次任務已恢復")
