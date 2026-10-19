import { apiClient } from './api';
import type {
  ComplianceEvaluationResponse,
  InspectionComplianceSummary,
  ComplianceOverrideRequest,
  InspectionComplianceItem,
} from '../types';

export const complianceApi = {
  /**
   * Run rule-based compliance engine evaluation on an inspection
   */
  async evaluateCompliance(
    inspectionId: number
  ): Promise<ComplianceEvaluationResponse> {
    return apiClient<ComplianceEvaluationResponse>(
      `/compliance/evaluate/${inspectionId}`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Get current compliance breakdown and summary for an inspection
   */
  async getComplianceSummary(
    inspectionId: number
  ): Promise<InspectionComplianceSummary> {
    return apiClient<InspectionComplianceSummary>(
      `/compliance/summary/${inspectionId}`
    );
  },

  /**
   * Override a compliance item evaluation (requires authorized reviewer/admin role and justification)
   */
  async overrideComplianceItem(
    itemId: number,
    payload: ComplianceOverrideRequest
  ): Promise<InspectionComplianceItem> {
    return apiClient<InspectionComplianceItem>(
      `/compliance/items/${itemId}/override`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  },
};
