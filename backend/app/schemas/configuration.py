"""
Configuration schemas for request/response validation.

Pydantic models for:
- ConfigurationCreate: 建立配置請求
- ConfigurationUpdate: 更新配置請求
- ConfigurationListItem: 配置列表項目（不含完整 configuration）
- ConfigurationDetail: 配置詳細資料（含完整 configuration）
- SubtitleConfig, LogoConfig, OverlayElement: 配置內容的子結構
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class SubtitleConfig(BaseModel):
    """字幕配置 schema"""

    font_family: str = Field(..., description="字體名稱")
    font_size: int = Field(..., ge=20, le=100, description="字體大小 (20-100)")
    font_color: str = Field(..., description="字體顏色 #RRGGBB 格式")
    position: str = Field(..., description="位置 (top/center/bottom)")
    border_enabled: bool = Field(default=False, description="是否顯示邊框")
    border_color: Optional[str] = Field(default=None, description="邊框顏色")
    border_width: Optional[int] = Field(default=None, ge=1, le=10, description="邊框寬度")
    shadow_enabled: bool = Field(default=False, description="是否顯示陰影")
    shadow_color: Optional[str] = Field(default=None, description="陰影顏色")
    shadow_offset_x: Optional[int] = Field(default=None, ge=-20, le=20, description="陰影 X 偏移")
    shadow_offset_y: Optional[int] = Field(default=None, ge=-20, le=20, description="陰影 Y 偏移")

    @field_validator("font_color", "border_color", "shadow_color")
    @classmethod
    def validate_color_format(cls, v: Optional[str]) -> Optional[str]:
        """驗證顏色格式為 #RRGGBB"""
        if v is None:
            return v
        if not v.startswith("#") or len(v) != 7:
            raise ValueError("顏色格式必須為 #RRGGBB")
        # 驗證是否為有效的十六進位
        try:
            int(v[1:], 16)
        except ValueError:
            raise ValueError("顏色格式必須為 #RRGGBB")
        return v


class LogoConfig(BaseModel):
    """Logo 配置 schema"""

    logo_file: Optional[str] = Field(default=None, description="Logo 檔案路徑")
    logo_x: int = Field(..., ge=0, le=1920, description="X 座標 (0-1920)")
    logo_y: int = Field(..., ge=0, le=1080, description="Y 座標 (0-1080)")
    logo_size: int = Field(..., ge=10, le=200, description="Logo 大小 (10-200)")
    logo_opacity: int = Field(..., ge=0, le=100, description="透明度 (0-100)")


class OverlayElement(BaseModel):
    """疊加元素 schema"""

    type: str = Field(..., description="元素類型 (text/shape/image)")
    x: int = Field(..., ge=0, le=1920, description="X 座標")
    y: int = Field(..., ge=0, le=1080, description="Y 座標")
    width: Optional[int] = Field(default=None, ge=1, le=1920, description="寬度")
    height: Optional[int] = Field(default=None, ge=1, le=1080, description="高度")
    content: Optional[str] = Field(default=None, description="內容")
    style: Optional[Dict[str, Any]] = Field(default=None, description="樣式")


class ConfigurationData(BaseModel):
    """配置資料的完整 schema（用於驗證）"""

    subtitle: SubtitleConfig
    logo: LogoConfig
    overlay_elements: List[OverlayElement] = Field(default_factory=list)


class ConfigurationCreate(BaseModel):
    """建立配置的請求 schema"""

    name: str = Field(..., min_length=1, max_length=200, description="配置名稱")
    configuration: Dict[str, Any] = Field(..., description="配置內容")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "預設配置",
                "configuration": {
                    "subtitle": {
                        "font_family": "Arial",
                        "font_size": 48,
                        "font_color": "#FFFFFF",
                        "position": "bottom",
                        "border_enabled": True,
                        "border_color": "#000000",
                        "border_width": 2,
                    },
                    "logo": {
                        "logo_file": None,
                        "logo_x": 50,
                        "logo_y": 50,
                        "logo_size": 100,
                        "logo_opacity": 80,
                    },
                    "overlay_elements": [],
                },
            }
        }


class ConfigurationUpdate(BaseModel):
    """更新配置的請求 schema"""

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    configuration: Optional[Dict[str, Any]] = Field(default=None)


class ConfigurationListItem(BaseModel):
    """配置列表項目 schema（不含完整 configuration）"""

    id: str
    name: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    usage_count: int

    class Config:
        from_attributes = True


class ConfigurationDetail(BaseModel):
    """配置詳細資料 schema（含完整 configuration）"""

    id: str
    name: str
    configuration: Dict[str, Any]
    created_at: datetime
    last_used_at: Optional[datetime] = None
    usage_count: int

    class Config:
        from_attributes = True
