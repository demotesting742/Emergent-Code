from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import uuid

from .config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models.user import Profile
from ..core.database import get_db

settings = get_settings()
security = HTTPBearer()


class CurrentUser:
    """Current authenticated user context."""
    
    def __init__(self, user_id: str, profile: Optional[Profile] = None):
        self.user_id = user_id
        self.profile = profile
    
    def is_authenticated(self) -> bool:
        return self.user_id is not None


from .supabase import supabase

async def verify_jwt_token(token: str) -> dict:
    """Verify JWT token using Supabase Admin API (service_role key).
    
    Uses supabase.auth.get_user() which validates the token server-side
    with full admin privileges (service_role key). This properly handles
    ES256 signed JWTs without needing the public key locally.
    """
    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        return {
            "sub": response.user.id,
            "email": response.user.email,
            "role": response.user.role
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Supabase Auth verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    payload = await verify_jwt_token(token)
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    # Fetch profile from database
    user_uuid = uuid.UUID(user_id)
    result = await db.execute(
        select(Profile).where(Profile.id == user_uuid)
    )

    profile = result.scalar_one_or_none()
    
    if not profile:
        print(f"DEBUG: Profile not found for {user_uuid}, Creating just-in-time...")
        email = payload.get("email", "unknown@supabase.com")
        profile = Profile(
            id=user_uuid,
            email=email,
            display_name=email.split("@")[0]
        )
        db.add(profile)
        try:
            await db.commit()
            await db.refresh(profile)
        except Exception as e:
            await db.rollback()
            print(f"DEBUG: Profile creation race condition or error: {str(e)}")
            result = await db.execute(
                select(Profile).where(Profile.id == user_uuid)
            )
            profile = result.scalar_one_or_none()
            if not profile:
                raise e
    
    return CurrentUser(user_id=user_id, profile=profile)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
) -> Optional[CurrentUser]:
    """Get current user if authenticated, None otherwise."""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None