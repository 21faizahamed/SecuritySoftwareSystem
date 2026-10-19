from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user, get_optional_current_user
from app.models.user import User
from app.schemas.establishment import (
    EstablishmentCreate,
    EstablishmentUpdate,
    EstablishmentResponse,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.establishment_service import EstablishmentService

router = APIRouter(prefix="/establishments", tags=["Establishments Management"])

@router.post(
    "",
    response_model=EstablishmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Establishment"
)
def create_establishment(
    data: EstablishmentCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Creates a new facility/establishment record with full Arabic & English text support."""
    return EstablishmentService.create(db, data, user=current_user)

@router.get(
    "",
    response_model=PaginatedResponse[EstablishmentResponse],
    summary="List Establishments (Paginated & Searchable)"
)
def list_establishments(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for name, address, or owner"),
    establishment_type: Optional[str] = Query(None, description="Filter by establishment type"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, INACTIVE, ARCHIVED)"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Returns a paginated list of establishments matching optional search filters."""
    items, total, pages = EstablishmentService.get_paginated(
        db,
        page=page,
        limit=limit,
        search=search,
        establishment_type=establishment_type,
        status=status,
        user=current_user,
    )
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages
    )

@router.get(
    "/{id}",
    response_model=EstablishmentResponse,
    summary="Get Establishment by ID"
)
def get_establishment(
    id: int,
    db: Session = Depends(get_db)
):
    """Retrieves single establishment details by ID."""
    return EstablishmentService.get_by_id(db, id)

@router.put(
    "/{id}",
    response_model=EstablishmentResponse,
    summary="Update Establishment"
)
def update_establishment(
    id: int,
    data: EstablishmentUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Updates fields of an existing establishment."""
    return EstablishmentService.update(db, id, data, user=current_user)

@router.delete(
    "/{id}",
    response_model=MessageResponse,
    summary="Delete Establishment"
)
def delete_establishment(
    id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Deletes an establishment and cascades to associated records."""
    EstablishmentService.delete(db, id, user=current_user)
    return MessageResponse(
        message="Establishment deleted successfully",
        detail=f"Establishment with ID {id} and related records were removed"
    )
