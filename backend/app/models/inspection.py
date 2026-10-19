from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    inspection_number = Column(String(64), unique=True, nullable=False, index=True)
    establishment_id = Column(Integer, ForeignKey("establishments.id", ondelete="CASCADE"), nullable=False, index=True)
    inspector_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    inspection_type = Column(String(50), default="INITIAL", nullable=False) # INITIAL, ANNUAL_RENEWAL, COMPLIANCE_FOLLOWUP, SPECIAL
    inspection_date = Column(DateTime, server_default=func.now(), nullable=False)
    
    # State Machine: DRAFT, IN_PROGRESS, AWAITING_VERIFICATION, AWAITING_REVIEW, APPROVED, REJECTED, COMPLETED, CANCELLED
    status = Column(String(50), default="DRAFT", nullable=False, index=True)
    
    compliance_score = Column(Float, nullable=True) # e.g. 92.5
    compliance_summary = Column(Text, nullable=True) # JSON string with breakdown
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    establishment = relationship("Establishment", back_populates="inspections")
    inspector = relationship("User", foreign_keys=[inspector_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    documents = relationship("Document", back_populates="inspection", cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="inspection", cascade="all, delete-orphan")
    compliance_items = relationship("InspectionComplianceItem", back_populates="inspection", cascade="all, delete-orphan")
    certificate = relationship("Certificate", back_populates="inspection", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Inspection(id={self.id}, number='{self.inspection_number}', status='{self.status}', score={self.compliance_score})>"
