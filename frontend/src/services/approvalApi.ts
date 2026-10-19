import { apiClient } from './api';
import type {
  Inspection,
  SubmitForReviewRequest,
  ApprovalDecisionRequest,
  RejectionRequest,
} from '../types';

export const approvalApi = {
  /**
   * Inspector submits completed inspection for formal review
   */
  async submitForReview(
    inspectionId: number,
    payload: SubmitForReviewRequest
  ): Promise<Inspection> {
    return apiClient<Inspection>(`/approvals/${inspectionId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Reviewer or Admin approves the inspection (blocks if mandatory items fail without override)
   */
  async approveInspection(
    inspectionId: number,
    payload: ApprovalDecisionRequest
  ): Promise<Inspection> {
    return apiClient<Inspection>(`/approvals/${inspectionId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Reviewer or Admin rejects the inspection with mandatory reason
   */
  async rejectInspection(
    inspectionId: number,
    payload: RejectionRequest
  ): Promise<Inspection> {
    return apiClient<Inspection>(`/approvals/${inspectionId}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
