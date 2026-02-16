"""Copilot chat service with RAG-like knowledge retrieval."""

import json
import uuid
from collections.abc import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge_base import KnowledgeBase
from app.services.ai_client import get_async_client, get_model_id
from app.schemas.copilot import CopilotMessage, CopilotResponse


async def _retrieve_knowledge(
    user_id: uuid.UUID,
    query: str,
    db: AsyncSession,
    limit: int = 5,
) -> list[dict]:
    """Simple keyword-based knowledge retrieval.

    TODO: Replace with Pinecone vector search when integrated.
    """
    result = await db.execute(
        select(KnowledgeBase)
        .where(KnowledgeBase.user_id == user_id)
        .order_by(KnowledgeBase.performance_score.desc().nullslast())
        .limit(limit)
    )
    entries = result.scalars().all()
    return [
        {"title": e.title, "content": e.content, "category": e.category.value if e.category else None}
        for e in entries
    ]


def _build_system_prompt(knowledge: list[dict]) -> str:
    base = """あなたはTikTok Shopセラー向けのAIアシスタント「TTS CR Agent Copilot」です。
セラーの質問に対して、クリエイティブ制作・市場分析・TikTok Shop運営に関するアドバイスを提供してください。
日本語で回答してください。"""

    if knowledge:
        base += "\n\n## 参考ナレッジベース\n"
        for k in knowledge:
            base += f"\n### {k['title']}"
            if k.get("category"):
                base += f" ({k['category']})"
            base += f"\n{k['content']}\n"

    return base


async def chat_sync(
    user_id: uuid.UUID,
    message: str,
    history: list[CopilotMessage],
    db: AsyncSession,
) -> CopilotResponse:
    """Non-streaming chat completion."""
    knowledge = await _retrieve_knowledge(user_id, message, db)

    messages = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": message})

    client = get_async_client()
    response = await client.messages.create(
        model=get_model_id(),
        max_tokens=2048,
        system=_build_system_prompt(knowledge),
        messages=messages,
    )

    return CopilotResponse(
        reply=response.content[0].text,
        sources=[k["title"] for k in knowledge],
    )


async def chat_stream(
    user_id: uuid.UUID,
    message: str,
    history: list[CopilotMessage],
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    """Streaming chat using Server-Sent Events."""
    knowledge = await _retrieve_knowledge(user_id, message, db)

    messages = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": message})

    client = get_async_client()

    # Send sources first
    sources = [k["title"] for k in knowledge]
    yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

    async with client.messages.stream(
        model=get_model_id(),
        max_tokens=2048,
        system=_build_system_prompt(knowledge),
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"
