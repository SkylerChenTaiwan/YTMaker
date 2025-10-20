"""Add quota_usage table

Revision ID: 004
Revises: 003
Create Date: 2025-10-20
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """建立 quota_usage 表格"""
    op.create_table(
        'quota_usage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('service', sa.String(length=50), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('used_units', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('idx_service_date', 'service', 'date', unique=True),
    )
    op.create_index(op.f('ix_quota_usage_id'), 'quota_usage', ['id'], unique=False)
    op.create_index(op.f('ix_quota_usage_date'), 'quota_usage', ['date'], unique=False)


def downgrade() -> None:
    """移除 quota_usage 表格"""
    op.drop_index(op.f('ix_quota_usage_date'), table_name='quota_usage')
    op.drop_index(op.f('ix_quota_usage_id'), table_name='quota_usage')
    op.drop_table('quota_usage')
