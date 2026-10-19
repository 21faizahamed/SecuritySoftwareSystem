import logging
from typing import List
from sqlalchemy.orm import Session
from app.models.role import Role, Permission
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings

logger = logging.getLogger("app.roles")

DEFAULT_PERMISSIONS = [
    ("users:manage", "Manage system users, activate/deactivate, and assign roles"),
    ("establishments:read", "View registered establishment profiles"),
    ("establishments:write", "Create and update establishment profiles"),
    ("establishments:delete", "Delete establishment profiles"),
    ("inspections:read", "View inspection cycles and notes"),
    ("inspections:write", "Create and update inspection cycles"),
    ("inspections:delete", "Delete inspection records"),
    ("inspections:review", "Review and approve/reject completed inspections"),
    ("documents:read", "View uploaded inspection evidence and certificates"),
    ("documents:write", "Upload and link document evidence"),
    ("documents:delete", "Delete document records"),
    ("settings:manage", "Manage system diagnostics and configurations"),
]

DEFAULT_ROLES_PERMISSIONS = {
    "ADMIN": [
        "users:manage",
        "establishments:read",
        "establishments:write",
        "establishments:delete",
        "inspections:read",
        "inspections:write",
        "inspections:delete",
        "inspections:review",
        "documents:read",
        "documents:write",
        "documents:delete",
        "settings:manage",
    ],
    "INSPECTOR": [
        "establishments:read",
        "inspections:read",
        "inspections:write",
        "documents:read",
        "documents:write",
    ],
    "REVIEWER": [
        "establishments:read",
        "inspections:read",
        "inspections:review",
        "documents:read",
    ],
    "VIEWER": [
        "establishments:read",
        "inspections:read",
        "documents:read",
    ],
}

ROLE_DESCRIPTIONS = {
    "ADMIN": "Full system administrator with user, settings, and full CRUD permissions",
    "INSPECTOR": "Field auditor responsible for conducting inspections and submitting evidence",
    "REVIEWER": "Compliance officer authorized to review and evaluate inspection results",
    "VIEWER": "Read-only access to permitted facilities, audit logs, and certificates",
}

class RoleService:
    @staticmethod
    def get_all_roles(db: Session) -> List[Role]:
        return db.query(Role).order_by(Role.id.asc()).all()

    @staticmethod
    def get_all_permissions(db: Session) -> List[Permission]:
        return db.query(Permission).order_by(Permission.name.asc()).all()

    @staticmethod
    def seed_default_roles_and_permissions(db: Session):
        """Seeds initial roles and permissions if they do not exist."""
        # 1. Seed Permissions
        permission_map = {}
        for perm_name, perm_desc in DEFAULT_PERMISSIONS:
            perm = db.query(Permission).filter(Permission.name == perm_name).first()
            if not perm:
                perm = Permission(name=perm_name, description=perm_desc)
                db.add(perm)
                db.flush()
            permission_map[perm_name] = perm

        # 2. Seed Roles and map permissions
        for role_name, perm_keys in DEFAULT_ROLES_PERMISSIONS.items():
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(
                    name=role_name,
                    description=ROLE_DESCRIPTIONS.get(role_name, f"{role_name} Role")
                )
                db.add(role)
                db.flush()
            
            # Update permissions
            current_perm_ids = {p.id for p in role.permissions}
            for pk in perm_keys:
                p_obj = permission_map.get(pk)
                if p_obj and p_obj.id not in current_perm_ids:
                    role.permissions.append(p_obj)

        db.commit()
        logger.info("Default roles and permissions verified/seeded in MySQL.")

    @staticmethod
    def seed_initial_admin(db: Session) -> User:
        """Seeds the first administrator account if no admin user exists."""
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if not admin_role:
            RoleService.seed_default_roles_and_permissions(db)
            admin_role = db.query(Role).filter(Role.name == "ADMIN").first()

        existing_admin = db.query(User).filter(User.username == settings.INITIAL_ADMIN_USERNAME).first()
        if not existing_admin:
            admin_user = User(
                username=settings.INITIAL_ADMIN_USERNAME,
                email=settings.INITIAL_ADMIN_EMAIL,
                password_hash=get_password_hash(settings.INITIAL_ADMIN_PASSWORD),
                full_name="System Administrator",
                role_id=admin_role.id,
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            existing_admin = admin_user
            logger.info(f"Initial Administrator account created: '{admin_user.username}'")

        # Seed Demo Customer User
        viewer_role = db.query(Role).filter(Role.name == "VIEWER").first()
        if viewer_role:
            existing_customer = db.query(User).filter(User.username == "customer").first()
            if not existing_customer:
                customer_user = User(
                    username="customer",
                    email="applicant@abracadabra.ae",
                    password_hash=get_password_hash("Customer@123456"),
                    full_name="Abracadabra Kids Arcade (Applicant)",
                    role_id=viewer_role.id,
                    is_active=True,
                )
                db.add(customer_user)
                db.commit()
                logger.info("Demo Customer user created: 'customer'")

        # Seed Demo Inspector User
        inspector_role = db.query(Role).filter(Role.name == "INSPECTOR").first()
        if inspector_role:
            existing_inspector = db.query(User).filter(User.username == "inspector").first()
            if not existing_inspector:
                inspector_user = User(
                    username="inspector",
                    email="inspector@sira.gov.ae",
                    password_hash=get_password_hash("Inspector@123456"),
                    full_name="Eng. Rashid Al Mansoori (SIRA Inspector)",
                    role_id=inspector_role.id,
                    is_active=True,
                )
                db.add(inspector_user)
                db.commit()
                logger.info("Demo Inspector user created: 'inspector'")

        return existing_admin

