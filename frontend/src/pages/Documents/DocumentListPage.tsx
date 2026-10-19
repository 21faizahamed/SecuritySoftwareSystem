import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Plus, RefreshCw, Info } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { DocumentTable } from '../../components/tables/DocumentTable';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useNotification } from '../../components/common/Notification';
import { documentApi } from '../../services/documentApi';
import { inspectionApi } from '../../services/inspectionApi';
import type { DocumentItem, DocumentCreate, Inspection } from '../../types';

export const DocumentListPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);

  // Form state
  const [inspectionId, setInspectionId] = useState<number | ''>('');
  const [filename, setFilename] = useState('');
  const [fileType, setFileType] = useState('application/pdf');
  const [fileSize, setFileSize] = useState('1048576');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchAllDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch inspections first to aggregate linked documents
      const inspsRes = await inspectionApi.getPaginated({ page: 1, limit: 100 });
      setInspections(inspsRes.items);

      // 2. Fetch documents across inspections
      const docPromises = inspsRes.items.map((i) =>
        documentApi.getByInspection(i.id).catch(() => [])
      );
      const results = await Promise.all(docPromises);
      const aggregated = results.flat();
      setDocuments(aggregated);
    } catch (err: any) {
      showError(err.message || 'Unable to retrieve documents from backend.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchAllDocuments();
  }, [fetchAllDocuments]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!inspectionId || Number(inspectionId) <= 0) {
      errs.inspectionId = 'Please select a parent inspection.';
    }
    if (!filename.trim()) {
      errs.filename = 'Document original filename is required.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const cleanName = filename.trim();
      const storedName = `doc_${inspectionId}_${Date.now()}_${cleanName}`;
      const payload: DocumentCreate = {
        inspection_id: Number(inspectionId),
        original_filename: cleanName,
        stored_filename: storedName,
        file_path: `uploads/original/${storedName}`,
        file_type: fileType,
        file_size: Number(fileSize) || 1048576,
        upload_status: 'UPLOADED',
      };

      await documentApi.createMetadata(payload);
      showSuccess(`Document metadata "${cleanName}" saved.`);
      setIsModalOpen(false);
      setFilename('');
      setInspectionId('');
      fetchAllDocuments();
    } catch (err: any) {
      showError(err.message || 'Failed to save document metadata.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    setIsSubmitting(true);
    try {
      await documentApi.delete(docToDelete.id);
      showSuccess(`Document record "${docToDelete.original_filename}" deleted.`);
      setDocToDelete(null);
      fetchAllDocuments();
    } catch (err: any) {
      showError(err.message || 'Failed to delete document record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Document Records & Evidence</h1>
          <p className="page-subheading">
            Uploaded compliance certificates, diagrams, and inspection photographic evidence
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={16} />}
            onClick={() => fetchAllDocuments()}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsModalOpen(true)}
          >
            + Register Document Record
          </Button>
        </div>
      </div>

      {/* Info notice banner */}
      <div className="notice-banner">
        <div className="notice-icon">
          <Info size={20} />
        </div>
        <div className="notice-content">
          <span className="notice-title">Document Architecture Foundation</span>
          <p className="notice-text">
            The document metadata database repository is active and connected to MySQL. The automated
            file ingestion, OCR pipeline, and AI computer vision processing will be integrated in
            subsequent system phases.
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <Card
        title="All Registered Documents"
        subtitle={`Total of ${documents.length} document metadata record(s) across all active inspections`}
      >
        {isLoading ? (
          <LoadingSpinner message="Querying document metadata records from MySQL..." />
        ) : documents.length === 0 ? (
          <EmptyState
            title="No Documents Registered"
            description="Register a document or evidence record linked to an existing inspection to view it here."
            actionText="+ Register Document Record"
            onAction={() => setIsModalOpen(true)}
            icon={<FileText size={44} />}
          />
        ) : (
          <DocumentTable
            documents={documents}
            onDelete={(doc) => setDocToDelete(doc)}
            showInspectionCol={true}
          />
        )}
      </Card>

      {/* Register Document Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Document Metadata"
        subtitle="Link document evidence to an active inspection record"
        maxWidth="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateDocument}
              isLoading={isSubmitting}
              type="button"
            >
              Save Record
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateDocument} className="form-stack">
          <div className="form-group">
            <label htmlFor="doc-insp-select" className="form-label required">
              Parent Inspection Record
            </label>
            <select
              id="doc-insp-select"
              className={`form-select ${formErrors.inspectionId ? 'input-error' : ''}`}
              value={inspectionId}
              onChange={(e) => setInspectionId(Number(e.target.value) || '')}
              disabled={isSubmitting}
            >
              <option value="">— Select Target Inspection —</option>
              {inspections.map((i) => (
                <option key={i.id} value={i.id}>
                  #{i.id} • {i.inspection_number} ({i.status})
                </option>
              ))}
            </select>
            {formErrors.inspectionId && (
              <span className="form-error-text">{formErrors.inspectionId}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="doc-name" className="form-label required">
              Document Original Filename
            </label>
            <input
              id="doc-name"
              type="text"
              className={`form-input ${formErrors.filename ? 'input-error' : ''}`}
              placeholder="e.g. شهادة_السلامة_المعتمدة_2026.pdf or fire_pump_schematic.png"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              disabled={isSubmitting}
            />
            {formErrors.filename && (
              <span className="form-error-text">{formErrors.filename}</span>
            )}
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="doc-mime" className="form-label">
                MIME / File Type
              </label>
              <select
                id="doc-mime"
                className="form-select"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="application/pdf">PDF Document (.pdf)</option>
                <option value="image/jpeg">JPEG Image (.jpg/.jpeg)</option>
                <option value="image/png">PNG Image (.png)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="doc-bytes" className="form-label">
                File Size (Bytes)
              </label>
              <input
                id="doc-bytes"
                type="number"
                className="form-input"
                value={fileSize}
                onChange={(e) => setFileSize(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleDeleteDocument}
        title="Delete Document Metadata?"
        message={`Are you sure you want to delete "${docToDelete?.original_filename}"?`}
        confirmText="Yes, Delete Document"
        isLoading={isSubmitting}
      />
    </div>
  );
};
