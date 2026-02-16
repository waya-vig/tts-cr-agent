import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProjectPurpose(str, enum.Enum):
    SALES = "sales"
    AWARENESS = "awareness"
    REVIEW = "review"


class ProjectDuration(str, enum.Enum):
    SHORT_15S = "15s"
    MEDIUM_30S = "30s"
    LONG_60S = "60s"


class ProjectStatus(str, enum.Enum):
    DRAFT = "draft"
    GENERATING = "generating"
    GENERATED = "generated"
    FILMING = "filming"
    PUBLISHED = "published"


class CRProject(Base):
    __tablename__ = "cr_projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    shop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shops.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_name: Mapped[str] = mapped_column(String(500), nullable=False)
    product_url: Mapped[str | None] = mapped_column(String(2048))
    purpose: Mapped[ProjectPurpose | None] = mapped_column(Enum(ProjectPurpose))
    duration: Mapped[ProjectDuration | None] = mapped_column(Enum(ProjectDuration))
    tone: Mapped[str | None] = mapped_column(String(100))
    reference_videos: Mapped[dict | None] = mapped_column(JSONB)
    additional_instructions: Mapped[str | None] = mapped_column(Text)
    ai_output: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.DRAFT, nullable=False
    )
    performance_data: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    shop = relationship("Shop", back_populates="cr_projects")
