"""
Authentication utilities for Axiom.
Provides reusable dependencies for protected endpoints.
"""
from fastapi import Depends, HTTPException, status, Header
from sqlmodel import Session
from typing import Optional

from backend.core.db import get_session
from backend.models.user_state import User


# Import token storage from auth module
# In production, this would use Redis or JWT
def _get_tokens():
    """Get the token storage dict from auth module."""
    from backend.api.auth import _tokens, get_user_from_token
    return _tokens, get_user_from_token


async def get_current_user(
    session: Session = Depends(get_session),
    authorization: Optional[str] = Header(None)
) -> User:
    """
    FastAPI dependency that extracts and validates the user from auth token.
    
    Usage:
        @router.get("/protected")
        async def protected_endpoint(user: User = Depends(get_current_user)):
            return {"user_id": str(user.id)}
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.split(" ")[1]
    _, get_user_from_token = _get_tokens()
    user = get_user_from_token(token, session)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_optional_user(
    session: Session = Depends(get_session),
    authorization: Optional[str] = Header(None)
) -> Optional[User]:
    """
    FastAPI dependency that optionally extracts user from auth token.
    Returns None if not authenticated (instead of raising error).
    
    Usage:
        @router.get("/public")
        async def public_endpoint(user: Optional[User] = Depends(get_optional_user)):
            if user:
                return {"message": f"Hello {user.username}"}
            return {"message": "Hello guest"}
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.split(" ")[1]
    _, get_user_from_token = _get_tokens()
    return get_user_from_token(token, session)
