from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Establishment(Base):
    __tablename__ = "establishments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    establishment_type = Column(String(100), nullable=False, index=True)
    address = Column(Text, nullable=False)
    owner_name = Column(String(255), nullable=True)
    contact_information = Column(String(255), nullable=True)
    location_coordinates = Column(String(100), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    inspections = relationship("Inspection", back_populates="establishment", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="establishment", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Establishment(id={self.id}, name='{self.name}', type='{self.establishment_type}', status='{self.status}')>"
