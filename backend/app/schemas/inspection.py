from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime
from app.schemas.establishment import EstablishmentResponse

class UserSummary(BaseModel):
    id: int
    username: str
    full_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)

class InspectionBase(BaseModel):
    establishment_id: int
    inspection_type: str = "INITIAL"
    inspection_date: Optional[datetime] = None
    status: str = "DRAFT"
    notes: Optional[str] = None
    inspector_id: Optional[int] = None
    reviewer_id: Optional[int] = None

class InspectionCreate(InspectionBase):
    inspection_number: Optional[str] = None

class InspectionUpdate(BaseModel):
    establishment_id: Optional[int] = None
    inspection_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    inspection_date: Optional[datetime] = None
    inspector_id: Optional[int] = None
    reviewer_id: Optional[int] = None
    compliance_score: Optional[float] = None
    compliance_summary: Optional[str] = None

class InspectionResponse(InspectionBase):
    id: int
    inspection_number: str
    compliance_score: Optional[float] = None
    compliance_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    establishment: Optional[EstablishmentResponse] = None
    inspector: Optional[UserSummary] = None
    reviewer: Optional[UserSummary] = None

    model_config = ConfigDict(from_attributes=True)
