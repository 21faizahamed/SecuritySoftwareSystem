from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Health & Status"])

@router.get("/health", summary="Service Health Check")
def health_check():
    """Returns application health status and current phase information."""
    return {
        "status": "ok",
        "application": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
        "phase": "Phase 5 — Authentication & Roles"
    }
