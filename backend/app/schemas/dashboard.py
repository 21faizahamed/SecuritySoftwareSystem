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
    pending_verification_inspections: int
    awaiting_review_inspections: int
    approved_inspections: int
    rejected_inspections: int
    total_certificates: int
    active_certificates: int
    average_compliance_score: float
    inspection_status_breakdown: List[InspectionStatusCount]
    establishment_type_breakdown: List[EstablishmentTypeCount]
    recent_inspections: List[InspectionResponse]
    recent_activities: List[AuditLogResponse]
