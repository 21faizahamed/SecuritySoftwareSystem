import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react';
import { certificateApi } from '../../services/certificateApi';
import { formatDate, formatDateTime } from '../../utils/formatters';
import type { CertificateVerificationResponse } from '../../types';

export const PublicVerifyPage: React.FC = () => {
  const { certNumber } = useParams<{ certNumber?: string }>();
  const [searchCode, setSearchCode] = useState(certNumber || '');
  const [result, setResult] = useState<CertificateVerificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const performVerification = async (numberToVerify: string) => {
    if (!numberToVerify.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await certificateApi.verifyCertificate(numberToVerify.trim());
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification lookup failed or certificate is invalid.');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (certNumber) {
      setSearchCode(certNumber);
      performVerification(certNumber);
    }
  }, [certNumber]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(searchCode);
  };

  return (
    <div className="public-verify-viewport">
      {/* Top Banner */}
      <header className="public-verify-header">
        <div className="flex items-center gap-3">
          <div className="brand-logo-icon">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">
              Official Safety & Security Certification Portal
            </h1>
            <span className="text-xs text-blue-200">
              National Compliance & Civil Defense Verification Authority
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="public-verify-main">
        {/* Search Box */}
        <div className="verify-search-card">
          <h2 className="text-xl font-bold text-main mb-1">Verify Certificate Authenticity</h2>
          <p className="text-sm text-secondary mb-4">
            Enter the unique certificate identifier to confirm official validity and safety compliance.
          </p>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="search-input-wrapper flex-1">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="form-input search-input font-mono uppercase"
                placeholder="e.g. CERT-2026-0001"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify Certificate'}
            </button>
          </form>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="verify-error-card">
            <ShieldAlert size={36} className="text-danger mb-2" />
            <h3 className="text-lg font-bold text-danger">Invalid or Unrecognized Certificate</h3>
            <p className="text-sm text-secondary mt-1">{errorMsg}</p>
          </div>
        )}

        {/* Verification Result Display */}
        {result && (
          <div className="verify-result-card">
            {/* Status Header Badge */}
            <div className={`verify-status-banner ${result.is_valid ? 'banner-valid' : 'banner-invalid'}`}>
              <div className="flex items-center gap-3">
                {result.is_valid ? (
                  <CheckCircle2 size={36} className="text-success" />
                ) : (
                  <XCircle size={36} className="text-danger" />
                )}
                <div>
                  <h3 className="text-xl font-bold">
                    {result.is_valid ? 'CERTIFICATE IS VALID & ACTIVE' : 'CERTIFICATE EXPIRED OR INACTIVE'}
                  </h3>
                  <p className="text-xs opacity-90 font-mono">
                    Verification Query Timestamp: {formatDateTime(result.verified_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="verify-details-body">
              <div className="verify-row">
                <span className="verify-lbl">Certificate Number</span>
                <span className="verify-val font-mono font-bold text-primary text-lg">
                  {result.certificate_number}
                </span>
              </div>

              <div className="verify-row">
                <span className="verify-lbl">Certified Establishment</span>
                <span className="verify-val font-semibold text-main">
                  {result.establishment_name}
                </span>
              </div>

              <div className="verify-row">
                <span className="verify-lbl">Establishment Category</span>
                <span className="verify-val text-main">
                  {result.establishment_type}
                </span>
              </div>

              <div className="verify-row">
                <span className="verify-lbl">Official Status</span>
                <span className={`verify-badge status-${result.status.toLowerCase()}`}>
                  {result.status}
                </span>
              </div>

              <div className="verify-row">
                <span className="verify-lbl">Date of Issuance</span>
                <span className="verify-val font-medium">
                  {formatDate(result.issue_date)}
                </span>
              </div>

              <div className="verify-row">
                <span className="verify-lbl">Valid Through</span>
                <span className="verify-val font-medium">
                  {formatDate(result.expiry_date)}
                </span>
              </div>
            </div>

            {/* Official Digital Seal Footer */}
            <div className="verify-official-seal">
              <ShieldCheck size={28} className="text-primary" />
              <div>
                <p className="text-xs font-semibold text-main">
                  Digitally Verified & Authenticated by Civil Defense & Security Certification Authority
                </p>
                <p className="text-xs text-muted">
                  This public verification record confirms compliance with regulatory standard (دليل نظم وقائية).
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="public-verify-footer text-center py-4 text-xs text-muted">
        © 2026 Security Certificate & Compliance Inspection System • Official Regulatory Verification Node
      </footer>
    </div>
  );
};
