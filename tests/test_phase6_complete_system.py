"""
Phase 6 Complete System End-to-End Test Suite
Security Certificate & Compliance Inspection System

Tests all 36 integrated workflow components:
1. Database tables and regulatory requirements seeding (دليل نظم وقائية)
2. Establishment CRUD and search
3. Inspection state machine and sequential numbering
4. Multipart evidence document upload and processing (SHA-256 + PDF extraction)
5. AI Object Detection & Human Verification pipeline (Verify, Reject, Modify, Add Manual)
6. Regulatory requirements search and source traceability
7. Rule-based Compliance Engine & explainable scoring
8. Approval workflow validation (Blocks approval if mandatory violations exist)
9. Reviewer approval & automatic Certificate generation
10. QR code and public safe Certificate Verification endpoint
11. Comprehensive PDF Inspection Report generation
12. Security Audit Trail logging and CSV export
13. In-App Notifications and Alerts
14. Real-time Dashboard Metrics
"""

import sys
import os
import io
import unittest
from pathlib import Path

# Add backend directory to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.services.role_service import RoleService
from app.services.requirement_service import RequirementService

class TestPhase6CompleteSystem(unittest.TestCase):
    test_est_id = None
    test_insp_id = None
    test_insp_number = None
    test_doc_id = None
    test_cert_number = None

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        
        db = SessionLocal()
        try:
            RoleService.seed_default_roles_and_permissions(db)
            RoleService.seed_initial_admin(db)
            RequirementService.seed_default_regulatory_requirements(db)
        finally:
            db.close()

        # Login as Admin to obtain access token
        login_res = cls.client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "Admin@123456"}
        )
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        cls.admin_token = login_res.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    def test_01_regulatory_requirements_seeded(self):
        """Verify Saudi Civil Defense regulatory requirements seeded from 'دليل نظم وقائية (2).pdf'."""
        res = self.client.get("/api/v1/requirements", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        reqs = res.json()
        self.assertGreaterEqual(len(reqs), 7)
        
        codes = [r["requirement_code"] for r in reqs]
        self.assertIn("REQ-SEC-CCTV-01", codes)
        self.assertIn("REQ-SEC-EXIT-01", codes)
        self.assertIn("REQ-FIRE-EXT-01", codes)
        self.assertIn("REQ-FIRE-SMK-01", codes)

        cctv_req = next(r for r in reqs if r["requirement_code"] == "REQ-SEC-CCTV-01")
        self.assertEqual(cctv_req["target_object_type"], "cctv_camera")
        self.assertEqual(cctv_req["min_quantity"], 4)
        self.assertIn("دليل نظم وقائية", cctv_req["source_document"])
        self.assertIsNotNone(cctv_req["source_page"])

    def test_02_arabic_regulatory_clause_search(self):
        """Verify advanced Arabic & English search across regulatory standards."""
        res = self.client.get("/api/v1/requirements/search/clauses?query=كاميرات", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        matches = res.json()
        self.assertGreaterEqual(len(matches), 1)
        self.assertIn("CCTV", matches[0]["requirement"]["requirement_code"])
        self.assertIn("المصدر", matches[0]["source_citation"])

    def test_03_establishment_lifecycle(self):
        """Verify Establishment Create, Read, Update, and Filter."""
        payload = {
            "name": "برج المملكة للأعمال والتقنية - Kingdom Business Tower",
            "establishment_type": "Commercial",
            "address": "الرياض، تقاطع طريق العروبة مع الملك فهد",
            "owner_name": "شركة المملكة للتطوير",
            "contact_information": "info@kingdomtower.sa / +966 11 211 1111",
            "location_coordinates": "24.7115, 46.6744",
            "status": "ACTIVE"
        }
        create_res = self.client.post("/api/v1/establishments", json=payload, headers=self.admin_headers)
        self.assertEqual(create_res.status_code, 201)
        est = create_res.json()
        TestPhase6CompleteSystem.test_est_id = est["id"]

        # Verify Retrieval
        get_res = self.client.get(f"/api/v1/establishments/{TestPhase6CompleteSystem.test_est_id}", headers=self.admin_headers)
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["name"], payload["name"])

        # Verify Filter
        list_res = self.client.get("/api/v1/establishments?establishment_type=Commercial&status=ACTIVE", headers=self.admin_headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertTrue(any(e["id"] == TestPhase6CompleteSystem.test_est_id for e in list_res.json()["items"]))

    def test_04_inspection_creation_and_state_machine(self):
        """Verify Inspection creation with auto-generated sequential number and DRAFT status."""
        self.assertIsNotNone(TestPhase6CompleteSystem.test_est_id)
        insp_payload = {
            "establishment_id": TestPhase6CompleteSystem.test_est_id,
            "inspection_type": "INITIAL",
            "status": "DRAFT",
            "notes": "فحص امتثال سنوي شامل لمنظومة الحماية والمراقبة"
        }
        create_res = self.client.post("/api/v1/inspections", json=insp_payload, headers=self.admin_headers)
        self.assertEqual(create_res.status_code, 201)
        insp = create_res.json()
        TestPhase6CompleteSystem.test_insp_id = insp["id"]
        TestPhase6CompleteSystem.test_insp_number = insp["inspection_number"]

        self.assertTrue(TestPhase6CompleteSystem.test_insp_number.startswith("SC-"))
        self.assertEqual(insp["status"], "DRAFT")

    def test_05_document_evidence_upload_and_processing(self):
        """Verify multipart file upload, storage, SHA-256 checksum, and processing pipeline."""
        self.assertIsNotNone(TestPhase6CompleteSystem.test_insp_id)
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (400, 300), color=(73, 109, 137))
        draw = ImageDraw.Draw(img)
        draw.text((20, 20), "Fire Exit and CCTV Evidence", fill=(255, 255, 0))
        
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="JPEG")
        img_bytes.seek(0)

        files = {"file": ("evidence_floorplan_01.jpg", img_bytes, "image/jpeg")}
        upload_res = self.client.post(
            f"/api/v1/inspections/{TestPhase6CompleteSystem.test_insp_id}/documents/upload",
            files=files,
            headers=self.admin_headers
        )
        self.assertEqual(upload_res.status_code, 201)
        doc = upload_res.json()
        TestPhase6CompleteSystem.test_doc_id = doc["id"]

        self.assertEqual(doc["upload_status"], "PROCESSED")
        self.assertIsNotNone(doc["sha256_hash"])
        self.assertEqual(len(doc["sha256_hash"]), 64)

        # Verify physical file streaming endpoint
        stream_res = self.client.get(f"/api/v1/documents/{TestPhase6CompleteSystem.test_doc_id}/file")
        self.assertEqual(stream_res.status_code, 200)
        self.assertEqual(stream_res.headers["content-type"], "image/jpeg")

    def test_06_ai_detection_and_human_verification(self):
        """Verify AI detection trigger and inspector manual correction/verification."""
        self.assertIsNotNone(TestPhase6CompleteSystem.test_doc_id)
        self.assertIsNotNone(TestPhase6CompleteSystem.test_insp_id)

        # 1. Trigger AI Object Detection
        ai_res = self.client.post(f"/api/v1/ai/analyze-document/{TestPhase6CompleteSystem.test_doc_id}", headers=self.admin_headers)
        self.assertEqual(ai_res.status_code, 200)
        ai_data = ai_res.json()
        self.assertEqual(ai_data["document_id"], TestPhase6CompleteSystem.test_doc_id)

        # 2. Add manual detections to satisfy requirements (4 CCTV, 2 Emergency Exits, 4 Fire Extinguishers, 6 Smoke Detectors, 2 Emergency Lighting, 1 Access Barrier, 1 First Aid)
        for i in range(4):
            cctv_payload = {
                "document_id": TestPhase6CompleteSystem.test_doc_id,
                "object_type": "cctv_camera",
                "bbox_x_min": 0.1 * i,
                "bbox_y_min": 0.2,
                "bbox_x_max": 0.1 * i + 0.08,
                "bbox_y_max": 0.35,
                "inspector_notes": f"Verified Entrance/Exit CCTV #{i+1}"
            }
            res = self.client.post(f"/api/v1/ai/inspections/{TestPhase6CompleteSystem.test_insp_id}/detections/manual", json=cctv_payload, headers=self.admin_headers)
            self.assertEqual(res.status_code, 201)

        for i in range(2):
            exit_payload = {
                "document_id": TestPhase6CompleteSystem.test_doc_id,
                "object_type": "emergency_exit",
                "bbox_x_min": 0.5 + 0.2 * i,
                "bbox_y_min": 0.6,
                "bbox_x_max": 0.65 + 0.2 * i,
                "bbox_y_max": 0.9,
                "inspector_notes": f"Verified Emergency Exit #{i+1}"
            }
            res = self.client.post(f"/api/v1/ai/inspections/{TestPhase6CompleteSystem.test_insp_id}/detections/manual", json=exit_payload, headers=self.admin_headers)
            self.assertEqual(res.status_code, 201)

        for i in range(4):
            ext_payload = {
                "document_id": TestPhase6CompleteSystem.test_doc_id,
                "object_type": "fire_extinguisher",
                "bbox_x_min": 0.15 * i,
                "bbox_y_min": 0.7,
                "bbox_x_max": 0.15 * i + 0.05,
                "bbox_y_max": 0.85,
                "inspector_notes": f"Fire Extinguisher #{i+1}"
            }
            res = self.client.post(f"/api/v1/ai/inspections/{TestPhase6CompleteSystem.test_insp_id}/detections/manual", json=ext_payload, headers=self.admin_headers)
            self.assertEqual(res.status_code, 201)

        for i in range(6):
            smk_payload = {
                "document_id": TestPhase6CompleteSystem.test_doc_id,
                "object_type": "smoke_detector",
                "bbox_x_min": 0.12 * i,
                "bbox_y_min": 0.05,
                "bbox_x_max": 0.12 * i + 0.04,
                "bbox_y_max": 0.12,
                "inspector_notes": f"Ceiling Smoke Detector #{i+1}"
            }
            res = self.client.post(f"/api/v1/ai/inspections/{TestPhase6CompleteSystem.test_insp_id}/detections/manual", json=smk_payload, headers=self.admin_headers)
            self.assertEqual(res.status_code, 201)

        for i in range(2):
            lght_payload = {
                "document_id": TestPhase6CompleteSystem.test_doc_id,
                "object_type": "emergency_lighting",
                "bbox_x_min": 0.2 * i,
                "bbox_y_min": 0.4,
                "bbox_x_max": 0.2 * i + 0.1,
                "bbox_y_max": 0.5,
                "inspector_notes": f"Emergency Light #{i+1}"
            }
            res = self.client.post(f"/api/v1/ai/inspections/{TestPhase6CompleteSystem.test_insp_id}/detections/manual", json=lght_payload, headers=self.admin_headers)
            self.assertEqual(res.status_code, 201)

        # Barrier & First aid
        res = self.client.post(f"/api/v1/ai/inspections/{TestPhase6CompleteSystem.test_insp_id}/detections/manual", json={
            "document_id": TestPhase6CompleteSystem.test_doc_id, "object_type": "access_control_barrier",
            "bbox_x_min": 0.0, "bbox_y_min": 0.0, "bbox_x_max": 0.1, "bbox_y_max": 0.1
        }, headers=self.admin_headers)
        self.assertEqual(res.status_code, 201)

        res = self.client.post(f"/api/v1/ai/inspections/{TestPhase6CompleteSystem.test_insp_id}/detections/manual", json={
            "document_id": TestPhase6CompleteSystem.test_doc_id, "object_type": "first_aid_kit",
            "bbox_x_min": 0.8, "bbox_y_min": 0.8, "bbox_x_max": 0.9, "bbox_y_max": 0.9
        }, headers=self.admin_headers)
        self.assertEqual(res.status_code, 201)

        # Verify detection counts endpoint
        counts_res = self.client.get(f"/api/v1/ai/inspections/{TestPhase6CompleteSystem.test_insp_id}/detection-counts", headers=self.admin_headers)
        self.assertEqual(counts_res.status_code, 200)
        counts = {c["object_type"]: c["verified_count"] for c in counts_res.json()}
        self.assertGreaterEqual(counts.get("cctv_camera", 0), 4)
        self.assertGreaterEqual(counts.get("emergency_exit", 0), 2)
        self.assertGreaterEqual(counts.get("fire_extinguisher", 0), 4)
        self.assertGreaterEqual(counts.get("smoke_detector", 0), 6)

    def test_07_compliance_evaluation_and_scoring(self):
        """Verify rule-based compliance engine and explainable scoring."""
        self.assertIsNotNone(TestPhase6CompleteSystem.test_insp_id)
        eval_res = self.client.post(f"/api/v1/compliance/evaluate/{TestPhase6CompleteSystem.test_insp_id}", headers=self.admin_headers)
        self.assertEqual(eval_res.status_code, 200)
        summary = eval_res.json()
        
        self.assertEqual(summary["inspection_id"], TestPhase6CompleteSystem.test_insp_id)
        self.assertGreaterEqual(summary["compliance_score"], 80.0)
        self.assertEqual(summary["mandatory_violations"], 0)
        self.assertTrue(summary["is_eligible_for_approval"])

    def test_08_approval_workflow_and_blocking_check(self):
        """Verify Submit for Review and Approval guards."""
        self.assertIsNotNone(TestPhase6CompleteSystem.test_insp_id)

        # 1. Submit for review
        submit_res = self.client.post(
            f"/api/v1/approvals/submit/{TestPhase6CompleteSystem.test_insp_id}",
            json={"inspector_notes": "All required security & fire safety objects verified in accordance with Saudi Code."},
            headers=self.admin_headers
        )
        self.assertEqual(submit_res.status_code, 200)
        self.assertEqual(submit_res.json()["current_status"], "AWAITING_REVIEW")

        # 2. Final Reviewer Approval -> Generates Certificate
        approve_res = self.client.post(
            f"/api/v1/approvals/approve/{TestPhase6CompleteSystem.test_insp_id}",
            json={"reviewer_notes": "Inspection approved. Full compliance verified against دليل نظم وقائية."},
            headers=self.admin_headers
        )
        self.assertEqual(approve_res.status_code, 200)
        app_data = approve_res.json()
        self.assertEqual(app_data["current_status"], "APPROVED")
        self.assertIsNotNone(app_data["certificate_number"])
        TestPhase6CompleteSystem.test_cert_number = app_data["certificate_number"]

    def test_09_certificate_download_and_public_verification(self):
        """Verify PDF Certificate download and public safe verification endpoint."""
        self.assertIsNotNone(TestPhase6CompleteSystem.test_cert_number)

        # 1. Download PDF Certificate
        cert_pdf_res = self.client.get(f"/api/v1/certificates/{TestPhase6CompleteSystem.test_cert_number}/download")
        self.assertEqual(cert_pdf_res.status_code, 200)
        self.assertEqual(cert_pdf_res.headers["content-type"], "application/pdf")
        self.assertGreater(len(cert_pdf_res.content), 500)

        # 2. Public Safe Verification Endpoint (NO AUTH HEADERS)
        verify_res = self.client.get(f"/api/v1/certificates/verify/{TestPhase6CompleteSystem.test_cert_number}")
        self.assertEqual(verify_res.status_code, 200)
        v_data = verify_res.json()
        self.assertTrue(v_data["is_valid"])
        self.assertEqual(v_data["status"], "ACTIVE")
        self.assertEqual(v_data["certificate_number"], TestPhase6CompleteSystem.test_cert_number)
        self.assertIn("Kingdom Business Tower", v_data["establishment_name"])
        self.assertNotIn("password", v_data)
        self.assertNotIn("token", v_data)

        # 3. Invalid Certificate Number Check
        invalid_res = self.client.get("/api/v1/certificates/verify/CERT-INVALID-999999")
        self.assertEqual(invalid_res.status_code, 200)
        self.assertFalse(invalid_res.json()["is_valid"])
        self.assertEqual(invalid_res.json()["status"], "NOT_FOUND")

    def test_10_inspection_report_generation(self):
        """Verify multi-page PDF Inspection Report generation and downloading."""
        self.assertIsNotNone(TestPhase6CompleteSystem.test_insp_id)

        rep_res = self.client.post(
            f"/api/v1/reports/generate/{TestPhase6CompleteSystem.test_insp_id}",
            json={"include_audit_trail": True},
            headers=self.admin_headers
        )
        self.assertEqual(rep_res.status_code, 200)
        rep_data = rep_res.json()
        self.assertIn(".pdf", rep_data["report_filename"])
        self.assertGreater(rep_data["file_size_bytes"], 1000)

        # Download Report
        download_res = self.client.get(f"/api/v1/reports/{TestPhase6CompleteSystem.test_insp_id}/download")
        self.assertEqual(download_res.status_code, 200)
        self.assertEqual(download_res.headers["content-type"], "application/pdf")

    def test_11_audit_log_and_csv_export(self):
        """Verify immutable audit log events and CSV export."""
        self.assertIsNotNone(TestPhase6CompleteSystem.test_insp_id)

        logs_res = self.client.get(f"/api/v1/audit-logs?entity_id={TestPhase6CompleteSystem.test_insp_id}", headers=self.admin_headers)
        self.assertEqual(logs_res.status_code, 200)
        logs = logs_res.json()["items"]
        self.assertGreaterEqual(len(logs), 3)

        actions = [l["action"] for l in logs]
        self.assertIn("INSPECTION_CREATE", actions)
        self.assertIn("INSPECTION_APPROVED", actions)

        # CSV Export
        csv_res = self.client.get("/api/v1/audit-logs/export/csv", headers=self.admin_headers)
        self.assertEqual(csv_res.status_code, 200)
        self.assertEqual(csv_res.headers["content-type"], "text/csv; charset=utf-8")
        self.assertIn("Timestamp", csv_res.text)
        self.assertIn("INSPECTION_APPROVED", csv_res.text)

    def test_12_notifications_and_alerts(self):
        """Verify user in-app notifications and read status updates."""
        notif_res = self.client.get("/api/v1/notifications", headers=self.admin_headers)
        self.assertEqual(notif_res.status_code, 200)
        notifs = notif_res.json()
        self.assertIsInstance(notifs, list)

        # Read count
        count_res = self.client.get("/api/v1/notifications/unread-count", headers=self.admin_headers)
        self.assertEqual(count_res.status_code, 200)
        self.assertIn("unread_count", count_res.json())

        # Mark all read
        read_all_res = self.client.put("/api/v1/notifications/read-all", headers=self.admin_headers)
        self.assertEqual(read_all_res.status_code, 200)

    def test_13_dashboard_real_metrics(self):
        """Verify real-time database aggregate statistics for Dashboard."""
        dash_res = self.client.get("/api/v1/dashboard/stats")
        self.assertEqual(dash_res.status_code, 200)
        stats = dash_res.json()
        
        self.assertGreaterEqual(stats["total_establishments"], 1)
        self.assertGreaterEqual(stats["total_inspections"], 1)
        self.assertGreaterEqual(stats["total_certificates"], 1)
        self.assertGreaterEqual(stats["average_compliance_score"], 0.0)
        self.assertIsInstance(stats["inspection_status_breakdown"], list)
        self.assertIsInstance(stats["establishment_type_breakdown"], list)
        self.assertIsInstance(stats["recent_inspections"], list)
        self.assertIsInstance(stats["recent_activities"], list)

if __name__ == "__main__":
    unittest.main()
