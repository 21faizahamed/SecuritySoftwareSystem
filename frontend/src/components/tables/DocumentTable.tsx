import React from 'react';
import { FileText, Trash2, HardDrive } from 'lucide-react';
import type { DocumentItem } from '../../types';
import { formatDateOnly, formatBytes } from '../../utils/formatters';
import { Badge } from '../common/Badge';

interface DocumentTableProps {
  documents: DocumentItem[];
  onDelete?: (document: DocumentItem) => void;
  showInspectionCol?: boolean;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onDelete,
  showInspectionCol = true,
}) => {
  return (
    <div className="table-responsive">
      <table className="enterprise-table">
        <thead>
          <tr>
            <th scope="col" style={{ width: '60px' }}>ID</th>
            <th scope="col">File Name</th>
            {showInspectionCol && <th scope="col" style={{ width: '130px' }}>Inspection ID</th>}
            <th scope="col" style={{ width: '120px' }}>Type</th>
            <th scope="col" style={{ width: '110px' }}>Size</th>
            <th scope="col" style={{ width: '130px' }}>Upload Status</th>
            <th scope="col" style={{ width: '130px' }}>Uploaded</th>
            {onDelete && <th scope="col" style={{ width: '90px', textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="table-row-hover">
              <td className="font-mono text-muted">#{doc.id}</td>
              <td>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary flex-shrink-0" />
                  <span className="font-medium text-main" title={doc.stored_filename}>
                    {doc.original_filename}
                  </span>
                </div>
              </td>
              {showInspectionCol && (
                <td className="font-mono text-secondary">#{doc.inspection_id}</td>
              )}
              <td>
                <span className="file-type-badge">{doc.file_type}</span>
              </td>
              <td className="text-secondary text-sm">
                <span className="flex items-center gap-1">
                  <HardDrive size={12} className="text-muted" />
                  {formatBytes(doc.file_size)}
                </span>
              </td>
              <td>
                <Badge variant={doc.upload_status === 'UPLOADED' ? 'success' : 'info'}>
                  {doc.upload_status}
                </Badge>
              </td>
              <td className="text-muted text-sm">{formatDateOnly(doc.created_at)}</td>
              {onDelete && (
                <td>
                  <div className="table-actions-cell">
                    <button
                      type="button"
                      className="action-icon-btn delete"
                      onClick={() => onDelete(doc)}
                      title="Delete document metadata"
                      aria-label={`Delete ${doc.original_filename}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
