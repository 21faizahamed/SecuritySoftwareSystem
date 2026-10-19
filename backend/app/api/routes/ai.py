from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user, get_optional_current_user
from app.models.user import User
from app.schemas.detection import (
    AIAnalysisResponse,
    DetectionResponse,
    DetectionVerifyRequest,
    DetectionManualCreate,
    DetectionCountSummary,
)
from app.schemas.common import MessageResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Computer Vision & Detections"])

@router.post(
    "/analyze-document/{document_id}",
    response_model=AIAnalysisResponse,
    summary="Run AI Object Detection on Uploaded Document"
)
def analyze_document(
    document_id: int,
    confidence_threshold: float = Query(0.25, ge=0.05, le=0.95, description="Detection confidence cutoff"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Executes YOLOv8 object detection on the uploaded image evidence.
    Identifies security, safety, and architectural elements and stores normalized bounding boxes.
    """
    return AIService.run_detection_pipeline(
        db=db,
        document_id=document_id,
        user=current_user,
        confidence_threshold=confidence_threshold
    )

@router.get(
    "/inspections/{inspection_id}/detections",
    response_model=List[DetectionResponse],
    summary="Get Detections for an Inspection"
)
def get_inspection_detections(
    inspection_id: int,
    document_id: Optional[int] = Query(None, description="Filter by document ID"),
    status: Optional[str] = Query(None, description="Filter by status (DETECTED, VERIFIED, REJECTED, MODIFIED, MANUALLY_ADDED)"),
    object_type: Optional[str] = Query(None, description="Filter by object class"),
    db: Session = Depends(get_db)
):
    """Retrieves all detected objects and human-verified items for an inspection."""
    return AIService.get_inspection_detections(
        db=db,
        inspection_id=inspection_id,
        document_id=document_id,
        verification_status=status,
        object_type=object_type
    )

@router.get(
    "/inspections/{inspection_id}/detection-counts",
    response_model=List[DetectionCountSummary],
    summary="Get Verified vs Detected Object Counts for Inspection"
)
def get_detection_counts(
    inspection_id: int,
    db: Session = Depends(get_db)
):
    """Aggregates total detected, verified, and rejected counts per object type."""
    return AIService.get_detection_counts_by_inspection(db, inspection_id)

@router.put(
    "/detections/{id}/verify",
    response_model=DetectionResponse,
    summary="Inspector Human Verification of Detection"
)
def verify_detection(
    id: int,
    data: DetectionVerifyRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Inspector accepts, rejects, modifies bounding box, or reclassifies an AI detection.
    Every change is audited for traceability.
    """
    return AIService.verify_detection(db, id, data, user=current_user)

@router.post(
    "/inspections/{inspection_id}/detections/manual",
    response_model=DetectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manually Add Missing Security Object Detection"
)
def add_manual_detection(
    inspection_id: int,
    data: DetectionManualCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Allows an inspector to manually add an object that AI missed."""
    return AIService.create_manual_detection(db, inspection_id, data, user=current_user)

@router.delete(
    "/detections/{id}",
    response_model=MessageResponse,
    summary="Delete Detection"
)
def delete_detection(
    id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Deletes a detection record."""
    AIService.delete_detection(db, id, user=current_user)
    return MessageResponse(
        message="Detection removed successfully",
        detail=f"Detection with ID {id} was deleted"
    )
