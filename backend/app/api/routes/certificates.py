from typing import Optional
from pathlib import Path
from fastapi import APIRouter, Depends, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user, get_optional_current_user, require_roles
from app.models.user import User
from app.schemas.certificate import (
    CertificateResponse,
    CertificateIssueRequest,
    PublicCertificateVerificationResponse,
)
from app.core.config import settings
from app.schemas.common import PaginatedResponse
from app.services.certificate_service import CertificateService
from app.utils.errors import NotFoundError

router = APIRouter(prefix="/certificates", tags=["Certificates & Public QR Verification"])

@router.get(
    "",
    response_model=PaginatedResponse[CertificateResponse],
    summary="List Certificates (Paginated & Searchable)"
)
def list_certificates(
    page: int = 1,
    limit: int = 50,
    establishment_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieves all issued certificates with pagination and search filtering."""
    res = CertificateService.get_all(
        db=db,
        establishment_id=establishment_id,
        status=status,
        search=search,
        page=page,
        limit=limit,
        user=current_user,
    )
    return PaginatedResponse(
        items=[CertificateResponse.model_validate(c) for c in res["items"]],
        total=res["total"],
        page=res["page"],
        limit=res["limit"],
        pages=res["pages"],
    )


@router.get(
    "/verify/{certificate_number}",
    response_model=PublicCertificateVerificationResponse,
    summary="Public Certificate Authenticity Verification (QR Code Target)"
)
def verify_certificate_public(
    certificate_number: str,
    db: Session = Depends(get_db)
):
    """
    Public verification endpoint (accessible without login).
    Reveals only safe, non-sensitive public metadata to verify official certificate validity.
    """
    return CertificateService.verify_certificate_public(db, certificate_number)

@router.get(
    "/inspection/{inspection_id}",
    response_model=CertificateResponse,
    summary="Get Certificate for an Inspection"
)
def get_inspection_certificate(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """Retrieves certificate details linked to an inspection."""
    cert = CertificateService.get_by_inspection(db, inspection_id)
    if not cert:
        raise NotFoundError(f"No certificate found for inspection {inspection_id}")
    return cert

@router.get(
    "/{certificate_number}",
    response_model=CertificateResponse,
    summary="Get Certificate Details by Number"
)
def get_certificate_by_number(
    certificate_number: str,
    db: Session = Depends(get_db)
):
    """Retrieves full certificate record by unique certificate number."""
    return CertificateService.get_by_number(db, certificate_number)

@router.get(
    "/{certificate_number}/download",
    summary="Download Official Certificate PDF Document"
)
def download_certificate_pdf(
    certificate_number: str,
    db: Session = Depends(get_db)
):
    """Streams the official security compliance PDF certificate file."""
    cert = CertificateService.get_by_number(db, certificate_number)
    if not cert.pdf_path:
        raise NotFoundError(f"PDF document for certificate {certificate_number} has not been generated")
    
    full_path = settings.UPLOAD_DIR.parent / cert.pdf_path
    if not full_path.exists():
        raise NotFoundError(f"Physical certificate file '{cert.pdf_path}' not found on server")

    return FileResponse(
        path=str(full_path),
        filename=f"Security_Certificate_{cert.certificate_number}.pdf",
        media_type="application/pdf"
    )

@router.post(
    "/issue/{inspection_id}",
    response_model=CertificateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Issue Security Certificate for Approved Inspection"
)
def issue_certificate(
    inspection_id: int,
    data: CertificateIssueRequest = CertificateIssueRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER"])),
):
    """
    Generates and issues a formal security certificate for an approved inspection.
    """
    return CertificateService.issue_certificate(
        db=db,
        inspection_id=inspection_id,
        issued_by_user=current_user,
        expiry_months=data.expiry_months,
    )
