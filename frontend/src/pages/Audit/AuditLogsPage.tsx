import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  Download,
  Clock,
  FileCode,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../components/common/Notification';
import { auditApi } from '../../services/auditApi';
import { formatDateTime } from '../../utils/formatters';
import type { AuditLog, AuditLogQueryParams } from '../../types';

export const AuditLogsPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchAction, setSearchAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  // Selected Log for details modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: AuditLogQueryParams = {
        action: searchAction || undefined,
        entity_type: entityType || undefined,
        user_id: userIdFilter ? Number(userIdFilter) : undefined,
        page: 1,
        page_size: 50,
      };
      const res = await auditApi.getAuditLogs(params);
      setLogs(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch audit log trail.');
    } finally {
      setIsLoading(false);
    }
  }, [searchAction, entityType, userIdFilter, showError]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCsv = async () => {
    try {
      const blob = await auditApi.exportCsv({
        action: searchAction || undefined,
        entity_type: entityType || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Audit_Trail_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('Audit trail CSV exported.');
    } catch (err: any) {
      showError('Failed to export audit logs.');
    }
  };

  const getActionVariant = (action: string) => {
    if (action.includes('APPROVE') || action.includes('CERTIFICATE')) return 'success';
    if (action.includes('REJECT') || action.includes('DELETE')) return 'danger';
    if (action.includes('SUBMIT') || action.includes('OVERRIDE')) return 'warning';
    return 'neutral';
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div className="flex items-center gap-3">
          <div className="detail-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="page-heading">System Audit Trail</h1>
            <p className="page-subheading">
              Tamper-Evident Governance Log for All Inspection, AI, and Certification Events
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            leftIcon={<Download size={16} />}
            onClick={handleExportCsv}
          >
            Export Audit Trail (CSV)
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <div className="filter-grid-3">
          <div className="form-group mb-0">
            <label className="form-label">Filter by Action</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. INSPECTION_APPROVE, AI_ANALYZE..."
              value={searchAction}
              onChange={(e) => setSearchAction(e.target.value)}
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Entity Type</label>
            <select
              className="form-select"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              <option value="">All Entities</option>
              <option value="INSPECTION">INSPECTION</option>
              <option value="DOCUMENT">DOCUMENT</option>
              <option value="DETECTION">DETECTION</option>
              <option value="REQUIREMENT">REQUIREMENT</option>
              <option value="COMPLIANCE">COMPLIANCE</option>
              <option value="CERTIFICATE">CERTIFICATE</option>
              <option value="USER">USER</option>
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">User ID</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g. 1"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card title={`Audit Trail Events (${totalCount})`}>
        {isLoading ? (
          <LoadingSpinner message="Querying audit trail records..." />
        ) : logs.length === 0 ? (
          <EmptyState
            title="No Audit Records Found"
            description="Adjust your search criteria to view events."
            icon={<Clock size={36} />}
          />
        ) : (
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Actor / User</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="text-xs font-mono text-secondary">
                        {formatDateTime(log.created_at)}
                      </span>
                    </td>
                    <td>
                      <Badge variant={getActionVariant(log.action)} size="sm">
                        {log.action}
                      </Badge>
                    </td>
                    <td>
                      <span className="text-xs font-mono font-semibold text-main">
                        {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-medium text-main">
                        {log.user ? log.user.full_name : `User #${log.user_id || 'System'}`}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-mono text-muted">{log.ip_address || '127.0.0.1'}</span>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<FileCode size={12} />}
                        onClick={() => setSelectedLog(log)}
                      >
                        Inspect Payload
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* INSPECT LOG PAYLOAD MODAL */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Log #${selectedLog.id} — ${selectedLog.action}`}
          subtitle={`Recorded at ${formatDateTime(selectedLog.created_at)}`}
          maxWidth="md"
          footer={
            <Button variant="primary" size="sm" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-muted font-mono pb-2 border-b">
              <span>Entity: {selectedLog.entity_type} #{selectedLog.entity_id}</span>
              <span>IP: {selectedLog.ip_address || '127.0.0.1'}</span>
            </div>

            {selectedLog.old_values && (
              <div>
                <label className="text-xs font-bold text-danger block mb-1">Previous State (Before Change):</label>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.old_values, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_values && (
              <div>
                <label className="text-xs font-bold text-success block mb-1">New State (After Change):</label>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.new_values, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
