from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import Base, engine, get_db
from app.dependencies.auth import get_optional_current_user
from app.models.sira_explorer import SiraEstablishmentCategory
from app.models.user import User
from app.services.sira_explorer_service import SiraExplorerService, find_sira_pdf_path

router = APIRouter(prefix="/sira-compliance", tags=["SIRA Preventive Systems Compliance Explorer"])


def _ensure_sira_seeded(db: Session) -> None:
    """Self-healing check to ensure the 21 SIRA Explorer tables exist and are seeded."""
    try:
        count = db.query(SiraEstablishmentCategory).count()
        if count < 43:
            Base.metadata.create_all(bind=engine)
            SiraExplorerService.seed_sira_manual_database(db)
    except Exception:
        Base.metadata.create_all(bind=engine)
        SiraExplorerService.seed_sira_manual_database(db)


@router.get("/overview")
def get_sira_overview(db: Session = Depends(get_db)) -> Dict[str, Any]:
    _ensure_sira_seeded(db)
    return SiraExplorerService.get_overview(db)


@router.get("/establishments")
def list_sira_establishments(
    search: Optional[str] = Query(None, description="Search by establishment name, synonym, or location keyword"),
    industry_sector: Optional[str] = Query(None, description="Filter by industry sector"),
    equipment_filter: Optional[str] = Query(None, description="Filter by equipment/security system"),
    fov_filter: Optional[str] = Query(None, description="Filter by camera Field of View"),
    sort_by: str = Query("chapter", description="Sort order: chapter, alpha, or requirements"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _ensure_sira_seeded(db)
    return SiraExplorerService.list_establishments(
        db=db,
        search=search,
        industry_sector=industry_sector,
        equipment_filter=equipment_filter,
        fov_filter=fov_filter,
        sort_by=sort_by,
    )


@router.get("/establishments/{slug_or_code}")
def get_sira_establishment_detail(
    slug_or_code: str,
    subtype_code: Optional[str] = Query(None, description="Optional subtype code within the chapter"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _ensure_sira_seeded(db)
    detail = SiraExplorerService.get_establishment_detail(db, slug_or_code, subtype_code)
    if not detail:
        raise HTTPException(status_code=404, detail=f"SIRA Establishment '{slug_or_code}' not found")
    return detail


@router.get("/standards")
def list_sira_technical_standards(
    part_number: Optional[int] = Query(None, description="1 for Technical Specifications, 2 for Operational Controls"),
    technical_category: Optional[str] = Query(None, description="Category filter"),
    search: Optional[str] = Query(None, description="Keyword search"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _ensure_sira_seeded(db)
    return SiraExplorerService.list_technical_standards(
        db=db,
        part_number=part_number,
        technical_category=technical_category,
        search=search,
    )


@router.get("/definitions")
def list_sira_definitions(
    search: Optional[str] = Query(None, description="Search official definitions and Field of View types"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _ensure_sira_seeded(db)
    return SiraExplorerService.list_definitions_and_fov(db=db, search=search)


@router.get("/search")
def global_sira_search(
    q: str = Query("", description="Global search query across all SIRA modules"),
    module_filter: str = Query("ALL", description="ALL, ESTABLISHMENTS, SECTOR_REQUIREMENTS, TECHNICAL_STANDARDS, DEFINITIONS, PDF_PAGES"),
    fov_filter: str = Query("ALL", description="Filter by FOV type"),
    applicability_filter: str = Query("ALL", description="MANDATORY or CONDITIONAL"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _ensure_sira_seeded(db)
    return SiraExplorerService.global_search(
        db=db,
        q=q,
        module_filter=module_filter,
        fov_filter=fov_filter,
        applicability_filter=applicability_filter,
    )


@router.get("/source-pages/{page_number}")
def get_sira_source_page(
    page_number: int,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _ensure_sira_seeded(db)
    return SiraExplorerService.get_source_page(db, page_number)


@router.get("/source-pdf")
def serve_sira_source_pdf():
    pdf_path = find_sira_pdf_path()
    if not pdf_path or not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Original SIRA PDF file not found on server")
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_path.name,
        headers={"Content-Disposition": f'inline; filename="{pdf_path.name}"'},
    )


@router.get("/projects")
def list_compliance_projects(db: Session = Depends(get_db)):
    _ensure_sira_seeded(db)
    return {"items": SiraExplorerService.list_projects(db)}


@router.post("/projects")
def create_compliance_project(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
):
    _ensure_sira_seeded(db)
    try:
        return SiraExplorerService.create_project(db, payload, actor_name=payload.get("lead_assessor", "System Auditor"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/projects/{project_id}")
def get_compliance_project_detail(
    project_id: int,
    db: Session = Depends(get_db),
):
    _ensure_sira_seeded(db)
    detail = SiraExplorerService.get_project_detail(db, project_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Compliance project not found")
    return detail


@router.put("/projects/{project_id}/items/{item_id}")
def update_compliance_project_item(
    project_id: int,
    item_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
):
    _ensure_sira_seeded(db)
    try:
        return SiraExplorerService.update_project_requirement(
            db=db,
            project_id=project_id,
            item_id=item_id,
            payload=payload,
            actor_name=payload.get("reviewer_name") or "Lead Auditor",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/seed")
def trigger_sira_reseed(db: Session = Depends(get_db)):
    Base.metadata.create_all(bind=engine)
    return SiraExplorerService.seed_sira_manual_database(db)


@router.get("/inspections/{inspection_id}/audit")
def get_inspection_sira_audit(
    inspection_id: int,
    category_slug: Optional[str] = Query(None, description="Optional SIRA chapter slug override (e.g. est-ch08)"),
    subtype_code: Optional[str] = Query(None, description="Optional SIRA subtype code override (e.g. CH08-SUB03)"),
    auto_evaluate: bool = Query(False, description="Auto-grade SIRA requirements against Phase 1 & 2 evidence"),
    bulk_status: Optional[str] = Query(None, description="Optional bulk grade: COMPLIANT, NON_COMPLIANT, PENDING_VERIFICATION"),
    phase1_readiness_pct: Optional[float] = Query(None, description="Optional Phase 1 readiness percentage"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Retrieves or evaluates the Phase 1 + Phase 2 SIRA Compliance Audit & Grading Matrix
    for a specific inspection, including weighted SIRA grade (A/B/C/D/F) and Stage 1 / Stage 2 review status.
    """
    _ensure_sira_seeded(db)
    actor = current_user.full_name if current_user and getattr(current_user, "full_name", None) else "SIRA Field Inspector"
    try:
        return SiraExplorerService.get_or_evaluate_inspection_sira_audit(
            db=db,
            inspection_id=inspection_id,
            category_slug=category_slug,
            subtype_code=subtype_code,
            auto_evaluate=auto_evaluate,
            bulk_status=bulk_status,
            phase1_readiness_pct=phase1_readiness_pct,
            actor_name=actor,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/inspections/{inspection_id}/evaluate")
def evaluate_inspection_sira_audit(
    inspection_id: int,
    payload: Dict[str, Any] = {},
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Triggers Phase 2 SIRA Compliance evaluation, category switching, or bulk grading for an inspection.
    """
    _ensure_sira_seeded(db)
    actor = current_user.full_name if current_user and getattr(current_user, "full_name", None) else payload.get("actor_name", "SIRA Field Inspector")
    try:
        return SiraExplorerService.get_or_evaluate_inspection_sira_audit(
            db=db,
            inspection_id=inspection_id,
            category_slug=payload.get("category_slug"),
            subtype_code=payload.get("subtype_code"),
            auto_evaluate=bool(payload.get("auto_evaluate", True)),
            bulk_status=payload.get("bulk_status"),
            phase1_readiness_pct=payload.get("phase1_readiness_pct"),
            actor_name=actor,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/inspections/{inspection_id}/items/{item_id}")
def grade_inspection_sira_item(
    inspection_id: int,
    item_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Grades a single SIRA requirement item within an inspection's Phase 2 SIRA audit and recalculates the SIRA Grade.
    """
    _ensure_sira_seeded(db)
    actor = current_user.full_name if current_user and getattr(current_user, "full_name", None) else payload.get("reviewer_name", "SIRA Field Inspector")
    try:
        audit = SiraExplorerService.get_or_evaluate_inspection_sira_audit(db, inspection_id, actor_name=actor)
        SiraExplorerService.update_project_requirement(
            db=db,
            project_id=audit["project_id"],
            item_id=item_id,
            payload=payload,
            actor_name=actor,
        )
        return SiraExplorerService.get_or_evaluate_inspection_sira_audit(db, inspection_id, actor_name=actor)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/inspections/{inspection_id}/inspector-decision")
def submit_stage1_inspector_sira_decision(
    inspection_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Stage 1: Field Inspector grades SIRA compliance and submits an APPROVE or REJECT recommendation to the Final Reviewer.
    """
    _ensure_sira_seeded(db)
    actor = current_user.full_name if current_user and getattr(current_user, "full_name", None) else payload.get("inspector_name", "Eng. Rashid Al Mansoori (SIRA Inspector)")
    try:
        return SiraExplorerService.submit_stage1_inspector_sira_decision(
            db=db,
            inspection_id=inspection_id,
            decision=payload.get("decision", "APPROVE"),
            inspector_notes=payload.get("inspector_notes", ""),
            actor_name=actor,
            user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/inspections/{inspection_id}/reviewer-decision")
def submit_stage2_final_reviewer_sira_decision(
    inspection_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Stage 2: Final Reviewer rechecks Phase 1 + Phase 2 SIRA compliance & Stage 1 Inspector grading,
    confirms the 4 recheck verification checks, and executes Final Approve (issuing the SIRA Certificate) or Final Reject.
    """
    _ensure_sira_seeded(db)
    actor = current_user.full_name if current_user and getattr(current_user, "full_name", None) else payload.get("reviewer_name", "Chief SIRA Compliance Reviewer")
    try:
        return SiraExplorerService.submit_stage2_final_reviewer_sira_decision(
            db=db,
            inspection_id=inspection_id,
            decision=payload.get("decision", "APPROVE"),
            reviewer_notes=payload.get("reviewer_notes", ""),
            recheck_phase1_scope=bool(payload.get("recheck_phase1_scope", True)),
            recheck_sira_category=bool(payload.get("recheck_sira_category", True)),
            recheck_camera_fov_matrix=bool(payload.get("recheck_camera_fov_matrix", True)),
            recheck_inspector_grade=bool(payload.get("recheck_inspector_grade", True)),
            allow_override=bool(payload.get("allow_override", False)),
            override_justification=payload.get("override_justification"),
            actor_name=actor,
            user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


