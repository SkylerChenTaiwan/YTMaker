from datetime import datetime, timezone
from typing import Any, Optional


class AppException(Exception):
    """基礎應用異常類別"""

    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 500,
        details: Optional[dict[str, Any]] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        self.timestamp = datetime.now(timezone.utc)
        super().__init__(self.message)


class ValidationException(AppException):
    """驗證錯誤異常"""

    def __init__(self, message: str = "請求資料驗證失敗", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="VALIDATION_ERROR", status_code=400, details=details
        )


class NotFoundException(AppException):
    """資源不存在異常"""

    def __init__(self, message: str = "請求的資源不存在", details: Optional[dict[str, Any]] = None):
        super().__init__(message=message, error_code="NOT_FOUND", status_code=404, details=details)


class ConflictException(AppException):
    """資源衝突異常"""

    def __init__(self, message: str = "資源衝突", details: Optional[dict[str, Any]] = None):
        super().__init__(message=message, error_code="CONFLICT", status_code=409, details=details)


class UnauthorizedException(AppException):
    """未授權異常"""

    def __init__(self, message: str = "未授權的請求", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="UNAUTHORIZED", status_code=401, details=details
        )


class QuotaExceededException(AppException):
    """配額超限異常"""

    def __init__(self, message: str = "API 配額已用盡", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="QUOTA_EXCEEDED", status_code=429, details=details
        )


# 業務特定異常


class ProjectNotFoundException(NotFoundException):
    """專案不存在"""

    def __init__(self, project_id: str):
        super().__init__(message="找不到指定的專案", details={"project_id": project_id})


class ProjectNotCompletedException(AppException):
    """專案尚未完成"""

    def __init__(self, project_id: str):
        super().__init__(
            message="專案尚未完成生成",
            error_code="PROJECT_NOT_COMPLETED",
            status_code=400,
            details={"project_id": project_id},
        )


class APIKeyInvalidException(UnauthorizedException):
    """API Key 無效"""

    def __init__(self, provider: str):
        super().__init__(message=f"{provider} API Key 無效或已過期", details={"provider": provider})


class ExternalAPIException(AppException):
    """外部 API 錯誤"""

    def __init__(self, provider: str, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=f"{provider} API 錯誤: {message}",
            error_code=f"{provider.upper()}_API_ERROR",
            status_code=500,
            details=details,
        )
