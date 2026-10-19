from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, default=1, nullable=False)
    object_type = Column(String(50), nullable=False, index=True)
    confidence = Column(Float, default=1.0, nullable=False)
    
    # Normalized Bounding Box [0.0 - 1.0] or pixel coordinates
    bbox_x_min = Column(Float, nullable=False, default=0.0)
    bbox_y_min = Column(Float, nullable=False, default=0.0)
    bbox_x_max = Column(Float, nullable=False, default=0.0)
    bbox_y_max = Column(Float, nullable=False, default=0.0)
    
    detection_source = Column(String(50), default="YOLOv8_SECURITY_DETECTOR", nullable=False)
    model_version = Column(String(50), default="yolov8n-sec-v1.0", nullable=False)
    verification_status = Column(String(30), default="DETECTED", nullable=False, index=True) # DETECTED, VERIFIED, REJECTED, MODIFIED, MANUALLY_ADDED
    
    verified_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    inspector_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    inspection = relationship("Inspection", back_populates="detections")
    document = relationship("Document", back_populates="detections")
    verified_by = relationship("User", foreign_keys=[verified_by_id])

    def __repr__(self) -> str:
        return f"<Detection(id={self.id}, object='{self.object_type}', conf={self.confidence:.2f}, status='{self.verification_status}')>"
