"""FastMoss Open API client for TikTok Shop analytics data.

Uses the official Open API at openapi.fastmoss.com with client_id/client_secret auth.
Falls back to the internal Web API (www.fastmoss.com/api/) when Open API credentials
are not configured.

Endpoints:
  - POST /product/v1/search     — Product search/ranking
  - POST /product/v1/video      — Product related videos
  - POST /creator/v1/rank/topEcommerce — Influencer sales ranking
"""

import hashlib
import json
import logging
import random
import time
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ---------- helpers ----------


def _safe_number(val: Any, default: int | float = 0) -> int | float:
    """Convert a value to a number, returning default for non-numeric values like '-'."""
    if val is None or val == "" or val == "-":
        return default
    try:
        # Strip trailing '%' if present (e.g. "5%", "12.5%")
        s = str(val).rstrip("%").strip()
        if not s:
            return default
        return float(s) if "." in s else int(s)
    except (ValueError, TypeError):
        return default


# ---------- HTTP client ----------

_http_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=15.0)
    return _http_client


# ---------- Token management ----------

_token_cache: dict[str, Any] = {
    "access_token": "",
    "refresh_token": "",
    "expires_at": 0,
}


async def _ensure_token() -> str:
    """Obtain or refresh the access token."""
    now = int(time.time())

    # Return cached token if still valid (with 60s buffer)
    if _token_cache["access_token"] and _token_cache["expires_at"] > now + 60:
        return _token_cache["access_token"]

    client = _get_client()
    base = settings.fastmoss_base_url

    # Try refresh first
    if _token_cache["refresh_token"]:
        try:
            resp = await client.post(
                f"{base}/v1/refreshToken",
                json={
                    "client_id": settings.fastmoss_client_id,
                    "refresh_token": _token_cache["refresh_token"],
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == 0:
                    token_data = data.get("data", {})
                    _token_cache["access_token"] = token_data.get("access_token", "")
                    _token_cache["refresh_token"] = token_data.get("refresh_token", "")
                    _token_cache["expires_at"] = now + token_data.get("expires_in", 3600)
                    return _token_cache["access_token"]
        except Exception as e:
            logger.warning(f"FastMoss token refresh failed: {e}")

    # Get new token
    try:
        resp = await client.post(
            f"{base}/v1/token",
            json={
                "client_id": settings.fastmoss_client_id,
                "client_secret": settings.fastmoss_client_secret,
            },
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == 0:
                token_data = data.get("data", {})
                _token_cache["access_token"] = token_data.get("access_token", "")
                _token_cache["refresh_token"] = token_data.get("refresh_token", "")
                _token_cache["expires_at"] = now + token_data.get("expires_in", 3600)
                return _token_cache["access_token"]
            logger.warning(f"FastMoss token request failed: {data}")
        else:
            logger.warning(f"FastMoss token request HTTP {resp.status_code}")
    except Exception as e:
        logger.warning(f"FastMoss token request error: {e}")

    return ""


def _generate_sign(uri: str, body: dict) -> str:
    """Generate SHA256 signature: SHA256(client_secret|uri|json_body|client_secret)"""
    body_json = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
    sign_data = f"{settings.fastmoss_client_secret}|{uri}|{body_json}|{settings.fastmoss_client_secret}"
    return hashlib.sha256(sign_data.encode("utf-8")).hexdigest()


# ---------- Open API request ----------


async def _open_api_request(uri: str, body: dict) -> dict | None:
    """Call FastMoss Open API. All endpoints use POST."""
    if not settings.fastmoss_client_id or not settings.fastmoss_client_secret:
        return None

    access_token = await _ensure_token()
    if not access_token:
        return None

    timestamp = str(int(time.time()))
    sign = _generate_sign(uri, body)

    client = _get_client()
    url = f"{settings.fastmoss_base_url}{uri}"
    params = {
        "client_id": settings.fastmoss_client_id,
        "access_token": access_token,
        "timestamp": timestamp,
        "sign": sign,
        "signature_version": "2",
    }

    try:
        resp = await client.post(url, params=params, json=body)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == 0:
                return data.get("data")
            logger.warning(f"FastMoss API {uri}: code={data.get('code')} msg={data.get('msg', data.get('message', ''))}")
        else:
            logger.warning(f"FastMoss API {uri}: HTTP {resp.status_code}")
    except Exception as e:
        logger.warning(f"FastMoss API {uri} error: {e}")

    return None


# ---------- Web API fallback ----------


def _anti_bot_params() -> dict[str, str]:
    """Generate _time and cnonce for internal web API."""
    return {
        "_time": str(int(time.time() * 1000)),
        "cnonce": str(random.randint(100000, 999999)),
    }


async def _web_api_request(path: str, params: dict | None = None) -> dict | None:
    """Call FastMoss internal web API as fallback."""
    client = _get_client()
    url = f"https://www.fastmoss.com/api{path}"
    all_params = {**(params or {}), **_anti_bot_params()}
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json",
        "Referer": "https://www.fastmoss.com/",
    }
    try:
        resp = await client.get(url, params=all_params, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == 200 or isinstance(data.get("data"), dict):
                return data.get("data")
        logger.warning(f"FastMoss Web API {path}: HTTP {resp.status_code}")
    except Exception as e:
        logger.warning(f"FastMoss Web API {path} error: {e}")
    return None


# ========== Image enrichment ==========


async def _enrich_product_images(
    products: list[dict],
    region: str,
    page: int,
    page_size: int,
    keywords: str,
    sort_by: str,
) -> None:
    """Fetch product images from Web API and merge into Open API results."""
    if not products or all(p.get("image") for p in products):
        return  # Already have images

    try:
        order_map = {
            "day7_units_sold": "2,2",
            "day7_gmv": "3,2",
            "total_units_sold": "4,2",
            "total_gmv": "5,2",
            "commission_rate": "6,2",
            "creator_count": "7,2",
        }
        order = order_map.get(sort_by, "2,2")
        params: dict[str, Any] = {
            "region": region,
            "page": page,
            "pagesize": page_size,
            "order": order,
        }
        if keywords:
            params["keyword"] = keywords

        data = await _web_api_request("/goods/V2/search", params)
        if not data or "product_list" not in data:
            return

        # Build image lookup by product_id
        img_map: dict[str, str] = {}
        for p in data["product_list"]:
            pid = p.get("product_id", p.get("id", ""))
            img = p.get("img", "")
            if pid and img:
                img_map[str(pid)] = img

        # Merge images
        for product in products:
            if not product.get("image"):
                product["image"] = img_map.get(product.get("product_id", ""), "")
    except Exception as e:
        logger.warning(f"Failed to enrich product images: {e}")


# ========== Public API Functions ==========


async def search_products(
    region: str = "JP",
    page: int = 1,
    page_size: int = 10,
    keywords: str = "",
    sort_by: str = "day7_units_sold",
) -> dict[str, Any]:
    """Search/rank products on TikTok Shop.

    sort_by options: day7_units_sold, day7_gmv, total_units_sold, total_gmv,
                     commission_rate, creator_count

    Note: Open API pagesize max is 10.
    """
    # Web API only reliable for page 1 (page 2+ returns wrong region data)
    if page == 1:
        order_map = {
            "day7_units_sold": "2,2",
            "day7_gmv": "3,2",
            "total_units_sold": "4,2",
            "total_gmv": "5,2",
            "commission_rate": "6,2",
            "creator_count": "7,2",
        }
        order = order_map.get(sort_by, "2,2")
        params: dict[str, Any] = {
            "region": region,
            "page": 1,
            "pagesize": page_size,
            "order": order,
        }
        if keywords:
            params["keyword"] = keywords

        data = await _web_api_request("/goods/V2/search", params)
        if data and "product_list" in data:
            return _normalize_product_list_webapi(data)

    # Open API for page 2+ or Web API fallback
    actual_page_size = min(page_size, 10)
    body: dict[str, Any] = {
        "filter": {"region": region},
        "page": page,
        "pagesize": actual_page_size,
    }
    if keywords:
        body["keywords"] = keywords
    body["orderby"] = {sort_by: "desc"}

    data = await _open_api_request("/product/v1/search", body)
    if data and "list" in data:
        result = _normalize_product_list_openapi(data)
        # Try to enrich with images from Web API
        await _enrich_product_images(
            result["products"], region, page, page_size, keywords, sort_by
        )
        return result

    return {"total": 0, "products": []}


async def get_product_videos(
    product_id: str,
    date_type: int = 7,
    page: int = 1,
    page_size: int = 10,
) -> dict[str, Any]:
    """Get related TikTok videos for a specific product.

    date_type: number of days (max 28)
    """
    actual_page_size = min(page_size, 10)
    body = {
        "filter": {
            "product_id": product_id,
            "date_type": str(date_type),
        },
        "page": page,
        "pagesize": actual_page_size,
    }

    data = await _open_api_request("/product/v1/videoList", body)
    if data and "list" in data:
        return _normalize_video_list(data)

    # No web API fallback for video list — Open API only
    return {"total": 0, "videos": []}


async def get_top_ecommerce_creators(
    region: str = "JP",
    page: int = 1,
    page_size: int = 10,
    date_type: str = "day",
    date_value: str = "",
) -> dict[str, Any]:
    """Get top e-commerce creator rankings.

    date_type: 'day' | 'week' | 'month'
    date_value: e.g. '2025-02-01'

    Note: Open API pagesize max is 10.
    """
    actual_page_size = min(page_size, 10)

    # date_info is REQUIRED by the API
    date_info: dict[str, str] = {"type": date_type or "week"}
    if date_value:
        date_info["value"] = date_value

    body: dict[str, Any] = {
        "filter": {"region": region, "date_info": date_info},
        "orderby": [{"field": "total_gmv", "order": "desc"}],
        "page": page,
        "pagesize": actual_page_size,
    }

    data = await _open_api_request("/creator/v1/rank/topEcommerce", body)
    if data and "list" in data:
        return _normalize_creator_ranking(data)

    # Fallback to web API
    web_params: dict[str, Any] = {
        "region": region,
        "page": page,
        "pagesize": page_size,
        "order": "2,2",  # sales desc
    }
    data = await _web_api_request("/author/search", web_params)
    if data and "author_list" in data:
        return _normalize_creator_list_webapi(data)

    return {"total": 0, "creators": []}


# ---------- Open API normalizers ----------


def _normalize_product_list_openapi(data: dict) -> dict[str, Any]:
    """Normalize Open API product search response."""
    products = []
    for p in data.get("list", []):
        shop = p.get("shop", {})
        category = p.get("category", {})
        # category can be nested: {"l1": {"name": "..."}, "l2": ...}
        if isinstance(category.get("l1"), dict):
            cat_name = category["l1"].get("name", "")
        else:
            cat_name = category.get("l1_name", category.get("name", ""))
        products.append({
            "product_id": p.get("product_id", ""),
            "title": p.get("title", ""),
            "image": p.get("cover", p.get("image", "")),
            "region": p.get("region", ""),
            "price": p.get("price", ""),
            "commission_rate": _safe_number(p.get("commission_rate", 0)),
            "day7_units_sold": _safe_number(p.get("day7_units_sold", 0)),
            "day7_gmv": _safe_number(p.get("day7_gmv", 0)),
            "total_units_sold": _safe_number(p.get("total_units_sold", 0)),
            "total_gmv": _safe_number(p.get("total_gmv", 0)),
            "creator_count": _safe_number(p.get("creator_count", 0)),
            "video_count": _safe_number(p.get("video_count", 0)),
            "product_rating": _safe_number(p.get("product_rating", 0)),
            "shop_name": shop.get("name", ""),
            "shop_avatar": shop.get("avatar", ""),
            "category_name": cat_name,
            "fastmoss_url": p.get("fastmoss_url", ""),
            "tiktok_url": p.get("tiktok_url", ""),
        })
    return {
        "total": data.get("total", 0),
        "products": products,
    }


def _normalize_product_list_webapi(data: dict) -> dict[str, Any]:
    """Normalize Web API product search response."""
    products = []
    for p in data.get("product_list", []):
        products.append({
            "product_id": p.get("product_id", p.get("id", "")),
            "title": p.get("title", ""),
            "image": p.get("img", ""),
            "region": p.get("region", ""),
            "price": p.get("price", ""),
            "commission_rate": _safe_number(p.get("crate", 0)),
            "day7_units_sold": p.get("day7_sold_count", p.get("yday_sold_count", 0)),
            "day7_gmv": p.get("day7_sale_amount", 0),
            "total_units_sold": p.get("sold_count", 0),
            "total_gmv": p.get("sale_amount", 0),
            "creator_count": p.get("relate_author_count", 0),
            "video_count": p.get("relate_video_count", p.get("video_count", 0)),
            "product_rating": _safe_number(p.get("product_rating", p.get("score", 0))),
            "shop_name": p.get("shop_name", ""),
            "shop_avatar": "",
            "category_name": (p.get("category_name_l1", []) or [""])[0] if isinstance(p.get("category_name_l1"), list) else p.get("category_name_l1", ""),
        })
    return {
        "total": data.get("total_cnt", data.get("total", 0)),
        "products": products,
    }


def _normalize_video_list(data: dict) -> dict[str, Any]:
    """Normalize Open API product video list response."""
    videos = []
    for v in data.get("list", []):
        video_meta = v.get("video", {})
        videos.append({
            "video_id": v.get("video_id", ""),
            "product_id": v.get("product_id", ""),
            "creator_uid": v.get("uid", ""),
            "cover": video_meta.get("cover", ""),
            "description": video_meta.get("video_desc", ""),
            "duration": video_meta.get("duration", "0"),
            "tiktok_url": video_meta.get("tiktok_url", ""),
            "fastmoss_url": video_meta.get("fastmoss_url", ""),
            "play_count": v.get("play_count", "0"),
            "digg_count": v.get("digg_count", "0"),
            "comment_count": v.get("comment_count", "0"),
            "share_count": v.get("share_count", "0"),
            "sold_count": v.get("sold_count", "0"),
            "sale_amount": v.get("sale_amount", "0"),
            "create_date": v.get("create_date", ""),
            "region": v.get("region", ""),
            "is_ad": v.get("is_ad", "0"),
        })
    total = data.get("total", {})
    total_count = total.get("total", 0) if isinstance(total, dict) else total
    return {
        "total": int(total_count) if total_count else 0,
        "videos": videos,
    }


def _normalize_creator_ranking(data: dict) -> dict[str, Any]:
    """Normalize Open API creator ranking response."""
    creators = []
    page = int(data.get("page", 1))
    page_size = int(data.get("pageSize", 20))
    for i, c in enumerate(data.get("list", [])):
        categories = c.get("category", [])
        cat_names = [cat.get("name", "") for cat in categories] if isinstance(categories, list) else []
        creators.append({
            "rank": (page - 1) * page_size + i + 1,
            "uid": c.get("uid", ""),
            "unique_id": c.get("unique_id", ""),
            "nickname": c.get("nickname", ""),
            "avatar": c.get("avatar", ""),
            "region": c.get("region", ""),
            "category": cat_names,
            "follower_count": c.get("follower_count", 0),
            "product_count": int(_safe_number(c.get("product_count", 0))),
            "total_gmv": float(_safe_number(c.get("total_gmv", 0))),
            "currency": c.get("currency", ""),
        })
    return {
        "total": data.get("total", 0),
        "creators": creators,
    }


def _normalize_creator_list_webapi(data: dict) -> dict[str, Any]:
    """Normalize Web API creator list as fallback for ranking."""
    creators = []
    for i, a in enumerate(data.get("author_list", []), 1):
        creators.append({
            "rank": i,
            "uid": a.get("uid", ""),
            "unique_id": a.get("unique_id", ""),
            "nickname": a.get("nickname", ""),
            "avatar": a.get("avatar", ""),
            "region": a.get("region", ""),
            "category": a.get("category", []),
            "follower_count": a.get("follower_count", 0),
            "product_count": a.get("sale_28d_count", 0),
            "total_gmv": a.get("sale_28d_amount", 0),
            "currency": "",
        })
    return {
        "total": data.get("total_cnt", data.get("total", 0)),
        "creators": creators,
    }
