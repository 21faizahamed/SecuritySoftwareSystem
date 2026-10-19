from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user, get_optional_current_user
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentResponse
from app.schemas.common import MessageResponse
from app.services.document_service import DocumentService

router = APIRouter(tags=["Document Management & Evidence Uploads"])

@router.post(
    "/inspections/{inspection_id}/documents/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload Inspection Evidence Document/Image"
)
def upload_inspection_document(
    inspection_id: int,
    file: UploadFile = File(...),
    document_type: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Accepts multipart file upload (PDF, JPG, JPEG, PNG), validates MIME & size,
    saves securely to uploads directory, executes text/image processing, and records metadata in MySQL.
    """
    return DocumentService.save_uploaded_file(db, inspection_id, file, document_type=document_type, user=current_user)

@router.post(
    "/documents/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload Evidence File (Generic Form Route)"
)
def upload_document_generic(
    file: UploadFile = File(...),
    inspection_id: int = Form(...),
    document_type: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Accepts multipart upload with inspection_id in Form body."""
    return DocumentService.save_uploaded_file(db, inspection_id, file, document_type=document_type, user=current_user)

@router.get(
    "/inspections/{inspection_id}/documents",
    response_model=List[DocumentResponse],
    summary="List Documents for an Inspection"
)
@router.get(
    "/documents/inspection/{inspection_id}",
    response_model=List[DocumentResponse],
    summary="List Documents for an Inspection (Alias)"
)
def list_inspection_documents(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """Retrieves all document metadata records attached to a specific inspection."""
    return DocumentService.get_by_inspection(db, inspection_id)

@router.get(
    "/documents/{id}",
    response_model=DocumentResponse,
    summary="Get Document Metadata by ID"
)
def get_document(
    id: int,
    db: Session = Depends(get_db)
):
    """Retrieves metadata for a specific uploaded document."""
    return DocumentService.get_by_id(db, id)

@router.get(
    "/documents/{id}/file",
    summary="Download or Stream Physical Document File"
)
def get_document_file(
    id: int,
    db: Session = Depends(get_db)
):
    """Securely streams the physical document file with path traversal protections."""
    doc = DocumentService.get_by_id(db, id)
    file_path = DocumentService.get_file_path(doc)
    return FileResponse(
        path=str(file_path),
        filename=doc.original_filename,
        media_type=doc.file_type
    )

@router.get(
    "/documents",
    response_model=List[DocumentResponse],
    summary="List All Document Records (Role Filtered)"
)
def list_all_documents(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieves document records filtered by user role and ownership."""
    return DocumentService.get_all(db, user=current_user)

@router.post(
    "/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Document Metadata"
)
def create_document_metadata(
    data: DocumentCreate,
    db: Session = Depends(get_db)
):
    """Saves document metadata linked to an existing inspection (programmatic/legacy)."""
    return DocumentService.create_metadata(db, data)

@router.delete(
    "/documents/{id}",
    response_model=MessageResponse,
    summary="Delete Document"
)
def delete_document(
    id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Deletes document metadata record and physical file."""
    DocumentService.delete(db, id, user=current_user)
    return MessageResponse(
        message="Document deleted successfully",
        detail=f"Document with ID {id} was removed"
    )
