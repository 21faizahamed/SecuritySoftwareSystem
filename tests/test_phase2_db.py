import urllib.request
import json
import sys

# Ensure UTF-8 output on Windows console
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=== STARTING PHASE 2 DATABASE & API VERIFICATION ===")
    
    # 1. Test Database Status API
    print("\n1. Testing GET /api/system/database-status...")
    req = urllib.request.Request(f"{BASE_URL}/api/system/database-status")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"   Database: {data.get('database')}")
        print(f"   Status: {data.get('status')}")
        print(f"   Version: {data.get('version')}")
        print(f"   Tables: {data.get('tables')}")
        assert data.get("status") == "connected", "Database status should be connected"
        assert "establishments" in data.get("tables", []), "establishments table missing"
        assert "inspections" in data.get("tables", []), "inspections table missing"
        assert "documents" in data.get("tables", []), "documents table missing"
        assert "system_settings" in data.get("tables", []), "system_settings table missing"
        print("   ✓ PASS: Database status endpoint verified.")

    # 2. Test Establishment CRUD + Arabic UTF-8 Persistence
    print("\n2. Testing POST /api/test/establishments (Arabic & English)...")
    est_payload = {
        "name": "اسم المنشأة التجريبية - Test Facility Alpha",
        "establishment_type": "Commercial",
        "address": "الرياض، طريق الملك فهد - Riyadh, King Fahd Road",
        "owner_name": "سعود العتيبي - Saud Al-Otaibi",
        "contact_information": "saud@example.com / +966 55 555 1234"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/test/establishments",
        data=json.dumps(est_payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        est_data = json.loads(resp.read().decode("utf-8"))
        est_id = est_data["id"]
        print(f"   Created Establishment ID: {est_id}")
        print(f"   Stored Name: {est_data['name']}")
        assert est_data["name"] == est_payload["name"], "Arabic name mismatch"
        print("   ✓ PASS: Arabic establishment created and preserved exactly.")

    # 3. Test Inspection Creation (Foreign Key: Establishment -> Inspection)
    print("\n3. Testing POST /api/test/inspections (FK to Establishment)...")
    insp_number = f"SC-2026-{est_id:06d}"
    insp_payload = {
        "inspection_number": insp_number,
        "establishment_id": est_id,
        "status": "PENDING",
        "notes": "فحص أولي لمعايير السلامة والأمان - Initial safety & compliance audit"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/test/inspections",
        data=json.dumps(insp_payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        insp_data = json.loads(resp.read().decode("utf-8"))
        insp_id = insp_data["id"]
        print(f"   Created Inspection ID: {insp_id}, Number: {insp_data['inspection_number']}")
        assert insp_data["establishment_id"] == est_id, "FK mismatch"
        assert insp_data["status"] == "PENDING"
        print("   ✓ PASS: Inspection created with valid foreign key.")

    # 4. Test Duplicate Inspection Number Constraint
    print("\n4. Testing Duplicate Inspection Number constraint...")
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/test/inspections",
            data=json.dumps(insp_payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            print("   ✗ FAIL: Duplicate inspection number was unexpectedly accepted.")
            sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f"   Expected error caught: HTTP {e.code}")
        assert e.code == 400, f"Expected HTTP 400 for duplicate constraint, got {e.code}"
        print("   ✓ PASS: Duplicate inspection constraint successfully enforced.")

    # 5. Test Document Metadata Creation (Foreign Key: Inspection -> Document)
    print("\n5. Testing POST /api/test/documents (FK to Inspection)...")
    doc_payload = {
        "inspection_id": insp_id,
        "original_filename": "شهادة_السلامة_2026.pdf",
        "stored_filename": f"doc_{insp_id}_safety_cert.pdf",
        "file_path": f"uploads/original/doc_{insp_id}_safety_cert.pdf",
        "file_type": "application/pdf",
        "file_size": 2048576,
        "upload_status": "UPLOADED"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/test/documents",
        data=json.dumps(doc_payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        doc_data = json.loads(resp.read().decode("utf-8"))
        print(f"   Created Document ID: {doc_data['id']}, Filename: {doc_data['original_filename']}")
        assert doc_data["inspection_id"] == insp_id
        assert doc_data["original_filename"] == "شهادة_السلامة_2026.pdf"
        print("   ✓ PASS: Document metadata linked to inspection successfully.")

    # 6. Test System Settings Key-Value Store
    print("\n6. Testing POST /api/test/settings...")
    setting_payload = {
        "setting_key": "system_name_ar",
        "setting_value": "نظام الشهادة الأمنية والتفتيش والامتثال"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/test/settings",
        data=json.dumps(setting_payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        set_data = json.loads(resp.read().decode("utf-8"))
        print(f"   Setting '{set_data['setting_key']}' = '{set_data['setting_value']}'")
        assert set_data["setting_value"] == setting_payload["setting_value"]
        print("   ✓ PASS: System setting persisted.")

    # 7. Test Retrieval of all establishments
    print("\n7. Testing GET /api/test/establishments...")
    req = urllib.request.Request(f"{BASE_URL}/api/test/establishments")
    with urllib.request.urlopen(req) as resp:
        all_est = json.loads(resp.read().decode("utf-8"))
        print(f"   Total establishments found: {len(all_est)}")
        assert len(all_est) >= 1
        print("   ✓ PASS: Establishments retrieved successfully.")

    print("\n=======================================================")
    print("ALL PHASE 2 DATABASE & API TESTS COMPLETED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
