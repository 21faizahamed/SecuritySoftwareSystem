import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  MapPin,
  User,
  Phone,
  Calendar,
  Edit3,
  Trash2,
  Plus,
  ClipboardCheck,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { InspectionTable } from '../../components/tables/InspectionTable';
import { EstablishmentFormModal } from '../../components/forms/EstablishmentFormModal';
import { InspectionFormModal } from '../../components/forms/InspectionFormModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useNotification } from '../../components/common/Notification';
import { establishmentApi } from '../../services/establishmentApi';
import { inspectionApi } from '../../services/inspectionApi';
import { formatDate } from '../../utils/formatters';
import type {
  Establishment,
  Inspection,
  EstablishmentUpdate,
  InspectionCreate,
  InspectionUpdate,
} from '../../types';

export const EstablishmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInspModalOpen, setIsInspModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [inspToDelete, setInspToDelete] = useState<Inspection | null>(null);

  const estId = Number(id);

  const fetchDetails = useCallback(async () => {
    if (!estId) return;
    setIsLoading(true);
    try {
      const [estRes, inspsRes] = await Promise.all([
        establishmentApi.getById(estId),
        inspectionApi.getPaginated({ establishment_id: estId, limit: 50 }),
      ]);
      setEstablishment(estRes);
      setInspections(inspsRes.items);
    } catch (err: any) {
      showError(err.message || 'Failed to retrieve establishment details from backend.');
    } finally {
      setIsLoading(false);
    }
  }, [estId, showError]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleUpdateEstablishment = async (data: any) => {
    if (!estId) return;
    setIsSubmitting(true);
    try {
      const updated = await establishmentApi.update(estId, data as EstablishmentUpdate);
      setEstablishment(updated);
      showSuccess('Establishment details updated successfully.');
      setIsEditModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'Failed to update establishment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEstablishment = async () => {
    if (!estId) return;
    setIsSubmitting(true);
    try {
      await establishmentApi.delete(estId);
      showSuccess(`Establishment #${estId} was deleted.`);
      navigate('/establishments');
    } catch (err: any) {
      showError(err.message || 'Failed to delete establishment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInspection = async (data: InspectionCreate | InspectionUpdate) => {
    setIsSubmitting(true);
    try {
      const created = await inspectionApi.create({
        ...(data as InspectionCreate),
        establishment_id: estId,
      });
      showSuccess(`Inspection #${created.inspection_number} scheduled.`);
      setIsInspModalOpen(false);
      fetchDetails();
    } catch (err: any) {
      showError(err.message || 'Failed to schedule inspection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInspection = async () => {
    if (!inspToDelete) return;
    setIsSubmitting(true);
    try {
      await inspectionApi.delete(inspToDelete.id);
      showSuccess(`Inspection #${inspToDelete.inspection_number} deleted.`);
      setInspToDelete(null);
      fetchDetails();
    } catch (err: any) {
      showError(err.message || 'Failed to delete inspection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading facility profile and inspection history..." fullHeight />;
  }

  if (!establishment) {
    return (
      <div className="page-container">
        <EmptyState
          title="Establishment Not Found"
          description={`Facility with ID #${id} does not exist or was deleted.`}
          actionText="Back to Establishments"
          onAction={() => navigate('/establishments')}
        />
      </div>
    );
  }

  const completedCount = inspections.filter((i) => i.status === 'COMPLETED').length;
  const inProgressCount = inspections.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'PENDING').length;

  return (
    <div className="page-container">
      {/* Back button & Title header */}
      <div className="detail-top-nav">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/establishments')}
        >
          Back to Establishments
        </Button>
      </div>

      <div className="page-header-row">
        <div className="flex items-center gap-3">
          <div className="detail-avatar">
            <Building2 size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-heading">{establishment.name}</h1>
              <span className="type-pill">{establishment.establishment_type}</span>
            </div>
            <p className="page-subheading font-mono text-muted">
              Facility Identifier: #{establishment.id}
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            leftIcon={<Edit3 size={16} />}
            onClick={() => setIsEditModalOpen(true)}
          >
            Edit Profile
          </Button>
          <Button
            variant="danger"
            leftIcon={<Trash2 size={16} />}
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Metrics Row for this establishment */}
      <div className="stats-grid-3">
        <div className="stat-card">
          <span className="stat-label">Total Inspection Cycles</span>
          <div className="stat-value">{inspections.length}</div>
          <span className="stat-meta">Lifetime recorded audits</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active / In-Progress Audits</span>
          <div className="stat-value text-amber">{inProgressCount}</div>
          <span className="stat-meta">Under review or pending</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed Inspections</span>
          <div className="stat-value text-green">{completedCount}</div>
          <span className="stat-meta">Finalized compliance cycles</span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="dashboard-grid-2">
        {/* Facility Information Card */}
        <Card title="Facility Details" subtitle="Registered physical and contact metadata">
          <div className="detail-info-list">
            <div className="detail-info-item">
              <div className="info-icon">
                <MapPin size={18} />
              </div>
              <div>
                <span className="info-label">Address / Location</span>
                <p className="info-value">{establishment.address}</p>
              </div>
            </div>

            <div className="detail-info-item">
              <div className="info-icon">
                <User size={18} />
              </div>
              <div>
                <span className="info-label">Owner / Authorized Representative</span>
                <p className="info-value">{establishment.owner_name || 'Not provided'}</p>
              </div>
            </div>

            <div className="detail-info-item">
              <div className="info-icon">
                <Phone size={18} />
              </div>
              <div>
                <span className="info-label">Contact Information</span>
                <p className="info-value">{establishment.contact_information || 'Not provided'}</p>
              </div>
            </div>

            <div className="detail-info-item">
              <div className="info-icon">
                <Calendar size={18} />
              </div>
              <div>
                <span className="info-label">Registration Timestamps</span>
                <p className="info-value text-sm">
                  Created: {formatDate(establishment.created_at)} • Last Updated:{' '}
                  {formatDate(establishment.updated_at)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Summary / Status Card */}
        <Card
          title="Compliance & SIRA Status"
          subtitle="Inspection audit status overview"
        >
          <div className="compliance-summary-box">
            <div className="compliance-icon-ring">
              <ClipboardCheck size={32} className="text-primary" />
            </div>
            <h4>Active SIRA Audit Status</h4>
            <p className="text-secondary text-sm text-center">
              {inspections.length > 0
                ? `This facility has ${inspections.length} recorded audit cycle(s). Latest audit status: ${inspections[0].status}.`
                : 'No inspection records yet. Use the button below to launch the Phase 1 Scope & Affection Plan verification.'}
            </p>
            <div className="flex gap-4 mt-2 font-mono text-xs text-muted">
              <span>Completed: <strong className="text-main">{completedCount}</strong></span>
              <span>•</span>
              <span>In Progress: <strong className="text-main">{inProgressCount}</strong></span>
            </div>
          </div>
        </Card>
      </div>

      {/* Related Inspections Section */}
      <Card
        title={`Inspections for ${establishment.name}`}
        subtitle="All security audit cycles linked to this facility"
        action={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setIsInspModalOpen(true)}
          >
            + Schedule Inspection
          </Button>
        }
      >
        {inspections.length === 0 ? (
          <EmptyState
            title="No Inspections Scheduled"
            description="There are currently no inspection records linked to this establishment. Click '+ Schedule Inspection' above to begin Phase 1."
            icon={<ClipboardCheck size={40} />}
          />
        ) : (
          <InspectionTable
            inspections={inspections}
            onView={(inspId) => navigate(`/inspections/${inspId}`)}
            onEdit={() => navigate('/inspections')}
            onDelete={(insp) => setInspToDelete(insp)}
          />
        )}
      </Card>

      {/* Edit Establishment Modal */}
      <EstablishmentFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateEstablishment}
        initialData={establishment}
        isLoading={isSubmitting}
      />

      {/* Create Inspection Modal with this Establishment preselected */}
      <InspectionFormModal
        isOpen={isInspModalOpen}
        onClose={() => setIsInspModalOpen(false)}
        onSubmit={handleCreateInspection}
        defaultEstablishmentId={establishment.id}
        isLoading={isSubmitting}
      />

      {/* Delete Establishment Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteEstablishment}
        title="Delete Establishment?"
        message={`Are you sure you want to delete "${establishment.name}"? This will permanently remove the facility and all linked inspections and documents from the database.`}
        confirmText="Yes, Delete Facility"
        isLoading={isSubmitting}
      />

      {/* Delete Inspection Dialog */}
      <ConfirmDialog
        isOpen={Boolean(inspToDelete)}
        onClose={() => setInspToDelete(null)}
        onConfirm={handleDeleteInspection}
        title="Delete Inspection?"
        message={`Are you sure you want to delete inspection #${inspToDelete?.inspection_number}?`}
        isLoading={isSubmitting}
      />
    </div>
  );
};
