import React from 'react';
import { Eye, Edit3, Trash2 } from 'lucide-react';
import type { Establishment } from '../../types';
import { formatDateOnly, truncateText } from '../../utils/formatters';

interface EstablishmentTableProps {
  establishments: Establishment[];
  onView: (id: number) => void;
  onEdit: (establishment: Establishment) => void;
  onDelete: (establishment: Establishment) => void;
}

export const EstablishmentTable: React.FC<EstablishmentTableProps> = ({
  establishments,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="table-responsive">
      <table className="enterprise-table">
        <thead>
          <tr>
            <th scope="col" style={{ width: '80px' }}>ID</th>
            <th scope="col">Establishment Name</th>
            <th scope="col">Facility Type</th>
            <th scope="col">Address</th>
            <th scope="col">Owner / Contact</th>
            <th scope="col" style={{ width: '130px' }}>Created</th>
            <th scope="col" style={{ width: '140px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {establishments.map((est) => (
            <tr key={est.id} className="table-row-hover">
              <td className="font-mono text-muted">#{est.id}</td>
              <td>
                <button
                  type="button"
                  className="table-link-btn"
                  onClick={() => onView(est.id)}
                  title="View details"
                >
                  {est.name}
                </button>
              </td>
              <td>
                <span className="type-pill">{est.establishment_type}</span>
              </td>
              <td className="text-secondary" title={est.address}>
                {truncateText(est.address, 45)}
              </td>
              <td>
                <div className="owner-cell">
                  <span className="owner-name">{est.owner_name || '—'}</span>
                  {est.contact_information && (
                    <span className="owner-contact">{est.contact_information}</span>
                  )}
                </div>
              </td>
              <td className="text-muted text-sm">{formatDateOnly(est.created_at)}</td>
              <td>
                <div className="table-actions-cell">
                  <button
                    type="button"
                    className="action-icon-btn view"
                    onClick={() => onView(est.id)}
                    title="View details"
                    aria-label={`View ${est.name}`}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    className="action-icon-btn edit"
                    onClick={() => onEdit(est)}
                    title="Edit establishment"
                    aria-label={`Edit ${est.name}`}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    type="button"
                    className="action-icon-btn delete"
                    onClick={() => onDelete(est)}
                    title="Delete establishment"
                    aria-label={`Delete ${est.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
