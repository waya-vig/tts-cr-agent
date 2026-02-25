"""FastMoss API routes for TikTok Shop analytics.

Endpoints:
  - GET /fastmoss/products          — Product search/ranking
  - GET /fastmoss/products/{id}/videos — Product related videos
  - GET /fastmoss/creators/ranking   — Top e-commerce creator ranking
  - GET /fastmoss/image-proxy       — Proxy images from s.500fd.com
"""

import httpx
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.core.auth import get_current_user
from app.models.user import User
from app.services import fastmoss_service

router = APIRouter(prefix="/fastmoss", tags=["fastmoss"])


@router.get("/products")
async def search_products(
    region: str = Query(default="JP", description="Country code (JP, US, GB, etc.)"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    keywords: str = Query(default="", description="Search keywords"),
    sort_by: str = Query(
        default="day7_units_sold",
        description="day7_units_sold | day7_gmv | total_units_sold | total_gmv | commission_rate | creator_count",
    ),
    current_user: User = Depends(get_current_user),
):
    """Search/rank products on TikTok Shop."""
    return await fastmoss_service.search_products(
        region=region,
        page=page,
        page_size=page_size,
        keywords=keywords,
        sort_by=sort_by,
    )


@router.get("/products/{product_id}/videos")
async def get_product_videos(
    product_id: str,
    date_type: int = Query(default=7, ge=1, le=28, description="Number of days (max 28)"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    """Get related TikTok videos for a product."""
    return await fastmoss_service.get_product_videos(
        product_id=product_id,
        date_type=date_type,
        page=page,
        page_size=page_size,
    )


@router.get("/creators/ranking")
async def get_creator_ranking(
    region: str = Query(default="JP", description="Country code"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    date_type: str = Query(default="day", description="day | week | month"),
    date_value: str = Query(default="", description="e.g. 2025-02-01"),
    current_user: User = Depends(get_current_user),
):
    """Get top e-commerce creator rankings by GMV."""
    return await fastmoss_service.get_top_ecommerce_creators(
        region=region,
        page=page,
        page_size=page_size,
        date_type=date_type,
        date_value=date_value,
    )


@router.get("/image-proxy")
async def image_proxy(
    url: str = Query(..., description="Image URL to proxy"),
):
    """Proxy product images from FastMoss CDN to avoid referrer blocking."""
    # Only allow proxying from known FastMoss image domains
    allowed_hosts = ["s.500fd.com", "p16-oec-va.ibyteimg.com"]
    from urllib.parse import urlparse

    parsed = urlparse(url)
    if parsed.hostname not in allowed_hosts:
        return Response(status_code=403, content="Domain not allowed")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Referer": "https://www.fastmoss.com/",
                    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
                },
            )
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "image/jpeg")
                return Response(
                    content=resp.content,
                    media_type=content_type,
                    headers={"Cache-Control": "public, max-age=86400"},
                )
            return Response(status_code=resp.status_code, content="Image fetch failed")
    except Exception:
        return Response(status_code=502, content="Image proxy error")
