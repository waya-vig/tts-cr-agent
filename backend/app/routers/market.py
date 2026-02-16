from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.trend_product import TrendProduct
from app.models.user import User
from app.schemas.market import HiddenGemResponse, TrendProductResponse

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/trends", response_model=list[TrendProductResponse])
async def list_trends(
    market: str | None = None,
    category: str | None = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TrendProduct]:
    """List trending products."""
    query = select(TrendProduct)

    if market:
        query = query.where(TrendProduct.market == market)
    if category:
        query = query.where(TrendProduct.category == category)

    query = query.offset(skip).limit(limit).order_by(TrendProduct.revenue.desc().nullslast())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/hidden-gems", response_model=list[HiddenGemResponse])
async def list_hidden_gems(
    market: str | None = None,
    min_growth_rate: float = Query(default=0.1, description="Minimum growth rate threshold"),
    max_competition: float = Query(default=0.5, description="Maximum competition score"),
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TrendProduct]:
    """Find hidden gem products: high growth + low competition."""
    query = (
        select(TrendProduct)
        .where(
            TrendProduct.growth_rate >= min_growth_rate,
            TrendProduct.competition_score <= max_competition,
        )
    )

    if market:
        query = query.where(TrendProduct.market == market)

    query = query.offset(skip).limit(limit).order_by(TrendProduct.growth_rate.desc())
    result = await db.execute(query)
    return list(result.scalars().all())
