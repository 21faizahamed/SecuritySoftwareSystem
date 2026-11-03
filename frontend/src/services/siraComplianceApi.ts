import { apiClient } from './api';

export interface SiraSubtypeSummary {
  subtype_code: string;
  section_order?: string;
  name: string;
  description: string;
  start_page: number;
  end_page: number;
  requirement_count: number;
}

export interface SiraEstablishmentSummary {
  id: number;
  slug: string;
  chapter_number: number;
  chapter_title: string;
  display_name: string;
  industry_sector: string;
  overview_text: string;
  synonyms: string[];
  matched_synonym?: string | null;
  start_page: number;
  end_page: number;
  total_requirements: number;
  camera_count: number;
  alarm_count: number;
  access_control_count: number;
  other_security_count: number;
  conditional_count: number;
  subtypes: SiraSubtypeSummary[];
}

export interface SiraSectorRequirementItem {
  id: number;
  requirement_code: string;
  section_group: string;
  table_title: string;
  sn: number;
  area_or_location: string;
  required_fov: string | null;
  system_or_equipment: string;
  exact_wording: string;
  simplified_explanation: string | null;
  remarks_and_conditions: string | null;
  approval_or_exception: string | null;
  applicability_type: string;
  condition_trigger: string | null;
  source_part: string;
  source_chapter: string;
  pdf_page: number;
  printed_page: number;
  verification_status: string;
  conditions: Array<{
    rule_type: string;
    condition_text: string;
    effect_text: string;
    requires_prior_approval: boolean;
    pdf_page: number;
  }>;
  linked_standard_codes: string[];
}

export interface SiraTechnicalStandardItem {
  id: number;
  standard_code: string;
  part_number: number;
  chapter_number: number;
  chapter_title: string;
  section_title: string;
  sn: number;
  technical_category: string;
  equipment_or_system: string;
  title: string;
  exact_wording: string;
  simplified_explanation: string | null;
  numeric_threshold: string | null;
  unit_of_measurement: string | null;
  conditions_and_exceptions: string | null;
  approval_requirement: string | null;
  is_mandatory: boolean;
  applicability_type: string;
  pdf_page: number;
  printed_page: number;
  verification_status: string;
}

export interface SiraFovTypeItem {
  fov_code: string;
  name: string;
  min_screen_percentage: string | null;
  min_pixel_density_ppm: string | null;
  horizontal_angle_limit: string | null;
  vertical_angle_limit: string | null;
  wdr_requirement: string | null;
  exact_wording: string;
  remarks: string | null;
  pdf_page: number;
}

export interface SiraDefinitionItem {
  sn: number;
  term: string;
  definition_text: string;
  simplified_explanation: string | null;
  category: string;
  pdf_page: number;
}

export const siraComplianceApi = {
  getOverview: () => apiClient<any>('/sira-compliance/overview'),

  listEstablishments: (params?: {
    search?: string;
    industry_sector?: string;
    equipment_filter?: string;
    fov_filter?: string;
    sort_by?: string;
  }) => apiClient<{ total: number; industries: string[]; items: SiraEstablishmentSummary[] }>('/sira-compliance/establishments', { params }),

  getEstablishmentDetail: (slugOrCode: string, subtypeCode?: string) =>
    apiClient<any>(`/sira-compliance/establishments/${encodeURIComponent(slugOrCode)}`, {
      params: subtypeCode ? { subtype_code: subtypeCode } : undefined,
    }),

  listTechnicalStandards: (params?: {
    part_number?: number;
    technical_category?: string;
    search?: string;
  }) => apiClient<{ total: number; categories: string[]; items: SiraTechnicalStandardItem[] }>('/sira-compliance/standards', { params }),

  listDefinitions: (search?: string) =>
    apiClient<{ definitions: SiraDefinitionItem[]; fov_types: SiraFovTypeItem[] }>('/sira-compliance/definitions', {
      params: search ? { search } : undefined,
    }),

  globalSearch: (params: {
    q: string;
    module_filter?: string;
    fov_filter?: string;
    applicability_filter?: string;
  }) => apiClient<any>('/sira-compliance/search', { params }),

  getSourcePage: (pageNumber: number) =>
    apiClient<any>(`/sira-compliance/source-pages/${pageNumber}`),

  getSourcePdfUrl: (pageNumber?: number) => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${base}/sira-compliance/source-pdf${pageNumber ? `#page=${pageNumber}` : ''}`;
  },

  listProjects: () => apiClient<{ items: any[] }>('/sira-compliance/projects'),

  createProject: (payload: Record<string, any>) =>
    apiClient<any>('/sira-compliance/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getProjectDetail: (projectId: number) =>
    apiClient<any>(`/sira-compliance/projects/${projectId}`),

  updateProjectItem: (projectId: number, itemId: number, payload: Record<string, any>) =>
    apiClient<any>(`/sira-compliance/projects/${projectId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getInspectionAudit: (
    inspectionId: number,
    params?: {
      category_slug?: string;
      subtype_code?: string;
      auto_evaluate?: boolean;
      bulk_status?: string;
      phase1_readiness_pct?: number;
    }
  ) =>
    apiClient<any>(`/sira-compliance/inspections/${inspectionId}/audit`, {
      params: params as any,
    }),

  evaluateInspectionAudit: (
    inspectionId: number,
    payload: {
      category_slug?: string;
      subtype_code?: string;
      auto_evaluate?: boolean;
      bulk_status?: string;
      phase1_readiness_pct?: number;
      actor_name?: string;
    }
  ) =>
    apiClient<any>(`/sira-compliance/inspections/${inspectionId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  gradeInspectionItem: (
    inspectionId: number,
    itemId: number,
    payload: {
      compliance_status: string;
      assessor_notes?: string;
      not_applicable_explanation?: string;
      evidence_reference?: string;
      reviewer_name?: string;
    }
  ) =>
    apiClient<any>(`/sira-compliance/inspections/${inspectionId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  submitInspectorDecision: (
    inspectionId: number,
    payload: {
      decision: 'APPROVE' | 'REJECT';
      inspector_notes?: string;
      inspector_name?: string;
    }
  ) =>
    apiClient<any>(`/sira-compliance/inspections/${inspectionId}/inspector-decision`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitReviewerDecision: (
    inspectionId: number,
    payload: {
      decision: 'APPROVE' | 'REJECT';
      reviewer_notes?: string;
      recheck_phase1_scope: boolean;
      recheck_sira_category: boolean;
      recheck_camera_fov_matrix: boolean;
      recheck_inspector_grade: boolean;
      allow_override?: boolean;
      override_justification?: string;
      reviewer_name?: string;
    }
  ) =>
    apiClient<any>(`/sira-compliance/inspections/${inspectionId}/reviewer-decision`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

