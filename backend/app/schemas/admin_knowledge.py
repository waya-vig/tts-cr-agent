"""Schemas for admin-managed global knowledge base."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class GlobalKnowledgeCreate(BaseModel):
    title: str
    content: str
    source: str | None = None


class GlobalKnowledgeUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    source: str | None = None


class GlobalKnowledgeResponse(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    source: str | None
    pinecone_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
