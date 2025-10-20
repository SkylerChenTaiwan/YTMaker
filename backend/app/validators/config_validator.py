"""Configuration data validator."""
from typing import Any, Dict, List
from pydantic import ValidationError
from app.schemas.configuration import ConfigurationData


def validate_configuration_data(config_data: Dict[str, Any]) -> List[Dict[str, str]]:
    """驗證配置資料格式,使用 Pydantic schema 進行驗證。

    Returns:
        List[Dict]: 驗證錯誤列表,空列表表示驗證通過
    """
    errors = []
    try:
        ConfigurationData(**config_data)
    except ValidationError as e:
        for error in e.errors():
            field_path = ".".join(str(loc) for loc in error["loc"])
            errors.append({"field": f"configuration.{field_path}", "message": error["msg"]})
    return errors
