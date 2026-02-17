"""Admin router for managing global knowledge base (RAG common layer).

Global knowledge is admin-managed and available to ALL users via AI chat.
Protected by admin email check.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.global_knowledge import GlobalKnowledge
from app.models.user import User
from app.schemas.admin_knowledge import (
    GlobalKnowledgeCreate,
    GlobalKnowledgeResponse,
    GlobalKnowledgeUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/knowledge", tags=["admin-knowledge"])


def _check_admin(user: User) -> None:
    """Raise 403 if user is not an admin."""
    if user.email not in settings.admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )


async def _embed_and_upsert_global(entry: GlobalKnowledge) -> None:
    """Generate embedding and upsert to Pinecone global namespace."""
    if not settings.pinecone_api_key:
        return
    try:
        from app.services.embedding_service import generate_embedding
        from app.services.pinecone_service import upsert_global_vector

        text = f"{entry.title}\n{entry.content}"
        embedding = await generate_embedding(text, input_type="search_document")
        metadata = {"title": entry.title, "global_knowledge_id": str(entry.id)}
        if entry.source:
            metadata["source"] = entry.source
        await upsert_global_vector(
            vector_id=str(entry.id),
            embedding=embedding,
            metadata=metadata,
        )
        entry.pinecone_id = str(entry.id)
    except Exception as e:
        logger.error(f"Global embedding/upsert failed for entry {entry.id}: {e}")


@router.get("/", response_model=list[GlobalKnowledgeResponse])
async def list_global_knowledge(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[GlobalKnowledge]:
    """List all global knowledge entries (admin only)."""
    _check_admin(current_user)
    query = (
        select(GlobalKnowledge)
        .offset(skip)
        .limit(limit)
        .order_by(GlobalKnowledge.created_at.desc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/", response_model=GlobalKnowledgeResponse, status_code=status.HTTP_201_CREATED)
async def create_global_knowledge(
    entry_in: GlobalKnowledgeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GlobalKnowledge:
    """Create a new global knowledge entry (admin only)."""
    _check_admin(current_user)

    entry = GlobalKnowledge(
        title=entry_in.title,
        content=entry_in.content,
        source=entry_in.source,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    # Generate embedding and store in Pinecone global namespace
    await _embed_and_upsert_global(entry)
    await db.flush()
    await db.refresh(entry)

    return entry


@router.get("/{entry_id}", response_model=GlobalKnowledgeResponse)
async def get_global_knowledge(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GlobalKnowledge:
    """Get a specific global knowledge entry (admin only)."""
    _check_admin(current_user)
    result = await db.execute(
        select(GlobalKnowledge).where(GlobalKnowledge.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return entry


@router.patch("/{entry_id}", response_model=GlobalKnowledgeResponse)
async def update_global_knowledge(
    entry_id: uuid.UUID,
    entry_in: GlobalKnowledgeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GlobalKnowledge:
    """Update a global knowledge entry (admin only)."""
    _check_admin(current_user)
    result = await db.execute(
        select(GlobalKnowledge).where(GlobalKnowledge.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    update_data = entry_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    # Re-embed if title or content changed
    if "title" in update_data or "content" in update_data:
        await _embed_and_upsert_global(entry)

    await db.flush()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_global_knowledge(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a global knowledge entry (admin only)."""
    _check_admin(current_user)
    result = await db.execute(
        select(GlobalKnowledge).where(GlobalKnowledge.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    # Delete from Pinecone
    if entry.pinecone_id and settings.pinecone_api_key:
        try:
            from app.services.pinecone_service import delete_global_vector

            await delete_global_vector(entry.pinecone_id)
        except Exception as e:
            logger.error(f"Pinecone global delete failed for {entry.pinecone_id}: {e}")

    await db.delete(entry)
