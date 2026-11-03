from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.requirement import RequirementResponse

class ComplianceItemResponse(BaseModel):
    id: int
    inspection_id: int
    requirement_id: int
    requirement_code: Optional[str] = None
    requirement_title: Optional[str] = None
    category: Optional[str] = None
    is_mandatory: bool = True
    detected_quantity: int = 0
    verified_quantity: int = 0
    required_quantity: Optional[int] = None
    required_value_text: Optional[str] = None
    detected_value_text: Optional[str] = None
    is_satisfied: bool = False
    status: str # COMPLIANT, NON_COMPLIANT, REQUIRES_MANUAL_REVIEW, INSUFFICIENT_EVIDENCE, NOT_APPLICABLE
    source_document: Optional[str] = None
    source_section: Optional[str] = None
    source_page: Optional[int] = None
    notes: Optional[str] = None
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
    status: Optional[str] = None
    target_status: str = "COMPLIANT" # COMPLIANT or NOT_APPLICABLE

class ComplianceEvaluateRequest(BaseModel):
    establishment_type: Optional[str] = None

class ComplianceSummary(BaseModel):
    inspection_id: int
    inspection_number: str
    total_requirements: int
    satisfied_count: int
    unsatisfied_count: int
    non_compliant_count: int = 0
    pending_verification_count: int
    manual_review_count: int = 0
    not_applicable_count: int
    overridden_count: int
    mandatory_violations: int
    compliance_score: float # 0.0 - 100.0
    overall_status: str = "REQUIRES_MANUAL_REVIEW"
    is_eligible_for_approval: bool
    summary_message: str
    evaluated_at: datetime
    items: List[ComplianceItemResponse]
