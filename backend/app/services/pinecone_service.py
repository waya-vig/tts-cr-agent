"""Pinecone vector database service for knowledge base RAG.

Supports two namespaces:
  - "global"       : Admin-managed common knowledge for all users
  - str(user_id)   : Per-user knowledge
"""

import logging
import uuid

from pinecone import Pinecone, ServerlessSpec

from app.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_DIMENSION = 1024
INDEX_METRIC = "cosine"
GLOBAL_NAMESPACE = "global"

# Module-level singletons
_pc: Pinecone | None = None
_index_host: str | None = None


def _get_pinecone_client() -> Pinecone:
    global _pc
    if _pc is None:
        _pc = Pinecone(api_key=settings.pinecone_api_key)
    return _pc


async def ensure_index() -> str:
    """Ensure the Pinecone index exists and return its host.

    Called once at application startup.
    """
    global _index_host
    if _index_host:
        return _index_host

    pc = _get_pinecone_client()
    index_name = settings.pinecone_index_name

    existing = pc.list_indexes()
    if index_name not in [idx.name for idx in existing]:
        logger.info(f"Creating Pinecone index: {index_name}")
        pc.create_index(
            name=index_name,
            dimension=EMBEDDING_DIMENSION,
            metric=INDEX_METRIC,
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        # Wait for ready
        import time
        while not pc.describe_index(index_name).status.ready:
            time.sleep(1)
        logger.info(f"Pinecone index {index_name} ready")

    _index_host = pc.describe_index(index_name).host
    return _index_host


# ── Per-user vector operations ──────────────────────────────────────


async def upsert_vector(
    vector_id: str,
    embedding: list[float],
    user_id: uuid.UUID,
    metadata: dict,
) -> None:
    """Upsert a single vector to Pinecone.

    Uses user_id as the namespace for multi-tenant isolation.
    """
    pc = _get_pinecone_client()
    host = await ensure_index()

    async with pc.IndexAsyncio(host=host) as idx:
        await idx.upsert(
            vectors=[{
                "id": vector_id,
                "values": embedding,
                "metadata": metadata,
            }],
            namespace=str(user_id),
        )


async def query_vectors(
    embedding: list[float],
    user_id: uuid.UUID,
    top_k: int = 5,
) -> list[dict]:
    """Query Pinecone for similar vectors in the user namespace.

    Returns list of matches with id, score, and metadata.
    """
    pc = _get_pinecone_client()
    host = await ensure_index()

    async with pc.IndexAsyncio(host=host) as idx:
        result = await idx.query(
            vector=embedding,
            top_k=top_k,
            namespace=str(user_id),
            include_metadata=True,
        )

    return [
        {
            "id": match.id,
            "score": match.score,
            "metadata": match.metadata,
        }
        for match in result.matches
    ]


async def delete_vector(vector_id: str, user_id: uuid.UUID) -> None:
    """Delete a single vector from Pinecone."""
    pc = _get_pinecone_client()
    host = await ensure_index()

    async with pc.IndexAsyncio(host=host) as idx:
        await idx.delete(ids=[vector_id], namespace=str(user_id))


# ── Global (admin) vector operations ───────────────────────────────


async def upsert_global_vector(
    vector_id: str,
    embedding: list[float],
    metadata: dict,
) -> None:
    """Upsert a vector to the global (admin) namespace."""
    pc = _get_pinecone_client()
    host = await ensure_index()

    async with pc.IndexAsyncio(host=host) as idx:
        await idx.upsert(
            vectors=[{
                "id": vector_id,
                "values": embedding,
                "metadata": metadata,
            }],
            namespace=GLOBAL_NAMESPACE,
        )


async def query_global_vectors(
    embedding: list[float],
    top_k: int = 5,
) -> list[dict]:
    """Query the global namespace for similar vectors.

    Returns list of matches with id, score, and metadata.
    """
    pc = _get_pinecone_client()
    host = await ensure_index()

    async with pc.IndexAsyncio(host=host) as idx:
        result = await idx.query(
            vector=embedding,
            top_k=top_k,
            namespace=GLOBAL_NAMESPACE,
            include_metadata=True,
        )

    return [
        {
            "id": match.id,
            "score": match.score,
            "metadata": match.metadata,
        }
        for match in result.matches
    ]


async def delete_global_vector(vector_id: str) -> None:
    """Delete a vector from the global namespace."""
    pc = _get_pinecone_client()
    host = await ensure_index()

    async with pc.IndexAsyncio(host=host) as idx:
        await idx.delete(ids=[vector_id], namespace=GLOBAL_NAMESPACE)


async def query_both_namespaces(
    embedding: list[float],
    user_id: uuid.UUID,
    global_top_k: int = 3,
    user_top_k: int = 3,
) -> tuple[list[dict], list[dict]]:
    """Query both global and user namespaces in parallel.

    Returns (global_matches, user_matches).
    Each match dict has keys: id, score, metadata.
    """
    import asyncio

    global_task = query_global_vectors(embedding, top_k=global_top_k)
    user_task = query_vectors(embedding, user_id, top_k=user_top_k)

    global_matches, user_matches = await asyncio.gather(
        global_task, user_task, return_exceptions=True
    )

    # Handle failures gracefully
    if isinstance(global_matches, Exception):
        logger.warning(f"Global namespace query failed: {global_matches}")
        global_matches = []
    if isinstance(user_matches, Exception):
        logger.warning(f"User namespace query failed: {user_matches}")
        user_matches = []

    return global_matches, user_matches
