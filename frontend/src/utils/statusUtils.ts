export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'primary' | 'secondary' | 'default';

export interface StatusConfig {
  label: string;
  variant: BadgeVariant;
  description: string;
}

export function getStatusConfig(status?: string | null): StatusConfig {
  const normalized = (status || 'UNKNOWN').toUpperCase().replace(/[\s-]/g, '_');

  switch (normalized) {
    case 'COMPLETED':
    case 'COMPLIANT':
    case 'PASSED':
    case 'APPROVED':
    case 'ACTIVE':
      return {
        label: normalized === 'COMPLIANT' ? 'Compliant' : normalized === 'APPROVED' ? 'Approved' : 'Active',
        variant: 'success',
        description: 'Concluded with safety standards satisfied',
      };

    case 'IN_PROGRESS':
    case 'UNDER_REVIEW':
    case 'AWAITING_VERIFICATION':
      return {
        label: normalized === 'AWAITING_VERIFICATION' ? 'Awaiting Verification' : 'In Progress',
        variant: 'info',
        description: 'Audit undergoing verification',
      };

    case 'PENDING':
    case 'SCHEDULED':
    case 'AWAITING_REVIEW':
      return {
        label: normalized === 'AWAITING_REVIEW' ? 'Awaiting Review' : 'Pending',
        variant: 'warning',
        description: 'Awaiting inspector or reviewer evaluation',
      };

    case 'NON_COMPLIANT':
    case 'FAILED':
    case 'CRITICAL':
    case 'REJECTED':
      return {
        label: normalized === 'REJECTED' ? 'Rejected' : 'Non-Compliant',
        variant: 'danger',
        description: 'Safety violations or deficiencies identified',
      };

    case 'MANUAL_REVIEW':
    case 'REQUIRES_MANUAL_REVIEW':
      return {
        label: 'Manual Review',
        variant: 'purple',
        description: 'Requires inspector verification',
      };

    case 'EXPIRED':
    case 'REVOKED':
      return {
        label: normalized === 'REVOKED' ? 'Revoked' : 'Expired',
        variant: 'danger',
        description: 'Certificate validity lapsed',
      };

    case 'DRAFT':
      return {
        label: 'Draft',
        variant: 'neutral',
        description: 'Initial record created',
      };

    default:
      return {
        label: status || 'Unknown',
        variant: 'neutral',
        description: 'Status unrecognized',
      };
  }
}
