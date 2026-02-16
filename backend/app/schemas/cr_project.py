import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.cr_project import ProjectDuration, ProjectPurpose, ProjectStatus


class CRProjectCreate(BaseModel):
    shop_id: uuid.UUID
    product_name: str
    product_url: str | None = None
    purpose: ProjectPurpose | None = None
    duration: ProjectDuration | None = None
    tone: str | None = None
    reference_videos: list[str] | None = None
    additional_instructions: str | None = None


class CRProjectResponse(BaseModel):
    id: uuid.UUID
    shop_id: uuid.UUID
    product_name: str
    product_url: str | None
    purpose: ProjectPurpose | None
    duration: ProjectDuration | None
    tone: str | None
    reference_videos: list[str] | None
    additional_instructions: str | None
    ai_output: dict | None
    status: ProjectStatus
    performance_data: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CRGenerateRequest(BaseModel):
    shop_id: uuid.UUID
    product_name: str
    product_url: str | None = None
    purpose: ProjectPurpose = ProjectPurpose.SALES
    duration: ProjectDuration = ProjectDuration.MEDIUM_30S
    tone: str | None = None
    reference_videos: list[str] | None = None
    additional_instructions: str | None = None


class CRGenerateResponse(BaseModel):
    project_id: uuid.UUID
    status: ProjectStatus
    ai_output: dict
