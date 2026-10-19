from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class CertificateIssueRequest(BaseModel):
    expiry_months: int = 12

class CertificateResponse(BaseModel):
    id: int
    certificate_number: str
    inspection_id: int
    establishment_id: int
    issued_by_id: int
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    status: str # ACTIVE, EXPIRED, REVOKED, SUSPENDED
    compliance_score: float
    qr_code_data: str
    qr_code_image_path: Optional[str] = None
    pdf_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PublicCertificateVerificationResponse(BaseModel):
    certificate_number: str
    is_valid: bool
    status: str # ACTIVE, EXPIRED, REVOKED, SUSPENDED, NOT_FOUND
    establishment_name: str
    establishment_type: str
    address: str
    inspection_number: str
    inspection_date: Optional[datetime] = None
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    compliance_score: Optional[float] = None
    verification_message: str
    verification_timestamp: datetime
