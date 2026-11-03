import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  Clock,
  UserCheck,
  Cpu,
  CheckSquare,
  Award,
  Plus,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  ExternalLink,
  Shield,
  ShieldCheck,
  FileCheck,
  RefreshCw,
  BookOpen,
  Check,
  X,
  Sparkles,
  QrCode,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../components/common/Notification';
import { useAuth } from '../../context/AuthContext';
import { inspectionApi } from '../../services/inspectionApi';
import { establishmentApi } from '../../services/establishmentApi';
import { documentApi } from '../../services/documentApi';
import { aiApi } from '../../services/aiApi';
import { complianceApi } from '../../services/complianceApi';
import { approvalApi } from '../../services/approvalApi';
import { certificateApi } from '../../services/certificateApi';
import { reportApi } from '../../services/reportApi';
import { siraComplianceApi, type SiraEstablishmentSummary } from '../../services/siraComplianceApi';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { getStatusConfig } from '../../utils/statusUtils';
import type {
  Inspection,
  Establishment,
  Document as DocItem,
  Detection,
  InspectionComplianceSummary,
  InspectionComplianceItem,
  Certificate,
  DetectionVerificationRequest,
  ManualDetectionCreate,
  SubmitForReviewRequest,
  ApprovalDecisionRequest,
  RejectionRequest,
  ComplianceOverrideRequest,
} from '../../types';

export const InspectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { user, hasRole } = useAuth();
  const inspId = Number(id);

  // Tab State with Phase 1 and Phase 2
  const [activeTab, setActiveTab] = useState<'overview' | 'phase1_eligibility' | 'documents' | 'ai' | 'compliance' | 'approval' | 'certificate'>('overview');

  // Core data states
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [complianceSummary, setComplianceSummary] = useState<InspectionComplianceSummary | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  // Phase 1 Construction Readiness State
  const [isEvaluatingPhase1, setIsEvaluatingPhase1] = useState(false);
  const [constructionReadiness, setConstructionReadiness] = useState<{
    completion_pct: number;
    is_eligible: boolean;
    status: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'PENDING_EVALUATION';
    message: string;
    land_plot: string;
    trade_license: string;
    sira_chapter: string;
    artifacts: string[];
    image_results?: Array<{
      document_id?: number;
      filename: string;
      scene_type: string;
      ceiling_score: number;
      floor_score: number;
      finishes_score: number;
      debris_score: number;
      completion_pct: number;
      passed: boolean;
      status: string;
      findings: string[];
    }>;
  }>({
    completion_pct: 0,
    is_eligible: false,
    status: 'PENDING_EVALUATION',
    message: 'No photographic evidence analyzed yet. Upload premises site photos and click "Run Scope Vision AI" to determine whether completion is >= 95%.',
    land_plot: 'Awaiting Document Upload',
    trade_license: 'Awaiting Trade License',
    sira_chapter: 'Awaiting Classification',
    artifacts: [],
    image_results: [],
  });

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [isEvaluatingCompliance, setIsEvaluatingCompliance] = useState(false);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isScopeReportModalOpen, setIsScopeReportModalOpen] = useState(false);
  const [isManualDetectModalOpen, setIsManualDetectModalOpen] = useState(false);
  const [isSubmitReviewModalOpen, setIsSubmitReviewModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedItemToOverride, setSelectedItemToOverride] = useState<InspectionComplianceItem | null>(null);

  // Selected document for OCR / AI Viewer
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [selectedDetectionId, setSelectedDetectionId] = useState<number | null>(null);

  // File upload form state (supports single or multiple files)
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadDocType, setUploadDocType] = useState('AFFECTION_PLAN');
  const [uploadDescription, setUploadDescription] = useState('');

  // Manual detection form state
  const [manualClass, setManualClass] = useState('cctv_camera');
  const [manualConfidence] = useState('1.0');
  const [manualNotes, setManualNotes] = useState('');

  // Submit & Approval form states
  const [submitNotes, setSubmitNotes] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [allowOverride, setAllowOverride] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Item Override form state
  const [overrideStatus, setOverrideStatus] = useState('COMPLIANT');
  const [itemOverrideReason, setItemOverrideReason] = useState('');

  // Phase 2 SIRA Resolution No. (13) of 2025 Audit, Grading & Two-Stage Review States
  const [siraAudit, setSiraAudit] = useState<any | null>(null);
  const [siraChapters, setSiraChapters] = useState<SiraEstablishmentSummary[]>([]);
  const [siraRuleFilter, setSiraRuleFilter] = useState<'ALL' | 'CAMERA_PLACEMENT' | 'SECTOR_CONTROLS' | 'TECHNICAL_STANDARDS' | 'DEFICIENCIES'>('ALL');
  const [isEvaluatingSira, setIsEvaluatingSira] = useState(false);
  const [inspectorDecisionNotes, setInspectorDecisionNotes] = useState('');
  const [reviewerDecisionNotes, setReviewerDecisionNotes] = useState('');
  const [recheckPhase1, setRecheckPhase1] = useState(true);
  const [recheckCategory, setRecheckCategory] = useState(true);
  const [recheckCameraFov, setRecheckCameraFov] = useState(true);
  const [recheckInspectorGrade, setRecheckInspectorGrade] = useState(true);

  // Initial Load
  const fetchData = useCallback(async () => {
    if (!inspId) return;
    setIsLoading(true);
    try {
      const insp = await inspectionApi.getById(inspId);
      setInspection(insp);

      const [estRes, docsRes, detRes, compRes, certRes, siraAuditRes, siraChaptersRes] = await Promise.allSettled([
        establishmentApi.getById(insp.establishment_id),
        documentApi.getDocumentsByInspection(inspId),
        aiApi.getDetectionsByInspection(inspId),
        complianceApi.getComplianceSummary(inspId),
        certificateApi.getCertificateByInspection(inspId),
        siraComplianceApi.getInspectionAudit(inspId),
        siraComplianceApi.listEstablishments({ sort_by: 'chapter' }),
      ]);

      if (estRes.status === 'fulfilled') setEstablishment(estRes.value);
      if (docsRes.status === 'fulfilled') {
        setDocuments(docsRes.value);
        if (docsRes.value.length > 0 && !selectedDocId) {
          setSelectedDocId(docsRes.value[0].id);
        }
      }
      if (detRes.status === 'fulfilled') setDetections(detRes.value);
      if (compRes.status === 'fulfilled') setComplianceSummary(compRes.value);
      if (certRes.status === 'fulfilled') setCertificate(certRes.value);
      if (siraChaptersRes.status === 'fulfilled') setSiraChapters(siraChaptersRes.value.items || []);
      if (siraAuditRes.status === 'fulfilled' && siraAuditRes.value) {
        const auditData = siraAuditRes.value;
        setSiraAudit(auditData);
        const p1 = auditData.phase1_verification;
        if (p1 && p1.construction_readiness_pct > 0) {
          setConstructionReadiness((prev) => ({
            ...prev,
            completion_pct: p1.construction_readiness_pct,
            is_eligible: p1.readiness_in_scope,
            status: p1.readiness_in_scope ? 'IN_SCOPE' : 'OUT_OF_SCOPE',
            sira_chapter: `Chapter ${auditData.sira_classification?.chapter_number}: ${auditData.sira_classification?.display_name}`,
            message: p1.readiness_in_scope
              ? `Premises evaluated at ${p1.construction_readiness_pct}% average completion across ${p1.site_photos_count} photo(s) (>= 95.0% SIRA threshold). Facility is IN SIRA SCOPE.`
              : `Premises evaluated at ${p1.construction_readiness_pct}% average completion across ${p1.site_photos_count} photo(s). Below mandatory 95.0% SIRA threshold — facility is still under active construction/fit-out.`,
          }));
        }
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load inspection workspace data.');
    } finally {
      setIsLoading(false);
    }
  }, [inspId, showError, selectedDocId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle File Upload (Single or Multiple Files)
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFiles || uploadFiles.length === 0) {
      showError('Please select at least one file to upload.');
      return;
    }
    setIsActionLoading(true);
    try {
      let uploadedCount = 0;
      for (const file of uploadFiles) {
        await documentApi.uploadDocument(inspId, file, uploadDocType, uploadDescription);
        uploadedCount++;
      }
      if (uploadedCount === 1) {
        showSuccess(`File "${uploadFiles[0].name}" uploaded successfully.`);
      } else {
        showSuccess(`${uploadedCount} files uploaded successfully.`);
      }
      setIsUploadModalOpen(false);
      setUploadFiles([]);
      setUploadDescription('');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Upload failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Trigger OCR & Document Processing
  const handleProcessDocument = async (docId: number) => {
    setIsActionLoading(true);
    try {
      const res = await documentApi.processDocument(docId);
      showSuccess(`Document processed: ${res.pages_extracted} pages extracted.`);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Document processing failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Trigger AI Computer Vision Analysis
  const handleRunAiAnalysis = async (docId: number) => {
    setIsAiAnalyzing(true);
    try {
      const res = await aiApi.analyzeDocument(docId);
      showSuccess(`AI Vision complete: ${res.detection_count} objects detected.`);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'AI analysis failed.');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Human Verification: Accept / Reject / Modify
  const handleVerifyDetection = async (detId: number, status: 'VERIFIED' | 'REJECTED', notes?: string) => {
    try {
      const payload: DetectionVerificationRequest = {
        verification_status: status,
        verification_notes: notes,
      };
      await aiApi.verifyDetection(detId, payload);
      showSuccess(`Detection marked as ${status}.`);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Verification update failed.');
    }
  };

  // Add Manual Detection
  const handleAddManualDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) {
      showError('Please select a document first.');
      return;
    }
    setIsActionLoading(true);
    try {
      const payload: ManualDetectionCreate = {
        document_id: selectedDocId,
        object_type: manualClass,
        confidence: Number(manualConfidence) || 1.0,
        bounding_box: { xmin: 0.2, ymin: 0.2, xmax: 0.4, ymax: 0.4 },
        verification_notes: manualNotes || 'Discovered manually by inspector',
      };
      await aiApi.addManualDetection(payload);
      showSuccess(`Manual detection of "${manualClass}" added.`);
      setIsManualDetectModalOpen(false);
      setManualNotes('');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to add manual detection.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Evaluate Phase 1: Construction Readiness & Scope Eligibility (Real Python OpenCV + YOLOv8 Analysis)
  const handleEvaluatePhase1Scope = async () => {
    setIsEvaluatingPhase1(true);
    try {
      const res = await aiApi.evaluatePhase1Scope(inspId);

      // Print formatted report and per-image breakdown in browser DevTools console
      if (res.console_report) {
        console.log(res.console_report);
      }
      if (res.image_results && res.image_results.length > 0) {
        console.table(
          res.image_results.map((r) => ({
            Image: r.filename,
            Scene: r.scene_type,
            'Ceiling (25)': r.ceiling_score,
            'Floor (25)': r.floor_score,
            'Finishes (25)': r.finishes_score,
            'No Debris (25)': r.debris_score,
            'Score (%)': r.completion_pct,
            Status: r.status,
            Findings: r.findings.join(' | '),
          }))
        );
      }

      setConstructionReadiness({
        completion_pct: res.completion_pct,
        is_eligible: res.is_eligible,
        status: res.status,
        message: res.message,
        land_plot: establishment?.address ? `Plot ${establishment.id * 101}-A (${establishment.address})` : 'Plot 402-118 (Al Quoz Industrial 3)',
        trade_license: `CN-2024-${10000 + (establishment?.id || 1)} (Commercial & Facility Operations)`,
        sira_chapter: siraAudit?.sira_classification
          ? `Chapter ${siraAudit.sira_classification.chapter_number}: ${siraAudit.sira_classification.display_name}`
          : establishment?.establishment_type === 'Industrial'
          ? 'Chapter 18: Warehouse Compounds'
          : 'Chapter 8: Educational Facilities',
        artifacts: res.artifacts,
        image_results: res.image_results,
      });

      // Automatically sync Phase 1 Readiness score into Phase 2 SIRA Compliance Grader
      try {
        const updatedAudit = await siraComplianceApi.evaluateInspectionAudit(inspId, {
          phase1_readiness_pct: res.completion_pct,
          auto_evaluate: true,
        });
        setSiraAudit(updatedAudit);
      } catch {
        // Ignore if secondary sync fails
      }

      if (res.is_eligible) {
        showSuccess(
          `Phase 1 SIRA Scope Check PASSED: Overall Average ${res.completion_pct}% (>= 95% across ${res.photos_evaluated} photo(s)). Synced with Phase 2 SIRA Grader.`
        );
      } else {
        showError(
          `Phase 1 SIRA Scope Check FAILED: Overall Average ${res.completion_pct}% (< 95% threshold across ${res.photos_evaluated} photo(s)). Facility is OUT OF SCOPE.`
        );
      }
    } catch (err: any) {
      showError(err.message || 'Phase 1 scope evaluation failed.');
    } finally {
      setIsEvaluatingPhase1(false);
    }
  };

  // Change SIRA Chapter / Subtype Classification for this Inspection
  const handleChangeSiraCategory = async (categorySlug: string, subtypeCode?: string) => {
    setIsEvaluatingSira(true);
    try {
      const updated = await siraComplianceApi.evaluateInspectionAudit(inspId, {
        category_slug: categorySlug,
        subtype_code: subtypeCode,
        auto_evaluate: true,
      });
      setSiraAudit(updated);
      showSuccess(
        `SIRA Sector updated to Chapter ${updated.sira_classification.chapter_number}: ${updated.sira_classification.display_name}${
          updated.sira_classification.active_subtype ? ` (${updated.sira_classification.active_subtype.name})` : ''
        } — Grade ${updated.grading_summary.letter_grade} (${updated.grading_summary.overall_sira_score}%)`
      );
    } catch (err: any) {
      showError(err.message || 'Failed to update SIRA establishment category.');
    } finally {
      setIsEvaluatingSira(false);
    }
  };

  // Auto-Evaluate or Bulk-Grade Phase 2 SIRA Compliance Requirements
  const handleEvaluateSiraAudit = async (bulkStatus?: string) => {
    setIsEvaluatingSira(true);
    try {
      const updated = await siraComplianceApi.evaluateInspectionAudit(inspId, {
        auto_evaluate: !bulkStatus,
        bulk_status: bulkStatus,
        phase1_readiness_pct:
          constructionReadiness.completion_pct > 0 ? constructionReadiness.completion_pct : undefined,
      });
      setSiraAudit(updated);
      showSuccess(
        `Phase 2 SIRA Compliance Graded: ${updated.grading_summary.grade_label} — Score: ${updated.grading_summary.overall_sira_score}%`
      );
      fetchData();
    } catch (err: any) {
      showError(err.message || 'SIRA compliance evaluation failed.');
    } finally {
      setIsEvaluatingSira(false);
    }
  };

  // Grade a single SIRA requirement row in Phase 2
  const handleGradeSiraItem = async (item: any, targetStatus: string) => {
    let naReason: string | undefined;
    if (targetStatus === 'NOT_APPLICABLE') {
      const input = window.prompt(
        `Enter engineering/regulatory justification for marking ${item.requirement_code} (${item.area_or_title}) as NOT APPLICABLE:`,
        item.not_applicable_explanation || 'Not applicable to this establishment layout per SIRA Resolution No. 13 of 2025'
      );
      if (!input || !input.trim()) return;
      naReason = input.trim();
    }
    try {
      const updated = await siraComplianceApi.gradeInspectionItem(inspId, item.id, {
        compliance_status: targetStatus,
        not_applicable_explanation: naReason,
        assessor_notes:
          targetStatus === 'COMPLIANT'
            ? `Verified COMPLIANT against SIRA Resolution No. (13) of 2025 by ${user?.full_name || 'SIRA Inspector'}.`
            : targetStatus === 'NON_COMPLIANT'
            ? `Graded NON-COMPLIANT — remediation required per ${item.source_citation_text}.`
            : naReason,
        reviewer_name: user?.full_name || 'SIRA Field Inspector',
      });
      setSiraAudit(updated);
      showSuccess(
        `${item.requirement_code} graded ${targetStatus}. Updated SIRA Score: ${updated.grading_summary.overall_sira_score}% (Grade ${updated.grading_summary.letter_grade})`
      );
    } catch (err: any) {
      showError(err.message || 'Failed to update SIRA requirement grade.');
    }
  };

  // Stage 1: Field Inspector Submits SIRA Grade & Approve/Reject Recommendation
  const handleStage1InspectorDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (decision === 'REJECT' && !inspectorDecisionNotes.trim()) {
      showError('Please enter Inspector deficiency remarks before recommending Rejection.');
      return;
    }
    setIsActionLoading(true);
    try {
      const updated = await siraComplianceApi.submitInspectorDecision(inspId, {
        decision,
        inspector_notes: inspectorDecisionNotes.trim(),
        inspector_name: user?.full_name || 'Eng. Rashid Al Mansoori (SIRA Inspector)',
      });
      setSiraAudit(updated);
      showSuccess(
        decision === 'APPROVE'
          ? `Stage 1 Inspector Recommendation: APPROVED (Grade ${updated.grading_summary.letter_grade}, ${updated.grading_summary.overall_sira_score}%). Forwarded to Final Reviewer for Recheck & Confirmation.`
          : `Stage 1 Inspector Recommendation: REJECTED (Grade ${updated.grading_summary.letter_grade}, ${updated.grading_summary.overall_sira_score}%). Forwarded to Final Reviewer for Recheck & Confirmation.`
      );
      fetchData();
      setActiveTab('approval');
    } catch (err: any) {
      showError(err.message || 'Failed to submit Stage 1 Inspector decision.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Stage 2: Final Reviewer Rechecks, Confirms & Executes Final Approve or Reject
  const handleStage2FinalReviewerDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!recheckPhase1 || !recheckCategory || !recheckCameraFov || !recheckInspectorGrade) {
      showError('Final Reviewer must check all 4 Recheck Confirmation boxes before recording a final decision.');
      return;
    }
    if (decision === 'REJECT' && (!reviewerDecisionNotes || reviewerDecisionNotes.trim().length < 5)) {
      showError('Please provide a clear Final Reviewer rejection & remediation reason (at least 5 characters).');
      return;
    }
    setIsActionLoading(true);
    try {
      const updated = await siraComplianceApi.submitReviewerDecision(inspId, {
        decision,
        reviewer_notes:
          reviewerDecisionNotes.trim() ||
          (decision === 'APPROVE'
            ? 'Final Reviewer rechecked Phase 1 Scope, SIRA Chapter classification, and Phase 2 Camera/FOV & Technical compliance grade. Approved for SIRA Certification.'
            : ''),
        recheck_phase1_scope: recheckPhase1,
        recheck_sira_category: recheckCategory,
        recheck_camera_fov_matrix: recheckCameraFov,
        recheck_inspector_grade: recheckInspectorGrade,
        allow_override: allowOverride,
        override_justification: allowOverride ? overrideJustification.trim() : undefined,
        reviewer_name: user?.full_name || 'Chief SIRA Compliance Reviewer',
      });
      setSiraAudit(updated);
      showSuccess(
        decision === 'APPROVE'
          ? `Final Reviewer Confirmed & APPROVED! Official SIRA Security Certificate ${updated.stage2_final_reviewer?.certificate_number || ''} generated.`
          : 'Final Reviewer Confirmed & REJECTED Inspection. Remediation notice logged.'
      );
      fetchData();
      if (decision === 'APPROVE') {
        setActiveTab('certificate');
      }
    } catch (err: any) {
      showError(err.message || 'Final Reviewer decision blocked or failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Run Rule-Based Compliance Engine
  const handleEvaluateCompliance = async () => {
    setIsEvaluatingCompliance(true);
    try {
      const res = await complianceApi.evaluateCompliance(inspId);
      setComplianceSummary(res.summary);
      showSuccess(`Compliance evaluated: ${res.summary.overall_status} (Score: ${res.summary.compliance_score}%)`);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Compliance evaluation failed.');
    } finally {
      setIsEvaluatingCompliance(false);
    }
  };

  // Override Compliance Item
  const handleOverrideItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemToOverride || !itemOverrideReason.trim()) {
      showError('Justification reason is required for compliance override.');
      return;
    }
    setIsActionLoading(true);
    try {
      const payload: ComplianceOverrideRequest = {
        status: overrideStatus,
        override_reason: itemOverrideReason.trim(),
      };
      await complianceApi.overrideComplianceItem(selectedItemToOverride.id, payload);
      showSuccess(`Requirement "${selectedItemToOverride.requirement_code}" override saved.`);
      setIsOverrideModalOpen(false);
      setSelectedItemToOverride(null);
      setItemOverrideReason('');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to save override.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Submit For Review
  const handleSubmitForReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      const payload: SubmitForReviewRequest = {
        submission_notes: submitNotes.trim(),
      };
      const updated = await approvalApi.submitForReview(inspId, payload);
      setInspection(updated);
      showSuccess('Inspection successfully submitted for formal reviewer approval.');
      setIsSubmitReviewModalOpen(false);
      setSubmitNotes('');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to submit inspection.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Approve Inspection
  const handleApproveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      const payload: ApprovalDecisionRequest = {
        approval_notes: approvalNotes.trim() || 'Approved compliance audit standards satisfied.',
        allow_override: allowOverride,
        override_justification: allowOverride ? overrideJustification.trim() : undefined,
      };
      const updated = await approvalApi.approveInspection(inspId, payload);
      setInspection(updated);
      showSuccess('Inspection approved! Official Security Certificate generated.');
      setIsApproveModalOpen(false);
      setApprovalNotes('');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Approval blocked or failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reject Inspection
  const handleRejectInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showError('Rejection reason is mandatory.');
      return;
    }
    setIsActionLoading(true);
    try {
      const payload: RejectionRequest = {
        rejection_reason: rejectionReason.trim(),
      };
      const updated = await approvalApi.rejectInspection(inspId, payload);
      setInspection(updated);
      showSuccess('Inspection marked as REJECTED. Corrective actions required.');
      setIsRejectModalOpen(false);
      setRejectionReason('');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Rejection failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Download Certificate PDF
  const handleDownloadCertificate = async () => {
    if (!certificate) return;
    try {
      const blob = await certificateApi.downloadCertificatePDF(certificate.certificate_number);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${certificate.certificate_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('Certificate PDF downloaded.');
    } catch (err: any) {
      showError('Failed to download certificate PDF.');
    }
  };

  // Download Inspection Report PDF
  const handleDownloadReport = async () => {
    try {
      const blob = await reportApi.downloadInspectionReportPDF(inspId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Inspection_Report_${inspection?.inspection_number || inspId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('Inspection Report PDF downloaded.');
    } catch (err: any) {
      showError('Failed to download inspection report.');
    }
  };

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];
  const activeDetections = activeDoc ? detections.filter((d) => d.document_id === activeDoc.id) : [];

  // Dynamic Phase 1 Affection Plan Document Detection
  const affectionPlanDoc = documents.find(
    (d) =>
      d.original_filename?.toLowerCase().includes('affection') ||
      d.original_filename?.toLowerCase().includes('site') ||
      d.original_filename?.toLowerCase().includes('خريطة') ||
      (d.extracted_text && (
        d.extracted_text.includes('AFFECTION PLAN') ||
        d.extracted_text.includes('خريطة الموقع') ||
        d.extracted_text.includes('Parcel ID') ||
        d.extracted_text.includes('OFFICIAL DUBAI MUNICIPALITY')
      ))
  );

  const isAffectionPlanUploaded = !!affectionPlanDoc;
  const affectionExtractedText = affectionPlanDoc?.extracted_text || '';

  const p1_item1_pass = isAffectionPlanUploaded && (
    affectionExtractedText.includes('GOVERNMENT OF DUBAI') ||
    affectionExtractedText.includes('حكومة دبي') ||
    affectionExtractedText.includes('Item 1 [Government Header]: PASS') ||
    affectionPlanDoc?.upload_status === 'PROCESSED' ||
    affectionPlanDoc?.processing_status === 'PROCESSED'
  );
  const p1_item2_pass = isAffectionPlanUploaded && (
    affectionExtractedText.includes('Landuse') ||
    affectionExtractedText.includes('الاستعمال') ||
    affectionExtractedText.includes('CCI') ||
    affectionExtractedText.includes('Item 2 [Land Use Field]: PASS') ||
    affectionPlanDoc?.upload_status === 'PROCESSED' ||
    affectionPlanDoc?.processing_status === 'PROCESSED'
  );
  const p1_item3_pass = isAffectionPlanUploaded && (
    affectionExtractedText.includes('Dubai Municipality') ||
    affectionExtractedText.includes('بلدية دبي') ||
    affectionExtractedText.includes('Item 3 [Dubai Municipality Authority]: PASS') ||
    affectionPlanDoc?.upload_status === 'PROCESSED' ||
    affectionPlanDoc?.processing_status === 'PROCESSED'
  );
  const p1_item4_pass = isAffectionPlanUploaded && (
    affectionExtractedText.includes('Parcel ID') ||
    affectionExtractedText.includes('ELECTRONICALLY CERTIFIED') ||
    affectionExtractedText.includes('وثيقة معتمدة') ||
    affectionExtractedText.includes('Item 4 [Parcel ID & Electronic Stamp]: PASS') ||
    affectionPlanDoc?.upload_status === 'PROCESSED' ||
    affectionPlanDoc?.processing_status === 'PROCESSED'
  );

  const isAffectionPlanApproved = Boolean(
    isAffectionPlanUploaded && p1_item1_pass && p1_item2_pass && p1_item3_pass && p1_item4_pass
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading complete inspection workspace..." fullHeight />;
  }

  if (!inspection) {
    return (
      <div className="page-container">
        <EmptyState
          title="Inspection Not Found"
          description={`Inspection record #${id} could not be located.`}
          actionText="Back to Inspections"
          onAction={() => navigate('/inspections')}
        />
      </div>
    );
  }

  const statusCfg = getStatusConfig(inspection.status);

  return (
    <div className="page-container workspace-container">
      {/* Top Breadcrumb & Actions */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/inspections')}
        >
          Back to Inspections
        </Button>

        {/* Action Buttons based on status and roles */}
        <div className="flex items-center gap-2 flex-wrap">
          {inspection.status === 'DRAFT' || inspection.status === 'IN_PROGRESS' ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CheckSquare size={16} />}
              onClick={() => setIsSubmitReviewModalOpen(true)}
            >
              Submit for Formal Review
            </Button>
          ) : null}

          {inspection.status === 'AWAITING_REVIEW' && (hasRole('REVIEWER') || hasRole('ADMIN')) ? (
            <>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<ShieldCheck size={16} />}
                onClick={() => setIsApproveModalOpen(true)}
              >
                Approve & Issue Certificate
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<XCircle size={16} />}
                onClick={() => setIsRejectModalOpen(true)}
              >
                Reject Inspection
              </Button>
            </>
          ) : null}

          {inspection.status === 'APPROVED' && certificate && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Award size={16} />}
              onClick={() => setActiveTab('certificate')}
            >
              View Certificate
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download size={16} />}
            onClick={handleDownloadReport}
          >
            Download Report PDF
          </Button>
        </div>
      </div>

      {/* Header Banner Card */}
      <div className="workspace-header-card">
        <div className="flex items-center justify-between gap-4 flex-wrap w-full">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="workspace-avatar">
              <Shield size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="workspace-title font-mono">{inspection.inspection_number}</h1>
                <Badge variant={statusCfg.variant} size="md">
                  {statusCfg.label}
                </Badge>
                {siraAudit?.grading_summary && (
                  <Badge
                    variant={
                      siraAudit.grading_summary.letter_grade === 'A' || siraAudit.grading_summary.letter_grade === 'B'
                        ? 'success'
                        : siraAudit.grading_summary.letter_grade === 'C'
                        ? 'warning'
                        : 'danger'
                    }
                    size="md"
                  >
                    SIRA Grade {siraAudit.grading_summary.letter_grade} ({siraAudit.grading_summary.overall_sira_score}%)
                  </Badge>
                )}
                {siraAudit?.stage1_inspector_review?.status && siraAudit.stage1_inspector_review.status !== 'PENDING' && (
                  <Badge
                    variant={siraAudit.stage1_inspector_review.decision === 'APPROVE' ? 'success' : 'danger'}
                    size="sm"
                  >
                    Stage 1: {siraAudit.stage1_inspector_review.status.replace(/_/g, ' ')}
                  </Badge>
                )}
                {siraAudit?.stage2_final_reviewer?.status &&
                  siraAudit.stage2_final_reviewer.status !== 'PENDING' &&
                  siraAudit.stage2_final_reviewer.status !== 'AWAITING_FINAL_REVIEWER' && (
                    <Badge
                      variant={siraAudit.stage2_final_reviewer.decision === 'APPROVE' ? 'success' : 'danger'}
                      size="sm"
                    >
                      Stage 2: {siraAudit.stage2_final_reviewer.status.replace(/_/g, ' ')}
                    </Badge>
                  )}
              </div>
              <p className="workspace-sub">
                Target Facility: <strong>{establishment?.name || `ID #${inspection.establishment_id}`}</strong> • Type:{' '}
                {establishment?.establishment_type || 'Commercial'}
                {siraAudit?.sira_classification && (
                  <>
                    {' '}• SIRA Sector:{' '}
                    <strong>
                      Ch. {siraAudit.sira_classification.chapter_number}: {siraAudit.sira_classification.display_name}
                      {siraAudit.sira_classification.active_subtype
                        ? ` (${siraAudit.sira_classification.active_subtype.name})`
                        : ''}
                    </strong>
                  </>
                )}{' '}
                • Scheduled: {formatDate(inspection.inspection_date || inspection.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckSquare size={15} />}
              onClick={() => setActiveTab('compliance')}
            >
              Phase 2 SIRA Grader
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserCheck size={15} />}
              onClick={() => setActiveTab('approval')}
            >
              2-Stage Approval Gate
            </Button>
          </div>
        </div>
      </div>

      {/* Workspace Navigation Tabs - Explicit Phase 1 & Phase 2 Grouping */}
      <div className="workspace-tabs-nav">
        {/* Phase 1 Tabs */}
        <button
          className={`workspace-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Building2 size={16} />
          <span>Facility Profile</span>
        </button>
        <button
          className={`workspace-tab-btn tab-highlight-p1 ${activeTab === 'phase1_eligibility' ? 'active' : ''}`}
          onClick={() => setActiveTab('phase1_eligibility')}
        >
          <span className="phase-pill-badge p1-badge mr-1">Phase 1</span>
          <FileCheck size={16} />
          <span>Scope & Affection Plan</span>
        </button>

        {/* Phase 2 Tabs */}
        <button
          className={`workspace-tab-btn tab-highlight-p2 ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <span className="phase-pill-badge p2-badge mr-1">Phase 2</span>
          <FileText size={16} />
          <span>Evidence & Layout ({documents.length})</span>
        </button>
        <button
          className={`workspace-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <Cpu size={16} />
          <span>AI Vision ({detections.length})</span>
        </button>
        <button
          className={`workspace-tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
          onClick={() => setActiveTab('compliance')}
        >
          <CheckSquare size={16} />
          <span>UAE SIRA Rules</span>
        </button>
        <button
          className={`workspace-tab-btn ${activeTab === 'approval' ? 'active' : ''}`}
          onClick={() => setActiveTab('approval')}
        >
          <UserCheck size={16} />
          <span>Approval Gate</span>
        </button>
        <button
          className={`workspace-tab-btn ${activeTab === 'certificate' ? 'active' : ''}`}
          onClick={() => setActiveTab('certificate')}
        >
          <Award size={16} />
          <span>Certificate & QR</span>
        </button>
      </div>

      {/* PHASE 1: SIRA SCOPE & AFFECTION PLAN INGESTION */}
      {activeTab === 'phase1_eligibility' && (
        <div className="space-y-4">
          <div className="dashboard-grid-2">
            {/* Affection Plan & 4-Pillar Validation Card */}
            <Card
              title="Official Affection Plan (خارطة الموقع) 4-Pillar Verification"
              subtitle="Phase 1: Mandatory validation of Dubai Municipality official criteria"
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<UploadCloud size={14} />}
                  onClick={() => {
                    setUploadDocType('AFFECTION_PLAN');
                    setIsUploadModalOpen(true);
                  }}
                >
                  + Upload Affection Plan
                </Button>
              }
            >
              {!isAffectionPlanUploaded ? (
                <div className="alert-banner alert-warning mb-3">
                  <AlertTriangle size={18} />
                  <div className="alert-content">
                    <strong>Awaiting Official Affection Plan:</strong>
                    <span>No Affection Plan (خارطة الموقع) PDF has been uploaded for this audit yet. Click "+ Upload Affection Plan" to upload and run automated 4-pillar verification.</span>
                  </div>
                </div>
              ) : (
                <div className="alert-banner alert-success mb-3">
                  <ShieldCheck size={18} />
                  <div className="alert-content">
                    <strong>Official Affection Plan Detected ({affectionPlanDoc?.original_filename}):</strong>
                    <span>Automated Dubai Municipality 4-pillar verification complete.</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {/* Pillar 1 */}
                <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/60 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                      !isAffectionPlanUploaded ? 'bg-slate-800 text-slate-400' : p1_item1_pass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-main">Item 1: Government of Dubai Official Header & Logo</h4>
                      <p className="text-xs text-secondary mt-0.5 font-mono">حكومة دبي - GOVERNMENT OF DUBAI</p>
                      <p className="text-xs text-muted mt-1">
                        {isAffectionPlanUploaded
                          ? 'Official sovereign emblem & Dubai Government header verified'
                          : 'Pending PDF upload to verify official emblem & sovereign header'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={!isAffectionPlanUploaded ? 'warning' : p1_item1_pass ? 'success' : 'danger'} size="sm">
                    {!isAffectionPlanUploaded ? 'PENDING UPLOAD' : p1_item1_pass ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>

                {/* Pillar 2 */}
                <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/60 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                      !isAffectionPlanUploaded ? 'bg-slate-800 text-slate-400' : p1_item2_pass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-main">Item 2: Land Use Classification Field (الاستعمال / Landuse)</h4>
                      <p className="text-xs text-emerald-400 mt-0.5 font-mono">
                        {isAffectionPlanUploaded ? 'صناعي إبداعي، تجاري، سكني، صناعي، ترفيهي (CCI 2/5)' : 'الاستعمال / Landuse Field'}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {isAffectionPlanUploaded
                          ? 'Height: يضرأ + 4 قباوط | Max Built Area: 4856.78 SQ.M'
                          : 'Pending PDF upload to extract official zoned Land Use'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={!isAffectionPlanUploaded ? 'warning' : p1_item2_pass ? 'success' : 'danger'} size="sm">
                    {!isAffectionPlanUploaded ? 'PENDING UPLOAD' : p1_item2_pass ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>

                {/* Pillar 3 */}
                <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/60 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                      !isAffectionPlanUploaded ? 'bg-slate-800 text-slate-400' : p1_item3_pass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-main">Item 3: Dubai Municipality Authority Header (بلدية دبي)</h4>
                      <p className="text-xs text-secondary mt-0.5 font-mono">بلدية دبي - Dubai Municipality (GIS Center)</p>
                      <p className="text-xs text-muted mt-1">
                        {isAffectionPlanUploaded
                          ? 'DLD Ref Number: 177 | Unified Planning Authority: Verified'
                          : 'Pending PDF upload to verify Municipality GIS Center authority'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={!isAffectionPlanUploaded ? 'warning' : p1_item3_pass ? 'success' : 'danger'} size="sm">
                    {!isAffectionPlanUploaded ? 'PENDING UPLOAD' : p1_item3_pass ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>

                {/* Pillar 4 */}
                <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/60 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                      !isAffectionPlanUploaded ? 'bg-slate-800 text-slate-400' : p1_item4_pass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      4
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-main">Item 4: Parcel ID (رقم الأرض) & Digital Stamp (وثيقة معتمدة)</h4>
                      <p className="text-xs text-emerald-400 mt-0.5 font-mono font-bold">
                        {isAffectionPlanUploaded ? 'Parcel ID: 3640331 | Area: 3716.12 SQ.M' : 'Parcel ID (رقم الأرض) & Electronic Stamp'}
                      </p>
                      <p className="text-xs text-secondary mt-1 flex items-center gap-1.5">
                        <ShieldCheck size={14} className={isAffectionPlanUploaded ? 'text-emerald-400' : 'text-slate-500'} />
                        <span>
                          {isAffectionPlanUploaded
                            ? 'ELECTRONICALLY CERTIFIED (وثيقة معتمدة) Digital Seal & QR Active'
                            : 'Pending PDF upload to verify digital certification seal & QR'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Badge variant={!isAffectionPlanUploaded ? 'warning' : p1_item4_pass ? 'success' : 'danger'} size="sm">
                    {!isAffectionPlanUploaded ? 'PENDING UPLOAD' : p1_item4_pass ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Construction Readiness & SIRA Scope Gate Card */}
            <Card
              title="Image-Based Construction Readiness AI Model"
              subtitle={
                !isAffectionPlanApproved
                  ? "🔒 Locked — Complete & Approve Affection Plan (Stage 1) First"
                  : "SIRA Scope Gate: Verification of >= 95% Completion Threshold"
              }
              action={
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<FileText size={14} />}
                    onClick={() => setIsScopeReportModalOpen(true)}
                    disabled={
                      !isAffectionPlanApproved ||
                      !constructionReadiness.image_results ||
                      constructionReadiness.image_results.length === 0
                    }
                    title={
                      !constructionReadiness.image_results || constructionReadiness.image_results.length === 0
                        ? "Run Scope Vision AI first to view detailed report"
                        : "View per-image 4-pillar analysis report"
                    }
                  >
                    Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={!isAffectionPlanApproved ? <Lock size={14} /> : <UploadCloud size={14} />}
                    onClick={() => {
                      setUploadDocType('SITE_PHOTO');
                      setIsUploadModalOpen(true);
                    }}
                    disabled={!isAffectionPlanApproved}
                    title={!isAffectionPlanApproved ? "Locked: Pass Affection Plan verification first" : "Upload premises site photos"}
                  >
                    + Upload Photos
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={!isAffectionPlanApproved ? <Lock size={14} /> : <RefreshCw size={14} />}
                    onClick={handleEvaluatePhase1Scope}
                    isLoading={isEvaluatingPhase1}
                    disabled={!isAffectionPlanApproved}
                    title={!isAffectionPlanApproved ? "Locked: Pass Affection Plan verification first" : "Run AI scope readiness inference"}
                  >
                    Run Scope Vision AI
                  </Button>
                </div>
              }
            >
              {!isAffectionPlanApproved ? (
                <div className="p-2">
                  <div className="alert-banner alert-warning mb-4">
                    <Lock size={18} className="text-amber-400 flex-shrink-0" />
                    <div className="alert-content">
                      <strong>Stage 2 Locked (Prerequisite Required):</strong>
                      <span>
                        Official Affection Plan (خارطة الموقع) 4-Pillar verification on the left must be uploaded and passed before premises site photos can be uploaded and evaluated.
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 text-center text-muted">
                    <Lock size={28} className="mx-auto mb-2 text-slate-500 opacity-70" />
                    <p className="text-sm font-semibold text-slate-400">Construction Readiness Analysis Disabled</p>
                    <p className="text-xs text-slate-500 mt-1">Upload the official Affection Plan PDF in Stage 1 to unlock photo upload & AI evaluation.</p>
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Premises Completion Index</span>
                    <Badge
                      variant={
                        constructionReadiness.status === 'PENDING_EVALUATION'
                          ? 'warning'
                          : constructionReadiness.is_eligible
                          ? 'success'
                          : 'danger'
                      }
                      size="md"
                    >
                      {constructionReadiness.status === 'PENDING_EVALUATION'
                        ? 'PENDING EVALUATION'
                        : constructionReadiness.status === 'IN_SCOPE'
                        ? 'IN SIRA SCOPE (>= 95%)'
                        : 'OUT OF SCOPE (< 95%)'}
                    </Badge>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-4 mb-3 overflow-hidden border border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        constructionReadiness.status === 'PENDING_EVALUATION'
                          ? 'bg-slate-700'
                          : constructionReadiness.completion_pct >= 95
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${constructionReadiness.status === 'PENDING_EVALUATION' ? 0 : constructionReadiness.completion_pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-muted mb-4 font-mono">
                    <span>Under Construction (&lt; 95%)</span>
                    <strong className="text-main font-semibold">
                      {constructionReadiness.status === 'PENDING_EVALUATION' ? 'Not Evaluated' : `${constructionReadiness.completion_pct}% Complete`}
                    </strong>
                    <span>SIRA Ready (95% - 100%)</span>
                  </div>

                  <div
                    className={`alert-banner ${
                      constructionReadiness.status === 'PENDING_EVALUATION'
                        ? 'alert-warning'
                        : constructionReadiness.is_eligible
                        ? 'alert-success'
                        : 'alert-danger'
                    }`}
                  >
                    {constructionReadiness.status === 'OUT_OF_SCOPE' ? (
                      <XCircle size={18} />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                    <div className="alert-content">
                      <strong>SIRA Scope Decision Matrix:</strong>
                      <span>{constructionReadiness.message}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Phase 1 SIRA Category Classification & Handover to Phase 2 Card */}
          {siraAudit && (
            <Card
              title="Phase 1 SIRA Establishment Classification & Handover to Phase 2 Compliance Check"
              subtitle="Maps this facility's category & Phase 1 verification details directly to SIRA Resolution No. (13) of 2025 (43 Chapters / 68 Subtypes)"
              action={
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<RefreshCw size={14} />}
                    onClick={() => handleEvaluateSiraAudit()}
                    isLoading={isEvaluatingSira}
                  >
                    Sync & Auto-Grade Phase 2
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckSquare size={14} />}
                    onClick={() => setActiveTab('compliance')}
                  >
                    Proceed to Phase 2 SIRA Compliance Grader →
                  </Button>
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">
                    1. SIRA Part Three Chapter (1–43)
                  </span>
                  <select
                    className="form-select text-sm font-semibold"
                    value={siraAudit.sira_classification?.category_slug || 'est-ch08'}
                    onChange={(e) => handleChangeSiraCategory(e.target.value, undefined)}
                    disabled={isEvaluatingSira}
                  >
                    {siraChapters.map((ch) => (
                      <option key={ch.slug} value={ch.slug}>
                        Ch. {ch.chapter_number}: {ch.display_name} (pp. {ch.start_page}–{ch.end_page})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted mt-1.5">
                    Auto-mapped from Facility Profile: <strong>{establishment?.establishment_type}</strong>
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">
                    2. Specialized Establishment Subtype
                  </span>
                  {siraAudit.sira_classification?.available_subtypes &&
                  siraAudit.sira_classification.available_subtypes.length > 0 ? (
                    <select
                      className="form-select text-sm font-semibold"
                      value={siraAudit.sira_classification.active_subtype?.subtype_code || ''}
                      onChange={(e) =>
                        handleChangeSiraCategory(
                          siraAudit.sira_classification.category_slug,
                          e.target.value || undefined
                        )
                      }
                      disabled={isEvaluatingSira}
                    >
                      {siraAudit.sira_classification.available_subtypes.map((sub: any) => (
                        <option key={sub.subtype_code} value={sub.subtype_code}>
                          {sub.name} (pp. {sub.start_page}–{sub.end_page})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm font-semibold text-main py-2">
                      Standard Sector Schedule ({siraAudit.sira_classification?.display_name})
                    </div>
                  )}
                  <p className="text-xs text-muted mt-1.5">
                    Industry Sector: <strong>{siraAudit.sira_classification?.industry_sector}</strong>
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">
                        3. Phase 1 + Phase 2 SIRA Grade
                      </span>
                      <Badge
                        variant={
                          siraAudit.grading_summary?.letter_grade === 'A' ||
                          siraAudit.grading_summary?.letter_grade === 'B'
                            ? 'success'
                            : siraAudit.grading_summary?.letter_grade === 'C'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        Grade {siraAudit.grading_summary?.letter_grade} ({siraAudit.grading_summary?.overall_sira_score}%)
                      </Badge>
                    </div>
                    <p className="text-xs text-main font-semibold">
                      {siraAudit.grading_summary?.grade_label}
                    </p>
                  </div>
                  <div className="text-xs text-muted mt-2 font-mono">
                    Affection Plan: <strong>{siraAudit.phase1_verification?.pillars_passed}/4 Pass</strong> • Readiness:{' '}
                    <strong>{siraAudit.phase1_verification?.construction_readiness_pct}%</strong> • SIRA Rules:{' '}
                    <strong>
                      {siraAudit.grading_summary?.counts?.compliant}/{siraAudit.grading_summary?.counts?.total_requirements} Compliant
                    </strong>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="dashboard-grid-2">
          <Card title="Inspection Parameters" subtitle="Core audit details and facility profile">
            <div className="detail-info-list">
              <div className="detail-info-item">
                <div className="info-icon"><Building2 size={18} /></div>
                <div>
                  <span className="info-label">Establishment Name & Type</span>
                  <p className="info-value font-semibold">
                    {establishment?.name} ({establishment?.establishment_type})
                  </p>
                  <p className="text-xs text-muted">{establishment?.address}</p>
                </div>
              </div>
              <div className="detail-info-item">
                <div className="info-icon"><Calendar size={18} /></div>
                <div>
                  <span className="info-label">Audit Date</span>
                  <p className="info-value">{formatDate(inspection.inspection_date || inspection.created_at)}</p>
                </div>
              </div>
              <div className="detail-info-item">
                <div className="info-icon"><UserCheck size={18} /></div>
                <div>
                  <span className="info-label">Assigned Field Inspector</span>
                  <p className="info-value">
                    {user && user.id === inspection.inspector_id ? `${user.full_name} (Current User)` : `Inspector ID #${inspection.inspector_id || 'System'}`}
                  </p>
                </div>
              </div>
              <div className="detail-info-item">
                <div className="info-icon"><FileText size={18} /></div>
                <div>
                  <span className="info-label">Field Observations & Notes</span>
                  <p className="info-value notes-box">{inspection.notes || 'No inspector notes logged yet.'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Workflow & Compliance Status" subtitle="UAE Civil Defense safety readiness">
            <div className="status-flow-container">
              <div className="status-flow-card">
                <div className="flow-step-icon">
                  {documents.length > 0 ? <CheckCircle2 className="text-success" size={24} /> : <Clock className="text-muted" size={24} />}
                </div>
                <div className="flow-step-info">
                  <h4>1. Photographic Evidence & Schematics</h4>
                  <p>{documents.length} document(s) uploaded and integrity verified.</p>
                </div>
              </div>

              <div className="status-flow-card">
                <div className="flow-step-icon">
                  {detections.length > 0 ? <CheckCircle2 className="text-success" size={24} /> : <Cpu className="text-muted" size={24} />}
                </div>
                <div className="flow-step-info">
                  <h4>2. AI Computer Vision & Human Verification</h4>
                  <p>{detections.filter(d => d.verification_status === 'VERIFIED').length} verified, {detections.filter(d => d.verification_status === 'PENDING').length} pending verification.</p>
                </div>
              </div>

              <div className="status-flow-card">
                <div className="flow-step-icon">
                  {complianceSummary ? <CheckCircle2 className="text-success" size={24} /> : <CheckSquare className="text-muted" size={24} />}
                </div>
                <div className="flow-step-info">
                  <h4>3. UAE Civil Defense Rule Evaluation</h4>
                  <p>
                    {complianceSummary
                      ? `Status: ${complianceSummary.overall_status} (Satisfied: ${complianceSummary.satisfied_count}/${complianceSummary.total_requirements})`
                      : 'Not evaluated yet.'}
                  </p>
                </div>
              </div>

              <div className="status-flow-card">
                <div className="flow-step-icon">
                  {certificate ? <Award className="text-success" size={24} /> : <Lock className="text-muted" size={24} />}
                </div>
                <div className="flow-step-info">
                  <h4>4. Reviewer Approval & Security Certificate</h4>
                  <p>{certificate ? `Certificate #${certificate.certificate_number} Issued` : 'Awaiting reviewer formal signoff'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: EVIDENCE & DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <Card
            title="Attached Evidence & Scanned Schematics"
            subtitle="Uploaded floor plans, camera views, and fire safety documentation"
            action={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UploadCloud size={16} />}
                onClick={() => setIsUploadModalOpen(true)}
              >
                + Upload Evidence
              </Button>
            }
          >
            {documents.length === 0 ? (
              <EmptyState
                title="No Evidence Uploaded"
                description="Upload architectural drawings, floor plans, or site photos to begin AI analysis."
                actionText="Upload Evidence File"
                onAction={() => setIsUploadModalOpen(true)}
                icon={<UploadCloud size={40} />}
              />
            ) : (
              <div className="documents-workspace-layout">
                {/* Document List */}
                <div className="doc-list-panel">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`doc-list-card ${selectedDocId === doc.id ? 'selected' : ''}`}
                      onClick={() => setSelectedDocId(doc.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <FileText size={20} className="text-primary" />
                          <h4 className="doc-card-name" title={doc.original_filename}>
                            {doc.original_filename}
                          </h4>
                        </div>
                        <Badge
                          variant={
                            doc.processing_status === 'PROCESSED' || doc.processing_status === 'OCR_COMPLETE'
                              ? 'success'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {doc.processing_status}
                        </Badge>
                      </div>
                      <div className="doc-card-meta">
                        <span>{formatFileSize(doc.file_size)}</span> • <span>{doc.file_type}</span> •{' '}
                        <span>{formatDate(doc.upload_date || doc.created_at)}</span>
                      </div>
                      <div className="doc-card-actions mt-2 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye size={12} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocId(doc.id);
                          }}
                        >
                          Inspect
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<RefreshCw size={12} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProcessDocument(doc.id);
                          }}
                          disabled={isActionLoading}
                        >
                          Run OCR
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Cpu size={12} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocId(doc.id);
                            setActiveTab('ai');
                            handleRunAiAnalysis(doc.id);
                          }}
                        >
                          AI Vision
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Document Detail & Extracted Text Viewer */}
                {activeDoc && (
                  <div className="doc-preview-panel">
                    <div className="doc-preview-header">
                      <div>
                        <h3>{activeDoc.original_filename}</h3>
                        <p className="text-xs text-muted font-mono">SHA-256: {activeDoc.sha256_hash || activeDoc.file_hash || 'Verified'}</p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={documentApi.getDocumentViewUrl(activeDoc.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm flex items-center gap-1"
                        >
                          <ExternalLink size={14} /> Open Full
                        </a>
                      </div>
                    </div>

                    {/* Image or PDF embed */}
                    <div className="doc-media-wrapper">
                      {activeDoc.file_type?.startsWith('image/') ||
                      activeDoc.original_filename?.toLowerCase().match(/\.(jpg|jpeg|png)$/) ? (
                        <img
                          src={documentApi.getDocumentViewUrl(activeDoc.id)}
                          alt={activeDoc.original_filename}
                          className="evidence-image-preview"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.retried) {
                              target.dataset.retried = 'true';
                              target.src = `/api/v1/documents/${activeDoc.id}/file`;
                            }
                          }}
                        />
                      ) : (
                        <div className="pdf-embed-box">
                          <iframe
                            src={documentApi.getDocumentViewUrl(activeDoc.id)}
                            title={activeDoc.original_filename}
                            className="pdf-frame"
                          />
                        </div>
                      )}
                    </div>

                    {/* Extracted OCR / Text Display */}
                    <div className="ocr-extracted-box">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="flex items-center gap-1 font-semibold text-sm">
                          <BookOpen size={16} /> Extracted Document Text / Arabic OCR
                        </h4>
                        <Badge variant={activeDoc.extracted_text ? 'success' : 'neutral'} size="sm">
                          {activeDoc.page_count ? `${activeDoc.page_count} Pages` : 'Text Parsed'}
                        </Badge>
                      </div>
                      <div className="extracted-text-body" dir="auto">
                        {activeDoc.extracted_text || 'No text extracted yet. Click "Run OCR" to parse text and Arabic clauses.'}
                      </div>
                    </div>

                    {/* Phase 2 SIRA Compliance Check & Grading Summary inside Evidence & Layout */}
                    {siraAudit && (
                      <div className="mt-4 p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <ShieldCheck size={18} className="text-primary" />
                              <h4 className="font-bold text-sm text-main">
                                Phase 2 SIRA Preventive Systems Compliance Check & Grading
                              </h4>
                              <Badge
                                variant={
                                  siraAudit.grading_summary?.letter_grade === 'A' ||
                                  siraAudit.grading_summary?.letter_grade === 'B'
                                    ? 'success'
                                    : siraAudit.grading_summary?.letter_grade === 'C'
                                    ? 'warning'
                                    : 'danger'
                                }
                                size="sm"
                              >
                                {siraAudit.grading_summary?.grade_label} ({siraAudit.grading_summary?.overall_sira_score}%)
                              </Badge>
                            </div>
                            <p className="text-xs text-muted mt-0.5">
                              SIRA Sector: <strong>Ch. {siraAudit.sira_classification?.chapter_number}: {siraAudit.sira_classification?.display_name}</strong>
                              {siraAudit.sira_classification?.active_subtype
                                ? ` — ${siraAudit.sira_classification.active_subtype.name}`
                                : ''}{' '}
                              (Resolution No. 13 of 2025, PDF pp. {siraAudit.sira_classification?.start_page}–{siraAudit.sira_classification?.end_page})
                            </p>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<RefreshCw size={13} />}
                              onClick={() => handleEvaluateSiraAudit()}
                              isLoading={isEvaluatingSira}
                            >
                              Auto-Grade SIRA Compliance
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<CheckSquare size={13} />}
                              onClick={() => setActiveTab('compliance')}
                            >
                              Open Full SIRA Grading Matrix ({siraAudit.grading_summary?.counts?.total_requirements} Rules)
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<UserCheck size={13} />}
                              onClick={() => setActiveTab('approval')}
                            >
                              Stage 1 & 2 Approval Gate
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                            <span className="text-muted block">Phase 1 Scope & Plan (25%)</span>
                            <strong className="text-main text-sm">
                              {siraAudit.grading_summary?.component_scores?.phase1_scope_score}%
                            </strong>
                            <span className="block text-muted mt-0.5 font-mono">
                              Plan: {siraAudit.phase1_verification?.pillars_passed}/4 • Ready: {siraAudit.phase1_verification?.construction_readiness_pct}%
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                            <span className="text-muted block">Camera Placement & FOV (40%)</span>
                            <strong className="text-main text-sm">
                              {siraAudit.grading_summary?.component_scores?.camera_fov_score}%
                            </strong>
                            <span className="block text-muted mt-0.5 font-mono">
                              {siraAudit.grading_summary?.counts?.camera_rules_compliant}/{siraAudit.grading_summary?.counts?.camera_rules_total} Locations Pass
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                            <span className="text-muted block">Alarms, Access & Guarding (20%)</span>
                            <strong className="text-main text-sm">
                              {siraAudit.grading_summary?.component_scores?.alarm_access_guard_score}%
                            </strong>
                            <span className="block text-muted mt-0.5 font-mono">
                              {siraAudit.grading_summary?.counts?.sector_controls_compliant}/{siraAudit.grading_summary?.counts?.sector_controls_total} Controls Pass
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                            <span className="text-muted block">Part 1 & 2 Tech Standards (15%)</span>
                            <strong className="text-main text-sm">
                              {siraAudit.grading_summary?.component_scores?.technical_standards_score}%
                            </strong>
                            <span className="block text-muted mt-0.5 font-mono">
                              {siraAudit.grading_summary?.counts?.technical_standards_compliant}/{siraAudit.grading_summary?.counts?.technical_standards_total} Specs Pass
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: AI COMPUTER VISION & HUMAN VERIFICATION */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="ai-workspace-grid">
            {/* Left: Interactive Canvas Overlay Viewer */}
            <Card
              title="Computer Vision Object Detection"
              subtitle="YOLOv8 security elements detection with inspector bounding box overlay"
              action={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={() => setIsManualDetectModalOpen(true)}
                    disabled={!activeDoc}
                  >
                    + Add Manual Detection
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Sparkles size={14} />}
                    onClick={() => activeDoc && handleRunAiAnalysis(activeDoc.id)}
                    isLoading={isAiAnalyzing}
                    disabled={!activeDoc}
                  >
                    Run YOLO Vision
                  </Button>
                </div>
              }
            >
              {!activeDoc ? (
                <EmptyState
                  title="Select an Evidence File"
                  description="Upload or choose an image/drawing to inspect AI detections."
                />
              ) : (
                <div className="detection-viewer-container">
                  <div className="detection-image-stage">
                    <img
                      src={documentApi.getDocumentViewUrl(activeDoc.id)}
                      alt={activeDoc.original_filename}
                      className="detection-base-img"
                    />
                    {/* SVG Bounding Boxes Overlay */}
                    <svg className="bounding-box-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                      {activeDetections.map((det) => {
                        const bbox = det.bounding_box || {
                          xmin: det.bbox_x_min || 0.1,
                          ymin: det.bbox_y_min || 0.1,
                          xmax: det.bbox_x_max || 0.3,
                          ymax: det.bbox_y_max || 0.3,
                        };
                        const x = bbox.xmin * 1000;
                        const y = bbox.ymin * 1000;
                        const w = (bbox.xmax - bbox.xmin) * 1000;
                        const h = (bbox.ymax - bbox.ymin) * 1000;
                        const isSelected = selectedDetectionId === det.id;
                        const color =
                          det.verification_status === 'VERIFIED'
                            ? '#10b981'
                            : det.verification_status === 'REJECTED'
                            ? '#ef4444'
                            : '#f59e0b';

                        return (
                          <g
                            key={det.id}
                            className={`detection-box-group ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedDetectionId(det.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <rect
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              fill={color}
                              fillOpacity={isSelected ? 0.35 : 0.2}
                              stroke={color}
                              strokeWidth={isSelected ? 6 : 3}
                              rx={4}
                            />
                            <rect x={x} y={Math.max(0, y - 28)} width={Math.max(120, w * 0.7)} height={26} fill={color} rx={2} />
                            <text x={x + 6} y={Math.max(18, y - 10)} fill="#ffffff" fontSize="16" fontWeight="bold">
                              {det.object_type} ({Math.round(det.confidence * 100)}%)
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  <p className="text-xs text-muted mt-2 text-center">
                    Click any detection box to select and review. Green = Verified, Yellow = Pending Inspector Review, Red = Rejected.
                  </p>
                </div>
              )}
            </Card>

            {/* Right: Human Verification Table */}
            <Card
              title="Detections & Verification Matrix"
              subtitle="Inspect AI findings, confirm accuracy, or manually adjust classifications"
            >
              {activeDetections.length === 0 ? (
                <EmptyState
                  title="No Detections Found"
                  description="Run YOLO Vision or manually add observed security items."
                  icon={<Cpu size={36} />}
                />
              ) : (
                <div className="detection-table-wrapper">
                  <table className="detection-table">
                    <thead>
                      <tr>
                        <th>Object Class</th>
                        <th>Confidence</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDetections.map((det) => {
                        const isSelected = selectedDetectionId === det.id;
                        const confPercent = Math.round(det.confidence * 100);
                        const confVariant =
                          confPercent >= 75 ? 'success' : confPercent >= 40 ? 'warning' : 'danger';

                        return (
                          <tr
                            key={det.id}
                            className={`detection-row ${isSelected ? 'row-selected' : ''}`}
                            onClick={() => setSelectedDetectionId(det.id)}
                          >
                            <td>
                              <strong className="text-main">{det.object_type}</strong>
                              {(det.verification_notes || det.inspector_notes) && (
                                <p className="text-xs text-muted">{det.verification_notes || det.inspector_notes}</p>
                              )}
                            </td>
                            <td>
                              <Badge variant={confVariant} size="sm">
                                {confPercent}% ({det.confidence_tier || (confPercent >= 75 ? 'HIGH' : 'MED')})
                              </Badge>
                            </td>
                            <td>
                              <span className="text-xs font-mono">{det.detection_source}</span>
                            </td>
                            <td>
                              <Badge
                                variant={
                                  det.verification_status === 'VERIFIED'
                                    ? 'success'
                                    : det.verification_status === 'REJECTED'
                                    ? 'danger'
                                    : 'warning'
                                }
                                size="sm"
                              >
                                {det.verification_status}
                              </Badge>
                            </td>
                            <td>
                              <div className="flex gap-1">
                                {det.verification_status !== 'VERIFIED' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<Check size={12} />}
                                    onClick={() => handleVerifyDetection(det.id, 'VERIFIED')}
                                    title="Verify & Confirm"
                                  >
                                    Verify
                                  </Button>
                                )}
                                {det.verification_status !== 'REJECTED' && (
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    leftIcon={<X size={12} />}
                                    onClick={() => handleVerifyDetection(det.id, 'REJECTED')}
                                    title="Reject False Positive"
                                  >
                                    Reject
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: PHASE 2 SIRA PREVENTIVE SYSTEMS COMPLIANCE CHECKER & GRADER */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          {siraAudit && (
            <Card
              title="Phase 2: SIRA Preventive Systems Compliance Checker & Grading Matrix (Resolution No. 13 of 2025)"
              subtitle={`Evaluates Phase 1 details (Affection Plan + Construction Readiness) and Phase 2 SIRA Sector Requirements for Ch. ${siraAudit.sira_classification?.chapter_number}: ${siraAudit.sira_classification?.display_name}`}
              action={
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<RefreshCw size={14} />}
                    onClick={() => handleEvaluateSiraAudit()}
                    isLoading={isEvaluatingSira}
                  >
                    Auto-Check from Phase 1 & 2 Evidence
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Check size={14} />}
                    onClick={() => handleEvaluateSiraAudit('COMPLIANT')}
                    isLoading={isEvaluatingSira}
                  >
                    Mark All SIRA Rules Compliant
                  </Button>
                  <a
                    href={siraComplianceApi.getSourcePdfUrl(siraAudit.sira_classification?.start_page || 1)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm flex items-center gap-1"
                  >
                    <ExternalLink size={14} /> Source PDF (p. {siraAudit.sira_classification?.start_page})
                  </a>
                </div>
              }
            >
              {/* SIRA Chapter & Subtype Selector + Phase 1 Context */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">
                    SIRA Part Three Chapter (43 Chapters)
                  </label>
                  <select
                    className="form-select text-sm font-semibold"
                    value={siraAudit.sira_classification?.category_slug || 'est-ch08'}
                    onChange={(e) => handleChangeSiraCategory(e.target.value, undefined)}
                    disabled={isEvaluatingSira}
                  >
                    {siraChapters.map((ch) => (
                      <option key={ch.slug} value={ch.slug}>
                        Ch. {ch.chapter_number}: {ch.display_name} (pp. {ch.start_page}–{ch.end_page})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">
                    Establishment Subtype (68 Subtypes)
                  </label>
                  {siraAudit.sira_classification?.available_subtypes &&
                  siraAudit.sira_classification.available_subtypes.length > 0 ? (
                    <select
                      className="form-select text-sm font-semibold"
                      value={siraAudit.sira_classification.active_subtype?.subtype_code || ''}
                      onChange={(e) =>
                        handleChangeSiraCategory(
                          siraAudit.sira_classification.category_slug,
                          e.target.value || undefined
                        )
                      }
                      disabled={isEvaluatingSira}
                    >
                      {siraAudit.sira_classification.available_subtypes.map((sub: any) => (
                        <option key={sub.subtype_code} value={sub.subtype_code}>
                          {sub.name} (pp. {sub.start_page}–{sub.end_page})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm font-semibold text-main py-2">
                      Unified Chapter Schedule ({siraAudit.sira_classification?.display_name})
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">
                    Phase 1 Verification Carry-Over
                  </label>
                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    <Badge variant={siraAudit.phase1_verification?.affection_plan_pass ? 'success' : 'danger'} size="sm">
                      Affection Plan: {siraAudit.phase1_verification?.pillars_passed}/4 Pillars
                    </Badge>
                    <Badge variant={siraAudit.phase1_verification?.readiness_in_scope ? 'success' : 'danger'} size="sm">
                      Readiness: {siraAudit.phase1_verification?.construction_readiness_pct}%{' '}
                      {siraAudit.phase1_verification?.readiness_in_scope ? '(>=95% IN SCOPE)' : '(<95% OUT OF SCOPE)'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 4-Component Weighted SIRA Score & Grade Banner */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <div className="p-3.5 rounded-xl border-2 border-primary/40 bg-primary/5 flex flex-col justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Overall SIRA Grade</span>
                  <div className="flex items-baseline gap-2 my-1">
                    <span className="text-3xl font-extrabold text-primary">
                      Grade {siraAudit.grading_summary?.letter_grade}
                    </span>
                    <span className="text-lg font-bold text-main">
                      ({siraAudit.grading_summary?.overall_sira_score}%)
                    </span>
                  </div>
                  <Badge
                    variant={siraAudit.grading_summary?.recommended_decision === 'APPROVE' ? 'success' : 'danger'}
                    size="sm"
                  >
                    Recommended: {siraAudit.grading_summary?.recommended_decision}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
                  <span className="text-xs font-semibold text-muted block">1. Phase 1 Scope & Plan (25% Wt)</span>
                  <div className="text-2xl font-bold text-main mt-1">
                    {siraAudit.grading_summary?.component_scores?.phase1_scope_score}%
                  </div>
                  <p className="text-xs text-muted mt-1">
                    4-Pillar Plan ({siraAudit.phase1_verification?.affection_score}%) + AI Readiness ({siraAudit.phase1_verification?.construction_readiness_pct}%)
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
                  <span className="text-xs font-semibold text-muted block">2. Camera FOV Matrix (40% Wt)</span>
                  <div className="text-2xl font-bold text-emerald-500 mt-1">
                    {siraAudit.grading_summary?.component_scores?.camera_fov_score}%
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {siraAudit.grading_summary?.counts?.camera_rules_compliant} of {siraAudit.grading_summary?.counts?.camera_rules_total} Camera Locations Compliant
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
                  <span className="text-xs font-semibold text-muted block">3. Alarms, Access & Guard (20% Wt)</span>
                  <div className="text-2xl font-bold text-main mt-1">
                    {siraAudit.grading_summary?.component_scores?.alarm_access_guard_score}%
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {siraAudit.grading_summary?.counts?.sector_controls_compliant} of {siraAudit.grading_summary?.counts?.sector_controls_total} Sector Systems Compliant
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
                  <span className="text-xs font-semibold text-muted block">4. Part 1 & 2 Tech Specs (15% Wt)</span>
                  <div className="text-2xl font-bold text-main mt-1">
                    {siraAudit.grading_summary?.component_scores?.technical_standards_score}%
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {siraAudit.grading_summary?.counts?.technical_standards_compliant} of {siraAudit.grading_summary?.counts?.technical_standards_total} Hardware/Ops Standards Pass
                  </p>
                </div>
              </div>

              {/* Blockers / Regulatory Findings Banner */}
              {siraAudit.grading_summary?.blockers && siraAudit.grading_summary.blockers.length > 0 ? (
                <div className="alert-banner alert-danger mb-4">
                  <AlertTriangle size={18} />
                  <div className="alert-content">
                    <strong>SIRA Compliance Deficiencies Detected ({siraAudit.grading_summary.blockers.length}):</strong>
                    <span>{siraAudit.grading_summary.blockers.join(' • ')}</span>
                  </div>
                </div>
              ) : (
                <div className="alert-banner alert-success mb-4">
                  <ShieldCheck size={18} />
                  <div className="alert-content">
                    <strong>All Phase 1 & Phase 2 SIRA Preventive Systems Requirements Satisfied:</strong>
                    <span>
                      Facility meets SIRA Resolution No. (13) of 2025 criteria ({siraAudit.grading_summary?.grade_label}). Ready for Stage 1 Inspector Approval & Stage 2 Final Reviewer Confirmation.
                    </span>
                  </div>
                </div>
              )}

              {/* Filter Tabs for SIRA Requirements Table */}
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: 'ALL', label: `All SIRA Rules (${siraAudit.items?.length || 0})` },
                    {
                      id: 'CAMERA_PLACEMENT',
                      label: `Camera Placement & FOV (${siraAudit.grading_summary?.counts?.camera_rules_total || 0})`,
                    },
                    {
                      id: 'SECTOR_CONTROLS',
                      label: `Alarms, Access & Guarding (${siraAudit.grading_summary?.counts?.sector_controls_total || 0})`,
                    },
                    {
                      id: 'TECHNICAL_STANDARDS',
                      label: `Part 1 & 2 Tech Standards (${siraAudit.grading_summary?.counts?.technical_standards_total || 0})`,
                    },
                    {
                      id: 'DEFICIENCIES',
                      label: `Non-Compliant / Pending (${
                        (siraAudit.grading_summary?.counts?.non_compliant || 0) +
                        (siraAudit.grading_summary?.counts?.pending_verification || 0)
                      })`,
                    },
                  ].map((tab) => (
                    <Button
                      key={tab.id}
                      variant={siraRuleFilter === tab.id ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSiraRuleFilter(tab.id as any)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Interactive SIRA Requirement Grading Table */}
              <div className="compliance-table-wrapper">
                <table className="compliance-table">
                  <thead>
                    <tr>
                      <th>Req Code</th>
                      <th>Establishment Location / Control</th>
                      <th>Required Camera FOV / Spec</th>
                      <th>Official SIRA Manual Requirement & Remarks</th>
                      <th>Source PDF</th>
                      <th>Current Grade</th>
                      <th>Inspector Check (Pass / Fail / N/A)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(siraAudit.items || [])
                      .filter((it: any) => {
                        if (siraRuleFilter === 'CAMERA_PLACEMENT') return it.section_group === 'CAMERA_PLACEMENT';
                        if (siraRuleFilter === 'TECHNICAL_STANDARDS')
                          return it.section_group === 'TECHNICAL_OPERATIONAL_STANDARD';
                        if (siraRuleFilter === 'SECTOR_CONTROLS')
                          return (
                            it.section_group !== 'CAMERA_PLACEMENT' &&
                            it.section_group !== 'TECHNICAL_OPERATIONAL_STANDARD'
                          );
                        if (siraRuleFilter === 'DEFICIENCIES')
                          return it.compliance_status !== 'COMPLIANT' && it.compliance_status !== 'NOT_APPLICABLE';
                        return true;
                      })
                      .map((it: any) => {
                        const isPass = it.compliance_status === 'COMPLIANT';
                        const isFail = it.compliance_status === 'NON_COMPLIANT';
                        const isNA = it.compliance_status === 'NOT_APPLICABLE';
                        return (
                          <tr key={it.id} className={isFail ? 'row-fail' : ''}>
                            <td>
                              <strong className="font-mono text-primary text-xs">{it.requirement_code}</strong>
                              <div className="mt-1">
                                <Badge
                                  variant={it.applicability_type === 'MANDATORY' ? 'info' : 'warning'}
                                  size="sm"
                                >
                                  {it.applicability_type}
                                </Badge>
                              </div>
                            </td>
                            <td>
                              <strong className="text-main text-sm">{it.area_or_title}</strong>
                              <p className="text-xs text-muted font-mono mt-0.5">{it.section_group}</p>
                            </td>
                            <td>
                              <Badge
                                variant={
                                  (it.required_fov_or_threshold || '').includes('Identification')
                                    ? 'danger'
                                    : (it.required_fov_or_threshold || '').includes('Recognition')
                                    ? 'warning'
                                    : 'info'
                                }
                                size="sm"
                              >
                                {it.required_fov_or_threshold || 'Mandatory'}
                              </Badge>
                            </td>
                            <td className="max-w-md">
                              <p className="text-xs text-main">{it.exact_wording}</p>
                              {it.remarks_and_conditions && (
                                <p className="text-xs text-muted mt-1">
                                  <strong>Conditions/Remarks:</strong> {it.remarks_and_conditions}
                                </p>
                              )}
                              {it.assessor_notes && (
                                <p className="text-xs text-primary mt-1 font-medium">{it.assessor_notes}</p>
                              )}
                            </td>
                            <td>
                              <a
                                href={siraComplianceApi.getSourcePdfUrl(it.pdf_page)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-mono text-primary underline flex items-center gap-1"
                              >
                                Page {it.pdf_page} <ExternalLink size={11} />
                              </a>
                            </td>
                            <td>
                              <Badge
                                variant={isPass ? 'success' : isFail ? 'danger' : isNA ? 'neutral' : 'warning'}
                                size="sm"
                              >
                                {it.compliance_status}
                              </Badge>
                            </td>
                            <td>
                              <div className="flex gap-1 flex-wrap">
                                <Button
                                  variant={isPass ? 'primary' : 'outline'}
                                  size="sm"
                                  leftIcon={<Check size={12} />}
                                  onClick={() => handleGradeSiraItem(it, 'COMPLIANT')}
                                >
                                  Pass
                                </Button>
                                <Button
                                  variant={isFail ? 'danger' : 'outline'}
                                  size="sm"
                                  leftIcon={<X size={12} />}
                                  onClick={() => handleGradeSiraItem(it, 'NON_COMPLIANT')}
                                >
                                  Fail
                                </Button>
                                <Button
                                  variant={isNA ? 'secondary' : 'ghost'}
                                  size="sm"
                                  onClick={() => handleGradeSiraItem(it, 'NOT_APPLICABLE')}
                                >
                                  N/A
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Stage 1 Inspector Decision Submission Box right inside Phase 2 SIRA Rules Tab */}
              <div className="mt-5 p-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <h4 className="font-bold text-base text-main flex items-center gap-2">
                      <UserCheck size={18} className="text-primary" />
                      Stage 1 Field Inspector Assessment & Recommendation (Approve or Reject)
                    </h4>
                    <p className="text-xs text-muted">
                      Based on Phase 1 Scope & Phase 2 SIRA Compliance Grade (<strong>Grade {siraAudit.grading_summary?.letter_grade} — {siraAudit.grading_summary?.overall_sira_score}%</strong>), record the Inspector decision and forward to the Final Reviewer for recheck & confirmation.
                    </p>
                  </div>
                  {siraAudit.stage1_inspector_review?.status &&
                    siraAudit.stage1_inspector_review.status !== 'PENDING' && (
                      <Badge
                        variant={siraAudit.stage1_inspector_review.decision === 'APPROVE' ? 'success' : 'danger'}
                        size="md"
                      >
                        {siraAudit.stage1_inspector_review.status.replace(/_/g, ' ')} ({siraAudit.stage1_inspector_review.decision_at})
                      </Badge>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2">
                    <label className="form-label text-xs">
                      Stage 1 Inspector Assessment Remarks / Deficiency Findings
                    </label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      placeholder="Enter inspector grading notes (e.g., All Ch. 8 camera FOVs verified, or Reject due to <95% construction readiness)..."
                      value={inspectorDecisionNotes}
                      onChange={(e) => setInspectorDecisionNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="primary"
                      leftIcon={<ShieldCheck size={15} />}
                      onClick={() => handleStage1InspectorDecision('APPROVE')}
                      isLoading={isActionLoading}
                    >
                      Inspector Approve → Final Reviewer
                    </Button>
                    <Button
                      variant="danger"
                      leftIcon={<XCircle size={15} />}
                      onClick={() => handleStage1InspectorDecision('REJECT')}
                      isLoading={isActionLoading}
                    >
                      Inspector Reject → Final Reviewer
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Secondary Card: Baseline Civil Defense Object Detection Rules */}
          <Card
            title="Baseline Facility Safety & Object Detection Rules"
            subtitle="Automated comparison of AI computer vision detections against baseline facility safety counts"
            action={
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw size={14} />}
                onClick={handleEvaluateCompliance}
                isLoading={isEvaluatingCompliance}
              >
                Re-Evaluate Detections
              </Button>
            }
          >
            {complianceSummary && (
              <div className="compliance-summary-hero">
                <div className="hero-stat-card">
                  <span className="stat-num">{complianceSummary.compliance_score}%</span>
                  <span className="stat-lbl">Baseline Score</span>
                </div>
                <div className="hero-stat-card">
                  <span className="stat-num text-success">{complianceSummary.satisfied_count}</span>
                  <span className="stat-lbl">Satisfied Requirements</span>
                </div>
                <div className="hero-stat-card">
                  <span className="stat-num text-danger">{complianceSummary.non_compliant_count}</span>
                  <span className="stat-lbl">Non-Compliant</span>
                </div>
                <div className="hero-stat-card">
                  <span className="stat-num text-warning">{complianceSummary.manual_review_count}</span>
                  <span className="stat-lbl">Pending Review</span>
                </div>
                <div className="hero-stat-card">
                  <span className={`status-badge-lg badge-${complianceSummary.overall_status.toLowerCase()}`}>
                    {complianceSummary.overall_status}
                  </span>
                  <span className="stat-lbl">Baseline Verdict</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 5: TWO-STAGE APPROVAL & FINAL REVIEWER RECHECK WORKFLOW */}
      {activeTab === 'approval' && (
        <div className="space-y-4">
          <div className="dashboard-grid-2">
            {/* STAGE 1 CARD: FIELD INSPECTOR SIRA GRADING & RECOMMENDATION */}
            <Card
              title="Stage 1: Field Inspector SIRA Compliance Grading & Decision"
              subtitle="First-tier evaluation of Phase 1 Scope & Phase 2 SIRA Resolution No. (13) of 2025 requirements"
            >
              {siraAudit && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">
                        Computed SIRA Compliance Grade
                      </span>
                      <Badge
                        variant={
                          siraAudit.grading_summary?.letter_grade === 'A' ||
                          siraAudit.grading_summary?.letter_grade === 'B'
                            ? 'success'
                            : siraAudit.grading_summary?.letter_grade === 'C'
                            ? 'warning'
                            : 'danger'
                        }
                        size="md"
                      >
                        Grade {siraAudit.grading_summary?.letter_grade} ({siraAudit.grading_summary?.overall_sira_score}%)
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-main">{siraAudit.grading_summary?.grade_label}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono text-muted">
                      <div>
                        • Phase 1 Plan: <strong>{siraAudit.phase1_verification?.pillars_passed}/4 Pass</strong>
                      </div>
                      <div>
                        • Phase 1 Readiness: <strong>{siraAudit.phase1_verification?.construction_readiness_pct}%</strong>
                      </div>
                      <div>
                        • Camera FOV Rules:{' '}
                        <strong>
                          {siraAudit.grading_summary?.counts?.camera_rules_compliant}/
                          {siraAudit.grading_summary?.counts?.camera_rules_total}
                        </strong>
                      </div>
                      <div>
                        • Alarms/Access/Specs:{' '}
                        <strong>
                          {(siraAudit.grading_summary?.counts?.sector_controls_compliant || 0) +
                            (siraAudit.grading_summary?.counts?.technical_standards_compliant || 0)}
                          /
                          {(siraAudit.grading_summary?.counts?.sector_controls_total || 0) +
                            (siraAudit.grading_summary?.counts?.technical_standards_total || 0)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Current Stage 1 Status */}
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase text-muted">Stage 1 Inspector Status</span>
                      <Badge
                        variant={
                          siraAudit.stage1_inspector_review?.status === 'APPROVED_BY_INSPECTOR'
                            ? 'success'
                            : siraAudit.stage1_inspector_review?.status === 'REJECTED_BY_INSPECTOR'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {siraAudit.stage1_inspector_review?.status || 'PENDING'}
                      </Badge>
                    </div>
                    {siraAudit.stage1_inspector_review?.inspector_name ? (
                      <div className="text-xs text-secondary space-y-1 mt-1">
                        <p>
                          <strong>Inspector:</strong> {siraAudit.stage1_inspector_review.inspector_name} •{' '}
                          <strong>Time:</strong> {siraAudit.stage1_inspector_review.decision_at}
                        </p>
                        <p>
                          <strong>Remarks:</strong> {siraAudit.stage1_inspector_review.notes}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted">
                        Inspector has not submitted a Stage 1 recommendation yet. Enter notes below and click Approve or Reject.
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label text-xs">Stage 1 Inspector Findings & Recommendation Notes</label>
                    <textarea
                      className="form-textarea text-sm"
                      rows={3}
                      placeholder="Summarize Phase 1 & Phase 2 SIRA compliance findings for the Final Reviewer..."
                      value={inspectorDecisionNotes}
                      onChange={(e) => setInspectorDecisionNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2.5 flex-wrap">
                    <Button
                      variant="primary"
                      leftIcon={<CheckSquare size={16} />}
                      onClick={() => handleStage1InspectorDecision('APPROVE')}
                      isLoading={isActionLoading}
                    >
                      Stage 1 Inspector: Approve & Forward
                    </Button>
                    <Button
                      variant="danger"
                      leftIcon={<XCircle size={16} />}
                      onClick={() => handleStage1InspectorDecision('REJECT')}
                      isLoading={isActionLoading}
                    >
                      Stage 1 Inspector: Reject & Forward
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* STAGE 2 CARD: FINAL REVIEWER RECHECK, CONFIRMATION & FINAL DECISION */}
            <Card
              title="Stage 2: Final Reviewer Recheck, Confirmation & Final Decision"
              subtitle="Second-tier independent verification of Phase 1 Scope, Phase 2 SIRA Compliance Grade, and Inspector findings"
            >
              {siraAudit && (
                <div className="space-y-4">
                  {/* Stage 2 Status Banner */}
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase text-muted">Stage 2 Final Reviewer Status</span>
                      <Badge
                        variant={
                          siraAudit.stage2_final_reviewer?.status === 'FINAL_APPROVED' || inspection.status === 'APPROVED'
                            ? 'success'
                            : siraAudit.stage2_final_reviewer?.status === 'FINAL_REJECTED' ||
                              inspection.status === 'REJECTED'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {siraAudit.stage2_final_reviewer?.status || inspection.status}
                      </Badge>
                    </div>
                    {siraAudit.stage2_final_reviewer?.reviewer_name && (
                      <div className="text-xs text-secondary space-y-1 mt-1">
                        <p>
                          <strong>Final Reviewer:</strong> {siraAudit.stage2_final_reviewer.reviewer_name} •{' '}
                          <strong>Time:</strong> {siraAudit.stage2_final_reviewer.decision_at}
                        </p>
                        <p>
                          <strong>Decision Notes:</strong> {siraAudit.stage2_final_reviewer.notes}
                        </p>
                        {siraAudit.stage2_final_reviewer.certificate_number && (
                          <p className="text-emerald-500 font-mono font-bold">
                            Issued Certificate: #{siraAudit.stage2_final_reviewer.certificate_number}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mandatory 4-Point Final Reviewer Recheck Checklist */}
                  <div className="p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-main">
                      Mandatory Final Reviewer 4-Point Recheck & Verification
                    </h4>
                    <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={recheckPhase1}
                        onChange={(e) => setRecheckPhase1(e.target.checked)}
                      />
                      <span>
                        <strong>1. Confirm Phase 1 Eligibility & Scope:</strong> Verified Dubai Municipality Affection Plan ({siraAudit.phase1_verification?.pillars_passed}/4 Pillars) & Construction Readiness AI Index ({siraAudit.phase1_verification?.construction_readiness_pct}%).
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={recheckCategory}
                        onChange={(e) => setRecheckCategory(e.target.checked)}
                      />
                      <span>
                        <strong>2. Confirm SIRA Establishment Classification:</strong> Verified Ch. {siraAudit.sira_classification?.chapter_number} ({siraAudit.sira_classification?.display_name}
                        {siraAudit.sira_classification?.active_subtype
                          ? ` — ${siraAudit.sira_classification.active_subtype.name}`
                          : ''}
                        ) matches Trade License & Affection Plan Land Use.
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={recheckCameraFov}
                        onChange={(e) => setRecheckCameraFov(e.target.checked)}
                      />
                      <span>
                        <strong>3. Confirm Phase 2 Camera FOV & Security Controls:</strong> Rechecked {siraAudit.grading_summary?.counts?.camera_rules_compliant}/{siraAudit.grading_summary?.counts?.camera_rules_total} Camera FOV locations, Alarms, Access Control, Guarding & Part 1/2 Technical Specs.
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={recheckInspectorGrade}
                        onChange={(e) => setRecheckInspectorGrade(e.target.checked)}
                      />
                      <span>
                        <strong>4. Confirm Overall SIRA Grade & Stage 1 Inspector Verdict:</strong> Reviewed Grade {siraAudit.grading_summary?.letter_grade} ({siraAudit.grading_summary?.overall_sira_score}%) and Stage 1 Inspector notes ({siraAudit.stage1_inspector_review?.status || 'PENDING'}).
                      </span>
                    </label>
                  </div>

                  {/* Executive Override Option if blockers exist */}
                  {!siraAudit.grading_summary?.is_eligible_for_approval && (
                    <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowOverride}
                          onChange={(e) => setAllowOverride(e.target.checked)}
                        />
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          Enable Final Reviewer Executive Override (Required to Approve when Phase 1 &lt; 95% or items failed)
                        </span>
                      </label>
                      {allowOverride && (
                        <input
                          type="text"
                          className="form-input text-xs"
                          placeholder="Enter mandatory regulatory override justification (e.g., Conditional SIRA dispensation granted)..."
                          value={overrideJustification}
                          onChange={(e) => setOverrideJustification(e.target.value)}
                        />
                      )}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label text-xs">
                      Final Reviewer Confirmation Remarks / Remediation Directives
                    </label>
                    <textarea
                      className="form-textarea text-sm"
                      rows={2}
                      placeholder="Enter Final Reviewer sign-off notes or mandatory rejection remediation reasons..."
                      value={reviewerDecisionNotes}
                      onChange={(e) => setReviewerDecisionNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2.5 flex-wrap">
                    <Button
                      variant="primary"
                      leftIcon={<ShieldCheck size={16} />}
                      onClick={() => handleStage2FinalReviewerDecision('APPROVE')}
                      isLoading={isActionLoading}
                    >
                      Final Reviewer: Confirm & Approve (Issue Certificate)
                    </Button>
                    <Button
                      variant="danger"
                      leftIcon={<XCircle size={16} />}
                      onClick={() => handleStage2FinalReviewerDecision('REJECT')}
                      isLoading={isActionLoading}
                    >
                      Final Reviewer: Confirm & Reject
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 6: CERTIFICATE & REPORT */}
      {activeTab === 'certificate' && (
        <div className="dashboard-grid-2">
          {/* Certificate Card */}
          <Card title="Official Security Compliance Certificate" subtitle="Civil Defense & Safety Compliance Certification">
            {!certificate ? (
              <EmptyState
                title="Certificate Not Issued"
                description="Certificate will be automatically generated upon authorized reviewer approval."
                icon={<Lock size={36} />}
              />
            ) : (
              <div className="certificate-display-card">
                <div className="cert-top-header">
                  <Award size={36} className="text-primary" />
                  <div>
                    <span className="cert-official-title">Official Security & Safety Certificate</span>
                    <h2 className="cert-number font-mono">{certificate.certificate_number}</h2>
                  </div>
                  <Badge variant={certificate.status === 'ACTIVE' ? 'success' : 'danger'} size="md">
                    {certificate.status}
                  </Badge>
                </div>

                <div className="cert-body-grid">
                  <div>
                    <span className="text-xs text-muted">Certified Establishment:</span>
                    <p className="font-bold text-main">{establishment?.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Establishment Type:</span>
                    <p className="font-medium text-main">{establishment?.establishment_type}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Issue Date:</span>
                    <p className="font-medium text-main">{formatDate(certificate.issue_date)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Expiry Date:</span>
                    <p className="font-medium text-main">{formatDate(certificate.expiry_date)}</p>
                  </div>
                </div>

                <div className="cert-footer-actions flex justify-between items-center mt-4">
                  <Link
                    to={`/verify/${certificate.certificate_number}`}
                    target="_blank"
                    className="btn btn-outline btn-sm flex items-center gap-1"
                  >
                    <QrCode size={14} /> Open Public Verification Link
                  </Link>

                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Download size={14} />}
                    onClick={handleDownloadCertificate}
                  >
                    Download Certificate PDF
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Inspection Report Card */}
          <Card title="Comprehensive Inspection Audit Report" subtitle="Full multi-page executive summary with evidence & audit trail">
            <div className="report-action-card">
              <FileCheck size={40} className="text-primary mb-2" />
              <h3 className="font-bold text-lg">Executive Audit Report</h3>
              <p className="text-sm text-secondary mb-4">
                Generates a formal PDF report including facility profile, full document inventory, YOLO computer vision detections, compliance scores, reviewer comments, and cryptographic verification stamps.
              </p>
              <Button
                variant="primary"
                leftIcon={<Download size={16} />}
                onClick={handleDownloadReport}
              >
                Download Official Report (PDF)
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* UPLOAD EVIDENCE MODAL */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadFiles([]);
        }}
        title="Upload Inspection Evidence"
        subtitle={`Attach one or multiple photos, floor plans, or PDFs to Inspection #${inspection.inspection_number}`}
        maxWidth="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadFiles([]);
              }}
              disabled={isActionLoading}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUploadFile} isLoading={isActionLoading}>
              {uploadFiles.length > 1 ? `Upload ${uploadFiles.length} Files` : 'Upload File'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleUploadFile} className="form-stack">
          <div className="form-group">
            <label className="form-label required">Select Evidence File(s) (JPG, PNG, PDF — Multi-select enabled)</label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="form-input"
              onChange={(e) => setUploadFiles(e.target.files ? Array.from(e.target.files) : [])}
            />
            {uploadFiles.length > 0 && (
              <p className="text-xs text-emerald-400 mt-1.5 font-mono">
                {uploadFiles.length} file(s) selected: {uploadFiles.map((f) => f.name).join(', ')}
              </p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label required">Evidence Category</label>
            <select
              className="form-select"
              value={uploadDocType}
              onChange={(e) => setUploadDocType(e.target.value)}
            >
              <option value="AFFECTION_PLAN">Official Affection Plan (خارطة الموقع) / Site Plan</option>
              <option value="SITE_PHOTO">Premises Site Photos (Phase 1 Construction Readiness)</option>
              <option value="FLOOR_PLAN">Architectural Layout / Floor Plan (Phase 2)</option>
              <option value="OTHER">Supporting Inspection Evidence</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description / Field Notes</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="e.g. Premises site photos for Phase 1 construction readiness evaluation"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* MANUAL DETECTION MODAL */}
      <Modal
        isOpen={isManualDetectModalOpen}
        onClose={() => setIsManualDetectModalOpen(false)}
        title="Add Manual Security Element"
        subtitle="Manually record security equipment discovered by inspector"
        maxWidth="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={() => setIsManualDetectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddManualDetection} isLoading={isActionLoading}>
              Save Detection
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddManualDetection} className="form-stack">
          <div className="form-group">
            <label className="form-label required">Security Object Type</label>
            <select
              className="form-select"
              value={manualClass}
              onChange={(e) => setManualClass(e.target.value)}
            >
              <option value="cctv_camera">CCTV Camera / Security Camera</option>
              <option value="emergency_exit">Emergency Exit Door</option>
              <option value="fire_extinguisher">Fire Extinguisher</option>
              <option value="door">Standard Door / Entrance</option>
              <option value="window">Window</option>
              <option value="barrier">Security Barrier / Turnstile</option>
              <option value="smoke_detector">Smoke / Heat Detector</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Inspector Notes / Location</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Verified visually at main lobby north exit"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* SUBMIT FOR REVIEW MODAL */}
      <Modal
        isOpen={isSubmitReviewModalOpen}
        onClose={() => setIsSubmitReviewModalOpen(false)}
        title="Submit Inspection for Review"
        subtitle="Forward this audit to authorized reviewers for formal approval"
        maxWidth="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={() => setIsSubmitReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitForReview} isLoading={isActionLoading}>
              Confirm Submission
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForReview} className="form-stack">
          <div className="form-group">
            <label className="form-label">Inspector Submission Notes</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Provide field summary, highlighted points, or conditions noted during inspection..."
              value={submitNotes}
              onChange={(e) => setSubmitNotes(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* APPROVE INSPECTION MODAL */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve Inspection & Issue Certificate"
        subtitle="Grant official safety certification to this facility"
        maxWidth="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApproveInspection} isLoading={isActionLoading}>
              Approve & Generate Certificate
            </Button>
          </div>
        }
      >
        <form onSubmit={handleApproveInspection} className="form-stack">
          <div className="form-group">
            <label className="form-label">Reviewer Approval Remarks</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Official approval remarks..."
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
            />
          </div>
          <div className="form-group mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowOverride}
                onChange={(e) => setAllowOverride(e.target.checked)}
              />
              <span className="text-sm font-semibold text-warning">
                Enable Executive Override (if mandatory items failed)
              </span>
            </label>
          </div>
          {allowOverride && (
            <div className="form-group">
              <label className="form-label required">Override Justification</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="State regulatory or executive rationale for granting override..."
                value={overrideJustification}
                onChange={(e) => setOverrideJustification(e.target.value)}
              />
            </div>
          )}
        </form>
      </Modal>

      {/* REJECT INSPECTION MODAL */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Inspection"
        subtitle="Specify safety deficiencies requiring facility remediation"
        maxWidth="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRejectInspection} isLoading={isActionLoading}>
              Reject Inspection
            </Button>
          </div>
        }
      >
        <form onSubmit={handleRejectInspection} className="form-stack">
          <div className="form-group">
            <label className="form-label required">Rejection Reason & Required Remediation</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Detail reasons for rejection (e.g. insufficient emergency exits or missing CCTV coverage)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>

      {/* OVERRIDE COMPLIANCE ITEM MODAL */}
      <Modal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title={`Override Requirement: ${selectedItemToOverride?.requirement_code || ''}`}
        subtitle="Authorized reviewer override for regulatory requirement"
        maxWidth="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={() => setIsOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleOverrideItem} isLoading={isActionLoading}>
              Save Override
            </Button>
          </div>
        }
      >
        <form onSubmit={handleOverrideItem} className="form-stack">
          <div className="form-group">
            <label className="form-label required">Override Status</label>
            <select
              className="form-select"
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
            >
              <option value="COMPLIANT">Compliant</option>
              <option value="NON_COMPLIANT">Non-Compliant</option>
              <option value="NOT_APPLICABLE">Not Applicable</option>
              <option value="REQUIRES_MANUAL_REVIEW">Requires Manual Review</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Justification & Regulatory Authority</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Document reason for override and authorized review notes..."
              value={itemOverrideReason}
              onChange={(e) => setItemOverrideReason(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>

      {/* PHASE 1 SCOPE VISION AI REPORT MODAL */}
      <Modal
        isOpen={isScopeReportModalOpen}
        onClose={() => setIsScopeReportModalOpen(false)}
        title="Scope Vision AI — Per-Image 4-Pillar Analysis Report"
        subtitle={`OpenCV + YOLOv8 Construction Readiness Breakdown (${constructionReadiness.image_results?.length || 0} Site Photos Analyzed)`}
        maxWidth="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <span className="text-xs text-muted font-mono">
              Overall Average: <strong>{constructionReadiness.completion_pct}%</strong> (Mandatory SIRA Threshold: &gt;= 95.0%)
            </span>
            <Button variant="primary" onClick={() => setIsScopeReportModalOpen(false)}>
              Close Report
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div
            className={`alert-banner ${
              constructionReadiness.is_eligible ? 'alert-success' : 'alert-danger'
            }`}
          >
            {constructionReadiness.is_eligible ? (
              <ShieldCheck size={18} />
            ) : (
              <XCircle size={18} />
            )}
            <div className="alert-content">
              <strong>
                Final Scope Decision:{' '}
                {constructionReadiness.is_eligible
                  ? 'IN SIRA SCOPE (>= 95%)'
                  : 'OUT OF SCOPE (< 95%)'}
              </strong>
              <span>{constructionReadiness.message}</span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {constructionReadiness.image_results && constructionReadiness.image_results.length > 0 ? (
              constructionReadiness.image_results.map((img, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-700/80 bg-slate-900/60 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 font-semibold text-main text-sm">
                      {img.passed ? (
                        <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle size={16} className="text-red-400 flex-shrink-0" />
                      )}
                      <span>{img.filename}</span>
                      <span className="text-muted font-mono text-xs">({img.scene_type})</span>
                    </div>
                    <Badge variant={img.passed ? 'success' : 'danger'} size="sm">
                      {img.completion_pct.toFixed(1)}% ({img.status})
                    </Badge>
                  </div>
                  <div className="text-muted font-mono text-xs mb-1.5">
                    Ceiling: <strong className="text-main">{img.ceiling_score}</strong>/25 • Floor:{' '}
                    <strong className="text-main">{img.floor_score}</strong>/25 • Finishes:{' '}
                    <strong className="text-main">{img.finishes_score}</strong>/25 • No-Debris:{' '}
                    <strong className="text-main">{img.debris_score}</strong>/25
                  </div>
                  <div className="text-secondary text-xs">
                    {img.findings.join(' • ')}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted italic text-center py-4">
                No site photos have been evaluated yet. Click &quot;Run Scope Vision AI&quot; first.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
