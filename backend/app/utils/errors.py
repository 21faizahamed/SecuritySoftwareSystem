import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError

logger = logging.getLogger("app.errors")

class AppException(Exception):
    """Base application exception."""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, error_code: str = "APP_ERROR"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)

class NotFoundError(AppException):
    """Resource not found exception."""
    def __init__(self, message: str = "Resource not found", error_code: str = "NOT_FOUND"):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND, error_code=error_code)

class ConflictError(AppException):
    """Resource conflict / duplicate exception."""
    def __init__(self, message: str = "Resource already exists", error_code: str = "CONFLICT"):
        super().__init__(message=message, status_code=status.HTTP_409_CONFLICT, error_code=error_code)

class ValidationException(AppException):
    """Business rule validation exception."""
    def __init__(self, message: str = "Validation failed", error_code: str = "VALIDATION_ERROR"):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST, error_code=error_code)

class ForbiddenError(AppException):
    """Access denied / forbidden exception."""
    def __init__(self, message: str = "Access denied", error_code: str = "FORBIDDEN"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN, error_code=error_code)

class UnauthorizedError(AppException):
    """Authentication required / invalid credentials."""
    def __init__(self, message: str = "Authentication required", error_code: str = "UNAUTHORIZED"):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED, error_code=error_code)

class DatabaseUnavailableError(AppException):
    """Database connectivity failure."""
    def __init__(self, message: str = "Database service is temporarily unavailable", error_code: str = "DATABASE_UNAVAILABLE"):
        super().__init__(message=message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE, error_code=error_code)

# --- Exception Handlers ---

async def app_exception_handler(request: Request, exc: AppException):
    """Handles custom application exceptions."""
    logger.warning(f"Application exception on {request.method} {request.url.path}: [{exc.error_code}] {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.message,
            "error_code": exc.error_code,
            "path": request.url.path,
        }
    )

async def sqlalchemy_integrity_error_handler(request: Request, exc: IntegrityError):
    """Handles database integrity violations (e.g. foreign key constraint, unique key duplication)."""
    logger.error(f"Database IntegrityError on {request.method} {request.url.path}: {exc.orig}")
    
    orig_msg = str(exc.orig).lower()
    if "duplicate entry" in orig_msg or "1062" in orig_msg:
        detail = "A record with these unique details already exists."
        status_code = status.HTTP_409_CONFLICT
        error_code = "DUPLICATE_RECORD"
    elif "foreign key constraint" in orig_msg or "1452" in orig_msg:
        detail = "Referenced parent record does not exist."
        status_code = status.HTTP_400_BAD_REQUEST
        error_code = "INVALID_FOREIGN_KEY"
    else:
        detail = "Database constraint violation occurred."
        status_code = status.HTTP_400_BAD_REQUEST
        error_code = "INTEGRITY_VIOLATION"

    return JSONResponse(
        status_code=status_code,
        content={
            "detail": detail,
            "error_code": error_code,
            "path": request.url.path,
        }
    )

async def sqlalchemy_operational_error_handler(request: Request, exc: OperationalError):
    """Handles database server down / timeout errors."""
    logger.critical(f"Database OperationalError on {request.method} {request.url.path}: {exc.orig}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Database connection is currently unavailable. Please check MySQL service.",
            "error_code": "DATABASE_OFFLINE",
            "path": request.url.path,
        }
    )

async def global_exception_handler(request: Request, exc: Exception):
    """Fallback handler for unexpected uncaught exceptions."""
    logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected internal server error occurred.",
            "error_code": "INTERNAL_SERVER_ERROR",
            "path": request.url.path,
        }
    )
