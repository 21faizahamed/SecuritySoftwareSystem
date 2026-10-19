from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class InspectionComplianceItem(Base):
    __tablename__ = "inspection_compliance_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    
    detected_quantity = Column(Integer, default=0, nullable=False)
    verified_quantity = Column(Integer, default=0, nullable=False)
    required_quantity = Column(Integer, nullable=True)
    
    status = Column(String(50), default="REQUIRES_MANUAL_REVIEW", nullable=False, index=True) # COMPLIANT, NON_COMPLIANT, REQUIRES_MANUAL_REVIEW, INSUFFICIENT_EVIDENCE, NOT_APPLICABLE
    evidence_notes = Column(Text, nullable=True)
    evaluated_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Authorized override support
    is_overridden = Column(Boolean, default=False, nullable=False)
    override_reason = Column(Text, nullable=True)
    overridden_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    inspection = relationship("Inspection", back_populates="compliance_items")
    requirement = relationship("Requirement", back_populates="compliance_items")
    overridden_by = relationship("User", foreign_keys=[overridden_by_id])

    def __repr__(self) -> str:
        return f"<InspectionComplianceItem(inspection_id={self.inspection_id}, req_id={self.requirement_id}, status='{self.status}')>"
