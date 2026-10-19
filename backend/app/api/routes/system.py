from fastapi import APIRouter
from app.core.database import check_db_connection

router = APIRouter(prefix="/system", tags=["System & Database Diagnostics"])

@router.get("/database-status", summary="MySQL Database Status Check")
def get_database_status():
    """Executes a live query to verify MySQL connectivity, tables, and server version."""
    return check_db_connection()
