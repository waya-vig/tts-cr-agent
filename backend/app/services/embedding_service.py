"""Embedding generation service using Amazon Bedrock (Cohere Embed Multilingual v3)."""

import asyncio
import json
import logging

import boto3

from app.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_DIMENSION = 1024

# Module-level boto3 client singleton
_bedrock_client = None


def _get_bedrock_client():
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
    return _bedrock_client


def _invoke_embedding_sync(text: str, input_type: str) -> list[float]:
    """Synchronous Bedrock embedding call."""
    client = _get_bedrock_client()
    body = json.dumps({
        "texts": [text],
        "input_type": input_type,
        "truncate": "END",
    })
    response = client.invoke_model(
        modelId=settings.bedrock_embedding_model_id,
        body=body,
        contentType="application/json",
        accept="application/json",
    )
    result = json.loads(response["body"].read())
    return result["embeddings"][0]


async def generate_embedding(
    text: str,
    input_type: str = "search_document",
) -> list[float]:
    """Generate an embedding vector for the given text.

    Args:
        text: The text to embed.
        input_type: "search_document" for indexing, "search_query" for querying.

    Returns:
        1024-dimensional embedding vector.
    """
    return await asyncio.to_thread(_invoke_embedding_sync, text, input_type)
