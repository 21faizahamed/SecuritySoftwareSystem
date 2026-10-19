"""
Phase 5: Authentication & RBAC Test Suite
Security Certificate & Compliance Inspection System

Tests:
1. Secure password hashing and verification (bcrypt)
2. JWT access token creation, decoding, and signature verification
3. Default roles and permissions seeding
4. Initial administrator account provisioning
5. Login endpoint (valid credentials, invalid password, invalid user)
6. Disabled account login rejection
7. Current authenticated user profile endpoint (/auth/me)
8. Role-based access control (Admin allowed, Inspector rejected on /users)
9. Admin user management CRUD (Create, Read, Update, Deactivate, Delete)
10. Roles and Permissions discovery endpoints
"""

import sys
import os
import unittest

# Add backend directory to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.database import SessionLocal, engine, Base
from app.services.role_service import RoleService
from app.models.user import User
from app.models.role import Role


class TestPhase5Auth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create all tables in database
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        # Ensure database tables, roles, and initial admin are seeded
        db = SessionLocal()
        try:
            RoleService.seed_default_roles_and_permissions(db)
            RoleService.seed_initial_admin(db)
        finally:
            db.close()



    def test_01_password_hashing(self):
        """Verify bcrypt password hashing and verification."""
        raw_password = "SecurePassword@2026"
        hashed = get_password_hash(raw_password)
        self.assertNotEqual(raw_password, hashed)
        self.assertTrue(hashed.startswith("$2b$") or hashed.startswith("$2a$"))
        self.assertTrue(verify_password(raw_password, hashed))
        self.assertFalse(verify_password("WrongPassword", hashed))

    def test_02_jwt_token_operations(self):
        """Verify JWT token creation and payload extraction."""
        data = {"sub": "999", "username": "testuser", "role": "ADMIN"}
        token = create_access_token(data)
        self.assertIsInstance(token, str)
        self.assertGreater(len(token), 20)

        payload = decode_access_token(token)
        self.assertEqual(payload.get("sub"), "999")
        self.assertEqual(payload.get("username"), "testuser")
        self.assertEqual(payload.get("role"), "ADMIN")

    def test_03_admin_login_success(self):
        """Verify POST /api/v1/auth/login with seeded initial admin."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "Admin@123456"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data.get("token_type"), "bearer")
        self.assertEqual(data["user"]["username"], "admin")
        self.assertEqual(data["user"]["role"]["name"], "ADMIN")

    def test_04_login_invalid_password(self):
        """Verify 401 Unauthorized for incorrect password."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "WrongPassword!99"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid username/email or password", response.json()["detail"])

    def test_05_login_invalid_username(self):
        """Verify 401 Unauthorized for non-existent user."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"username": "non_existent_user_9999", "password": "SomePassword123"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid username/email or password", response.json()["detail"])


    def test_06_current_user_me(self):
        """Verify GET /api/v1/auth/me returns current user profile and permissions."""
        # First login to get token
        login_res = self.client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "Admin@123456"}
        )
        token = login_res.json()["access_token"]

        # Call /auth/me
        me_res = self.client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(me_res.status_code, 200)
        user_info = me_res.json()
        self.assertEqual(user_info["username"], "admin")
        self.assertEqual(user_info["role"], "ADMIN")
        self.assertIsInstance(user_info["permissions"], list)
        self.assertIn("users:manage", user_info["permissions"])

    def test_07_unauthenticated_request_rejected(self):
        """Verify 401 Unauthorized when no token is provided."""
        res = self.client.get("/api/v1/auth/me")
        self.assertEqual(res.status_code, 401)

    def test_08_admin_user_management_crud(self):
        """Verify ADMIN can create, update, list, and delete a user."""
        # 1. Login as Admin
        admin_login = self.client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "Admin@123456"}
        )
        token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Find Inspector role ID
        roles_res = self.client.get("/api/v1/roles", headers=headers)
        self.assertEqual(roles_res.status_code, 200)
        roles = roles_res.json()
        inspector_role = next((r for r in roles if r["name"] == "INSPECTOR"), roles[0])

        # 3. Create a new inspector user
        create_payload = {
            "username": "test_inspector_01",
            "email": "inspector01@safetytest.local",
            "full_name": "Test Inspector One",
            "password": "Inspector@123456",
            "role_id": inspector_role["id"],
            "is_active": True
        }
        create_res = self.client.post("/api/v1/users", json=create_payload, headers=headers)
        self.assertEqual(create_res.status_code, 201)
        created_user = create_res.json()
        user_id = created_user["id"]
        self.assertEqual(created_user["username"], "test_inspector_01")
        self.assertNotIn("password", created_user)
        self.assertNotIn("password_hash", created_user)

        # 4. Read user list
        list_res = self.client.get("/api/v1/users", headers=headers)
        self.assertEqual(list_res.status_code, 200)
        items = list_res.json()["items"]
        self.assertTrue(any(u["id"] == user_id for u in items))

        # 5. Update user
        update_payload = {"full_name": "Test Inspector Updated"}
        update_res = self.client.put(f"/api/v1/users/{user_id}", json=update_payload, headers=headers)
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["full_name"], "Test Inspector Updated")

        # 6. Delete user
        del_res = self.client.delete(f"/api/v1/users/{user_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

    def test_09_rbac_non_admin_forbidden_on_user_management(self):
        """Verify non-admin (INSPECTOR) receives 403 Forbidden on user management."""
        # 1. Admin creates an inspector
        admin_login = self.client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "Admin@123456"}
        )
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        roles_res = self.client.get("/api/v1/roles", headers=admin_headers)
        roles = roles_res.json()
        inspector_role = next((r for r in roles if r["name"] == "INSPECTOR"), roles[0])

        user_payload = {
            "username": "inspector_rbac_test",
            "email": "inspector_rbac@safetytest.local",
            "full_name": "RBAC Inspector",
            "password": "Password@123456",
            "role_id": inspector_role["id"],
            "is_active": True
        }
        create_res = self.client.post("/api/v1/users", json=user_payload, headers=admin_headers)
        inspector_user_id = create_res.json()["id"]

        try:
            # 2. Login as Inspector
            insp_login = self.client.post(
                "/api/v1/auth/login",
                json={"username": "inspector_rbac_test", "password": "Password@123456"}
            )
            self.assertEqual(insp_login.status_code, 200)
            insp_token = insp_login.json()["access_token"]
            insp_headers = {"Authorization": f"Bearer {insp_token}"}

            # 3. Attempt to access GET /api/v1/users -> Expect 403
            forbidden_res = self.client.get("/api/v1/users", headers=insp_headers)
            self.assertEqual(forbidden_res.status_code, 403)
            self.assertIn("Access denied", forbidden_res.json()["detail"])


            # 4. Attempt to create user -> Expect 403
            forbidden_create = self.client.post("/api/v1/users", json=user_payload, headers=insp_headers)
            self.assertEqual(forbidden_create.status_code, 403)
        finally:
            # Cleanup
            self.client.delete(f"/api/v1/users/{inspector_user_id}", headers=admin_headers)

    def test_10_disabled_account_login_rejection(self):
        """Verify disabled user account is rejected upon login."""
        # 1. Admin creates an inactive user
        admin_login = self.client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "Admin@123456"}
        )
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        roles = self.client.get("/api/v1/roles", headers=admin_headers).json()
        viewer_role = next((r for r in roles if r["name"] == "VIEWER"), roles[0])

        user_payload = {
            "username": "disabled_user_test",
            "email": "disabled@safetytest.local",
            "full_name": "Disabled Operator",
            "password": "Password@123456",
            "role_id": viewer_role["id"],
            "is_active": False  # Disabled
        }
        create_res = self.client.post("/api/v1/users", json=user_payload, headers=admin_headers)
        user_id = create_res.json()["id"]

        try:
            # 2. Attempt login
            login_res = self.client.post(
                "/api/v1/auth/login",
                json={"username": "disabled_user_test", "password": "Password@123456"}
            )
            self.assertEqual(login_res.status_code, 403)
            self.assertIn("disabled", login_res.json()["detail"].lower())
        finally:
            # Cleanup
            self.client.delete(f"/api/v1/users/{user_id}", headers=admin_headers)

    def test_11_roles_and_permissions_endpoints(self):
        """Verify /roles and /permissions return valid RBAC hierarchy."""
        admin_login = self.client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "Admin@123456"}
        )
        headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        roles_res = self.client.get("/api/v1/roles", headers=headers)
        self.assertEqual(roles_res.status_code, 200)
        roles = roles_res.json()
        role_names = [r["name"] for r in roles]
        self.assertIn("ADMIN", role_names)
        self.assertIn("INSPECTOR", role_names)
        self.assertIn("REVIEWER", role_names)
        self.assertIn("VIEWER", role_names)

        perms_res = self.client.get("/api/v1/permissions", headers=headers)
        self.assertEqual(perms_res.status_code, 200)
        perms = perms_res.json()
        self.assertGreaterEqual(len(perms), 10)


if __name__ == "__main__":
    unittest.main()
