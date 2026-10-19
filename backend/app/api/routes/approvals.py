from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user, require_roles
from app.models.user import User
from app.schemas.approval import (
    SubmitForReviewRequest,
    ReviewApprovalRequest,
    ReviewRejectionRequest,
    ApprovalResponse,
)
from app.services.approval_service import ApprovalService

router = APIRouter(prefix="/approvals", tags=["Inspection Review & Approval Workflow"])

@router.post(
    "/submit/{inspection_id}",
    response_model=ApprovalResponse,
    summary="Inspector Submits Inspection for Formal Compliance Review"
)
def submit_for_review(
    inspection_id: int,
    data: SubmitForReviewRequest = SubmitForReviewRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Submits an inspection with verified evidence for formal review.
    Transitions status to 'AWAITING_REVIEW'.
    """
    return ApprovalService.submit_for_review(
        db=db,
        inspection_id=inspection_id,
        user=current_user,
        inspector_notes=data.inspector_notes
    )

@router.post(
    "/approve/{inspection_id}",
    response_model=ApprovalResponse,
    summary="Authorized Reviewer/Admin Approves Inspection & Issues Certificate"
)
def approve_inspection(
    inspection_id: int,
    data: ReviewApprovalRequest = ReviewApprovalRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER"])),
):
    """
    Reviewer or Administrator grants final regulatory approval.
    Blocks approval if unresolved mandatory requirements exist unless explicitly overridden.
    Automatically generates official PDF Certificate upon approval.
    """
    return ApprovalService.approve_inspection(
        db=db,
        inspection_id=inspection_id,
        user=current_user,
        reviewer_notes=data.reviewer_notes,
        force_override=data.force_override,
        override_reason=data.override_reason,
    )

@router.post(
    "/reject/{inspection_id}",
    response_model=ApprovalResponse,
    summary="Reviewer Rejects Inspection Cycle with Formal Feedback"
)
def reject_inspection(
    inspection_id: int,
    data: ReviewRejectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER"])),
):
    """
    Rejects an inspection cycle and specifies non-compliance issues requiring remediation.
    """
    return ApprovalService.reject_inspection(
        db=db,
        inspection_id=inspection_id,
        user=current_user,
        rejection_reason=data.rejection_reason,
        reviewer_notes=data.reviewer_notes,
    )
