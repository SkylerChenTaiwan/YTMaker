from typing import Literal

from pydantic import BaseModel, Field


class APIKeyRequest(BaseModel):
    provider: Literal["gemini", "stability_ai", "did"]
    api_key: str = Field(..., min_length=10, description="API Key（至少 10 字元）")


class APIKeyTestRequest(BaseModel):
    provider: Literal["gemini", "stability_ai", "did"]


class InitStatusResponse(BaseModel):
    success: bool = True
    data: dict


class QuotaInfo(BaseModel):
    total: int
    used: int
    remaining: int
    unit: str
    reset_date: str


class QuotaResponse(BaseModel):
    success: bool = True
    data: dict[str, QuotaInfo]
