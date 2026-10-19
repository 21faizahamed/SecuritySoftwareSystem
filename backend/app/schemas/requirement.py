from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class RequirementBase(BaseModel):
    requirement_code: str
    category: str
    title: str
    description: str
    requirement_type: str = "MIN_QUANTITY" # MIN_QUANTITY, MAX_QUANTITY, REQUIRED_PRESENCE, PROHIBITED_CONDITION, DOCUMENTATION, DISTANCE, COVERAGE
    target_object_type: Optional[str] = None
    min_quantity: Optional[int] = None
    max_quantity: Optional[int] = None
    unit: str = "units"
    establishment_type: str = "ALL"
    severity: str = "MANDATORY" # MANDATORY, HIGH, MEDIUM, LOW, RECOMMENDED
    is_mandatory: bool = True
    is_active: bool = True
    source_document: str = "دليل نظم وقائية (2).pdf"
    source_version: str = "v2024.1"
    source_section: Optional[str] = None
    source_page: Optional[int] = None
    original_text: Optional[str] = None

class RequirementCreate(RequirementBase):
    pass

class RequirementUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    requirement_type: Optional[str] = None
    target_object_type: Optional[str] = None
    min_quantity: Optional[int] = None
    max_quantity: Optional[int] = None
    unit: Optional[str] = None
    establishment_type: Optional[str] = None
    severity: Optional[str] = None
    is_mandatory: Optional[bool] = None
    is_active: Optional[bool] = None
    source_document: Optional[str] = None
    source_version: Optional[str] = None
    source_section: Optional[str] = None
    source_page: Optional[int] = None
    original_text: Optional[str] = None

class RequirementResponse(RequirementBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RequirementSearchMatch(BaseModel):
    requirement: RequirementResponse
    similarity_score: float
    matched_term: str
    source_citation: str
