import logging
import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User

logger = logging.getLogger("app.audit")

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        user: Optional[User] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """
        Records an immutable audit event in the database.
        """
        details_str = None
        if details:
            try:
                details_str = json.dumps(details, default=str)
            except Exception:
                details_str = str(details)

        log_entry = AuditLog(
            user_id=user.id if user else None,
            username=user.username if user else "SYSTEM",
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            details=details_str,
            ip_address=ip_address,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        logger.info(f"AUDIT: [{action}] on {entity_type}:{entity_id} by {log_entry.username}")
        return log_entry

    @staticmethod
    def get_logs(
        db: Session,
        page: int = 1,
        limit: int = 20,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        user_id: Optional[int] = None,
    ):
        query = db.query(AuditLog)
        if action:
            query = query.filter(AuditLog.action == action)
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        if entity_id:
            query = query.filter(AuditLog.entity_id == str(entity_id))
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)

        total = query.count()
        pages = (total + limit - 1) // limit if total > 0 else 1
        offset = (page - 1) * limit
        items = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }
