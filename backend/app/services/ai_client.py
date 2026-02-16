"""Shared AI client factory for Anthropic / Bedrock."""

import anthropic

from app.config import settings


def get_async_client() -> anthropic.AsyncAnthropic | anthropic.AsyncAnthropicBedrock:
    """Return the appropriate async Anthropic client.

    If use_bedrock is True, returns AsyncAnthropicBedrock (AWS credits).
    Otherwise, returns AsyncAnthropic (direct API).
    """
    if settings.use_bedrock:
        return anthropic.AsyncAnthropicBedrock(
            aws_access_key=settings.aws_access_key_id,
            aws_secret_key=settings.aws_secret_access_key,
            aws_region=settings.aws_region,
        )
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


def get_model_id() -> str:
    """Return the appropriate model identifier."""
    if settings.use_bedrock:
        return settings.bedrock_model_id
    return "claude-sonnet-4-5-20250514"
