from app.api.routes.health import router as health_router
from app.api.routes.system import router as system_router
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.roles import router as roles_router
from app.api.routes.establishments import router as establishments_router
from app.api.routes.inspections import router as inspections_router
from app.api.routes.documents import router as documents_router
from app.api.routes.ai import router as ai_router
from app.api.routes.requirements import router as requirements_router
from app.api.routes.compliance import router as compliance_router
from app.api.routes.approvals import router as approvals_router
from app.api.routes.certificates import router as certificates_router
from app.api.routes.reports import router as reports_router
from app.api.routes.audit_logs import router as audit_logs_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.dashboard import router as dashboard_router

__all__ = [
    "health_router",
    "system_router",
    "auth_router",
    "users_router",
    "roles_router",
    "establishments_router",
    "inspections_router",
    "documents_router",
    "ai_router",
    "requirements_router",
    "compliance_router",
    "approvals_router",
    "certificates_router",
    "reports_router",
    "audit_logs_router",
    "notifications_router",
    "dashboard_router",
]
