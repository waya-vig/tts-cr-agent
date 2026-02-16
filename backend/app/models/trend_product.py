import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DataSource(str, enum.Enum):
    FASTMOSS = "fastmoss"
    TTS_API = "tts_api"


class TrendProduct(Base):
    __tablename__ = "trend_products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_name: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str | None] = mapped_column(String(255))
    sold_count: Mapped[int | None] = mapped_column(Integer)
    revenue: Mapped[float | None] = mapped_column(Float)
    growth_rate: Mapped[float | None] = mapped_column(Float)
    competition_score: Mapped[float | None] = mapped_column(Float)
    top_video_url: Mapped[str | None] = mapped_column(String(2048))
    video_script: Mapped[str | None] = mapped_column(Text)
    source: Mapped[DataSource | None] = mapped_column(Enum(DataSource))
    market: Mapped[str | None] = mapped_column(String(50))
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
