from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class SubtitleConfig(BaseModel):
    font_family: str
    font_size: int = Field(ge=20, le=100)
    font_color: str
    position: str
    border_enabled: bool = False
    border_color: Optional[str] = None
    border_width: Optional[int] = Field(None, ge=1, le=10)

    @field_validator("font_color", "border_color")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        if v and (not v.startswith("#") or len(v) != 7):
            raise ValueError("顏色格式必須為 #RRGGBB")
        return v


class LogoConfig(BaseModel):
    logo_file: Optional[str] = None
    logo_x: int = Field(ge=0, le=1920)
    logo_y: int = Field(ge=0, le=1080)
    logo_size: int = Field(ge=10, le=200)
    logo_opacity: int = Field(ge=0, le=100)


class OverlayElement(BaseModel):
    type: str
    x: int = Field(ge=0, le=1920)
    y: int = Field(ge=0, le=1080)
    width: Optional[int] = None
    height: Optional[int] = None
    content: Optional[str] = None
    style: Optional[Dict[str, Any]] = None


class ConfigurationData(BaseModel):
    subtitle: SubtitleConfig
    logo: LogoConfig
    overlay_elements: List[OverlayElement] = Field(default_factory=list)


class ConfigurationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    configuration: Dict[str, Any]


class ConfigurationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    configuration: Optional[Dict[str, Any]] = None


class ConfigurationListItem(BaseModel):
    id: str
    name: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    usage_count: int

    class Config:
        from_attributes = True


class ConfigurationDetail(BaseModel):
    id: str
    name: str
    configuration: Dict[str, Any]
    created_at: datetime
    last_used_at: Optional[datetime] = None
    usage_count: int

    class Config:
        from_attributes = True
