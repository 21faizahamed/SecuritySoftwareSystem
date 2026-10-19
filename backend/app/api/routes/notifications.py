from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.schemas.common import MessageResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["In-App Notifications & Alerts"])

@router.get(
    "",
    response_model=List[NotificationResponse],
    summary="Get Notifications for Current Authenticated User"
)
def get_my_notifications(
    limit: int = Query(30, ge=1, le=100),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieves notifications and alerts for the currently logged in user."""
    return NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.id,
        limit=limit,
        unread_only=unread_only
    )

@router.get(
    "/unread-count",
    summary="Get Count of Unread Notifications"
)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, int]:
    """Returns number of unread notifications for badge display."""
    count = NotificationService.get_unread_count(db, current_user.id)
    return {"unread_count": count}

@router.put(
    "/{id}/read",
    response_model=MessageResponse,
    summary="Mark Notification as Read"
)
def mark_notification_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Marks a single notification as read."""
    NotificationService.mark_as_read(db, id, current_user.id)
    return MessageResponse(message="Notification marked as read")

@router.put(
    "/read-all",
    response_model=MessageResponse,
    summary="Mark All Notifications as Read"
)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Marks all notifications for current user as read."""
    count = NotificationService.mark_all_as_read(db, current_user.id)
    return MessageResponse(message=f"{count} notifications marked as read")
