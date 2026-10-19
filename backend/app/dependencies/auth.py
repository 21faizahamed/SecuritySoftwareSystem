from typing import Optional, List, Callable, Union
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.models.user import User
from app.services.user_service import UserService
from app.core.security import decode_access_token

http_bearer = HTTPBearer(auto_error=False)

async def get_optional_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Extracts JWT Bearer token if provided, but returns None if missing or invalid."""
    if not auth_credentials or not auth_credentials.credentials:
        return None

    try:
        payload = decode_access_token(auth_credentials.credentials)
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        user_id = int(user_id_str)
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.is_active:
            return user
        return None
    except Exception:
        return None

async def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Extracts and validates JWT Bearer token and returns the authenticated User entity."""
    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_credentials.credentials

    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing subject identifier.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = int(user_id_str)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists in system.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Please contact an administrator.",
        )

    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensures user is authenticated and active."""
    return current_user

def require_roles(*allowed_roles: Union[str, List[str]]) -> Callable:
    """Dependency factory checking that current user possesses one of the required roles."""
    # Flatten if passed as a list
    flattened_roles = []
    for r in allowed_roles:
        if isinstance(r, (list, tuple, set)):
            flattened_roles.extend(r)
        else:
            flattened_roles.append(r)

    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_role = current_user.role.name if current_user.role else ""
        if user_role not in flattened_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role in {flattened_roles}. Your role is '{user_role}'.",
            )
        return current_user
    return role_checker

def require_permissions(*required_permissions: Union[str, List[str]]) -> Callable:
    """Dependency factory checking that current user's role possesses all required permissions."""
    flattened_perms = []
    for p in required_permissions:
        if isinstance(p, (list, tuple, set)):
            flattened_perms.extend(p)
        else:
            flattened_perms.append(p)

    async def permission_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if not current_user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User has no role assigned.",
            )

        user_perms = {p.name for p in current_user.role.permissions}
        # Admin bypass or exact match
        if current_user.role.name == "ADMIN":
            return current_user

        missing = [p for p in flattened_perms if p not in user_perms]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing required permission(s): {', '.join(missing)}.",
            )
        return current_user
    return permission_checker
