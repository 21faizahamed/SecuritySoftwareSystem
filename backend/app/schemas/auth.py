from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserResponse

class LoginRequest(BaseModel):
    username: str  # Can accept either username or email
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CurrentUserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    role: str
    permissions: List[str]

    model_config = ConfigDict(from_attributes=True)

# Alias for compatibility
UserProfileResponse = CurrentUserResponse
