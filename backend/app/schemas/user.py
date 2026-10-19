from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from datetime import datetime
from app.schemas.role import RoleResponse

class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    role_id: int
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    role: Optional[RoleResponse] = None

    model_config = ConfigDict(from_attributes=True)
