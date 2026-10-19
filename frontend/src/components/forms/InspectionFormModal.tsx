import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { establishmentApi } from '../../services/establishmentApi';
import type {
  Inspection,
  InspectionCreate,
  InspectionUpdate,
  Establishment,
} from '../../types';

interface InspectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InspectionCreate | InspectionUpdate) => Promise<void>;
  initialData?: Inspection | null;
  defaultEstablishmentId?: number;
  isLoading?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending / Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress (Field Audit)' },
  { value: 'COMPLETED', label: 'Completed' },
];

export const InspectionFormModal: React.FC<InspectionFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultEstablishmentId,
  isLoading = false,
}) => {
  const isEditing = Boolean(initialData);

  const [establishmentId, setEstablishmentId] = useState<number | ''>('');
  const [status, setStatus] = useState('PENDING');
  const [inspectionDate, setInspectionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [establishmentsList, setEstablishmentsList] = useState<Establishment[]>([]);
  const [loadingEsts, setLoadingEsts] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setLoadingEsts(true);
      establishmentApi
        .getPaginated({ page: 1, limit: 100 })
        .then((res) => setEstablishmentsList(res.items))
        .catch(() => setEstablishmentsList([]))
        .finally(() => setLoadingEsts(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setEstablishmentId(initialData.establishment_id);
      setStatus(initialData.status);
      setInspectionDate(
        initialData.inspection_date
          ? new Date(initialData.inspection_date).toISOString().slice(0, 16)
          : ''
      );
      setNotes(initialData.notes || '');
    } else {
      setEstablishmentId(defaultEstablishmentId || '');
      setStatus('PENDING');
      setInspectionDate(new Date().toISOString().slice(0, 16));
      setNotes('');
    }
    setErrors({});
  }, [initialData, defaultEstablishmentId, isOpen]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!isEditing && (!establishmentId || Number(establishmentId) <= 0)) {
      errs.establishmentId = 'Please select an establishment.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isEditing) {
      await onSubmit({
        status,
        inspection_date: inspectionDate ? new Date(inspectionDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
      } as InspectionUpdate);
    } else {
      await onSubmit({
        establishment_id: Number(establishmentId),
        status,
        inspection_date: inspectionDate ? new Date(inspectionDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
      } as InspectionCreate);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Update Inspection' : 'Schedule New Inspection'}
      subtitle={
        isEditing
          ? `Editing Inspection #${initialData?.inspection_number}`
          : 'Inspection identifier will be automatically assigned by the backend authority'
      }
      maxWidth="md"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="outline" onClick={onClose} disabled={isLoading} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading} type="button">
            {isEditing ? 'Save Changes' : 'Create Inspection'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="form-stack">
        {/* Establishment Selection (Only when creating) */}
        {!isEditing ? (
          <div className="form-group">
            <label htmlFor="insp-est" className="form-label required">
              Target Establishment
            </label>
            <select
              id="insp-est"
              className={`form-select ${errors.establishmentId ? 'input-error' : ''}`}
              value={establishmentId}
              onChange={(e) => setEstablishmentId(Number(e.target.value) || '')}
              disabled={isLoading || loadingEsts || Boolean(defaultEstablishmentId)}
            >
              <option value="">
                {loadingEsts ? 'Loading establishments...' : '— Select Establishment —'}
              </option>
              {establishmentsList.map((est) => (
                <option key={est.id} value={est.id}>
                  #{est.id} • {est.name} ({est.establishment_type})
                </option>
              ))}
            </select>
            {errors.establishmentId && (
              <span className="form-error-text">{errors.establishmentId}</span>
            )}
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Inspection Number</label>
            <input
              type="text"
              className="form-input font-mono bg-surface-subtle"
              value={initialData?.inspection_number}
              disabled
            />
          </div>
        )}

        {/* Status & Date Grid */}
        <div className="form-grid-2">
          <div className="form-group">
            <label htmlFor="insp-status" className="form-label required">
              Workflow Status
            </label>
            <select
              id="insp-status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isLoading}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="insp-date" className="form-label">
              Scheduled / Inspection Date
            </label>
            <input
              id="insp-date"
              type="datetime-local"
              className="form-input"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="insp-notes" className="form-label">
            Auditor Notes & Observations
          </label>
          <textarea
            id="insp-notes"
            rows={3}
            className="form-textarea"
            placeholder="e.g. فحص دوري لأنظمة السلامة ومكافحة الحريق والإنذار المبكر"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </form>
    </Modal>
  );
};
