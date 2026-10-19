from typing import Generic, List, TypeVar, Optional
from pydantic import BaseModel, Field

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int = Field(..., description="Total count of matching records")
    page: int = Field(..., description="Current page number (1-indexed)")
    limit: int = Field(..., description="Number of items per page")
    pages: int = Field(..., description="Total number of pages available")

class MessageResponse(BaseModel):
    message: str
    detail: str = ""

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
    path: Optional[str] = None
