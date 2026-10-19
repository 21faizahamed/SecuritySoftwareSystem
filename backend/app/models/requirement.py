from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requirement_code = Column(String(50), unique=True, nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    requirement_type = Column(String(50), default="MIN_QUANTITY", nullable=False) # MIN_QUANTITY, MAX_QUANTITY, REQUIRED_PRESENCE, PROHIBITED_CONDITION, DOCUMENTATION
    target_object_type = Column(String(50), nullable=True, index=True) # e.g. cctv_camera, emergency_exit, fire_extinguisher
    min_quantity = Column(Integer, nullable=True)
    max_quantity = Column(Integer, nullable=True)
    unit = Column(String(30), default="units", nullable=False)
    establishment_type = Column(String(100), default="ALL", nullable=False)
    
    severity = Column(String(30), default="MANDATORY", nullable=False) # MANDATORY, HIGH, MEDIUM, LOW, RECOMMENDED
    is_mandatory = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Regulatory Source Traceability (Module 9 & 20)
    source_document = Column(String(255), default="دليل نظم وقائية (2).pdf", nullable=False)
    source_version = Column(String(50), default="v2024.1", nullable=False)
    source_section = Column(String(150), nullable=True)
    source_page = Column(Integer, nullable=True)
    original_text = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    compliance_items = relationship("InspectionComplianceItem", back_populates="requirement", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Requirement(code='{self.requirement_code}', title='{self.title}', category='{self.category}')>"
