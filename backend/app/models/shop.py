import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Shop(Base):
    __tablename__ = "shops"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    shop_name: Mapped[str] = mapped_column(String(255), nullable=False)
    tts_shop_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    access_token_enc: Mapped[str | None] = mapped_column(String(1024))
    refresh_token_enc: Mapped[str | None] = mapped_column(String(1024))
    market: Mapped[str | None] = mapped_column(String(50))
    category: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="shops")
    cr_projects = relationship(
        "CRProject", back_populates="shop", cascade="all, delete-orphan"
    )
