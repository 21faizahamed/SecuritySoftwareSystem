from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user, get_optional_current_user
from app.models.user import User
from app.schemas.inspection import (
    InspectionCreate,
    InspectionUpdate,
    InspectionResponse,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.inspection_service import InspectionService

router = APIRouter(prefix="/inspections", tags=["Inspections Management"])

@router.post(
    "",
    response_model=InspectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Inspection"
)
def create_inspection(
    data: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Creates a new inspection linked to an establishment.
    Validates establishment existence, unique inspection number, and valid status enum.
    """
    return InspectionService.create(db, data, user=current_user)

@router.get(
    "",
    response_model=PaginatedResponse[InspectionResponse],
    summary="List Inspections (Paginated & Filterable)"
)
def list_inspections(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, IN_PROGRESS, AWAITING_VERIFICATION, AWAITING_REVIEW, APPROVED, REJECTED, COMPLETED)"),
    search: Optional[str] = Query(None, description="Search inspection number or notes"),
    establishment_id: Optional[int] = Query(None, description="Filter by establishment ID"),
    inspector_id: Optional[int] = Query(None, description="Filter by inspector user ID"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Returns paginated inspections with optional status, search, and establishment filters."""
    items, total, pages = InspectionService.get_paginated(
        db,
        page=page,
        limit=limit,
        status=status,
        search=search,
        establishment_id=establishment_id,
        inspector_id=inspector_id,
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
    response_model=InspectionResponse,
    summary="Get Inspection by ID"
)
def get_inspection(
    id: int,
    db: Session = Depends(get_db)
):
    """Retrieves single inspection details by ID."""
    return InspectionService.get_by_id(db, id)

@router.put(
    "/{id}",
    response_model=InspectionResponse,
    summary="Update Inspection"
)
def update_inspection(
    id: int,
    data: InspectionUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Updates inspection status, notes, or date."""
    return InspectionService.update(db, id, data, user=current_user)

@router.delete(
    "/{id}",
    response_model=MessageResponse,
    summary="Delete Inspection"
)
def delete_inspection(
    id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Deletes an inspection record and its linked documents."""
    InspectionService.delete(db, id, user=current_user)
    return MessageResponse(
        message="Inspection deleted successfully",
        detail=f"Inspection with ID {id} was removed"
    )
