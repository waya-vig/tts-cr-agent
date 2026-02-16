import uuid
from datetime import datetime

from pydantic import BaseModel


class ShopCreate(BaseModel):
    shop_name: str
    tts_shop_id: str | None = None
    market: str | None = None
    category: str | None = None


class ShopUpdate(BaseModel):
    shop_name: str | None = None
    tts_shop_id: str | None = None
    market: str | None = None
    category: str | None = None
    is_active: bool | None = None


class ShopResponse(BaseModel):
    id: uuid.UUID
    shop_name: str
    tts_shop_id: str | None
    market: str | None
    category: str | None
    is_active: bool
    connected_at: datetime

    model_config = {"from_attributes": True}
