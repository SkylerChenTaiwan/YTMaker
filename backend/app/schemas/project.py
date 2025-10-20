from typing import Optional
from pydantic import BaseModel

# Placeholder schemas for projects
class ProjectCreate(BaseModel):
    pass

class ProjectListQuery(BaseModel):
    limit: int = 20
    offset: int = 0
    sort_by: str = "updated_at"
    order: str = "desc"
    status: Optional[str] = None

class ProjectResponse(BaseModel):
    pass

class ProjectListResponse(BaseModel):
    pass

class MessageResponse(BaseModel):
    success: bool
    message: str

class ProjectConfigurationUpdate(BaseModel):
    pass

class PromptModelUpdate(BaseModel):
    pass

class YouTubeSettingsUpdate(BaseModel):
    pass

class GenerateResponse(BaseModel):
    pass

class ResultResponse(BaseModel):
    pass
