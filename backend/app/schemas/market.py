import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.trend_product import DataSource


class TrendProductResponse(BaseModel):
    id: uuid.UUID
    product_name: str
    category: str | None
    sold_count: int | None
    revenue: float | None
    growth_rate: float | None
    competition_score: float | None
    top_video_url: str | None
    video_script: str | None
    source: DataSource | None
    market: str | None
    fetched_at: datetime

    model_config = {"from_attributes": True}


class HiddenGemResponse(BaseModel):
    """Hidden gem = high growth, low competition."""
    id: uuid.UUID
    product_name: str
    category: str | None
    sold_count: int | None
    revenue: float | None
    growth_rate: float | None
    competition_score: float | None
    market: str | None

    model_config = {"from_attributes": True}
