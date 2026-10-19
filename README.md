# Security Certificate & Compliance Inspection System (SCIS)

## Overview & Purpose
The **Security Certificate & Compliance Inspection System (SCIS)** is an enterprise-grade inspection, compliance evaluation, and certificate issuance platform. It integrates:
- **Establishment & Inspection Lifecycle Management**
- **Evidence Management & Scanned Schematic OCR (Arabic & English)**
- **AI Computer Vision (Ultralytics YOLOv8)** for security object detection & counting (CCTV cameras, fire extinguishers, emergency exits, doors, windows, barriers)
- **Human Verification & Inspector In-the-Loop Feedback**
- **Official Regulatory Document Traceability** (UAE Fire & Life Safety Code of Practice — *دليل الإمارات للسلامة والوقاية من الحريق*)
- **Rule-Based Compliance Engine & Explainable Scoring**
- **Role-Based Reviewer Approval Workflow with Executive Override Tracking**
- **Official Security Certificate Generation (ReportLab PDF + Cryptographic QR Code)**
- **Public Certificate Authenticity Verification Portal** (`/verify/{certificate_number}`)
- **Executive Inspection Audit Reports (Multi-Page PDF)**
- **Immutable System Audit Trail & In-App Notification System**
- **Full React 18 + TypeScript + Vite Enterprise Frontend**

---

## Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Vanilla CSS + Lucide Icons + React Router 6
- **Backend**: Python 3.10+ + FastAPI (Async REST API) + SQLAlchemy 2.0 ORM + Pydantic v2 + PyMySQL
- **Database**: MySQL / MariaDB (XAMPP Port 4306) with `utf8mb4` encoding for full Arabic & English support
- **AI / Computer Vision**: Ultralytics YOLOv8 (`yolov8n.pt`) + OpenCV + Pillow
- **Document & PDF Processing**: PyPDF + ReportLab + QRCode (Python)
- **Authentication**: JWT (RS256/HS256) + PBKDF2 Password Hashing + RBAC (Admin, Inspector, Reviewer, Viewer)

---

## System Architecture

```text
                                 [ Web Browser / Client ]
                                             │
                   ┌─────────────────────────┴─────────────────────────┐
                   │                                                   │
        [ React Enterprise SPA ]                            [ Public QR Scanner ]
       (Port 5173 - Auth Guarded)                        (/verify/{cert_number} - Public)
                   │                                                   │
                   └─────────────────────────┬─────────────────────────┘
                                             │ HTTP REST
                                             ▼
                                 [ FastAPI Application ]
                                   (/api/v1 - Port 8000)
                                             │
      ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
      ▼                  ▼                   ▼                   ▼                  ▼
[ Auth & RBAC ]    [ Evidence API ]    [ YOLOv8 Vision ]   [ Compliance ]     [ Certificate ]
  JWT Security       SHA-256 + OCR       Object Counts       UAE Standards      QR & PDF Gen
      │                  │                   │                   │                  │
      └──────────────────┴───────────────────┼───────────────────┴──────────────────┘
                                             │
                                    [ MySQL Database ]
                              (14 Relations on Port 4306)
```

---

## Complete Workflow

1. **Establishment Registration**: Register commercial/industrial facility with type, owner, address, and coordinates.
2. **Inspection Scheduling**: Create inspection cycle (`DRAFT` / `IN_PROGRESS`) and assign certified field inspector.
3. **Evidence Upload**: Upload JPG/PNG schematics, floor plans, or PDFs (validated by size, MIME, and SHA-256 hash).
4. **Document Processing & OCR**: Extract text and Arabic clauses preserving page structure.
5. **AI YOLOv8 Analysis**: Detect security objects (CCTV, exits, extinguishers, doors, barriers) with confidence ratings (High >= 75%, Medium 40-74%, Low < 40%).
6. **Human Inspector Verification**: Inspector confirms, modifies bounding boxes/class, rejects false positives, or adds manual findings.
7. **UAE Regulatory Matching**: Match verified findings against official UAE Civil Defense standards (*دليل الإمارات للسلامة والوقاية من الحريق*).
8. **Compliance Engine Evaluation**: Rule-based evaluation comparing required vs verified quantities. Calculates explainable compliance score.
9. **Submission for Review**: Field inspector submits audit to senior reviewer with field notes.
10. **Authorized Reviewer Decision**: Reviewer approves or rejects. Mandatory requirement failures block approval unless explicit executive override justification is provided.
11. **Security Certificate Issuance**: Generates official PDF certificate with unique number (`CERT-YYYY-XXXXXX`) and cryptographic QR code.
12. **Public Verification**: QR code directs to `/verify/{certificate_number}` showing public-safe authenticity seal.
13. **Executive Audit Report**: Generates multi-page PDF inspection report with complete evidence, detection matrix, and audit summary.
14. **Audit Logging & Notifications**: All logins, detections, verifications, overrides, and approvals are recorded in immutable audit trail.

---

## API Endpoints (`/api/v1`)

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Health & System** | `GET` | `/health`, `/system/database-status` | Health & MySQL connection checks |
| **Auth** | `POST` | `/auth/login`, `/auth/logout`, `/auth/me` | JWT login, session, and profile |
| **Establishments** | `GET`, `POST`, `PUT`, `DELETE` | `/establishments` | Establishment directory CRUD & search |
| **Inspections** | `GET`, `POST`, `PUT`, `DELETE` | `/inspections` | Inspection cycle CRUD & search |
| **Documents** | `POST` | `/documents/upload` | Multipart file upload with SHA-256 |
| | `GET` | `/documents/{id}/view`, `/download` | Stream and download evidence files |
| | `POST` | `/documents/{id}/process` | Trigger PDF text extraction & OCR |
| **AI Vision** | `POST` | `/ai/analyze/{document_id}` | YOLOv8 object detection inference |
| | `PUT` | `/ai/detections/{id}/verify` | Human inspector verification |
| | `POST` | `/ai/detections/manual` | Add manual inspector detection |
| | `GET` | `/ai/counts/{inspection_id}` | Detection counts by class & status |
| **Requirements** | `GET`, `POST`, `PUT`, `DELETE` | `/requirements` | UAE regulatory requirements CRUD |
| | `POST` | `/requirements/ingest-pdf/{doc_id}` | Ingest requirements from official PDF |
| **Compliance** | `POST` | `/compliance/evaluate/{inspection_id}` | Rule-based compliance evaluation |
| | `GET` | `/compliance/summary/{inspection_id}` | Compliance breakdown & score |
| | `PUT` | `/compliance/items/{id}/override` | Reviewer regulatory override |
| **Approvals** | `POST` | `/approvals/{id}/submit` | Inspector submit for review |
| | `POST` | `/approvals/{id}/approve` | Reviewer approval & certificate trigger |
| | `POST` | `/approvals/{id}/reject` | Reviewer rejection with reason |
| **Certificates** | `GET` | `/certificates`, `/certificates/{num}` | Certificate registry & metadata |
| | `GET` | `/certificates/{num}/download` | Download official Certificate PDF |
| | `GET` | `/certificates/verify/{num}` | **Public Unauthenticated QR Verification** |
| **Reports** | `GET` | `/reports/inspection/{id}` | Structured audit report payload |
| | `GET` | `/reports/inspection/{id}/pdf` | Download Multi-Page Inspection PDF |
| **Audit Logs** | `GET` | `/audit-logs`, `/export/csv` | Query and export system audit trail |
| **Notifications** | `GET`, `PUT` | `/notifications`, `/read-all` | In-app notification alerts & badges |
| **Dashboard** | `GET` | `/dashboard/summary` | Live database metrics & pass rates |

---

## Windows Local Execution Instructions

### Prerequisites
1. **XAMPP MySQL** running on port `4306` (or configured port in `.env`).
2. **Python 3.10+** with virtual environment activated.
3. **Node.js 18+** with npm installed.

### 1. Database Setup
Ensure database `security_certificate_system` exists in MySQL:
```powershell
# In MySQL console / phpMyAdmin
CREATE DATABASE IF NOT EXISTS security_certificate_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Start Backend Server
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Start Frontend App
```powershell
cd frontend
npm run dev
```
Frontend Web Application: [http://localhost:5173](http://localhost:5173)

### 4. Run Automated Test Suite
```powershell
python -m unittest discover -s tests -p "test_*.py"
```

---

## Demo Credentials
- **Admin**: `username: admin` | `password: AdminPass123!`
- **Inspector**: `username: inspector1` | `password: InspPass123!`
- **Reviewer**: `username: reviewer1` | `password: ReviewPass123!`
- **Viewer**: `username: viewer1` | `password: ViewPass123!`
