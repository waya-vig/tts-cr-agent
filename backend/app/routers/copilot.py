from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.copilot import CopilotRequest, CopilotResponse
from app.services.copilot_service import chat_stream, chat_sync

router = APIRouter(prefix="/copilot", tags=["copilot"])


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
        ),
        media_type="text/event-stream",
    )
