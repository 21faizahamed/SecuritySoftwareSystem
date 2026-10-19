from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user
from app.schemas.role import RoleResponse, PermissionResponse
from app.services.role_service import RoleService

router = APIRouter(tags=["Roles & Permissions"])

@router.get(
    "/roles",
    response_model=List[RoleResponse],
    summary="List Roles with Assigned Permissions"
)
def list_roles(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieves all defined roles and their mapped permissions."""
    return RoleService.get_all_roles(db)

@router.get(
    "/permissions",
    response_model=List[PermissionResponse],
    summary="List System Permissions"
)
def list_permissions(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieves all system permissions."""
    return RoleService.get_all_permissions(db)
