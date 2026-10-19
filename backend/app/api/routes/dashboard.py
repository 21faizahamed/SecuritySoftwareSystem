from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_optional_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardStatsResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Real-Time Metrics"])

@router.get(
    "/stats",
    response_model=DashboardStatsResponse,
    summary="Get Real-Time Database Metrics for Dashboard"
)
def get_dashboard_statistics(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Returns live aggregated database metrics:
    total establishments, inspections breakdown by status, certificates issued,
    average compliance scores, and recent activity streams.
    """
    return DashboardService.get_dashboard_metrics(db, user=current_user)
