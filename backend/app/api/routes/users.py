from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user, require_roles
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["User Administration"])

@router.get(
    "",
    response_model=PaginatedResponse[UserResponse],
    summary="List Users (Admin Only)"
)
def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by username, email, or full name"),
    role_id: Optional[int] = Query(None, description="Filter by role ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    """Retrieves paginated user accounts with optional search and role filtering."""
    items, total, pages = UserService.get_paginated(
        db, page=page, limit=limit, search=search, role_id=role_id, is_active=is_active
    )
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )

@router.get(
    "/{id}",
    response_model=UserResponse,
    summary="Get User by ID"
)
def get_user(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieves user profile by ID. Non-admin users may only view their own profile."""
    if current_user.role.name != "ADMIN" and current_user.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You can only view your own user profile."
        )
    return UserService.get_by_id(db, id)

@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New User (Admin Only)"
)
def create_user(
    data: UserCreate,
    current_admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    """Registers a new user account with assigned role and bcrypt password hashing."""
    return UserService.create(db, data)

@router.put(
    "/{id}",
    response_model=UserResponse,
    summary="Update User (Admin Only)"
)
def update_user(
    id: int,
    data: UserUpdate,
    current_admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    """Updates user information, role assignment, active state, or resets password."""
    return UserService.update(db, id, data)

@router.delete(
    "/{id}",
    response_model=MessageResponse,
    summary="Delete User (Admin Only)"
)
def delete_user(
    id: int,
    current_admin: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    """Deletes a user account from system."""
    if current_admin.id == id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own active administrator account."
        )
    UserService.delete(db, id)
    return MessageResponse(
        message="User deleted successfully",
        detail=f"User with ID {id} was removed."
    )
