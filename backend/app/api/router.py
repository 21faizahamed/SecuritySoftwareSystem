from fastapi import APIRouter
from app.api.routes import (
    health_router,
    system_router,
    auth_router,
    users_router,
    roles_router,
    establishments_router,
    inspections_router,
    documents_router,
    ai_router,
    requirements_router,
    compliance_router,
    approvals_router,
    certificates_router,
    reports_router,
    audit_logs_router,
    notifications_router,
    dashboard_router,
)

api_v1_router = APIRouter(prefix="/api/v1")

# Include all modular sub-routers
api_v1_router.include_router(health_router)
api_v1_router.include_router(system_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(roles_router)
api_v1_router.include_router(establishments_router)
api_v1_router.include_router(inspections_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(requirements_router)
api_v1_router.include_router(compliance_router)
api_v1_router.include_router(approvals_router)
api_v1_router.include_router(certificates_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(audit_logs_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(dashboard_router)

__all__ = ["api_v1_router"]
