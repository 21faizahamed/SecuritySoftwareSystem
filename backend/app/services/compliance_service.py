import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.compliance import InspectionComplianceItem
from app.models.requirement import Requirement
from app.models.inspection import Inspection
from app.models.detection import Detection
from app.models.document import Document
from app.models.establishment import Establishment
from app.models.user import User
from app.schemas.compliance import ComplianceSummary, ComplianceItemResponse
from app.services.requirement_service import RequirementService
from app.services.audit_service import AuditService
from app.utils.errors import NotFoundError, ValidationException, ForbiddenError

logger = logging.getLogger("app.compliance_service")

class ComplianceService:
    @staticmethod
    def evaluate_inspection(
        db: Session,
        inspection_id: int,
        user: Optional[User] = None
    ) -> ComplianceSummary:
        """
        Executes the rule-based compliance engine for an inspection:
        1. Identifies applicable regulatory requirements based on establishment type.
        2. Aggregates detected and verified evidence from the inspection.
        3. Compares required vs verified values according to requirement type.
        4. Calculates explainable weighted compliance score.
        5. Updates database records and returns full breakdown.
        """
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            raise NotFoundError(f"Inspection with ID {inspection_id} not found")

        establishment = db.query(Establishment).filter(Establishment.id == inspection.establishment_id).first()
        est_type = establishment.establishment_type if establishment else "Commercial"

        # Get active requirements
        applicable_reqs = RequirementService.get_all(db, establishment_type=est_type, is_active=True)
        if not applicable_reqs:
            # Fallback to all requirements
            applicable_reqs = RequirementService.get_all(db, is_active=True)

        # Get all detections for this inspection
        all_detections = db.query(Detection).filter(Detection.inspection_id == inspection_id).all()
        
        # Count documents
        doc_count = db.query(Document).filter(Document.inspection_id == inspection_id).count()

        # Build count maps
        # detected_map: total objects detected (all statuses except REJECTED)
        # verified_map: verified or manually added objects
        # pending_map: detected but not yet reviewed
        detected_map: Dict[str, int] = {}
        verified_map: Dict[str, int] = {}
        pending_map: Dict[str, int] = {}

        for d in all_detections:
            ot = d.object_type.lower().strip()
            if d.verification_status != "REJECTED":
                detected_map[ot] = detected_map.get(ot, 0) + 1
            
            if d.verification_status in ("VERIFIED", "MANUALLY_ADDED", "MODIFIED"):
                verified_map[ot] = verified_map.get(ot, 0) + 1
            elif d.verification_status == "DETECTED":
                pending_map[ot] = pending_map.get(ot, 0) + 1

        compliance_items_responses: List[ComplianceItemResponse] = []
        satisfied_count = 0
        unsatisfied_count = 0
        pending_verification_count = 0
        not_applicable_count = 0
        overridden_count = 0
        mandatory_violations = 0

        total_weight = 0.0
        earned_weight = 0.0

        for req in applicable_reqs:
            weight = 2.0 if req.is_mandatory or req.severity == "MANDATORY" else 1.0

            # Find or create InspectionComplianceItem row
            item = db.query(InspectionComplianceItem).filter(
                InspectionComplianceItem.inspection_id == inspection_id,
                InspectionComplianceItem.requirement_id == req.id
            ).first()

            if not item:
                item = InspectionComplianceItem(
                    inspection_id=inspection_id,
                    requirement_id=req.id,
                )
                db.add(item)
                db.flush()

            # Target object mapping
            target_obj = req.target_object_type.lower().strip() if req.target_object_type else None
            req_qty = req.min_quantity or 1
            
            det_qty = detected_map.get(target_obj, 0) if target_obj else 0
            ver_qty = verified_map.get(target_obj, 0) if target_obj else 0
            pend_qty = pending_map.get(target_obj, 0) if target_obj else 0

            item.detected_quantity = det_qty
            item.verified_quantity = ver_qty
            item.required_quantity = req_qty

            status_result = "REQUIRES_MANUAL_REVIEW"
            evidence_notes = ""

            # Check if overridden
            if item.is_overridden:
                status_result = "COMPLIANT"
                overridden_count += 1
                evidence_notes = f"[OVERRIDDEN]: {item.override_reason}"
            elif req.requirement_type == "MIN_QUANTITY":
                if ver_qty >= req_qty:
                    status_result = "COMPLIANT"
                    evidence_notes = f"Verified {ver_qty} of required {req_qty} {req.unit} ({req.target_object_type})"
                elif pend_qty > 0 and (ver_qty + pend_qty) >= req_qty:
                    status_result = "REQUIRES_MANUAL_REVIEW"
                    evidence_notes = f"Detected {det_qty} ({pend_qty} unverified). Human verification needed to reach {req_qty}."
                elif doc_count == 0:
                    status_result = "INSUFFICIENT_EVIDENCE"
                    evidence_notes = "No photographic evidence or floor plans uploaded for this facility."
                else:
                    status_result = "NON_COMPLIANT"
                    evidence_notes = f"Verified only {ver_qty} out of required {req_qty} {req.unit}."
            elif req.requirement_type == "DOCUMENTATION":
                if doc_count > 0:
                    status_result = "COMPLIANT"
                    evidence_notes = f"Document evidence attached ({doc_count} files on file)."
                else:
                    status_result = "NON_COMPLIANT"
                    evidence_notes = "Mandatory safety documentation not uploaded."
            elif req.requirement_type == "MAX_QUANTITY":
                if ver_qty <= (req.max_quantity or 0):
                    status_result = "COMPLIANT"
                else:
                    status_result = "NON_COMPLIANT"
            else:
                # Default generic presence
                status_result = "COMPLIANT" if ver_qty > 0 else "REQUIRES_MANUAL_REVIEW"

            item.status = status_result
            item.evidence_notes = evidence_notes
            item.evaluated_at = datetime.now()

            # Scoring aggregation
            if status_result == "COMPLIANT":
                satisfied_count += 1
                total_weight += weight
                earned_weight += weight
            elif status_result in ("NON_COMPLIANT", "INSUFFICIENT_EVIDENCE"):
                unsatisfied_count += 1
                total_weight += weight
                if req.is_mandatory:
                    mandatory_violations += 1
            elif status_result == "REQUIRES_MANUAL_REVIEW":
                pending_verification_count += 1
                total_weight += weight
                if req.is_mandatory:
                    mandatory_violations += 1
            elif status_result == "NOT_APPLICABLE":
                not_applicable_count += 1

            compliance_items_responses.append(item)

        # Calculate final compliance score (0.0 to 100.0)
        final_score = round((earned_weight / total_weight) * 100.0, 1) if total_weight > 0 else 100.0

        is_eligible = (mandatory_violations == 0 and pending_verification_count == 0 and unsatisfied_count == 0)

        # Persist score and summary on Inspection
        summary_dict = {
            "total_requirements": len(applicable_reqs),
            "satisfied": satisfied_count,
            "unsatisfied": unsatisfied_count,
            "pending_verification": pending_verification_count,
            "not_applicable": not_applicable_count,
            "overridden": overridden_count,
            "mandatory_violations": mandatory_violations,
            "compliance_score": final_score,
            "is_eligible_for_approval": is_eligible,
        }

        inspection.compliance_score = final_score
        inspection.compliance_summary = json.dumps(summary_dict)
        db.commit()

        # Audit evaluation
        AuditService.log_event(
            db=db,
            action="COMPLIANCE_EVALUATED",
            entity_type="INSPECTION",
            entity_id=str(inspection_id),
            user=user,
            details=summary_dict
        )

        msg = (
            f"Compliance evaluated: {satisfied_count}/{len(applicable_reqs)} requirements satisfied. "
            f"Score: {final_score}%. Eligible for approval: {'Yes' if is_eligible else 'No'}"
        )

        return ComplianceSummary(
            inspection_id=inspection_id,
            inspection_number=inspection.inspection_number,
            total_requirements=len(applicable_reqs),
            satisfied_count=satisfied_count,
            unsatisfied_count=unsatisfied_count,
            pending_verification_count=pending_verification_count,
            not_applicable_count=not_applicable_count,
            overridden_count=overridden_count,
            mandatory_violations=mandatory_violations,
            compliance_score=final_score,
            is_eligible_for_approval=is_eligible,
            summary_message=msg,
            evaluated_at=datetime.now(),
            items=compliance_items_responses,
        )

    @staticmethod
    def get_compliance_items(db: Session, inspection_id: int) -> List[InspectionComplianceItem]:
        """Retrieves existing compliance evaluation items for an inspection."""
        return db.query(InspectionComplianceItem).filter(
            InspectionComplianceItem.inspection_id == inspection_id
        ).all()

    @staticmethod
    def override_item(
        db: Session,
        item_id: int,
        reason: str,
        target_status: str = "COMPLIANT",
        user: Optional[User] = None
    ) -> InspectionComplianceItem:
        """
        Allows an authorized Reviewer/Admin to override a compliance item.
        Requires explicit reason and logs immutable audit trail.
        """
        item = db.query(InspectionComplianceItem).filter(InspectionComplianceItem.id == item_id).first()
        if not item:
            raise NotFoundError(f"Compliance item {item_id} not found")

        if not reason or len(reason.strip()) < 5:
            raise ValidationException("An explicit override reason of at least 5 characters is required")

        item.is_overridden = True
        item.override_reason = reason.strip()
        item.status = target_status.upper().strip()
        item.overridden_by_id = user.id if user else None

        db.commit()
        db.refresh(item)

        AuditService.log_event(
            db=db,
            action="COMPLIANCE_ITEM_OVERRIDDEN",
            entity_type="COMPLIANCE_ITEM",
            entity_id=str(item_id),
            user=user,
            details={
                "inspection_id": item.inspection_id,
                "requirement_id": item.requirement_id,
                "new_status": item.status,
                "reason": reason,
            }
        )

        logger.info(f"Compliance item {item_id} overridden to '{item.status}' by {user.username if user else 'Reviewer'}")
        return item
