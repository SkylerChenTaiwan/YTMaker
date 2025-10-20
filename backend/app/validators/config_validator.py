"""
Configuration data validator.

驗證配置資料格式是否符合定義的 schema。
"""
from typing import Any, Dict, List

from pydantic import ValidationError

from app.schemas.configuration import ConfigurationData


def validate_configuration_data(config_data: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    驗證配置資料格式

    使用 Pydantic schema 進行驗證

    Args:
        config_data: 配置資料字典

    Returns:
        List[Dict]: 驗證錯誤列表，空列表表示驗證通過
            每個錯誤包含：
            - field: 欄位路徑
            - message: 錯誤訊息
    """
    errors = []

    try:
        # 使用 Pydantic schema 驗證
        ConfigurationData(**config_data)
    except ValidationError as e:
        # 轉換 Pydantic 錯誤為自訂格式
        for error in e.errors():
            field_path = ".".join(str(loc) for loc in error["loc"])
            errors.append({"field": f"configuration.{field_path}", "message": error["msg"]})

    return errors
