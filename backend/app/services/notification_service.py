import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.models.role import Role

logger = logging.getLogger("app.notification_service")

class NotificationService:
    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        limit: int = 30,
        unread_only: bool = False
    ) -> List[Notification]:
        """Retrieves recent notifications for a user."""
        query = db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.is_read == False)
        return query.order_by(Notification.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        """Returns total unread notifications count for a user."""
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        link: Optional[str] = None,
        notification_type: str = "INFO"
    ) -> Notification:
        """Creates an in-app notification for a specific user."""
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            link=link,
            notification_type=notification_type.upper(),
            is_read=False,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

    @staticmethod
    def notify_role(
        db: Session,
        role_name: str,
        title: str,
        message: str,
        link: Optional[str] = None,
        notification_type: str = "INFO"
    ):
        """Broadcasts a notification to all active users with a specified role."""
        role = db.query(Role).filter(Role.name == role_name.upper()).first()
        if not role:
            return

        users = db.query(User).filter(User.role_id == role.id, User.is_active == True).all()
        for u in users:
            notif = Notification(
                user_id=u.id,
                title=title,
                message=message,
                link=link,
                notification_type=notification_type.upper(),
                is_read=False,
            )
            db.add(notif)
        db.commit()

    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> bool:
        """Marks a single notification as read."""
        notif = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if notif:
            notif.is_read = True
            db.commit()
            return True
        return False

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> int:
        """Marks all notifications for a user as read."""
        updated = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True})
        db.commit()
        return updated
