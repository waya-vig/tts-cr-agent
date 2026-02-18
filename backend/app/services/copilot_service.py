"""Copilot chat service with RAG knowledge retrieval and DB persistence."""

import json
import logging
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.conversation import ChatMessage, Conversation
from app.models.global_knowledge import GlobalKnowledge
from app.models.knowledge_base import KnowledgeBase
from app.schemas.copilot import CopilotMessage, CopilotResponse
from app.services.ai_client import get_async_client, get_model_id

logger = logging.getLogger(__name__)


async def _retrieve_knowledge(
    user_id: uuid.UUID,
    query: str,
    db: AsyncSession,
    global_limit: int = 3,
    user_limit: int = 3,
) -> tuple[list[dict], list[dict]]:
    """Two-layer semantic knowledge retrieval via Pinecone.

    Searches both:
      1. Global namespace (admin-managed common knowledge)
      2. User namespace (per-user knowledge)

    Returns (global_knowledge, user_knowledge).
    Falls back to DB-based retrieval if vector search is unavailable.
    """
    if settings.pinecone_api_key:
        try:
            from app.services.embedding_service import generate_embedding
            from app.services.pinecone_service import query_both_namespaces

            query_embedding = await generate_embedding(query, input_type="search_query")
            global_matches, user_matches = await query_both_namespaces(
                embedding=query_embedding,
                user_id=user_id,
                global_top_k=global_limit,
                user_top_k=user_limit,
            )

            global_knowledge = await _matches_to_knowledge(
                global_matches, db, is_global=True
            )
            user_knowledge = await _matches_to_knowledge(
                user_matches, db, is_global=False
            )
            return global_knowledge, user_knowledge

        except Exception as e:
            logger.warning(f"Vector search failed, falling back to DB: {e}")

    # Fallback: DB-based retrieval (user knowledge only, no global table yet may be empty)
    global_knowledge = await _fallback_global_knowledge(db, global_limit)
    user_knowledge = await _fallback_user_knowledge(user_id, db, user_limit)
    return global_knowledge, user_knowledge


async def _matches_to_knowledge(
    matches: list[dict],
    db: AsyncSession,
    is_global: bool,
) -> list[dict]:
    """Convert Pinecone matches to knowledge dicts by fetching from DB."""
    if not matches:
        return []

    knowledge_ids = [uuid.UUID(m["id"]) for m in matches]
    model = GlobalKnowledge if is_global else KnowledgeBase

    result = await db.execute(
        select(model).where(model.id.in_(knowledge_ids))
    )
    entries = {str(e.id): e for e in result.scalars().all()}

    knowledge = []
    for match in matches:
        entry = entries.get(match["id"])
        if entry:
            item = {
                "title": entry.title,
                "content": entry.content,
                "source": "global" if is_global else "user",
            }
            if not is_global and hasattr(entry, "category") and entry.category:
                item["category"] = entry.category.value
            knowledge.append(item)
    return knowledge


async def _fallback_global_knowledge(db: AsyncSession, limit: int) -> list[dict]:
    """DB fallback for global knowledge."""
    result = await db.execute(
        select(GlobalKnowledge)
        .order_by(GlobalKnowledge.created_at.desc())
        .limit(limit)
    )
    return [
        {"title": e.title, "content": e.content, "source": "global"}
        for e in result.scalars().all()
    ]


async def _fallback_user_knowledge(
    user_id: uuid.UUID, db: AsyncSession, limit: int
) -> list[dict]:
    """DB fallback for user knowledge."""
    result = await db.execute(
        select(KnowledgeBase)
        .where(KnowledgeBase.user_id == user_id)
        .order_by(KnowledgeBase.performance_score.desc().nullslast())
        .limit(limit)
    )
    return [
        {
            "title": e.title,
            "content": e.content,
            "source": "user",
            "category": e.category.value if e.category else None,
        }
        for e in result.scalars().all()
    ]


def _build_system_prompt(
    global_knowledge: list[dict],
    user_knowledge: list[dict],
) -> str:
    base = """あなたはTikTok Shop運営をサポートするAIアシスタントです。
ユーザーの質問に対して、以下のナレッジを参考にしながら具体的で実用的なアドバイスを提供してください。

## TikTokクリエイティブ（CR）の大前提
TikTokのCRはブランドCMやMV風の映像ではない。以下の特徴を常に念頭に置くこと:
- UGC（ユーザー生成コンテンツ）感が最重要。スマホ撮影、自然光、生活感のあるリアルな映像
- 「広告っぽさ」は最大の敵。視聴者は広告と感じた瞬間にスワイプする
- 演者は「友達がおすすめしてくれてる」感覚。プロっぽい演出より素人感・リアル感
- 商品レビュー系は「実際に使ってみた」「買ってみた」のトーン
- 撮影は自宅・日常シーンが基本。スタジオ撮影やライティング機材は不要
- テロップは手作り感のあるフォント、ポップな色使い
- BGMはTikTokでトレンドの楽曲を使う
- 尺は15〜60秒が主流。長くても90秒以内
- 冒頭1〜2秒のフックが全て。ここで止まらなければ見てもらえない

回答のルール:
- 日本語で回答する
- 事実ベースで簡潔に回答する
- 「ご相談を受けています」のような架空の状況設定はしない
- CR（クリエイティブ）について聞かれた場合、上記のTikTokらしさを前提にアドバイスする。ブランドCM的な提案はしない
- ナレッジにない内容を聞かれた場合は、知っている範囲で回答し、わからないことは正直に伝える
- 箇条書きや見出しを活用して読みやすく整理する
- 見出しや箇条書きに絵文字（🔥✅💡📌🎯など）を積極的に使い、視覚的に読みやすくする
- 親しみやすいフレンドリーなトーンで話す"""

    if global_knowledge:
        base += "\n\n## 共通ナレッジ（TikTok運営ノウハウ）\n"
        for k in global_knowledge:
            base += f"\n### {k['title']}"
            base += f"\n{k['content']}\n"

    if user_knowledge:
        base += "\n\n## ユーザー独自ナレッジ\n"
        for k in user_knowledge:
            base += f"\n### {k['title']}"
            if k.get("category"):
                base += f" ({k['category']})"
            base += f"\n{k['content']}\n"

    return base


async def _get_or_create_conversation(
    user_id: uuid.UUID,
    conversation_id: str | None,
    first_message: str,
    db: AsyncSession,
) -> Conversation:
    """Get existing conversation or create a new one."""
    if conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == uuid.UUID(conversation_id),
                Conversation.user_id == user_id,
            )
        )
        conv = result.scalar_one_or_none()
        if conv:
            conv.updated_at = datetime.now(timezone.utc)
            return conv

    # Create new conversation with title from first message
    title = first_message[:30].strip()
    if len(first_message) > 30:
        title += "..."
    conv = Conversation(user_id=user_id, title=title)
    db.add(conv)
    await db.flush()
    return conv


async def _load_history(conversation_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    """Load message history from DB for a conversation."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at)
    )
    msgs = result.scalars().all()
    return [{"role": m.role, "content": m.content} for m in msgs]


async def _save_message(
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    sources: list[str] | None,
    db: AsyncSession,
) -> ChatMessage:
    """Save a single message to the DB."""
    msg = ChatMessage(
        conversation_id=conversation_id,
        role=role,
        content=content,
        sources=sources,
    )
    db.add(msg)
    await db.flush()
    return msg


async def chat_sync(
    user_id: uuid.UUID,
    message: str,
    history: list[CopilotMessage],
    db: AsyncSession,
    conversation_id: str | None = None,
) -> CopilotResponse:
    """Non-streaming chat completion with DB persistence."""
    global_knowledge, user_knowledge = await _retrieve_knowledge(user_id, message, db)

    # Get or create conversation
    conv = await _get_or_create_conversation(user_id, conversation_id, message, db)

    # Load history from DB if continuing a conversation
    if conversation_id:
        messages = await _load_history(conv.id, db)
    else:
        messages = [{"role": m.role, "content": m.content} for m in history]

    messages.append({"role": "user", "content": message})

    # Save user message
    await _save_message(conv.id, "user", message, None, db)

    client = get_async_client()
    response = await client.messages.create(
        model=get_model_id(),
        max_tokens=2048,
        system=_build_system_prompt(global_knowledge, user_knowledge),
        messages=messages,
    )

    reply = response.content[0].text
    all_knowledge = global_knowledge + user_knowledge
    sources = [k["title"] for k in all_knowledge]

    # Save assistant message
    await _save_message(conv.id, "assistant", reply, sources, db)

    return CopilotResponse(
        reply=reply,
        sources=sources,
        conversation_id=str(conv.id),
    )


async def chat_stream(
    user_id: uuid.UUID,
    message: str,
    history: list[CopilotMessage],
    db: AsyncSession,
    conversation_id: str | None = None,
) -> AsyncGenerator[str, None]:
    """Streaming chat using Server-Sent Events with DB persistence."""
    global_knowledge, user_knowledge = await _retrieve_knowledge(user_id, message, db)

    # Get or create conversation
    conv = await _get_or_create_conversation(user_id, conversation_id, message, db)

    # Load history from DB if continuing a conversation
    if conversation_id:
        messages = await _load_history(conv.id, db)
    else:
        messages = [{"role": m.role, "content": m.content} for m in history]

    messages.append({"role": "user", "content": message})

    # Save user message
    await _save_message(conv.id, "user", message, None, db)

    client = get_async_client()

    # Send conversation_id and sources first
    all_knowledge = global_knowledge + user_knowledge
    sources = [k["title"] for k in all_knowledge]
    yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': str(conv.id)})}\n\n"
    yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

    assistant_content = ""
    async with client.messages.stream(
        model=get_model_id(),
        max_tokens=2048,
        system=_build_system_prompt(global_knowledge, user_knowledge),
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            assistant_content += text
            yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"

    # Save assistant message after streaming completes
    await _save_message(conv.id, "assistant", assistant_content, sources, db)

    yield f"data: {json.dumps({'type': 'done'})}\n\n"
