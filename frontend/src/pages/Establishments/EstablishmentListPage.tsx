import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, RefreshCw } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { EstablishmentTable } from '../../components/tables/EstablishmentTable';
import { Pagination } from '../../components/tables/Pagination';
import { EstablishmentFormModal } from '../../components/forms/EstablishmentFormModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useNotification } from '../../components/common/Notification';
import { establishmentApi } from '../../services/establishmentApi';
import type { Establishment, EstablishmentCreate, EstablishmentUpdate } from '../../types';

export const EstablishmentListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEst, setEditingEst] = useState<Establishment | null>(null);
  const [estToDelete, setEstToDelete] = useState<Establishment | null>(null);

  const fetchEstablishments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await establishmentApi.getPaginated({
        page,
        limit,
        search: appliedSearch || undefined,
      });
      setEstablishments(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err: any) {
      showError(err.message || 'Unable to load establishments. Please verify backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, appliedSearch, showError]);

  useEffect(() => {
    fetchEstablishments();
  }, [fetchEstablishments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchQuery.trim());
  };

  const handleOpenCreate = () => {
    setEditingEst(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (est: Establishment) => {
    setEditingEst(est);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: EstablishmentCreate | EstablishmentUpdate) => {
    setIsSubmitting(true);
    try {
      if (editingEst) {
        await establishmentApi.update(editingEst.id, data as EstablishmentUpdate);
        showSuccess(`Establishment #${editingEst.id} updated successfully.`);
      } else {
        const created = await establishmentApi.create(data as EstablishmentCreate);
        showSuccess(`Establishment "${created.name}" registered successfully.`);
      }
      setIsModalOpen(false);
      setEditingEst(null);
      fetchEstablishments();
    } catch (err: any) {
      showError(err.message || 'Failed to save establishment record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!estToDelete) return;
    setIsSubmitting(true);
    try {
      await establishmentApi.delete(estToDelete.id);
      showSuccess(`Establishment "${estToDelete.name}" was removed.`);
      setEstToDelete(null);
      fetchEstablishments();
    } catch (err: any) {
      showError(err.message || 'Failed to delete establishment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Establishments Management</h1>
          <p className="page-subheading">
            Commercial, industrial, and government facilities registered for security compliance
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={16} />}
            onClick={() => fetchEstablishments()}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={handleOpenCreate}
          >
            + New Establishment
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
              placeholder="Search by facility name, address, owner, or facility type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" size="md">
            Search
          </Button>
          {appliedSearch && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setSearchQuery('');
                setAppliedSearch('');
                setPage(1);
              }}
            >
              Clear Filter
            </Button>
          )}
        </form>
      </Card>

      {/* Main Table Card */}
      <Card>
        {isLoading ? (
          <LoadingSpinner message="Loading establishments directory from MySQL..." />
        ) : establishments.length === 0 ? (
          <EmptyState
            title={appliedSearch ? 'No Matching Establishments' : 'No Establishments Registered'}
            description={
              appliedSearch
                ? `No facilities matched the query "${appliedSearch}". Try clearing your search.`
                : 'Get started by registering your first facility for compliance inspections.'
            }
            actionText={appliedSearch ? 'Clear Search' : '+ New Establishment'}
            onAction={appliedSearch ? () => { setSearchQuery(''); setAppliedSearch(''); } : handleOpenCreate}
            icon={<Building2 size={44} />}
          />
        ) : (
          <>
            <EstablishmentTable
              establishments={establishments}
              onView={(id) => navigate(`/establishments/${id}`)}
              onEdit={handleOpenEdit}
              onDelete={(est) => setEstToDelete(est)}
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
      <EstablishmentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEst(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingEst}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(estToDelete)}
        onClose={() => setEstToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Establishment?"
        message={`Are you sure you want to delete "${estToDelete?.name}" (ID #${estToDelete?.id})? This will permanently delete the facility and cascade to all attached inspections and documents.`}
        confirmText="Yes, Delete Facility"
        isLoading={isSubmitting}
      />
    </div>
  );
};
