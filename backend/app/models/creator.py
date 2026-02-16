import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CreatorSource(str, enum.Enum):
    FASTMOSS = "fastmoss"
    TTS_API = "tts_api"


class Creator(Base):
    __tablename__ = "creators"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tts_creator_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    followers: Mapped[int | None] = mapped_column(Integer)
    avg_views: Mapped[int | None] = mapped_column(Integer)
    categories: Mapped[dict | None] = mapped_column(JSONB)
    engagement_rate: Mapped[float | None] = mapped_column(Float)
    commission_rate: Mapped[float | None] = mapped_column(Float)
    past_products: Mapped[dict | None] = mapped_column(JSONB)
    source: Mapped[CreatorSource | None] = mapped_column(Enum(CreatorSource))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
