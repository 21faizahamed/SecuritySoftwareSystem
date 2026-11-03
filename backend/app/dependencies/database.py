from typing import Generator
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, ensure_database_ready

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a transactional database session per request.
    Ensures sessions are closed automatically when request finishes.
    """
    ensure_database_ready()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
