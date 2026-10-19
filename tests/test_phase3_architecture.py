import urllib.request
import urllib.error
import json
import sys
import uuid

# Ensure UTF-8 output on Windows console
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def make_request(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json; charset=utf-8", "Accept": "application/json"}
    body = json.dumps(data, ensure_ascii=False).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode("utf-8")
        return resp.status, json.loads(content) if content else {}

def run_tests():
    print("==================================================================")
    print("STARTING PHASE 3 FASTAPI BACKEND ARCHITECTURE TESTS")
    print("==================================================================")

    # 1. Health & Status Endpoints
    print("\n[1] Testing Health Endpoints...")
    status, res = make_request("/api/v1/health")
    assert status == 200 and res.get("status") == "ok"
    print("   ✓ GET /api/v1/health passed")

    status, res = make_request("/health")
    assert status == 200 and res.get("status") == "ok"
    print("   ✓ GET /health (legacy alias) passed")

    status, res = make_request("/api/v1/system/database-status")
    assert status == 200 and res.get("status") == "connected"
    print(f"   ✓ GET /api/v1/system/database-status passed (DB: {res.get('database')}, Tables: {len(res.get('tables', []))})")

    # 2. Establishment CRUD Lifecycle
    print("\n[2] Testing Establishment CRUD Lifecycle...")
    unique_suffix = uuid.uuid4().hex[:6]
    est_create_data = {
        "name": f"مجمع الابتكار الصناعي #{unique_suffix} - Innovation Industrial Complex",
        "establishment_type": "Industrial / Manufacturing",
        "address": "المنطقة الصناعية الثانية، الرياض - 2nd Industrial Zone, Riyadh",
        "owner_name": "م. فيصل الخالدي - Eng. Faisal Al-Khaldi",
        "contact_information": "faisal.eng@example.com / +966 50 987 6543"
    }
    status, est = make_request("/api/v1/establishments", method="POST", data=est_create_data)
    assert status == 201
    est_id = est["id"]
    print(f"   ✓ POST /api/v1/establishments -> Created ID {est_id} ({est['name']})")

    # Read Single Establishment
    status, fetched_est = make_request(f"/api/v1/establishments/{est_id}")
    assert status == 200 and fetched_est["name"] == est_create_data["name"]
    print(f"   ✓ GET /api/v1/establishments/{est_id} -> Retrieved details")

    # Update Establishment
    est_update_data = {
        "name": f"مجمع الابتكار الصناعي المطور #{unique_suffix} - Advanced Innovation Complex",
        "owner_name": "م. فيصل بن فهد الخالدي"
    }
    status, updated_est = make_request(f"/api/v1/establishments/{est_id}", method="PUT", data=est_update_data)
    assert status == 200 and updated_est["name"] == est_update_data["name"]
    assert updated_est["establishment_type"] == est_create_data["establishment_type"]
    print(f"   ✓ PUT /api/v1/establishments/{est_id} -> Updated name & owner")

    # Paginated List & Search
    status, paginated_est = make_request(f"/api/v1/establishments?page=1&limit=10&search={unique_suffix}")
    assert status == 200
    assert paginated_est["total"] >= 1
    assert any(item["id"] == est_id for item in paginated_est["items"])
    print(f"   ✓ GET /api/v1/establishments?page=1&limit=10&search=... -> Found {paginated_est['total']} matching records")

    # 3. Inspection CRUD Lifecycle & Validation
    print("\n[3] Testing Inspection CRUD Lifecycle & Validations...")
    insp_number = f"SC-2026-{unique_suffix.upper()}"
    insp_create_data = {
        "inspection_number": insp_number,
        "establishment_id": est_id,
        "status": "PENDING",
        "notes": "فحص دوري لأنظمة السلامة ومكافحة الحريق - Periodic Fire & Safety Inspection"
    }
    status, insp = make_request("/api/v1/inspections", method="POST", data=insp_create_data)
    assert status == 201
    insp_id = insp["id"]
    print(f"   ✓ POST /api/v1/inspections -> Created Inspection #{insp_number} (ID: {insp_id})")

    # Read Single Inspection
    status, fetched_insp = make_request(f"/api/v1/inspections/{insp_id}")
    assert status == 200 and fetched_insp["inspection_number"] == insp_number
    print(f"   ✓ GET /api/v1/inspections/{insp_id} -> Retrieved inspection")

    # Update Inspection Status & Notes
    insp_update_data = {
        "status": "IN_PROGRESS",
        "notes": "تم بدء الفحص الميداني بواسطة المفتش المعتمد - Field audit started by certified inspector"
    }
    status, updated_insp = make_request(f"/api/v1/inspections/{insp_id}", method="PUT", data=insp_update_data)
    assert status == 200 and updated_insp["status"] == "IN_PROGRESS"
    print(f"   ✓ PUT /api/v1/inspections/{insp_id} -> Status updated to IN_PROGRESS")

    # Filter Inspections by Status
    status, filtered_insps = make_request(f"/api/v1/inspections?status=IN_PROGRESS&establishment_id={est_id}")
    assert status == 200
    assert any(item["id"] == insp_id for item in filtered_insps["items"])
    print(f"   ✓ GET /api/v1/inspections?status=IN_PROGRESS -> Filtered successfully")

    # 3.1 Auto-Generated Inspection Number Test
    insp_auto_data = {
        "establishment_id": est_id,
        "status": "DRAFT",
        "notes": "فحص آلي تم إنشاؤه بدون رقم مسبق - Auto-generated inspection number test"
    }
    status, insp_auto = make_request("/api/v1/inspections", method="POST", data=insp_auto_data)
    assert status == 201 and insp_auto["inspection_number"].startswith("SC-")
    insp_auto_id = insp_auto["id"]
    print(f"   ✓ POST /api/v1/inspections (Auto Number) -> Generated #{insp_auto['inspection_number']} (ID: {insp_auto_id})")

    # 4. Document Metadata API Foundation
    print("\n[4] Testing Document Metadata Foundation...")
    doc_create_data = {
        "inspection_id": insp_id,
        "original_filename": "تقرير_السلامة_المعتمد.pdf",
        "stored_filename": f"doc_{insp_id}_{unique_suffix}.pdf",
        "file_path": f"uploads/original/doc_{insp_id}_{unique_suffix}.pdf",
        "file_type": "application/pdf",
        "file_size": 1048576,
        "upload_status": "UPLOADED"
    }
    status, doc = make_request("/api/v1/documents", method="POST", data=doc_create_data)
    assert status == 201
    doc_id = doc["id"]
    print(f"   ✓ POST /api/v1/documents -> Registered document metadata ID {doc_id}")

    # Read Single Document by ID
    status, fetched_doc = make_request(f"/api/v1/documents/{doc_id}")
    assert status == 200 and fetched_doc["original_filename"] == doc_create_data["original_filename"]
    print(f"   ✓ GET /api/v1/documents/{doc_id} -> Retrieved document details")

    # List documents for inspection
    status, docs_list = make_request(f"/api/v1/inspections/{insp_id}/documents")
    assert status == 200 and len(docs_list) >= 1
    assert any(d["id"] == doc_id for d in docs_list)
    print(f"   ✓ GET /api/v1/inspections/{insp_id}/documents -> Found {len(docs_list)} documents")

    # Delete Document Metadata
    status, del_doc_res = make_request(f"/api/v1/documents/{doc_id}", method="DELETE")
    assert status == 200
    print(f"   ✓ DELETE /api/v1/documents/{doc_id} -> Deleted successfully")

    # Clean up auto inspection
    make_request(f"/api/v1/inspections/{insp_auto_id}", method="DELETE")

    # 5. Error Handling & Validation Tests
    print("\n[5] Testing Error Handling & Validation Constraints...")
    
    # Test 5.1: Duplicate inspection number (Conflict)
    try:
        make_request("/api/v1/inspections", method="POST", data=insp_create_data)
        print("   ✗ FAIL: Duplicate inspection number was unexpectedly accepted.")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        assert e.code in (400, 409), f"Expected 400/409, got {e.code}"
        error_body = json.loads(e.read().decode("utf-8"))
        print(f"   ✓ PASS: Duplicate inspection number rejected ({e.code}: {error_body.get('detail')})")

    # Test 5.2: Invalid establishment foreign key
    invalid_insp_data = {
        "inspection_number": f"SC-INVALID-{uuid.uuid4().hex[:6]}",
        "establishment_id": 99999999,
        "status": "PENDING"
    }
    try:
        make_request("/api/v1/inspections", method="POST", data=invalid_insp_data)
        print("   ✗ FAIL: Non-existent establishment ID was unexpectedly accepted.")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        assert e.code == 404, f"Expected 404, got {e.code}"
        error_body = json.loads(e.read().decode("utf-8"))
        print(f"   ✓ PASS: Invalid establishment ID rejected with 404 ({error_body.get('detail')})")

    # Test 5.3: Non-existent resource retrieval
    try:
        make_request("/api/v1/establishments/99999999")
        print("   ✗ FAIL: Non-existent establishment retrieval succeeded.")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        assert e.code == 404
        print(f"   ✓ PASS: Non-existent ID returned 404")

    # 6. Delete Lifecycle & Cascade
    print("\n[6] Testing Cleanup / Deletion...")
    status, del_insp_res = make_request(f"/api/v1/inspections/{insp_id}", method="DELETE")
    assert status == 200
    print(f"   ✓ DELETE /api/v1/inspections/{insp_id} -> Deleted successfully")

    status, del_est_res = make_request(f"/api/v1/establishments/{est_id}", method="DELETE")
    assert status == 200
    print(f"   ✓ DELETE /api/v1/establishments/{est_id} -> Deleted successfully")

    # 7. Documentation Endpoints
    print("\n[7] Testing OpenAPI & Documentation...")
    status, openapi = make_request("/openapi.json")
    assert status == 200 and "paths" in openapi
    print(f"   ✓ GET /openapi.json -> Valid schema generated with {len(openapi['paths'])} route paths")

    print("\n==================================================================")
    print("ALL PHASE 3 FASTAPI BACKEND ARCHITECTURE TESTS PASSED SUCCESSFULLY!")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
