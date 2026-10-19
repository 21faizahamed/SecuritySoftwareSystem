from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.requirement import RequirementResponse

class ComplianceItemResponse(BaseModel):
    id: int
    inspection_id: int
    requirement_id: int
    detected_quantity: int
    verified_quantity: int
    required_quantity: Optional[int] = None
    status: str # COMPLIANT, NON_COMPLIANT, REQUIRES_MANUAL_REVIEW, INSUFFICIENT_EVIDENCE, NOT_APPLICABLE
    evidence_notes: Optional[str] = None
    evaluated_at: datetime
    is_overridden: bool = False
    override_reason: Optional[str] = None
    overridden_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    requirement: Optional[RequirementResponse] = None

    model_config = ConfigDict(from_attributes=True)

class ComplianceOverrideRequest(BaseModel):
    override_reason: str
    target_status: str = "COMPLIANT" # COMPLIANT or NOT_APPLICABLE

class ComplianceEvaluateRequest(BaseModel):
    establishment_type: Optional[str] = None

class ComplianceSummary(BaseModel):
    inspection_id: int
    inspection_number: str
    total_requirements: int
    satisfied_count: int
    unsatisfied_count: int
    pending_verification_count: int
    not_applicable_count: int
    overridden_count: int
    mandatory_violations: int
    compliance_score: float # 0.0 - 100.0
    is_eligible_for_approval: bool
    summary_message: str
    evaluated_at: datetime
    items: List[ComplianceItemResponse]
