"""TikTok Login Kit OAuth endpoints with PKCE support."""

import hashlib
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
from app.models.user import User

router = APIRouter(prefix="/auth/tiktok", tags=["tiktok-auth"])

TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
TIKTOK_USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/"

SCOPES = "user.info.basic,user.info.profile,user.info.stats,video.list"

# In-memory store for PKCE code_verifiers (keyed by state)
# In production, use Redis or DB. This works for single-instance.
_pkce_store: dict[str, str] = {}


def _generate_pkce() -> tuple[str, str]:
    """Generate PKCE code_verifier and code_challenge (S256)."""
    code_verifier = secrets.token_urlsafe(64)[:128]
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    # base64url encode without padding
    import base64
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return code_verifier, code_challenge


class TikTokAuthURL(BaseModel):
    url: str
    state: str


class TikTokCallbackRequest(BaseModel):
    code: str
    state: str


class TikTokAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_new_user: bool = False
    tiktok_display_name: str | None = None


@router.get("/authorize", response_model=TikTokAuthURL)
async def get_tiktok_auth_url() -> TikTokAuthURL:
    """Generate TikTok OAuth authorization URL with PKCE."""
    state = secrets.token_urlsafe(32)
    code_verifier, code_challenge = _generate_pkce()

    # Store code_verifier for later use in callback
    _pkce_store[state] = code_verifier

    params = {
        "client_key": settings.tiktok_client_key,
        "scope": SCOPES,
        "response_type": "code",
        "redirect_uri": settings.tiktok_redirect_uri,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    url = f"{TIKTOK_AUTH_URL}?{urlencode(params)}"
    return TikTokAuthURL(url=url, state=state)


@router.post("/callback", response_model=TikTokAuthResponse)
async def tiktok_callback(
    body: TikTokCallbackRequest,
    db: AsyncSession = Depends(get_db),
) -> TikTokAuthResponse:
    """Exchange TikTok authorization code for access token and login/register user."""

    # Retrieve PKCE code_verifier
    code_verifier = _pkce_store.pop(body.state, "")

    # 1. Exchange code for TikTok access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            TIKTOK_TOKEN_URL,
            data={
                "client_key": settings.tiktok_client_key,
                "client_secret": settings.tiktok_client_secret,
                "code": body.code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.tiktok_redirect_uri,
                "code_verifier": code_verifier,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"TikTok token exchange failed: {token_resp.text}",
        )

    token_data = token_resp.json()
    tiktok_access_token = token_data.get("access_token")
    tiktok_open_id = token_data.get("open_id")

    if not tiktok_access_token or not tiktok_open_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Invalid TikTok token response: {token_data}",
        )

    # 2. Fetch TikTok user info
    user_info_fields = (
        "open_id,display_name,avatar_url,"
        "bio_description,profile_deep_link,is_verified,"
        "follower_count,following_count,like_count,video_count"
    )
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            f"{TIKTOK_USER_INFO_URL}?fields={user_info_fields}",
            headers={"Authorization": f"Bearer {tiktok_access_token}"},
        )

    tiktok_user = {}
    if user_resp.status_code == 200:
        resp_data = user_resp.json()
        tiktok_user = resp_data.get("data", {}).get("user", {})

    display_name = tiktok_user.get("display_name", "")
    avatar_url = tiktok_user.get("avatar_url", "")

    # 3. Find or create user
    is_new_user = False
    result = await db.execute(
        select(User).where(User.tiktok_open_id == tiktok_open_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        # Create new user with TikTok info
        is_new_user = True
        # Generate a placeholder email and random password for TikTok-only users
        placeholder_email = f"tiktok_{tiktok_open_id[:16]}@vigsella.app"
        user = User(
            email=placeholder_email,
            password_hash=get_password_hash(secrets.token_urlsafe(32)),
            tiktok_open_id=tiktok_open_id,
            tiktok_display_name=display_name,
            tiktok_avatar_url=avatar_url,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    else:
        # Update TikTok profile info
        user.tiktok_display_name = display_name
        user.tiktok_avatar_url = avatar_url
        await db.flush()

    # 4. Issue our JWT
    access_token = create_access_token(data={"sub": str(user.id)})

    return TikTokAuthResponse(
        access_token=access_token,
        is_new_user=is_new_user,
        tiktok_display_name=display_name,
    )
