"""add tiktok oauth fields to users

Revision ID: a1b2c3d4e5f6
Revises: c3ddb00d3089
Create Date: 2026-03-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "c3ddb00d3089"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("tiktok_open_id", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("tiktok_display_name", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("tiktok_avatar_url", sa.String(1024), nullable=True))
    op.create_index("ix_users_tiktok_open_id", "users", ["tiktok_open_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_tiktok_open_id", table_name="users")
    op.drop_column("users", "tiktok_avatar_url")
    op.drop_column("users", "tiktok_display_name")
    op.drop_column("users", "tiktok_open_id")
