import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.knowledge_base import KnowledgeCategory


class KnowledgeCreate(BaseModel):
    title: str
    content: str
    category: KnowledgeCategory | None = None
    source: str | None = None
    performance_score: float | None = None


class KnowledgeUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: KnowledgeCategory | None = None
    source: str | None = None
    performance_score: float | None = None


class KnowledgeResponse(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    category: KnowledgeCategory | None
    source: str | None
    performance_score: float | None
    pinecone_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
