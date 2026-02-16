import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.cr_project import CRProject, ProjectStatus
from app.models.shop import Shop
from app.models.user import User
from app.schemas.cr_project import CRGenerateRequest, CRGenerateResponse, CRProjectResponse
from app.services.cr_generator import generate_cr

router = APIRouter(prefix="/cr", tags=["cr"])


@router.get("/projects", response_model=list[CRProjectResponse])
async def list_projects(
    shop_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CRProject]:
    """List CR projects for the current user's shops."""
    query = (
        select(CRProject)
        .join(Shop)
        .where(Shop.user_id == current_user.id)
    )
    if shop_id:
        query = query.where(CRProject.shop_id == shop_id)

    query = query.offset(skip).limit(limit).order_by(CRProject.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/projects/{project_id}", response_model=CRProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CRProject:
    """Get a specific CR project."""
    result = await db.execute(
        select(CRProject)
        .join(Shop)
        .where(CRProject.id == project_id, Shop.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.post("/generate", response_model=CRGenerateResponse)
async def generate_creative(
    req: CRGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Generate a creative brief using Claude AI."""
    # Verify the shop belongs to this user
    result = await db.execute(
        select(Shop).where(Shop.id == req.shop_id, Shop.user_id == current_user.id)
    )
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found")

    # Create project record
    project = CRProject(
        shop_id=req.shop_id,
        product_name=req.product_name,
        product_url=req.product_url,
        purpose=req.purpose,
        duration=req.duration,
        tone=req.tone,
        reference_videos=req.reference_videos,
        additional_instructions=req.additional_instructions,
        status=ProjectStatus.GENERATING,
    )
    db.add(project)
    await db.flush()

    try:
        ai_output = await generate_cr(
            product_name=req.product_name,
            purpose=req.purpose.value if req.purpose else "sales",
            duration=req.duration.value if req.duration else "30s",
            tone=req.tone,
            additional_instructions=req.additional_instructions,
            reference_videos=req.reference_videos,
        )

        project.ai_output = ai_output
        project.status = ProjectStatus.GENERATED
        await db.flush()
        await db.refresh(project)

        return {
            "project_id": project.id,
            "status": project.status,
            "ai_output": ai_output,
        }
    except Exception as e:
        project.status = ProjectStatus.DRAFT
        project.ai_output = {"error": str(e)}
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI generation failed: {str(e)}",
        )


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a CR project."""
    result = await db.execute(
        select(CRProject)
        .join(Shop)
        .where(CRProject.id == project_id, Shop.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    await db.delete(project)
