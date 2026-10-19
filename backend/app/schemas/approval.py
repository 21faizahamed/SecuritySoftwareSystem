from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SubmitForReviewRequest(BaseModel):
    inspector_notes: Optional[str] = None

class ReviewApprovalRequest(BaseModel):
    reviewer_notes: Optional[str] = None
    force_override: bool = False
    override_reason: Optional[str] = None

class ReviewRejectionRequest(BaseModel):
    rejection_reason: str
    reviewer_notes: Optional[str] = None

class ApprovalResponse(BaseModel):
    inspection_id: int
    inspection_number: str
    previous_status: str
    current_status: str
    approved_by: Optional[str] = None
    action_timestamp: datetime
    message: str
    certificate_id: Optional[int] = None
    certificate_number: Optional[str] = None
