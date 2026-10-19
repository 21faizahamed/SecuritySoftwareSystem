from sqlalchemy import Column, Integer, String, BigInteger, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True, index=True)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=False) # e.g. application/pdf, image/jpeg, image/png
    file_size = Column(BigInteger, nullable=False)
    sha256_hash = Column(String(64), nullable=True)
    
    # Processing Pipeline: UPLOADED, PROCESSING, PROCESSED, OCR_COMPLETE, FAILED, NEEDS_REVIEW
    upload_status = Column(String(50), default="UPLOADED", nullable=False, index=True)
    
    extracted_text = Column(Text, nullable=True)
    page_count = Column(Integer, default=1, nullable=False)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    inspection = relationship("Inspection", back_populates="documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    detections = relationship("Detection", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Document(id={self.id}, file='{self.original_filename}', status='{self.upload_status}')>"
