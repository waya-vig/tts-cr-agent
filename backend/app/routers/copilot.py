import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.conversation import ChatMessage, Conversation
from app.models.user import User
from app.schemas.copilot import (
    ConversationDetail,
    ConversationSummary,
    CopilotMessage,
    CopilotRequest,
    CopilotResponse,
)
from app.services.copilot_service import chat_stream, chat_sync

router = APIRouter(prefix="/copilot", tags=["copilot"])


# ── Conversation CRUD ─────────────────────────────────────


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationSummary]:
    """List all conversations for the current user (newest first)."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    convs = result.scalars().all()
    return [
        ConversationSummary(
            id=str(c.id),
            title=c.title,
            updated_at=c.updated_at,
        )
        for c in convs
    ]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetail:
    """Get a conversation with all its messages."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == uuid.UUID(conversation_id),
            Conversation.user_id == current_user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conv.id)
        .order_by(ChatMessage.created_at)
    )
    msgs = msg_result.scalars().all()

    return ConversationDetail(
        id=str(conv.id),
        title=conv.title,
        messages=[CopilotMessage(role=m.role, content=m.content) for m in msgs],
        created_at=conv.created_at,
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a conversation and all its messages."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == uuid.UUID(conversation_id),
            Conversation.user_id == current_user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    await db.delete(conv)


# ── Chat Endpoints ─────────────────────────────────────


@router.post("/chat", response_model=CopilotResponse)
async def chat(
    req: CopilotRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CopilotResponse:
    """Non-streaming copilot chat."""
    return await chat_sync(
        user_id=current_user.id,
        message=req.message,
        history=req.history,
        db=db,
        conversation_id=req.conversation_id,
    )


@router.post("/chat/stream")
async def chat_streaming(
    req: CopilotRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Streaming copilot chat using Server-Sent Events."""
    return StreamingResponse(
        chat_stream(
            user_id=current_user.id,
            message=req.message,
            history=req.history,
            db=db,
            conversation_id=req.conversation_id,
        ),
        media_type="text/event-stream",
    )
