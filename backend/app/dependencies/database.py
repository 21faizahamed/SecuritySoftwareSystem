from typing import Generator
from sqlalchemy.orm import Session
from app.core.database import SessionLocal

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a transactional database session per request.
    Ensures sessions are closed automatically when request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
