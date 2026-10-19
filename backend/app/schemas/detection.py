from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class DetectionBase(BaseModel):
    inspection_id: int
    document_id: int
    page_number: int = 1
    object_type: str
    confidence: float = 1.0
    bbox_x_min: float = 0.0
    bbox_y_min: float = 0.0
    bbox_x_max: float = 0.0
    bbox_y_max: float = 0.0
    detection_source: str = "YOLOv8_SECURITY_DETECTOR"
    model_version: str = "yolov8n-sec-v1.0"
    verification_status: str = "DETECTED" # DETECTED, VERIFIED, REJECTED, MODIFIED, MANUALLY_ADDED
    inspector_notes: Optional[str] = None

class DetectionCreate(DetectionBase):
    pass

class DetectionManualCreate(BaseModel):
    document_id: int
    page_number: int = 1
    object_type: str
    bbox_x_min: float
    bbox_y_min: float
    bbox_x_max: float
    bbox_y_max: float
    inspector_notes: Optional[str] = None

class DetectionUpdate(BaseModel):
    object_type: Optional[str] = None
    bbox_x_min: Optional[float] = None
    bbox_y_min: Optional[float] = None
    bbox_x_max: Optional[float] = None
    bbox_y_max: Optional[float] = None
    verification_status: Optional[str] = None
    inspector_notes: Optional[str] = None

class DetectionVerifyRequest(BaseModel):
    verification_status: str # VERIFIED, REJECTED, MODIFIED
    inspector_notes: Optional[str] = None
    object_type: Optional[str] = None
    bbox_x_min: Optional[float] = None
    bbox_y_min: Optional[float] = None
    bbox_x_max: Optional[float] = None
    bbox_y_max: Optional[float] = None

class DetectionResponse(DetectionBase):
    id: int
    verified_by_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DetectionCountSummary(BaseModel):
    object_type: str
    detected_count: int
    verified_count: int
    rejected_count: int

class AIAnalysisResponse(BaseModel):
    document_id: int
    inspection_id: int
    model_name: str
    model_version: str
    total_detections: int
    detections: List[DetectionResponse]
    summary_counts: List[DetectionCountSummary]

class ConstructionPhotoResult(BaseModel):
    document_id: int
    filename: str
    predicted_class: str
    confidence: float
    completion_percentage: float

class ConstructionReadinessResponse(BaseModel):
    inspection_id: int
    completion_pct: float
    is_eligible: bool
    status: str # "IN_SCOPE", "OUT_OF_SCOPE", "PENDING_EVALUATION"
    message: str
    land_plot: Optional[str] = None
    trade_license: Optional[str] = None
    sira_chapter: Optional[str] = None
    photos_analyzed: int
    photo_results: List[ConstructionPhotoResult] = []
    artifacts: List[str] = []

