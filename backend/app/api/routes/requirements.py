from typing import List, Optional, Dict, Any
from pathlib import Path
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user, get_optional_current_user
from app.models.user import User
from app.schemas.requirement import (
    RequirementCreate,
    RequirementUpdate,
    RequirementResponse,
    RequirementSearchMatch,
)
from app.schemas.common import MessageResponse
from app.core.config import settings
from app.services.requirement_service import RequirementService

router = APIRouter(prefix="/requirements", tags=["Regulatory Standards & Requirements Management"])

@router.get(
    "",
    response_model=List[RequirementResponse],
    summary="List Regulatory Requirements (Filterable & Searchable)"
)
def list_requirements(
    category: Optional[str] = Query(None, description="Filter by requirement category"),
    establishment_type: Optional[str] = Query(None, description="Filter by establishment type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search requirement code, title, or description"),
    db: Session = Depends(get_db)
):
    """Retrieves structured regulatory requirements with full source traceability."""
    return RequirementService.get_all(
        db=db,
        category=category,
        establishment_type=establishment_type,
        is_active=is_active,
        search=search,
    )

@router.get(
    "/search/clauses",
    response_model=List[RequirementSearchMatch],
    summary="Advanced Arabic & English Regulatory Search"
)
def search_regulatory_clauses(
    query: str = Query(..., min_length=2, description="Search term for Arabic/English regulatory clauses"),
    db: Session = Depends(get_db)
):
    """Searches official regulatory articles, source citations, and clauses."""
    return RequirementService.search_regulatory_clauses(db, query)

@router.post(
    "/seed-defaults",
    response_model=MessageResponse,
    summary="Seed Official Regulatory Requirements"
)
def seed_default_requirements(
    db: Session = Depends(get_db)
):
    """Seeds standard regulatory requirements from 'دليل نظم وقائية (2).pdf'."""
    RequirementService.seed_default_regulatory_requirements(db)
    return MessageResponse(
        message="Default regulatory requirements seeded successfully",
        detail="Standard UAE Civil Defense regulations loaded into requirements database."
    )

@router.post(
    "/ingest-pdf",
    summary="Ingest Official Regulatory PDF Document"
)
def ingest_regulatory_pdf(
    file: UploadFile = File(...),
    document_title: str = Form("دليل نظم وقائية (2).pdf"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Ingests an uploaded regulatory PDF, segments text into chapters and articles,
    and returns extracted candidate requirements with page and section references.
    """
    reg_dir = settings.UPLOAD_DIR / "regulations"
    reg_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = reg_dir / (file.filename or "regulation.pdf")
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    result = RequirementService.ingest_regulatory_pdf(
        db=db,
        pdf_path=file_path,
        document_title=document_title,
        user=current_user
    )
    return result

@router.get(
    "/{id}",
    response_model=RequirementResponse,
    summary="Get Requirement by ID"
)
def get_requirement(
    id: int,
    db: Session = Depends(get_db)
):
    """Retrieves single requirement by ID."""
    return RequirementService.get_by_id(db, id)

@router.post(
    "",
    response_model=RequirementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Regulatory Requirement"
)
def create_requirement(
    data: RequirementCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Adds a new requirement with regulatory source citation."""
    return RequirementService.create(db, data, user=current_user)

@router.put(
    "/{id}",
    response_model=RequirementResponse,
    summary="Update Regulatory Requirement"
)
def update_requirement(
    id: int,
    data: RequirementUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Updates requirement fields."""
    return RequirementService.update(db, id, data, user=current_user)

@router.delete(
    "/{id}",
    response_model=MessageResponse,
    summary="Delete Regulatory Requirement"
)
def delete_requirement(
    id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Deletes a requirement record."""
    RequirementService.delete(db, id, user=current_user)
    return MessageResponse(
        message="Requirement deleted successfully",
        detail=f"Requirement with ID {id} was removed"
    )
