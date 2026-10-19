import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import require_roles
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse
from app.schemas.common import PaginatedResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail & Security Logs"])

@router.get(
    "",
    response_model=PaginatedResponse[AuditLogResponse],
    summary="List Audit Log Events (Paginated & Filterable)"
)
def list_audit_logs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (INSPECTION, DOCUMENT, CERTIFICATE, USER)"),
    entity_id: Optional[str] = Query(None, description="Filter by entity primary key"),
    user_id: Optional[int] = Query(None, description="Filter by actor user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER"])),
):
    """
    Retrieves the immutable system and security audit trail.
    Available to authorized Administrators and Reviewers.
    """
    res = AuditService.get_logs(
        db=db,
        page=page,
        limit=limit,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
    )
    return PaginatedResponse(
        items=[AuditLogResponse.model_validate(i) for i in res["items"]],
        total=res["total"],
        page=res["page"],
        limit=res["limit"],
        pages=res["pages"],
    )

@router.get(
    "/export/csv",
    summary="Export Audit Trail as CSV for Compliance Archive"
)
def export_audit_logs_csv(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER"])),
):
    """Generates and downloads a CSV export of system audit logs."""
    res = AuditService.get_logs(
        db=db,
        page=1,
        limit=1000,
        action=action,
        entity_type=entity_type,
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp", "Username", "Action", "Entity Type", "Entity ID", "IP Address", "Details"])

    for item in res["items"]:
        writer.writerow([
            item.id,
            item.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            item.username or "SYSTEM",
            item.action,
            item.entity_type,
            item.entity_id or "",
            item.ip_address or "",
            item.details or "",
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=security_system_audit_logs.csv"}
    )
