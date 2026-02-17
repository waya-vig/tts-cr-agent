from datetime import datetime

from pydantic import BaseModel


class CopilotMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class CopilotRequest(BaseModel):
    message: str
    history: list[CopilotMessage] = []
    conversation_id: str | None = None  # existing conversation to continue


class CopilotResponse(BaseModel):
    reply: str
    sources: list[str] = []
    conversation_id: str  # saved conversation ID


class ConversationSummary(BaseModel):
    id: str
    title: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: str
    title: str
    messages: list[CopilotMessage]
    created_at: datetime

    model_config = {"from_attributes": True}
