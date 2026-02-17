import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User
from app.schemas.knowledge import KnowledgeCreate, KnowledgeResponse, KnowledgeUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


async def _embed_and_upsert(entry: KnowledgeBase, user_id: uuid.UUID) -> None:
    """Generate embedding and upsert to Pinecone. Fails silently."""
    if not settings.pinecone_api_key:
        return
    try:
        from app.services.embedding_service import generate_embedding
        from app.services.pinecone_service import upsert_vector

        text = f"{entry.title}\n{entry.content}"
        embedding = await generate_embedding(text, input_type="search_document")
        metadata = {"title": entry.title, "knowledge_id": str(entry.id)}
        if entry.category:
            metadata["category"] = entry.category.value
        await upsert_vector(
            vector_id=str(entry.id),
            embedding=embedding,
            user_id=user_id,
            metadata=metadata,
        )
        entry.pinecone_id = str(entry.id)
    except Exception as e:
        logger.error(f"Embedding/upsert failed for entry {entry.id}: {e}")


@router.get("/", response_model=list[KnowledgeResponse])
async def list_knowledge(
    category: str | None = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[KnowledgeBase]:
    """List knowledge base entries for the current user."""
    query = select(KnowledgeBase).where(KnowledgeBase.user_id == current_user.id)
    if category:
        query = query.where(KnowledgeBase.category == category)

    query = query.offset(skip).limit(limit).order_by(KnowledgeBase.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/", response_model=KnowledgeResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge(
    entry_in: KnowledgeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBase:
    """Create a new knowledge base entry."""
    entry = KnowledgeBase(
        user_id=current_user.id,
        title=entry_in.title,
        content=entry_in.content,
        category=entry_in.category,
        source=entry_in.source,
        performance_score=entry_in.performance_score,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    # Generate embedding and store in Pinecone
    await _embed_and_upsert(entry, current_user.id)
    await db.flush()
    await db.refresh(entry)

    return entry


@router.get("/{entry_id}", response_model=KnowledgeResponse)
async def get_knowledge(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBase:
    """Get a specific knowledge base entry."""
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == entry_id, KnowledgeBase.user_id == current_user.id
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return entry


@router.patch("/{entry_id}", response_model=KnowledgeResponse)
async def update_knowledge(
    entry_id: uuid.UUID,
    entry_in: KnowledgeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBase:
    """Update a knowledge base entry."""
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == entry_id, KnowledgeBase.user_id == current_user.id
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    update_data = entry_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    # Re-embed if title or content changed
    if "title" in update_data or "content" in update_data:
        await _embed_and_upsert(entry, current_user.id)

    await db.flush()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a knowledge base entry."""
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == entry_id, KnowledgeBase.user_id == current_user.id
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    # Delete from Pinecone
    if entry.pinecone_id and settings.pinecone_api_key:
        try:
            from app.services.pinecone_service import delete_vector

            await delete_vector(entry.pinecone_id, current_user.id)
        except Exception as e:
            logger.error(f"Pinecone delete failed for {entry.pinecone_id}: {e}")

    await db.delete(entry)
