import math
from datetime import datetime, timezone
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password
from app.utils.errors import NotFoundError, ConflictError, AppException

class UserService:
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError(f"User with ID {user_id} was not found")
        return user

    @staticmethod
    def get_by_username_or_email(db: Session, identifier: str) -> Optional[User]:
        clean_id = identifier.strip().lower()
        return db.query(User).filter(
            or_(
                User.username.ilike(clean_id),
                User.email.ilike(clean_id)
            )
        ).first()

    @staticmethod
    def get_paginated(
        db: Session,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        role_id: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[User], int, int]:
        query = db.query(User)

        if role_id:
            query = query.filter(User.role_id == role_id)

        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    User.username.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.full_name.ilike(search_pattern),
                )
            )

        total = query.count()
        pages = math.ceil(total / limit) if total > 0 else 1
        offset = (page - 1) * limit
        items = query.order_by(User.id.desc()).offset(offset).limit(limit).all()

        return items, total, pages

    @staticmethod
    def create(db: Session, data: UserCreate) -> User:
        clean_username = data.username.strip()
        clean_email = data.email.strip().lower()

        # Check unique username
        if db.query(User).filter(User.username.ilike(clean_username)).first():
            raise ConflictError(f"Username '{clean_username}' is already taken.")

        # Check unique email
        if db.query(User).filter(User.email.ilike(clean_email)).first():
            raise ConflictError(f"Email '{clean_email}' is already registered.")

        # Verify role exists
        role = db.query(Role).filter(Role.id == data.role_id).first()
        if not role:
            raise NotFoundError(f"Role with ID {data.role_id} does not exist.")

        # Password validation
        if len(data.password) < 6:
            raise AppException("Password must be at least 6 characters long.")

        user = User(
            username=clean_username,
            email=clean_email,
            password_hash=get_password_hash(data.password),
            full_name=data.full_name.strip(),
            role_id=data.role_id,
            is_active=data.is_active,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update(db: Session, user_id: int, data: UserUpdate) -> User:
        user = UserService.get_by_id(db, user_id)

        if data.email:
            clean_email = data.email.strip().lower()
            existing = db.query(User).filter(User.email.ilike(clean_email), User.id != user_id).first()
            if existing:
                raise ConflictError(f"Email '{clean_email}' is already in use by another user.")
            user.email = clean_email

        if data.full_name:
            user.full_name = data.full_name.strip()

        if data.role_id is not None:
            role = db.query(Role).filter(Role.id == data.role_id).first()
            if not role:
                raise NotFoundError(f"Role with ID {data.role_id} does not exist.")
            user.role_id = data.role_id

        if data.is_active is not None:
            user.is_active = data.is_active

        if data.password:
            if len(data.password) < 6:
                raise AppException("Password must be at least 6 characters long.")
            user.password_hash = get_password_hash(data.password)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete(db: Session, user_id: int) -> bool:
        user = UserService.get_by_id(db, user_id)
        db.delete(user)
        db.commit()
        return True

    @staticmethod
    def authenticate(db: Session, username_or_email: str, password: str) -> User:
        """Authenticates user credentials and checks active state."""
        user = UserService.get_by_username_or_email(db, username_or_email)
        if not user or not verify_password(password, user.password_hash):
            raise AppException("Invalid username/email or password.", status_code=401, error_code="INVALID_CREDENTIALS")

        if not user.is_active:
            raise AppException("This account has been disabled. Please contact an administrator.", status_code=403, error_code="ACCOUNT_DISABLED")

        # Record last login timestamp
        user.last_login_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user
