"""Add prompt_content to projects

Revision ID: 005
Revises: 004
Create Date: 2025-10-24

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers
revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add prompt_content column to projects table."""

    # Add prompt_content column (TEXT field)
    op.add_column(
        "projects",
        sa.Column("prompt_content", sa.Text(), nullable=True)
    )


def downgrade() -> None:
    """Remove prompt_content column from projects table."""

    # Drop column
    op.drop_column("projects", "prompt_content")
