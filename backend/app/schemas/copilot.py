from pydantic import BaseModel


class CopilotMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class CopilotRequest(BaseModel):
    message: str
    history: list[CopilotMessage] = []


class CopilotResponse(BaseModel):
    reply: str
    sources: list[str] = []
