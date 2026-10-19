import os
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from sqlalchemy.orm import Session

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from app.models.inspection import Inspection
from app.models.establishment import Establishment
from app.models.document import Document
from app.models.detection import Detection
from app.models.compliance import InspectionComplianceItem
from app.models.certificate import Certificate
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.report import ReportResponse
from app.core.config import settings
from app.services.audit_service import AuditService
from app.utils.errors import NotFoundError

logger = logging.getLogger("app.report_service")

class ReportService:
    @staticmethod
    def generate_inspection_report(
        db: Session,
        inspection_id: int,
        user: Optional[User] = None,
        include_audit_trail: bool = True
    ) -> ReportResponse:
        """
        Generates a comprehensive multi-page executive PDF inspection report.
        """
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            raise NotFoundError(f"Inspection {inspection_id} not found")

        establishment = db.query(Establishment).filter(Establishment.id == inspection.establishment_id).first()
        documents = db.query(Document).filter(Document.inspection_id == inspection_id).all()
        detections = db.query(Detection).filter(Detection.inspection_id == inspection_id).all()
        compliance_items = db.query(InspectionComplianceItem).filter(InspectionComplianceItem.inspection_id == inspection_id).all()
        certificate = db.query(Certificate).filter(Certificate.inspection_id == inspection_id).first()
        audit_records = db.query(AuditLog).filter(
            AuditLog.entity_id == str(inspection_id)
        ).order_by(AuditLog.created_at.asc()).limit(20).all() if include_audit_trail else []

        # Prepare output path
        report_dir = settings.UPLOAD_DIR / "reports"
        report_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"report_insp_{inspection.inspection_number.replace('-', '_')}_{timestamp_str}.pdf"
        report_path = report_dir / report_filename

        doc = SimpleDocTemplate(
            str(report_path),
            pagesize=letter,
            leftMargin=40,
            rightMargin=40,
            topMargin=40,
            bottomMargin=40
        )

        styles = getSampleStyleSheet()
        
        # Styles
        title_style = ParagraphStyle(
            'RepTitle', parent=styles['Heading1'],
            fontName='Helvetica-Bold', fontSize=18, leading=22,
            textColor=colors.HexColor('#0f2b48'), alignment=TA_CENTER
        )
        sub_style = ParagraphStyle(
            'RepSub', parent=styles['Normal'],
            fontName='Helvetica', fontSize=9, leading=12,
            textColor=colors.HexColor('#64748b'), alignment=TA_CENTER
        )
        sec_title_style = ParagraphStyle(
            'SecTitle', parent=styles['Heading2'],
            fontName='Helvetica-Bold', fontSize=12, leading=16,
            textColor=colors.HexColor('#1e3a8a')
        )
        cell_bold = ParagraphStyle(
            'CellBold', parent=styles['Normal'],
            fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#0f172a')
        )
        cell_text = ParagraphStyle(
            'CellText', parent=styles['Normal'],
            fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#334155')
        )

        elements = []

        # Header
        elements.append(Paragraph("SECURITY & COMPLIANCE INSPECTION PLATFORM", sub_style))
        elements.append(Paragraph("COMPREHENSIVE REGULATORY INSPECTION REPORT", title_style))
        elements.append(Paragraph(f"Reference: {inspection.inspection_number} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", sub_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f2b48')))
        elements.append(Spacer(1, 10))

        # 1. Facility & Inspection Metadata Table
        elements.append(Paragraph("1. Facility & Inspection Profile", sec_title_style))
        elements.append(Spacer(1, 4))
        
        score_val = f"{inspection.compliance_score:.1f}%" if inspection.compliance_score is not None else "Pending"
        meta_data = [
            [Paragraph("<b>Establishment Name:</b>", cell_bold), Paragraph(establishment.name if establishment else "N/A", cell_text),
             Paragraph("<b>Inspection Cycle:</b>", cell_bold), Paragraph(inspection.inspection_number, cell_text)],
            [Paragraph("<b>Establishment Type:</b>", cell_bold), Paragraph(establishment.establishment_type if establishment else "N/A", cell_text),
             Paragraph("<b>Status:</b>", cell_bold), Paragraph(f"<b>{inspection.status}</b>", cell_bold)],
            [Paragraph("<b>Physical Address:</b>", cell_bold), Paragraph(establishment.address if establishment else "N/A", cell_text),
             Paragraph("<b>Compliance Score:</b>", cell_bold), Paragraph(score_val, cell_bold)],
            [Paragraph("<b>Owner / Contact:</b>", cell_bold), Paragraph(f"{establishment.owner_name or 'N/A'} ({establishment.contact_information or 'N/A'})", cell_text),
             Paragraph("<b>Certificate Ref:</b>", cell_bold), Paragraph(certificate.certificate_number if certificate else "Not Issued", cell_text)],
        ]
        meta_table = Table(meta_data, colWidths=[110, 155, 110, 155])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 12))

        # 2. Uploaded Document Evidence Table
        elements.append(Paragraph(f"2. Photographic & Document Evidence ({len(documents)} Attached)", sec_title_style))
        elements.append(Spacer(1, 4))
        if documents:
            doc_data = [[
                Paragraph("<b>ID</b>", cell_bold),
                Paragraph("<b>Filename</b>", cell_bold),
                Paragraph("<b>Format / Size</b>", cell_bold),
                Paragraph("<b>Processing Status</b>", cell_bold),
                Paragraph("<b>SHA-256 Hash</b>", cell_bold),
            ]]
            for d in documents:
                doc_data.append([
                    Paragraph(str(d.id), cell_text),
                    Paragraph(d.original_filename, cell_text),
                    Paragraph(f"{d.file_type} ({d.file_size // 1024} KB)", cell_text),
                    Paragraph(d.upload_status, cell_text),
                    Paragraph(f"{d.sha256_hash[:16]}..." if d.sha256_hash else "N/A", cell_text),
                ])
            doc_table = Table(doc_data, colWidths=[30, 160, 110, 90, 140])
            doc_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(doc_table)
        else:
            elements.append(Paragraph("<i>No document evidence uploaded.</i>", cell_text))
        elements.append(Spacer(1, 12))

        # 3. AI Computer Vision Detections Summary
        elements.append(Paragraph(f"3. AI Computer Vision Detections ({len(detections)} Objects Analyzed)", sec_title_style))
        elements.append(Spacer(1, 4))
        if detections:
            det_data = [[
                Paragraph("<b>Object Type</b>", cell_bold),
                Paragraph("<b>Confidence</b>", cell_bold),
                Paragraph("<b>Bounding Box (Normalized)</b>", cell_bold),
                Paragraph("<b>Verification Status</b>", cell_bold),
                Paragraph("<b>Inspector Notes</b>", cell_bold),
            ]]
            for det in detections[:15]: # Show top 15
                bbox_str = f"[{det.bbox_x_min:.2f}, {det.bbox_y_min:.2f}, {det.bbox_x_max:.2f}, {det.bbox_y_max:.2f}]"
                det_data.append([
                    Paragraph(f"<b>{det.object_type}</b>", cell_text),
                    Paragraph(f"{det.confidence * 100:.1f}%", cell_text),
                    Paragraph(bbox_str, cell_text),
                    Paragraph(f"<b>{det.verification_status}</b>", cell_text),
                    Paragraph(det.inspector_notes or "-", cell_text),
                ])
            det_table = Table(det_data, colWidths=[110, 65, 135, 95, 125])
            det_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(det_table)
        else:
            elements.append(Paragraph("<i>No AI detections registered.</i>", cell_text))
        elements.append(Spacer(1, 12))

        # 4. Regulatory Compliance Evaluation Checklist
        elements.append(Paragraph("4. Regulatory Compliance Checklist (دليل نظم وقائية)", sec_title_style))
        elements.append(Spacer(1, 4))
        if compliance_items:
            comp_data = [[
                Paragraph("<b>Code</b>", cell_bold),
                Paragraph("<b>Regulatory Requirement & Citation</b>", cell_bold),
                Paragraph("<b>Required</b>", cell_bold),
                Paragraph("<b>Verified</b>", cell_bold),
                Paragraph("<b>Status</b>", cell_bold),
            ]]
            for item in compliance_items:
                req = item.requirement
                title_cite = f"{req.title if req else 'N/A'}<br/><font color='#64748b' size=7>{req.source_document if req else ''} ({req.source_section if req else ''})</font>"
                status_color = "#16a34a" if item.status == "COMPLIANT" else ("#dc2626" if item.status == "NON_COMPLIANT" else "#d97706")
                comp_data.append([
                    Paragraph(req.requirement_code if req else "N/A", cell_bold),
                    Paragraph(title_cite, cell_text),
                    Paragraph(str(item.required_quantity or 1), cell_text),
                    Paragraph(str(item.verified_quantity), cell_text),
                    Paragraph(f"<font color='{status_color}'><b>{item.status}</b></font>", cell_text),
                ])
            comp_table = Table(comp_data, colWidths=[80, 260, 50, 50, 90])
            comp_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(comp_table)
        else:
            elements.append(Paragraph("<i>Compliance engine evaluation pending.</i>", cell_text))
        elements.append(Spacer(1, 12))

        # 5. Review Notes & Approvals
        elements.append(Paragraph("5. Inspector & Reviewer Formal Observations", sec_title_style))
        elements.append(Spacer(1, 4))
        notes_text = inspection.notes or "No additional notes recorded."
        elements.append(Paragraph(notes_text.replace("\n", "<br/>"), cell_text))
        elements.append(Spacer(1, 14))

        # 6. Audit Trail Snapshot
        if audit_records:
            elements.append(Paragraph("6. Audit Trail & Chain of Custody Snapshot", sec_title_style))
            elements.append(Spacer(1, 4))
            audit_data = [[
                Paragraph("<b>Timestamp</b>", cell_bold),
                Paragraph("<b>User</b>", cell_bold),
                Paragraph("<b>Action</b>", cell_bold),
                Paragraph("<b>Entity</b>", cell_bold),
            ]]
            for a in audit_records:
                audit_data.append([
                    Paragraph(a.created_at.strftime("%Y-%m-%d %H:%M:%S"), cell_text),
                    Paragraph(a.username or "SYSTEM", cell_text),
                    Paragraph(a.action, cell_text),
                    Paragraph(f"{a.entity_type}:{a.entity_id or ''}", cell_text),
                ])
            audit_table = Table(audit_data, colWidths=[120, 90, 170, 150])
            audit_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ]))
            elements.append(audit_table)

        # Build PDF
        doc.build(elements)
        file_size = report_path.stat().st_size
        relative_path = f"uploads/reports/{report_filename}"

        # Audit log
        AuditService.log_event(
            db=db,
            action="INSPECTION_REPORT_GENERATED",
            entity_type="INSPECTION",
            entity_id=str(inspection_id),
            user=user,
            details={"report_filename": report_filename, "file_size_bytes": file_size}
        )

        logger.info(f"Inspection report generated: {report_filename} ({file_size} bytes)")
        return ReportResponse(
            inspection_id=inspection.id,
            inspection_number=inspection.inspection_number,
            report_filename=report_filename,
            report_path=relative_path,
            file_size_bytes=file_size,
            generated_at=datetime.now(),
            download_url=f"/api/v1/reports/{inspection.id}/download",
        )
