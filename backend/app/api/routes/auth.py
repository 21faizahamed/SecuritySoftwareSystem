from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, CurrentUserResponse
from app.schemas.user import UserResponse
from app.schemas.common import MessageResponse
from app.services.user_service import UserService
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User Login & JWT Token Issuance"
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticates username/email and password, issuing a signed JWT Bearer token."""
    user = UserService.authenticate(db, data.username, data.password)
    
    # Generate token payload
    token_payload = {
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role.name if user.role else "VIEWER",
    }
    access_token = create_access_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )

@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="User Logout"
)
def logout(
    current_user: User = Depends(get_current_active_user),
):
    """Stateless JWT logout endpoint acknowledging session termination."""
    return MessageResponse(
        message="Logged out successfully",
        detail=f"Session for user '{current_user.username}' concluded."
    )

@router.get(
    "/me",
    response_model=CurrentUserResponse,
    summary="Get Authenticated User Profile"
)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Returns safe profile, active role name, and permissions of the currently authenticated user."""
    role_name = current_user.role.name if current_user.role else "VIEWER"
    permissions = [p.name for p in current_user.role.permissions] if current_user.role else []
    
    return CurrentUserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role_id=current_user.role_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login_at=current_user.last_login_at,
        role=role_name,
        permissions=permissions,
    )

