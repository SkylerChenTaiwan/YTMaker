"""Add missing configuration_id and error_info to projects

Revision ID: 003
Revises: 002
Create Date: 2025-10-20

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers
revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add configuration_id and error_info columns to projects table."""

    # Add configuration_id column with foreign key
    op.add_column(
        "projects",
        sa.Column("configuration_id", sa.String(), nullable=True)
    )

    # Create foreign key constraint
    op.create_foreign_key(
        "fk_projects_configuration_id",
        "projects",
        "configurations",
        ["configuration_id"],
        ["id"],
        ondelete="SET NULL"
    )

    # Add error_info column (JSON field)
    op.add_column(
        "projects",
        sa.Column("error_info", sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    """Remove configuration_id and error_info columns from projects table."""

    # Drop foreign key constraint
    op.drop_constraint("fk_projects_configuration_id", "projects", type_="foreignkey")

    # Drop columns
    op.drop_column("projects", "configuration_id")
    op.drop_column("projects", "error_info")
