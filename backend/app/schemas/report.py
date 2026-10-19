from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReportGenerateRequest(BaseModel):
    include_audit_trail: bool = True
    include_raw_detections: bool = True

class ReportResponse(BaseModel):
    inspection_id: int
    inspection_number: str
    report_filename: str
    report_path: str
    file_size_bytes: int
    generated_at: datetime
    download_url: str
