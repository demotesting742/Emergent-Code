from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from typing import Optional
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


async def verify_jwt_token(token: str) -> dict:
    """Verify JWT token from Supabase."""
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
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
    result = await db.execute(
        select(Profile).where(Profile.id == user_id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )
    
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