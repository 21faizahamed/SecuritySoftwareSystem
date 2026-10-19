from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user, get_optional_current_user
from app.models.user import User
from app.schemas.compliance import (
    ComplianceSummary,
    ComplianceItemResponse,
    ComplianceOverrideRequest,
)
from app.services.compliance_service import ComplianceService

router = APIRouter(prefix="/compliance", tags=["Compliance Engine & Rule Evaluation"])

@router.post(
    "/evaluate/{inspection_id}",
    response_model=ComplianceSummary,
    summary="Evaluate Inspection Compliance Against Regulatory Requirements"
)
def evaluate_inspection_compliance(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Executes the rule-based compliance engine:
    Compares Required standards against Verified evidence, calculates weighted score,
    identifies compliance outcomes, and checks approval eligibility.
    """
    return ComplianceService.evaluate_inspection(db, inspection_id, user=current_user)

@router.get(
    "/inspections/{inspection_id}",
    response_model=ComplianceSummary,
    summary="Get Current Compliance Summary for Inspection"
)
def get_inspection_compliance(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """Retrieves the full compliance evaluation breakdown for an inspection."""
    return ComplianceService.evaluate_inspection(db, inspection_id)

@router.put(
    "/items/{item_id}/override",
    response_model=ComplianceItemResponse,
    summary="Authorized Reviewer Override of Compliance Item"
)
def override_compliance_item(
    item_id: int,
    data: ComplianceOverrideRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Allows an authorized Reviewer or Admin to override a non-compliant or manual-review item
    with an explicit justification recorded in the immutable audit trail.
    """
    return ComplianceService.override_item(
        db=db,
        item_id=item_id,
        reason=data.override_reason,
        target_status=data.target_status,
        user=current_user
    )
