"""Add batch_task_id and error_message to projects

Revision ID: 002
Revises: 001
Create Date: 2025-10-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add batch_task_id and error_message columns to projects table."""
    
    # Add error_message column
    op.add_column(
        "projects",
        sa.Column("error_message", sa.String(length=500), nullable=True)
    )
    
    # Add batch_task_id column with foreign key
    op.add_column(
        "projects",
        sa.Column("batch_task_id", sa.String(), nullable=True)
    )
    
    # Create index on batch_task_id
    op.create_index(
        "idx_projects_batch_task_id",
        "projects",
        ["batch_task_id"]
    )
    
    # Create foreign key constraint
    op.create_foreign_key(
        "fk_projects_batch_task_id",
        "projects",
        "batch_tasks",
        ["batch_task_id"],
        ["id"],
        ondelete="SET NULL"
    )


def downgrade() -> None:
    """Remove batch_task_id and error_message columns from projects table."""
    
    # Drop foreign key constraint
    op.drop_constraint("fk_projects_batch_task_id", "projects", type_="foreignkey")
    
    # Drop index
    op.drop_index("idx_projects_batch_task_id", "projects")
    
    # Drop columns
    op.drop_column("projects", "batch_task_id")
    op.drop_column("projects", "error_message")
