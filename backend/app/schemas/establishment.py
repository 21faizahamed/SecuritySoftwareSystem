from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class EstablishmentBase(BaseModel):
    name: str
    establishment_type: str
    address: str
    owner_name: Optional[str] = None
    contact_information: Optional[str] = None
    location_coordinates: Optional[str] = None
    status: str = "ACTIVE"

class EstablishmentCreate(EstablishmentBase):
    pass

class EstablishmentUpdate(BaseModel):
    name: Optional[str] = None
    establishment_type: Optional[str] = None
    address: Optional[str] = None
    owner_name: Optional[str] = None
    contact_information: Optional[str] = None
    location_coordinates: Optional[str] = None
    status: Optional[str] = None

class EstablishmentResponse(EstablishmentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
