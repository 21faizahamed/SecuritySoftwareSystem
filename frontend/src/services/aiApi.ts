import { apiClient } from './api';
import type {
  Detection,
  AIDetectionResponse,
  DetectionVerificationRequest,
  ManualDetectionCreate,
  DetectionCountSummary,
} from '../types';

export const aiApi = {
  /**
   * Run AI computer vision analysis on a document
   */
  async analyzeDocument(
    documentId: number,
    confidenceThreshold?: number
  ): Promise<AIDetectionResponse> {
    return apiClient<AIDetectionResponse>(`/ai/analyze/${documentId}`, {
      method: 'POST',
      body: JSON.stringify({
        confidence_threshold: confidenceThreshold ?? 0.35,
      }),
    });
  },

  /**
   * Get all detections for an inspection
   */
  async getDetectionsByInspection(
    inspectionId: number,
    status?: string
  ): Promise<Detection[]> {
    return apiClient<Detection[]>(`/ai/detections/inspection/${inspectionId}`, {
      params: { status },
    });
  },

  /**
   * Get all detections for a document
   */
  async getDetectionsByDocument(documentId: number): Promise<Detection[]> {
    return apiClient<Detection[]>(`/ai/detections/document/${documentId}`);
  },

  /**
   * Verify, reject, or modify an AI detection
   */
  async verifyDetection(
    detectionId: number,
    verification: DetectionVerificationRequest
  ): Promise<Detection> {
    return apiClient<Detection>(`/ai/detections/${detectionId}/verify`, {
      method: 'PUT',
      body: JSON.stringify(verification),
    });
  },

  /**
   * Add a manual detection discovered by the inspector
   */
  async addManualDetection(payload: ManualDetectionCreate): Promise<Detection> {
    return apiClient<Detection>('/ai/detections/manual', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete a detection
   */
  async deleteDetection(detectionId: number): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/ai/detections/${detectionId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get detection count summary for an inspection (by class and verification status)
   */
  async getDetectionCounts(inspectionId: number): Promise<DetectionCountSummary> {
    return apiClient<DetectionCountSummary>(`/ai/counts/${inspectionId}`);
  },
};
