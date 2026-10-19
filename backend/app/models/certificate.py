from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    certificate_number = Column(String(64), unique=True, nullable=False, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    establishment_id = Column(Integer, ForeignKey("establishments.id", ondelete="CASCADE"), nullable=False, index=True)
    
    issued_by_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    issue_date = Column(DateTime, server_default=func.now(), nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    
    status = Column(String(30), default="ACTIVE", nullable=False, index=True) # ACTIVE, EXPIRED, REVOKED, SUSPENDED
    compliance_score = Column(Float, default=100.0, nullable=False)
    
    qr_code_data = Column(Text, nullable=False)
    qr_code_image_path = Column(String(500), nullable=True)
    pdf_path = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    inspection = relationship("Inspection", back_populates="certificate")
    establishment = relationship("Establishment", back_populates="certificates")
    issued_by = relationship("User", foreign_keys=[issued_by_id])

    def __repr__(self) -> str:
        return f"<Certificate(number='{self.certificate_number}', status='{self.status}', score={self.compliance_score})>"
