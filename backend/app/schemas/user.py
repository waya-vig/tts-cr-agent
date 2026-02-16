import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.user import PlanType


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    company_name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    company_name: str | None
    plan: PlanType
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str | None = None
