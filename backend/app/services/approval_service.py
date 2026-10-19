import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.inspection import Inspection
from app.models.user import User
from app.schemas.approval import ApprovalResponse
from app.services.compliance_service import ComplianceService
from app.services.certificate_service import CertificateService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.utils.errors import NotFoundError, ValidationException, ForbiddenError

logger = logging.getLogger("app.approval_service")

class ApprovalService:
    @staticmethod
    def submit_for_review(
        db: Session,
        inspection_id: int,
        user: User,
        inspector_notes: Optional[str] = None
    ) -> ApprovalResponse:
        """
        Inspector submits an inspection with verified evidence for formal compliance review.
        Transitions state to AWAITING_REVIEW.
        """
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            raise NotFoundError(f"Inspection with ID {inspection_id} not found")

        valid_prior_states = ("DRAFT", "IN_PROGRESS", "AWAITING_VERIFICATION")
        if inspection.status not in valid_prior_states:
            raise ValidationException(
                f"Cannot submit inspection: Current status is '{inspection.status}'. "
                f"Inspection must be in one of: {', '.join(valid_prior_states)}"
            )

        # Run compliance evaluation before submission
        compliance_summary = ComplianceService.evaluate_inspection(db, inspection_id, user=user)

        prev_status = inspection.status
        inspection.status = "AWAITING_REVIEW"
        inspection.inspector_id = user.id
        if inspector_notes:
            inspection.notes = (inspection.notes or "") + f"\n[Inspector Submission Notes ({datetime.now().strftime('%Y-%m-%d %H:%M')}]: {inspector_notes.strip()}"

        db.commit()
        db.refresh(inspection)

        # Audit event
        AuditService.log_event(
            db=db,
            action="INSPECTION_SUBMITTED_FOR_REVIEW",
            entity_type="INSPECTION",
            entity_id=str(inspection_id),
            user=user,
            details={
                "previous_status": prev_status,
                "new_status": "AWAITING_REVIEW",
                "compliance_score": compliance_summary.compliance_score,
                "satisfied_count": compliance_summary.satisfied_count,
                "mandatory_violations": compliance_summary.mandatory_violations,
            }
        )

        # Notify reviewers
        NotificationService.notify_role(
            db=db,
            role_name="REVIEWER",
            title="Inspection Submitted for Review",
            message=f"Inspection #{inspection.inspection_number} has been submitted by {user.full_name} for compliance review.",
            link=f"/inspections/{inspection.id}",
            notification_type="INFO"
        )

        logger.info(f"Inspection #{inspection.inspection_number} submitted for review by {user.username}")
        return ApprovalResponse(
            inspection_id=inspection.id,
            inspection_number=inspection.inspection_number,
            previous_status=prev_status,
            current_status=inspection.status,
            approved_by=user.username,
            action_timestamp=datetime.now(),
            message=f"Inspection #{inspection.inspection_number} successfully submitted for reviewer approval.",
        )

    @staticmethod
    def approve_inspection(
        db: Session,
        inspection_id: int,
        user: User,
        reviewer_notes: Optional[str] = None,
        force_override: bool = False,
        override_reason: Optional[str] = None
    ) -> ApprovalResponse:
        """
        Authorized Reviewer/Admin approves an inspection.
        Enforces mandatory compliance verification rules before final approval.
        """
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            raise NotFoundError(f"Inspection with ID {inspection_id} not found")

        if inspection.status not in ("AWAITING_REVIEW", "IN_PROGRESS", "AWAITING_VERIFICATION"):
            raise ValidationException(
                f"Cannot approve inspection in '{inspection.status}' status. Must be in 'AWAITING_REVIEW'."
            )

        # Re-evaluate compliance
        compliance_summary = ComplianceService.evaluate_inspection(db, inspection_id, user=user)

        # Strict Rule Check
        if compliance_summary.mandatory_violations > 0 or not compliance_summary.is_eligible_for_approval:
            if not force_override:
                raise ValidationException(
                    f"Approval blocked: Inspection has {compliance_summary.mandatory_violations} unsatisfied mandatory "
                    f"regulatory requirements and {compliance_summary.pending_verification_count} items requiring review. "
                    f"All mandatory items must be verified/satisfied or explicitly overridden by an authorized authority."
                )
            if not override_reason or len(override_reason.strip()) < 5:
                raise ValidationException("An explicit override reason is required to force approval of a non-compliant inspection.")

        prev_status = inspection.status
        inspection.status = "APPROVED"
        inspection.reviewer_id = user.id
        if reviewer_notes:
            inspection.notes = (inspection.notes or "") + f"\n[Reviewer Approval ({datetime.now().strftime('%Y-%m-%d %H:%M')}]: {reviewer_notes.strip()}"
        if force_override and override_reason:
            inspection.notes = (inspection.notes or "") + f"\n[ADMIN OVERRIDE]: {override_reason.strip()}"

        db.commit()
        db.refresh(inspection)

        # Generate official Certificate
        cert = CertificateService.issue_certificate(
            db=db,
            inspection_id=inspection.id,
            issued_by_user=user,
            expiry_months=12
        )

        # Audit log
        AuditService.log_event(
            db=db,
            action="INSPECTION_APPROVED",
            entity_type="INSPECTION",
            entity_id=str(inspection_id),
            user=user,
            details={
                "previous_status": prev_status,
                "new_status": "APPROVED",
                "certificate_number": cert.certificate_number,
                "score": inspection.compliance_score,
                "forced_override": force_override,
                "override_reason": override_reason,
            }
        )

        # Notify inspector
        if inspection.inspector_id:
            NotificationService.create_notification(
                db=db,
                user_id=inspection.inspector_id,
                title="Inspection Approved & Certificate Issued",
                message=f"Inspection #{inspection.inspection_number} has been approved. Certificate #{cert.certificate_number} is now active.",
                link=f"/inspections/{inspection.id}",
                notification_type="SUCCESS"
            )

        logger.info(f"Inspection #{inspection.inspection_number} APPROVED by {user.username}. Certificate #{cert.certificate_number} generated.")
        return ApprovalResponse(
            inspection_id=inspection.id,
            inspection_number=inspection.inspection_number,
            previous_status=prev_status,
            current_status=inspection.status,
            approved_by=user.username,
            action_timestamp=datetime.now(),
            message=f"Inspection #{inspection.inspection_number} approved successfully. Certificate #{cert.certificate_number} has been issued.",
            certificate_id=cert.id,
            certificate_number=cert.certificate_number,
        )

    @staticmethod
    def reject_inspection(
        db: Session,
        inspection_id: int,
        user: User,
        rejection_reason: str,
        reviewer_notes: Optional[str] = None
    ) -> ApprovalResponse:
        """
        Reviewer rejects an inspection cycle with formal feedback.
        """
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            raise NotFoundError(f"Inspection with ID {inspection_id} not found")

        if not rejection_reason or len(rejection_reason.strip()) < 5:
            raise ValidationException("A clear rejection reason of at least 5 characters is required.")

        prev_status = inspection.status
        inspection.status = "REJECTED"
        inspection.reviewer_id = user.id
        
        rejection_note = f"\n[REJECTED by {user.username} on {datetime.now().strftime('%Y-%m-%d %H:%M')}]: Reason: {rejection_reason.strip()}"
        if reviewer_notes:
            rejection_note += f" | Notes: {reviewer_notes.strip()}"
        inspection.notes = (inspection.notes or "") + rejection_note

        db.commit()
        db.refresh(inspection)

        # Audit event
        AuditService.log_event(
            db=db,
            action="INSPECTION_REJECTED",
            entity_type="INSPECTION",
            entity_id=str(inspection_id),
            user=user,
            details={
                "previous_status": prev_status,
                "new_status": "REJECTED",
                "rejection_reason": rejection_reason,
            }
        )

        # Notify inspector
        if inspection.inspector_id:
            NotificationService.create_notification(
                db=db,
                user_id=inspection.inspector_id,
                title="Inspection Rejected",
                message=f"Inspection #{inspection.inspection_number} was rejected by {user.full_name}: {rejection_reason}",
                link=f"/inspections/{inspection.id}",
                notification_type="WARNING"
            )

        logger.info(f"Inspection #{inspection.inspection_number} REJECTED by {user.username}")
        return ApprovalResponse(
            inspection_id=inspection.id,
            inspection_number=inspection.inspection_number,
            previous_status=prev_status,
            current_status=inspection.status,
            approved_by=user.username,
            action_timestamp=datetime.now(),
            message=f"Inspection #{inspection.inspection_number} has been rejected with feedback.",
        )
