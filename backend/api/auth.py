"""
Authentication endpoints for login, register, and Google OAuth.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import os
import secrets
import hashlib

from backend.core.db import get_session
from backend.models.user_state import User, ThinkingProfile

router = APIRouter(prefix="/auth", tags=["auth"])

# Simple token storage (in production, use Redis or JWT)
_tokens = {}

# --- Models ---

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    username: str

# --- Helpers ---

def hash_password(password: str) -> str:
    """Simple password hashing with salt."""
    salt = "brainwave_salt_2024"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def create_access_token(user_id: str) -> str:
    """Create a simple bearer token."""
    token = secrets.token_urlsafe(32)
    _tokens[token] = {
        "user_id": user_id,
        "expires": datetime.utcnow() + timedelta(days=7)
    }
    return token

def get_user_from_token(token: str, session: Session) -> Optional[User]:
    """Validate token and return user."""
    if token not in _tokens:
        return None
    
    token_data = _tokens[token]
    if datetime.utcnow() > token_data["expires"]:
        del _tokens[token]
        return None
    
    from uuid import UUID
    user = session.get(User, UUID(token_data["user_id"]))
    return user

# --- Endpoints ---

@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest, session: Session = Depends(get_session)):
    """Register a new user with username/email/password."""
    
    # Check if username exists
    existing = session.exec(select(User).where(User.username == req.username)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Check if email exists
    existing_email = session.exec(select(User).where(User.email == req.email)).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        username=req.username,
        email=req.email,
        password_hash=hash_password(req.password)
    )
    session.add(user)
    session.flush()
    
    # Create profile
    profile = ThinkingProfile(user_id=user.id)
    session.add(profile)
    session.commit()
    session.refresh(user)
    
    # Generate token
    token = create_access_token(str(user.id))
    
    return AuthResponse(
        access_token=token,
        user_id=str(user.id),
        username=user.username
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, session: Session = Depends(get_session)):
    """Login with username and password."""
    
    user = session.exec(select(User).where(User.username == req.username)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check password
    if not hasattr(user, 'password_hash') or not user.password_hash:
        # User may have been created before auth system
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please use Google login or contact support"
        )
    
    if user.password_hash != hash_password(req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Generate token
    token = create_access_token(str(user.id))
    
    return AuthResponse(
        access_token=token,
        user_id=str(user.id),
        username=user.username
    )


@router.get("/me")
async def get_current_user_info(
    session: Session = Depends(get_session),
    authorization: str = None
):
    """Get current user from token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    token = authorization.split(" ")[1]
    user = get_user_from_token(token, session)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return {
        "user_id": str(user.id),
        "username": user.username,
        "email": user.email
    }


@router.get("/google/login")
async def google_login():
    """Return the Google OAuth URL for the frontend to redirect to."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    
    if not client_id or not redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    scope = "openid email profile"
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope={scope}&access_type=offline&prompt=consent"
    
    return {"url": auth_url}


class GoogleCallbackRequest(BaseModel):
    code: str

@router.post("/google/callback", response_model=AuthResponse)
async def google_callback(req: GoogleCallbackRequest, session: Session = Depends(get_session)):
    """Exchange auth code for token and login/create user."""
    import requests
    
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
        
    # 1. Exchange code for access token
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": req.code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri
    }
    
    res = requests.post(token_url, data=data)
    if not res.ok:
        raise HTTPException(status_code=400, detail=f"Failed to get Google token: {res.text}")
        
    token_data = res.json()
    access_token = token_data.get("access_token")
    
    # 2. Get user info
    user_info_res = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if not user_info_res.ok:
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
    user_info = user_info_res.json()
    email = user_info.get("email")
    google_id = user_info.get("id")
    name = user_info.get("name") # e.g. "John Doe"
    
    if not email:
        raise HTTPException(status_code=400, detail="No email provided by Google")
        
    # 3. Find or create user
    # Check by email first
    user = session.exec(select(User).where(User.email == email)).first()
    
    if not user:
        # Create new user
        # Generate a unique username from email or name
        base_username = email.split("@")[0]
        username = base_username
        
        # Ensure username uniqueness
        counter = 1
        while session.exec(select(User).where(User.username == username)).first():
            username = f"{base_username}{counter}"
            counter += 1
            
        user = User(
            username=username,
            email=email,
            password_hash=None # No password for Google users
        )
        session.add(user)
        session.flush()
        
        profile = ThinkingProfile(user_id=user.id)
        session.add(profile)
        session.commit()
        session.refresh(user)
    
    # Generate token
    token = create_access_token(str(user.id))
    
    return AuthResponse(
        access_token=token,
        user_id=str(user.id),
        username=user.username
    )


@router.post("/logout")
async def logout(authorization: str = None):
    """Invalidate the current token."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        if token in _tokens:
            del _tokens[token]
    
    return {"success": True}
