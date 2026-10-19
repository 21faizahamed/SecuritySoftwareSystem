import React from 'react';
import { Eye, Edit3, Trash2, Calendar, FileText } from 'lucide-react';
import type { Inspection } from '../../types';
import { formatDateOnly, truncateText } from '../../utils/formatters';
import { getStatusConfig } from '../../utils/statusUtils';
import { Badge } from '../common/Badge';

interface InspectionTableProps {
  inspections: Inspection[];
  onView: (id: number) => void;
  onEdit: (inspection: Inspection) => void;
  onDelete: (inspection: Inspection) => void;
}

export const InspectionTable: React.FC<InspectionTableProps> = ({
  inspections,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="table-responsive">
      <table className="enterprise-table">
        <thead>
          <tr>
            <th scope="col" style={{ width: '180px' }}>Inspection #</th>
            <th scope="col">Establishment ID</th>
            <th scope="col" style={{ width: '140px' }}>Date</th>
            <th scope="col" style={{ width: '150px' }}>Status</th>
            <th scope="col">Notes</th>
            <th scope="col" style={{ width: '130px' }}>Inspector</th>
            <th scope="col" style={{ width: '140px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {inspections.map((insp) => {
            const statusConfig = getStatusConfig(insp.status);

            return (
              <tr key={insp.id} className="table-row-hover">
                <td>
                  <button
                    type="button"
                    className="table-link-btn font-mono"
                    onClick={() => onView(insp.id)}
                    title="View inspection details"
                  >
                    <FileText size={14} className="inline mr-1 text-primary opacity-80" />
                    {insp.inspection_number}
                  </button>
                </td>
                <td>
                  <span className="text-secondary font-medium">
                    #{insp.establishment_id}
                  </span>
                </td>
                <td className="text-secondary text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar size={13} className="text-muted" />
                    {formatDateOnly(insp.inspection_date || insp.created_at)}
                  </div>
                </td>
                <td>
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.label}
                  </Badge>
                </td>
                <td className="text-muted text-sm" title={insp.notes || ''}>
                  {truncateText(insp.notes || 'No notes attached', 45)}
                </td>
                <td>
                  <span className="text-muted text-xs bg-surface-subtle px-2 py-1 rounded">
                    Not assigned
                  </span>
                </td>
                <td>
                  <div className="table-actions-cell">
                    <button
                      type="button"
                      className="action-icon-btn view"
                      onClick={() => onView(insp.id)}
                      title="View inspection details"
                      aria-label={`View ${insp.inspection_number}`}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      className="action-icon-btn edit"
                      onClick={() => onEdit(insp)}
                      title="Update inspection"
                      aria-label={`Edit ${insp.inspection_number}`}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      className="action-icon-btn delete"
                      onClick={() => onDelete(insp)}
                      title="Delete inspection"
                      aria-label={`Delete ${insp.inspection_number}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
