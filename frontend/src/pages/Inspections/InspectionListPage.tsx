import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Plus, Search, RefreshCw, Filter } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { InspectionTable } from '../../components/tables/InspectionTable';
import { Pagination } from '../../components/tables/Pagination';
import { InspectionFormModal } from '../../components/forms/InspectionFormModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useNotification } from '../../components/common/Notification';
import { inspectionApi } from '../../services/inspectionApi';
import type { Inspection, InspectionCreate, InspectionUpdate } from '../../types';

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

export const InspectionListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInsp, setEditingInsp] = useState<Inspection | null>(null);
  const [inspToDelete, setInspToDelete] = useState<Inspection | null>(null);

  const fetchInspections = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await inspectionApi.getPaginated({
        page,
        limit,
        status: statusFilter || undefined,
        search: appliedSearch || undefined,
      });
      setInspections(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err: any) {
      showError(err.message || 'Unable to load inspections. Please verify backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, appliedSearch, showError]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchQuery.trim());
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleOpenCreate = () => {
    setEditingInsp(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (insp: Inspection) => {
    setEditingInsp(insp);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: InspectionCreate | InspectionUpdate) => {
    setIsSubmitting(true);
    try {
      if (editingInsp) {
        await inspectionApi.update(editingInsp.id, data as InspectionUpdate);
        showSuccess(`Inspection #${editingInsp.inspection_number} updated.`);
      } else {
        const created = await inspectionApi.create(data as InspectionCreate);
        showSuccess(`Inspection #${created.inspection_number} scheduled successfully.`);
      }
      setIsModalOpen(false);
      setEditingInsp(null);
      fetchInspections();
    } catch (err: any) {
      showError(err.message || 'Failed to save inspection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!inspToDelete) return;
    setIsSubmitting(true);
    try {
      await inspectionApi.delete(inspToDelete.id);
      showSuccess(`Inspection #${inspToDelete.inspection_number} removed.`);
      setInspToDelete(null);
      fetchInspections();
    } catch (err: any) {
      showError(err.message || 'Failed to delete inspection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Inspections Management</h1>
          <p className="page-subheading">
            Track safety audits, field inspection cycles, notes, and compliance status
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={16} />}
            onClick={() => fetchInspections()}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={handleOpenCreate}
          >
            + Schedule Inspection
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="filter-card">
        <form onSubmit={handleSearchSubmit} className="search-filter-form">
          <div className="search-input-wrapper flex-grow">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by inspection number (e.g. SC-2026-000001) or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-select-wrapper">
            <Filter size={16} className="filter-icon" />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="secondary" size="md">
            Filter
          </Button>

          {(appliedSearch || statusFilter) && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setSearchQuery('');
                setAppliedSearch('');
                setStatusFilter('');
                setPage(1);
              }}
            >
              Reset
            </Button>
          )}
        </form>
      </Card>

      {/* Main Table Card */}
      <Card>
        {isLoading ? (
          <LoadingSpinner message="Loading inspections directory from MySQL..." />
        ) : inspections.length === 0 ? (
          <EmptyState
            title={
              appliedSearch || statusFilter
                ? 'No Matching Inspections'
                : 'No Inspections Scheduled'
            }
            description={
              appliedSearch || statusFilter
                ? 'No inspections matched your filter criteria. Try resetting the filters.'
                : 'Get started by scheduling your first safety and compliance audit cycle.'
            }
            actionText={
              appliedSearch || statusFilter ? 'Reset Filters' : '+ Schedule Inspection'
            }
            onAction={
              appliedSearch || statusFilter
                ? () => {
                    setSearchQuery('');
                    setAppliedSearch('');
                    setStatusFilter('');
                    setPage(1);
                  }
                : handleOpenCreate
            }
            icon={<ClipboardCheck size={44} />}
          />
        ) : (
          <>
            <InspectionTable
              inspections={inspections}
              onView={(id) => navigate(`/inspections/${id}`)}
              onEdit={handleOpenEdit}
              onDelete={(insp) => setInspToDelete(insp)}
            />
            <Pagination
              page={page}
              pages={pages}
              total={total}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              isLoading={isLoading}
            />
          </>
        )}
      </Card>

      {/* Create / Edit Form Modal */}
      <InspectionFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInsp(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingInsp}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(inspToDelete)}
        onClose={() => setInspToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Inspection?"
        message={`Are you sure you want to delete inspection #${inspToDelete?.inspection_number}? All attached document metadata will also be deleted.`}
        confirmText="Yes, Delete Inspection"
        isLoading={isSubmitting}
      />
    </div>
  );
};
