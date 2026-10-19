from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class DocumentBase(BaseModel):
    inspection_id: int
    original_filename: str
    stored_filename: str
    file_path: str
    file_type: str
    file_size: int
    upload_status: str = "UPLOADED"
    uploaded_by_id: Optional[int] = None
    sha256_hash: Optional[str] = None
    extracted_text: Optional[str] = None
    page_count: int = 1

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
