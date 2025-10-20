
from pydantic import BaseModel, Field


class APIQuota(BaseModel):
    """API 配額資訊"""

    used: int = Field(..., description="已使用量")
    total: int = Field(..., description="總配額")
    unit: str = Field(..., description="單位（minutes, units 等）")


class StatsData(BaseModel):
    """統計資料"""

    total_projects: int = Field(..., description="總專案數")
    projects_this_month: int = Field(..., description="本月生成數")
    scheduled_projects: int = Field(..., description="已排程影片數")
    api_quotas: dict[str, APIQuota] = Field(..., description="API 配額資訊")


class StatsResponse(BaseModel):
    """統計資料回應"""

    success: bool = Field(True, description="請求是否成功")
    data: StatsData = Field(..., description="統計資料")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "total_projects": 50,
                    "projects_this_month": 10,
                    "scheduled_projects": 3,
                    "api_quotas": {
                        "did": {"used": 30, "total": 90, "unit": "minutes"},
                        "youtube": {"used": 2000, "total": 10000, "unit": "units"},
                    },
                },
            }
        }


class QuotaResponse(BaseModel):
    """配額資訊回應"""

    success: bool = Field(True, description="請求是否成功")
    data: dict[str, APIQuota] = Field(..., description="配額資訊")
