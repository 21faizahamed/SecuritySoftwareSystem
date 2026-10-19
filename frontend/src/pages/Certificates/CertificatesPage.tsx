import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Search,
  Download,
  QrCode,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../components/common/Notification';
import { certificateApi } from '../../services/certificateApi';
import { formatDate } from '../../utils/formatters';
import type { Certificate, CertificateQueryParams } from '../../types';

export const CertificatesPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Cert for QR Modal
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const fetchCertificates = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: CertificateQueryParams = {
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        page: 1,
        page_size: 50,
      };
      const res = await certificateApi.getCertificates(params);
      setCertificates(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch certificate registry.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, showError]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleDownloadPDF = async (certNumber: string) => {
    try {
      const blob = await certificateApi.downloadCertificatePDF(certNumber);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${certNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess(`Certificate #${certNumber} downloaded.`);
    } catch (err: any) {
      showError('Failed to download certificate.');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div className="flex items-center gap-3">
          <div className="detail-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Award size={28} />
          </div>
          <div>
            <h1 className="page-heading">Security Compliance Certificates</h1>
            <p className="page-subheading">
              Official Registry of Approved Safety & Security Certificates
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <div className="filter-grid-2">
          <div className="form-group mb-0">
            <label className="form-label">Search Certificate # or Establishment</label>
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search certificate number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Certificate Status</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active & Valid</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table Card */}
      <Card title={`Issued Certificates Registry (${totalCount})`}>
        {isLoading ? (
          <LoadingSpinner message="Querying certificate registry..." />
        ) : certificates.length === 0 ? (
          <EmptyState
            title="No Certificates Found"
            description="Certificates are generated when inspections are reviewed and approved."
            icon={<Award size={36} />}
          />
        ) : (
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Certificate Number</th>
                  <th>Facility Profile</th>
                  <th>Inspection Reference</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id}>
                    <td>
                      <strong className="font-mono text-primary text-base">{cert.certificate_number}</strong>
                    </td>
                    <td>
                      <div className="font-semibold text-main">
                        {cert.establishment?.name || `Establishment #${cert.establishment_id}`}
                      </div>
                      <span className="text-xs text-muted">
                        {cert.establishment?.establishment_type || 'Facility'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/inspections/${cert.inspection_id}`} className="info-link font-mono">
                        Inspection #{cert.inspection_id}
                      </Link>
                    </td>
                    <td>{formatDate(cert.issue_date)}</td>
                    <td>{formatDate(cert.expiry_date)}</td>
                    <td>
                      <Badge
                        variant={cert.status === 'ACTIVE' ? 'success' : cert.status === 'EXPIRED' ? 'warning' : 'danger'}
                        size="sm"
                      >
                        {cert.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<QrCode size={12} />}
                          onClick={() => setSelectedCert(cert)}
                          title="View QR Code & Public Link"
                        >
                          QR / Verify
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Download size={12} />}
                          onClick={() => handleDownloadPDF(cert.certificate_number)}
                          title="Download PDF Certificate"
                        >
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* QR CODE & VERIFY MODAL */}
      {selectedCert && (
        <Modal
          isOpen={!!selectedCert}
          onClose={() => setSelectedCert(null)}
          title={`Certificate #${selectedCert.certificate_number}`}
          subtitle="Cryptographic Verification & Public Status"
          maxWidth="sm"
          footer={
            <div className="flex justify-between items-center w-full">
              <Link
                to={`/verify/${selectedCert.certificate_number}`}
                target="_blank"
                className="btn btn-outline btn-sm flex items-center gap-1"
              >
                <ExternalLink size={14} /> Open Public Page
              </Link>
              <Button variant="primary" size="sm" onClick={() => handleDownloadPDF(selectedCert.certificate_number)}>
                Download PDF
              </Button>
            </div>
          }
        >
          <div className="qr-modal-content text-center py-4">
            <div className="qr-box mx-auto mb-3">
              {selectedCert.qr_code_data ? (
                <img
                  src={`data:image/png;base64,${selectedCert.qr_code_data}`}
                  alt="Certificate QR Code"
                  className="mx-auto w-48 h-48 border rounded p-2"
                />
              ) : (
                <div className="w-48 h-48 border rounded flex items-center justify-center mx-auto text-muted">
                  <QrCode size={48} />
                </div>
              )}
            </div>
            <p className="text-sm font-semibold text-main mb-1">
              {selectedCert.establishment?.name || `Establishment #${selectedCert.establishment_id}`}
            </p>
            <p className="text-xs text-muted font-mono">Status: {selectedCert.status} • Valid until {formatDate(selectedCert.expiry_date)}</p>
          </div>
        </Modal>
      )}
    </div>
  );
};
