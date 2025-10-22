"""
ProjectService - Project management business logic
"""
import os
import shutil
from datetime import datetime, timezone

from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.core.exceptions import (
    InvalidProjectStatusException,
    ProjectNotFoundException,
    ValidationException,
)
from app.models.project import Project, ProjectStatus
from app.models.prompt_template import PromptTemplate
from app.schemas.project import (
    GenerateResponse,
    ProjectConfigurationUpdate,
    ProjectCreate,
    ProjectListItem,
    ProjectListQuery,
    ProjectListResponse,
    ProjectResponse,
    PromptModelUpdate,
    ResultResponse,
    YouTubeSettingsUpdate,
)


class ProjectService:
    """Project management service"""

    def __init__(self, db: Session):
        self.db = db

    def create_project(self, data: ProjectCreate) -> ProjectResponse:
        """Create new project"""
        # 1. Validate text length
        content_length = len(data.content)
        if content_length < 500 or content_length > 10000:
            raise ValidationException(
                message="Content length must be between 500-10000 characters",
                details={
                    "current_length": content_length,
                    "required_range": "500-10000",
                },
            )

        # 2. Validate prompt template exists (if provided)
        if data.prompt_template_id:
            prompt_template = (
                self.db.query(PromptTemplate)
                .filter(PromptTemplate.id == str(data.prompt_template_id))
                .first()
            )
            if not prompt_template:
                raise ValidationException(
                    message=f"Prompt template '{data.prompt_template_id}' not found"
                )

        # 3. Validate Gemini model
        valid_models = ["gemini-1.5-pro", "gemini-1.5-flash"]
        if data.gemini_model not in valid_models:
            raise ValidationException(
                message=f"Invalid Gemini model, valid values: {', '.join(valid_models)}"
            )

        # 4. Create project record
        project = Project(
            name=data.name,
            content=data.content,
            status=ProjectStatus.INITIALIZED,
            prompt_template_id=str(data.prompt_template_id) if data.prompt_template_id else None,
            gemini_model=data.gemini_model,
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)

        # 5. Create project directory
        project_dir = f"/tmp/projects/{project.id}"
        os.makedirs(project_dir, exist_ok=True)

        return ProjectResponse.model_validate(project)

    def list_projects(self, query: ProjectListQuery) -> ProjectListResponse:
        """List projects"""
        # Base query
        db_query = self.db.query(Project)

        # Status filter
        if query.status and query.status != "all":
            db_query = db_query.filter(Project.status == query.status.upper())

        # Total count
        total = db_query.count()

        # Sorting
        sort_column = getattr(Project, query.sort_by)
        if query.order == "desc":
            db_query = db_query.order_by(desc(sort_column))
        else:
            db_query = db_query.order_by(asc(sort_column))

        # Pagination
        projects = db_query.limit(query.limit).offset(query.offset).all()

        # Convert to list items
        project_items = []
        for p in projects:
            youtube_url = None
            if p.youtube_video_id:
                youtube_url = f"https://youtube.com/watch?v={p.youtube_video_id}"

            item = ProjectListItem(
                id=p.id,
                name=p.name,
                status=p.status.value,
                created_at=p.created_at,
                updated_at=p.updated_at,
                youtube_url=youtube_url,
            )
            project_items.append(item.model_dump())

        return ProjectListResponse(
            success=True,
            data={
                "projects": project_items,
                "total": total,
                "limit": query.limit,
                "offset": query.offset,
            },
        )

    def get_project(self, project_id: str) -> ProjectResponse:
        """Get single project"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)
        return ProjectResponse.model_validate(project)

    def update_configuration(
        self, project_id: str, data: ProjectConfigurationUpdate
    ) -> None:
        """Update visual configuration"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        project.configuration = data.model_dump(exclude_none=True)
        project.updated_at = datetime.now(timezone.utc)
        self.db.commit()

    def update_prompt_model(self, project_id: str, data: PromptModelUpdate) -> None:
        """Update Prompt and model"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        # Validate prompt template exists
        prompt_template = (
            self.db.query(PromptTemplate)
            .filter(PromptTemplate.id == str(data.prompt_template_id))
            .first()
        )
        if not prompt_template:
            raise ValidationException(
                message=f"Prompt template '{data.prompt_template_id}' not found"
            )

        project.prompt_template_id = str(data.prompt_template_id)
        project.gemini_model = data.gemini_model
        project.updated_at = datetime.now(timezone.utc)
        self.db.commit()

    def update_youtube_settings(
        self, project_id: str, data: YouTubeSettingsUpdate
    ) -> None:
        """Update YouTube settings"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        project.youtube_settings = data.model_dump()
        project.updated_at = datetime.now(timezone.utc)
        self.db.commit()

    def start_generation(self, project_id: str) -> GenerateResponse:
        """Start video generation"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        # Check status
        allowed_statuses = [
            ProjectStatus.INITIALIZED,
            ProjectStatus.FAILED,
            ProjectStatus.PAUSED,
        ]
        if project.status not in allowed_statuses:
            raise InvalidProjectStatusException(
                current_status=project.status.value,
                allowed_statuses=[s.value for s in allowed_statuses],
                message=f"Project status is '{project.status.value}', cannot start generation",
            )

        # Update status
        project.status = ProjectStatus.SCRIPT_GENERATING
        project.updated_at = datetime.now(timezone.utc)
        self.db.commit()

        # TODO (Task-014): Start Celery task
        task_id = "mock-task-id"  # Temporary mock

        return GenerateResponse(
            success=True,
            data={
                "task_id": task_id,
                "status": project.status.value,
                "estimated_time": 1500,  # 25 minutes
            },
        )

    def cancel_generation(self, project_id: str) -> None:
        """Cancel generation"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        # TODO (Task-014): Cancel Celery task

        project.status = ProjectStatus.FAILED
        project.updated_at = datetime.now(timezone.utc)
        self.db.commit()

    def pause_generation(self, project_id: str) -> None:
        """Pause generation"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        # TODO (Task-014): Pause Celery task

        project.status = ProjectStatus.PAUSED
        project.updated_at = datetime.now(timezone.utc)
        self.db.commit()

    def resume_generation(self, project_id: str) -> GenerateResponse:
        """Resume generation (resume from checkpoint)"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        if project.status != ProjectStatus.PAUSED:
            raise InvalidProjectStatusException(
                current_status=project.status.value,
                allowed_statuses=["PAUSED"],
                message="Only paused projects can be resumed",
            )

        # TODO (Task-014): Resume Celery task

        # Resume based on previous status
        project.status = ProjectStatus.SCRIPT_GENERATING
        project.updated_at = datetime.now(timezone.utc)
        self.db.commit()

        task_id = "mock-resume-task-id"

        return GenerateResponse(
            success=True,
            data={
                "task_id": task_id,
                "status": project.status.value,
                "estimated_time": 1000,  # Estimated remaining time
            },
        )

    def get_result(self, project_id: str) -> ResultResponse:
        """Get generation result"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        if project.status != ProjectStatus.COMPLETED:
            raise InvalidProjectStatusException(
                current_status=project.status.value,
                allowed_statuses=["COMPLETED"],
                message="Only completed projects can view results",
            )

        # Get file paths
        project_dir = f"/tmp/projects/{project_id}"
        video_path = f"{project_dir}/final_video.mp4"
        thumbnail_path = f"{project_dir}/thumbnail.jpg"

        # Build YouTube URL
        youtube_url = None
        if project.youtube_video_id:
            youtube_url = f"https://youtube.com/watch?v={project.youtube_video_id}"

        # Extract YouTube settings
        youtube_title = None
        youtube_description = None
        youtube_tags = []
        privacy = None
        publish_type = None
        published_at = None
        scheduled_date = None

        if project.youtube_settings:
            youtube_title = project.youtube_settings.get("title")
            youtube_description = project.youtube_settings.get("description")
            youtube_tags = project.youtube_settings.get("tags", [])
            privacy = project.youtube_settings.get("privacy")
            publish_type = project.youtube_settings.get("publish_type")
            scheduled_date = project.youtube_settings.get("scheduled_date")

        # Determine local video URL for private videos
        local_video_url = None
        if privacy == "private" and os.path.exists(video_path):
            local_video_url = f"/api/v1/projects/{project_id}/download/video"

        return ResultResponse(
            success=True,
            data={
                "id": project.id,
                "project_name": project.name,
                "youtube_url": youtube_url,
                "youtube_video_id": project.youtube_video_id,
                "youtube_title": youtube_title,
                "youtube_description": youtube_description,
                "youtube_tags": youtube_tags,
                "privacy": privacy,
                "publish_type": publish_type,
                "published_at": published_at,
                "scheduled_date": scheduled_date,
                "status": "completed",
                "local_video_url": local_video_url,
            },
        )

    def delete_project(self, project_id: str, delete_files: bool = True) -> None:
        """Delete project"""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ProjectNotFoundException(project_id)

        # Delete files
        if delete_files:
            project_dir = f"/tmp/projects/{project_id}"
            if os.path.exists(project_dir):
                shutil.rmtree(project_dir)

        # Delete database record (cascade will automatically delete assets)
        self.db.delete(project)
        self.db.commit()
