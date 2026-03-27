"""
Authentication API endpoints
Handles login, registration, and user profile
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import logging
from app.db.models import User
from app.core.auth import (
    authenticate_user, 
    create_access_token, 
    get_password_hash, 
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_active_user
)
from datetime import timedelta
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)


class LoginRequest(BaseModel):
    """Login request model"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class RegistrationRequest(BaseModel):
    """Registration request model"""
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    full_name: Optional[str] = Field(None, max_length=100)


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserProfile(BaseModel):
    """User profile response"""
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: str


@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    """
    Login endpoint - returns JWT token
    
    Example:
        POST /api/v1/auth/login
        {
            "username": "admin",
            "password": "secret"
        }
    """
    try:
        user = await authenticate_user(login_data.username, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Ungültiger Benutzername oder Passwort",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        
        logger.info(f"User {user.username} logged in successfully")
        
        return TokenResponse(
            access_token=access_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fehler beim Login"
        )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(registration_data: RegistrationRequest):
    """
    Registration endpoint - creates new user and returns JWT token
    
    Example:
        POST /api/v1/auth/register
        {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "securepassword",
            "full_name": "John Doe"
        }
    """
    try:
        print("Register payload:", registration_data)
        # Check if username already exists
        existing_user = await User.find_one({"username": registration_data.username})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Benutzername bereits vergeben"
            )
        
        # Check if email already exists
        existing_email = await User.find_one({"email": registration_data.email})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-Mail bereits registriert"
            )
        
        # Hash the password
        hashed_password = get_password_hash(registration_data.password)
        
        # Create new user
        user = User(
            username=registration_data.username,
            email=registration_data.email,
            hashed_password=hashed_password,
            full_name=registration_data.full_name,
            is_active=True
        )
        
        await user.save()
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        
        logger.info(f"New user {user.username} registered successfully")
        
        return TokenResponse(
            access_token=access_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fehler bei der Registrierung"
        )


@router.get("/profile", response_model=UserProfile)
async def get_profile(current_user: User = Depends(get_current_active_user)):
    """
    Get current user profile (protected endpoint)
    
    Example:
        GET /api/v1/auth/profile
        Authorization: Bearer <token>
    """
    return UserProfile(
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at.isoformat()
    )


@router.post("/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Change user password (protected endpoint)
    
    Example:
        POST /api/v1/auth/change-password
        Authorization: Bearer <token>
        {
            "old_password": "oldpass",
            "new_password": "newpass"
        }
    """
    from app.core.auth import verify_password
    
    try:
        # Verify old password
        if not verify_password(old_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Altes Passwort ist falsch"
            )
        
        # Hash new password
        current_user.hashed_password = get_password_hash(new_password)
        current_user.updated_at = datetime.utcnow()
        await current_user.save()
        
        logger.info(f"User {current_user.username} changed password")
        
        return {"status": "success", "message": "Passwort erfolgreich geändert"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fehler beim Ändern des Passworts"
        )
# Temporary comment to trigger reload