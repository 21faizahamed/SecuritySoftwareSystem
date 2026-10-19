from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user, get_optional_current_user
from app.models.user import User
from app.schemas.report import ReportGenerateRequest, ReportResponse
from app.core.config import settings
from app.services.report_service import ReportService
from app.services.inspection_service import InspectionService
from app.utils.errors import NotFoundError

router = APIRouter(prefix="/reports", tags=["Inspection Reports & PDF Export"])

@router.post(
    "/generate/{inspection_id}",
    response_model=ReportResponse,
    summary="Generate Comprehensive PDF Inspection Report"
)
def generate_report(
    inspection_id: int,
    data: ReportGenerateRequest = ReportGenerateRequest(),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Generates a full-featured multi-page PDF Inspection Report containing:
    facility details, evidence files, AI detections, regulatory checklist, and audit summary.
    """
    return ReportService.generate_inspection_report(
        db=db,
        inspection_id=inspection_id,
        user=current_user,
        include_audit_trail=data.include_audit_trail,
    )

@router.get(
    "/{inspection_id}/download",
    summary="Download Generated PDF Inspection Report"
)
def download_report(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """Downloads or generates on-the-fly the PDF inspection report."""
    inspection = InspectionService.get_by_id(db, inspection_id)
    report_dir = settings.UPLOAD_DIR / "reports"
    
    # Check for existing matching report
    matching_reports = sorted(report_dir.glob(f"report_insp_{inspection.inspection_number.replace('-', '_')}*.pdf"), reverse=True)
    if matching_reports:
        target_path = matching_reports[0]
    else:
        # Generate on the fly
        resp = ReportService.generate_inspection_report(db, inspection_id)
        target_path = settings.UPLOAD_DIR.parent / resp.report_path

    return FileResponse(
        path=str(target_path),
        filename=f"Inspection_Report_{inspection.inspection_number}.pdf",
        media_type="application/pdf"
    )
