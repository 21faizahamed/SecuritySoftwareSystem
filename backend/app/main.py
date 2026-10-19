from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError, OperationalError

from app.core.config import settings
from app.core.logging import logger, RequestLoggingMiddleware
from app.core.database import Base, engine, check_db_connection
from app.api.router import api_v1_router
from app.utils.errors import (
    AppException,
    app_exception_handler,
    sqlalchemy_integrity_error_handler,
    sqlalchemy_operational_error_handler,
    global_exception_handler,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown procedures."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION} [{settings.APP_ENV}]...")
    try:
        # Initialize tables from SQLAlchemy metadata
        Base.metadata.create_all(bind=engine)
        db_info = check_db_connection()
        logger.info(
            f"Database initialized: {db_info['status'].upper()} | "
            f"DB: '{db_info.get('database')}' on {db_info.get('host')}:{db_info.get('port')} "
            f"({db_info.get('version', 'unknown')})"
        )

        # Seed roles, permissions, initial admin user, and regulatory standards
        from app.core.database import SessionLocal
        from app.services.role_service import RoleService
        from app.services.requirement_service import RequirementService
        with SessionLocal() as db:
            RoleService.seed_default_roles_and_permissions(db)
            RoleService.seed_initial_admin(db)
            RequirementService.seed_default_regulatory_requirements(db)

    except Exception as e:
        logger.warning(f"Database initialization warning on startup: {e}")
    
    yield
    
    logger.info(f"Shutting down {settings.APP_NAME}...")

app = FastAPI(
    title=settings.APP_NAME,
    description="End-to-End Security Certificate & Compliance Inspection System Platform",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# 1. Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Central Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(IntegrityError, sqlalchemy_integrity_error_handler)
app.add_exception_handler(OperationalError, sqlalchemy_operational_error_handler)
app.add_exception_handler(Exception, global_exception_handler)

# 4. Versioned API Router (/api/v1)
app.include_router(api_v1_router)

# 4.1 Legacy Phase 2 Test Router (/api/test)
try:
    from app.api.test import router as test_legacy_router
    app.include_router(test_legacy_router, prefix="/api")
except ImportError:
    pass

# 5. Static Files & Single Page Application (SPA) Serving
import sys
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

if getattr(sys, 'frozen', False):
    base_dir = getattr(sys, '_MEIPASS', os.path.abspath("."))
    frontend_dist = os.path.join(base_dir, "frontend_dist")
else:
    frontend_dist = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    )

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/favicon.svg", include_in_schema=False)
    def favicon_svg():
        f = os.path.join(frontend_dist, "favicon.svg")
        return FileResponse(f) if os.path.exists(f) else {"status": "ok"}

    @app.get("/icons.svg", include_in_schema=False)
    def icons_svg():
        f = os.path.join(frontend_dist, "icons.svg")
        return FileResponse(f) if os.path.exists(f) else {"status": "ok"}

# 6. Root & Backward Compatibility Endpoints
@app.get("/", summary="Root Application / API Index", tags=["Root"])
def root():
    if os.path.exists(frontend_dist):
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    return {
        "message": f"{settings.APP_NAME} API is running",
        "phase": "Phase 6 — Complete Security Certificate System",
        "version": settings.VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "api_v1": settings.API_V1_PREFIX,
        "health_check": f"{settings.API_V1_PREFIX}/health"
    }

@app.get("/health", summary="Health Check (Legacy Alias)", tags=["Health & Status"])
def legacy_health_check():
    """Backward-compatible health endpoint."""
    return {
        "status": "ok",
        "application": settings.APP_NAME,
        "version": settings.VERSION,
        "phase": "Phase 6 — Complete Security Certificate System"
    }

@app.get("/api/system/database-status", summary="Database Status (Legacy Alias)", tags=["System & Database Diagnostics"])
def legacy_database_status():
    """Backward-compatible database status endpoint."""
    return check_db_connection()

if os.path.exists(frontend_dist):
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_routes(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Endpoint not found")
        
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

