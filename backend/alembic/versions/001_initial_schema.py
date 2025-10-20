"""Initial schema

Revision ID: 001
Revises:
Create Date: 2025-10-19

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables and indexes."""

    # 1. Prompt Templates table (must be created before Projects)
    op.create_table(
        "prompt_templates",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("usage_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_prompt_templates_is_default", "prompt_templates", ["is_default"])

    # 2. Projects table
    op.create_table(
        "projects",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "INITIALIZED",
                "SCRIPT_GENERATING",
                "SCRIPT_GENERATED",
                "ASSETS_GENERATING",
                "ASSETS_GENERATED",
                "RENDERING",
                "RENDERED",
                "THUMBNAIL_GENERATING",
                "THUMBNAIL_GENERATED",
                "UPLOADING",
                "COMPLETED",
                "FAILED",
                "PAUSED",
                name="projectstatus",
            ),
            nullable=False,
        ),
        sa.Column("configuration", sa.JSON(), nullable=True),
        sa.Column("prompt_template_id", sa.String(), nullable=True),
        sa.Column("gemini_model", sa.String(length=50), nullable=False),
        sa.Column("youtube_settings", sa.JSON(), nullable=True),
        sa.Column("youtube_video_id", sa.String(length=50), nullable=True),
        sa.Column("script", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["prompt_template_id"],
            ["prompt_templates.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_projects_status", "projects", ["status"])
    op.create_index("idx_projects_created_at", "projects", ["created_at"])
    op.create_index("idx_projects_updated_at", "projects", ["updated_at"])

    # 3. Assets table
    op.create_table(
        "assets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "AUDIO",
                "IMAGE",
                "AVATAR_INTRO",
                "AVATAR_OUTRO",
                "THUMBNAIL",
                "FINAL_VIDEO",
                name="assettype",
            ),
            nullable=False,
        ),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "GENERATING", "COMPLETED", "FAILED", name="assetstatus"),
            nullable=False,
        ),
        sa.Column("segment_index", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_assets_project_id", "assets", ["project_id"])
    op.create_index("idx_assets_type", "assets", ["type"])

    # 4. Configurations table
    op.create_table(
        "configurations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("configuration", sa.JSON(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("usage_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_configurations_last_used_at", "configurations", ["last_used_at"])

    # 5. YouTube Accounts table
    op.create_table(
        "youtube_accounts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("channel_name", sa.String(length=200), nullable=False),
        sa.Column("channel_id", sa.String(length=100), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(), nullable=False),
        sa.Column("subscriber_count", sa.Integer(), nullable=False),
        sa.Column("is_authorized", sa.Boolean(), nullable=False),
        sa.Column("authorized_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("channel_id"),
    )
    op.create_index("idx_youtube_accounts_channel_id", "youtube_accounts", ["channel_id"])

    # 6. Batch Tasks table
    op.create_table(
        "batch_tasks",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("total_projects", sa.Integer(), nullable=False),
        sa.Column("completed_projects", sa.Integer(), nullable=False),
        sa.Column("failed_projects", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("QUEUED", "RUNNING", "COMPLETED", "FAILED", name="batchtaskstatus"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_batch_tasks_status", "batch_tasks", ["status"])
    op.create_index("idx_batch_tasks_created_at", "batch_tasks", ["created_at"])

    # 7. System Settings table
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table("system_settings")
    op.drop_table("batch_tasks")
    op.drop_table("youtube_accounts")
    op.drop_table("configurations")
    op.drop_table("assets")
    op.drop_table("projects")
    op.drop_table("prompt_templates")
