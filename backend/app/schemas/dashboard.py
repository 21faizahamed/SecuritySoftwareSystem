from pydantic import BaseModel
from typing import List, Dict, Any
from app.schemas.inspection import InspectionResponse
from app.schemas.audit_log import AuditLogResponse

class InspectionStatusCount(BaseModel):
    status: str
    count: int

class EstablishmentTypeCount(BaseModel):
    establishment_type: str
    count: int

class DashboardStatsResponse(BaseModel):
    total_establishments: int
    active_establishments: int
    total_inspections: int
    active_inspections: int
    pending_inspections: int = 0
    completed_inspections: int = 0
    pending_verification_inspections: int
    awaiting_review_inspections: int
    inspections_awaiting_review: int = 0
    approved_inspections: int
    compliant_inspections: int = 0
    rejected_inspections: int
    non_compliant_inspections: int = 0
    compliance_rate: float = 0.0
    total_certificates: int
    active_certificates: int
    certificates_issued: int = 0
    certificates_expiring_soon: int = 0
    average_compliance_score: float
    inspection_status_breakdown: List[InspectionStatusCount]
    establishment_type_breakdown: List[EstablishmentTypeCount]
    recent_inspections: List[InspectionResponse]
    recent_activities: List[AuditLogResponse]
