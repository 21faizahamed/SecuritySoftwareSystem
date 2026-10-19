export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  error_code?: string;
  path?: string;
}

export interface MessageResponse {
  message: string;
  detail?: string;
}

// --- Establishment Types ---

export interface Establishment {
  id: number;
  name: string;
  establishment_type: string;
  address: string;
  owner_name?: string | null;
  contact_information?: string | null;
  location_coordinates?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | string;
  created_at: string;
  updated_at: string;
}

export interface EstablishmentCreate {
  name: string;
  establishment_type: string;
  address: string;
  owner_name?: string;
  contact_information?: string;
  location_coordinates?: string;
  status?: string;
}

export interface EstablishmentUpdate {
  name?: string;
  establishment_type?: string;
  address?: string;
  owner_name?: string;
  contact_information?: string;
  location_coordinates?: string;
  status?: string;
}

export interface EstablishmentQueryParams {
  search?: string;
  establishment_type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// --- Inspection Types ---

export type InspectionStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'AWAITING_VERIFICATION'
  | 'AWAITING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PENDING';

export interface UserSummary {
  id: number;
  username: string;
  full_name: string;
  email: string;
}

export interface Inspection {
  id: number;
  inspection_number: string;
  establishment_id: number;
  inspector_id?: number | null;
  reviewer_id?: number | null;
  inspection_type: string;
  inspection_date: string;
  status: InspectionStatus | string;
  compliance_score?: number | null;
  compliance_summary?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  establishment?: Establishment | null;
  inspector?: UserSummary | null;
  reviewer?: UserSummary | null;
}

export interface InspectionCreate {
  establishment_id: number;
  inspection_number?: string;
  inspection_type?: string;
  inspection_date?: string;
  status?: string;
  notes?: string;
  inspector_id?: number;
}

export interface InspectionUpdate {
  establishment_id?: number;
  inspection_type?: string;
  status?: string;
  notes?: string;
  inspection_date?: string;
  inspector_id?: number;
  reviewer_id?: number;
  compliance_score?: number;
  compliance_summary?: string;
}

export interface InspectionQueryParams {
  establishment_id?: number;
  inspector_id?: number;
  status?: string;
  inspection_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// --- Document Types ---

export interface Document {
  id: number;
  inspection_id: number;
  uploaded_by_id?: number | null;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  sha256_hash?: string | null;
  file_hash?: string | null;
  upload_status?: string;
  processing_status?: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'OCR_REQUIRED' | 'OCR_COMPLETE' | 'FAILED' | string;
  extracted_text?: string | null;
  page_count?: number;
  upload_date?: string;
  created_at: string;
  updated_at?: string | null;
}

export type DocumentItem = Document;

export interface DocumentCreate {
  inspection_id: number;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  upload_status?: string;
}

export interface DocumentUploadResponse {
  message: string;
  document: Document;
}

export interface DocumentProcessingResult {
  document_id: number;
  processing_status: string;
  extracted_text?: string | null;
  pages_extracted: number;
  sha256_hash?: string;
}

export interface DocumentQueryParams {
  inspection_id?: number;
  file_type?: string;
  upload_status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// --- AI Computer Vision & Detection Types ---

export type VerificationStatus = 'PENDING' | 'DETECTED' | 'VERIFIED' | 'REJECTED' | 'MODIFIED' | 'MANUALLY_ADDED';

export interface BoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface Detection {
  id: number;
  inspection_id: number;
  document_id: number;
  page_number?: number;
  object_type: string;
  confidence: number;
  confidence_tier?: 'HIGH' | 'MED' | 'LOW' | string;
  bbox_x_min?: number;
  bbox_y_min?: number;
  bbox_x_max?: number;
  bbox_y_max?: number;
  bounding_box?: BoundingBox;
  detection_source: string;
  model_name?: string;
  model_version?: string;
  verification_status: VerificationStatus | string;
  verified_by_id?: number | null;
  verified_at?: string | null;
  inspector_notes?: string | null;
  verification_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DetectionVerificationRequest {
  verification_status: 'VERIFIED' | 'REJECTED' | 'MODIFIED' | string;
  verification_notes?: string;
  inspector_notes?: string;
  object_type?: string;
  bounding_box?: BoundingBox;
}

export type DetectionVerifyRequest = DetectionVerificationRequest;

export interface ManualDetectionCreate {
  document_id: number;
  page_number?: number;
  object_type: string;
  confidence?: number;
  bounding_box?: BoundingBox;
  verification_notes?: string;
  inspector_notes?: string;
}

export type DetectionManualCreate = ManualDetectionCreate;

export interface DetectionCountSummary {
  object_type: string;
  total_count?: number;
  verified_count: number;
  pending_count?: number;
  rejected_count: number;
  detected_count?: number;
}

export interface AIDetectionResponse {
  document_id: number;
  inspection_id: number;
  model_name: string;
  model_version?: string;
  detection_count: number;
  total_detections?: number;
  detections: Detection[];
  counts_by_class?: Record<string, number>;
  summary_counts?: DetectionCountSummary[];
}

export type AIAnalysisResponse = AIDetectionResponse;

// --- Regulatory Requirements Types ---

export interface Requirement {
  id: number;
  requirement_code: string;
  category: string;
  title: string;
  description: string;
  requirement_type: string;
  target_object_type?: string | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  quantity_requirement?: number | null;
  unit?: string;
  establishment_type: string;
  severity: 'CRITICAL' | 'MANDATORY' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  is_mandatory: boolean;
  is_active: boolean;
  source_document: string;
  source_version?: string;
  source_section?: string | null;
  source_page?: number | null;
  original_text?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementCreate {
  requirement_code: string;
  category: string;
  title: string;
  description: string;
  requirement_type?: string;
  target_object_type?: string;
  min_quantity?: number;
  max_quantity?: number;
  quantity_requirement?: number;
  unit?: string;
  establishment_type?: string;
  severity?: string;
  is_mandatory?: boolean;
  is_active?: boolean;
  source_document?: string;
  source_version?: string;
  source_section?: string;
  source_page?: number;
  original_text?: string;
}

export interface RequirementUpdate {
  category?: string;
  title?: string;
  description?: string;
  requirement_type?: string;
  target_object_type?: string;
  min_quantity?: number;
  max_quantity?: number;
  quantity_requirement?: number;
  unit?: string;
  establishment_type?: string;
  severity?: string;
  is_mandatory?: boolean;
  is_active?: boolean;
  source_document?: string;
  source_version?: string;
  source_section?: string;
  source_page?: number;
  original_text?: string;
}

export interface RequirementQueryParams {
  category?: string;
  severity?: string;
  establishment_type?: string;
  is_mandatory?: boolean;
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  limit?: number;
}

export interface PDFIngestionResponse {
  document_id: number;
  document_name: string;
  extracted_clauses_count: number;
  message: string;
}

// --- Compliance Engine Types ---

export interface InspectionComplianceItem {
  id: number;
  inspection_id: number;
  requirement_id: number;
  requirement_code: string;
  requirement_title: string;
  category?: string;
  is_mandatory: boolean;
  required_quantity?: number | null;
  required_value_text?: string | null;
  detected_quantity?: number | null;
  detected_value_text?: string | null;
  is_satisfied: boolean;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_MANUAL_REVIEW' | 'INSUFFICIENT_EVIDENCE' | 'NOT_APPLICABLE' | string;
  source_document?: string | null;
  source_section?: string | null;
  source_page?: number | null;
  notes?: string | null;
  is_overridden: boolean;
  override_reason?: string | null;
  overridden_by_id?: number | null;
  created_at: string;
  updated_at: string;
}

export type ComplianceItem = InspectionComplianceItem;

export interface InspectionComplianceSummary {
  inspection_id: number;
  total_requirements: number;
  satisfied_count: number;
  non_compliant_count: number;
  unsatisfied_count?: number;
  manual_review_count: number;
  pending_verification_count?: number;
  not_applicable_count: number;
  compliance_score: number;
  overall_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_MANUAL_REVIEW' | string;
  is_eligible_for_approval: boolean;
  evaluated_at: string;
  items: InspectionComplianceItem[];
}

export type ComplianceSummary = InspectionComplianceSummary;

export interface ComplianceEvaluationResponse {
  inspection_id: number;
  summary: InspectionComplianceSummary;
  message: string;
}

export interface ComplianceOverrideRequest {
  status: string;
  override_reason: string;
  target_status?: string;
}

// --- Approvals & Review Types ---

export interface SubmitForReviewRequest {
  submission_notes?: string;
  inspector_notes?: string;
}

export interface ApprovalDecisionRequest {
  approval_notes?: string;
  reviewer_notes?: string;
  allow_override?: boolean;
  force_override?: boolean;
  override_justification?: string;
  override_reason?: string;
}

export type ReviewApprovalRequest = ApprovalDecisionRequest;

export interface RejectionRequest {
  rejection_reason: string;
  reviewer_notes?: string;
}

export type ReviewRejectionRequest = RejectionRequest;

// --- Certificate Types ---

export interface Certificate {
  id: number;
  certificate_number: string;
  inspection_id: number;
  establishment_id: number;
  issued_by_id?: number | null;
  issue_date: string;
  expiry_date?: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED' | string;
  compliance_score?: number | null;
  qr_code_data?: string | null;
  qr_code_image_path?: string | null;
  pdf_path?: string | null;
  created_at: string;
  updated_at: string;
  establishment?: Establishment | null;
  inspection?: Inspection | null;
}

export interface CertificateVerificationResponse {
  certificate_number: string;
  is_valid: boolean;
  status: string;
  establishment_name: string;
  establishment_type: string;
  address?: string;
  inspection_number?: string;
  issue_date: string;
  expiry_date: string;
  compliance_score?: number | null;
  verified_at: string;
  verification_timestamp?: string;
  verification_status?: string;
}

export type PublicCertificateVerification = CertificateVerificationResponse;

export interface CertificateQueryParams {
  establishment_id?: number;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
  limit?: number;
}

// --- Report Types ---

export interface InspectionReportResponse {
  inspection: Inspection;
  establishment: Establishment;
  documents: Document[];
  detections: Detection[];
  compliance: InspectionComplianceSummary;
  certificate?: Certificate | null;
  generated_at: string;
}

export type ReportResponse = InspectionReportResponse;

// --- Audit Log Types ---

export interface AuditLog {
  id: number;
  user_id?: number | null;
  username?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: any;
  new_values?: any;
  details?: string | null;
  ip_address?: string | null;
  created_at: string;
  user?: UserSummary | null;
}

export interface AuditLogQueryParams {
  user_id?: number;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  page?: number;
  page_size?: number;
  limit?: number;
}

// --- Notifications Types ---

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CERTIFICATE_ISSUED' | 'INSPECTION_REJECTED' | string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationUnreadCount {
  unread_count: number;
}

// --- Dashboard Types ---

export interface DashboardSummary {
  total_establishments: number;
  active_inspections: number;
  pending_inspections: number;
  completed_inspections: number;
  inspections_awaiting_review: number;
  compliant_inspections: number;
  non_compliant_inspections: number;
  compliance_rate: number;
  certificates_issued: number;
  certificates_expiring_soon: number;
  status_breakdown: Record<string, number>;
  inspections_by_type: Record<string, number>;
}

export type DashboardStats = DashboardSummary;

// --- Auth & User Types ---

export type UserRole = 'ADMIN' | 'INSPECTOR' | 'REVIEWER' | 'VIEWER';

export interface Permission {
  id: number;
  name: string;
  description?: string | null;
}

export interface Role {
  id: number;
  name: UserRole | string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  permissions: Permission[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
  role?: Role | null;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role_id: number;
  is_active?: boolean;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  password?: string;
  full_name?: string;
  role_id?: number;
  is_active?: boolean;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
  role: UserRole | string;
  permissions: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface SystemHealth {
  status: string;
  application: string;
  version?: string;
  environment?: string;
  phase?: string;
}

export interface DatabaseStatus {
  database: string;
  status: 'connected' | 'disconnected';
  version?: string;
  host?: string;
  port?: number;
  tables?: string[];
  error?: string;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}
