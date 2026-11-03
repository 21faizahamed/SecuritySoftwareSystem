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
@router.post(
    "/{inspection_id}/submit",
    response_model=ApprovalResponse,
    summary="Inspector Submits Inspection for Formal Compliance Review (Alias)"
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
    notes = data.inspector_notes or data.submission_notes
    return ApprovalService.submit_for_review(
        db=db,
        inspection_id=inspection_id,
        user=current_user,
        inspector_notes=notes
    )

@router.post(
    "/approve/{inspection_id}",
    response_model=ApprovalResponse,
    summary="Authorized Reviewer/Admin Approves Inspection & Issues Certificate"
)
@router.post(
    "/{inspection_id}/approve",
    response_model=ApprovalResponse,
    summary="Authorized Reviewer/Admin Approves Inspection & Issues Certificate (Alias)"
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
    notes = data.reviewer_notes or data.approval_notes
    force = data.force_override or data.allow_override
    reason = data.override_reason or data.override_justification
    return ApprovalService.approve_inspection(
        db=db,
        inspection_id=inspection_id,
        user=current_user,
        reviewer_notes=notes,
        force_override=force,
        override_reason=reason,
    )

@router.post(
    "/reject/{inspection_id}",
    response_model=ApprovalResponse,
    summary="Reviewer Rejects Inspection Cycle with Formal Feedback"
)
@router.post(
    "/{inspection_id}/reject",
    response_model=ApprovalResponse,
    summary="Reviewer Rejects Inspection Cycle with Formal Feedback (Alias)"
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
