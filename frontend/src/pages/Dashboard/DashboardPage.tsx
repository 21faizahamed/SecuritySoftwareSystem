import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Award,
  BookOpen,
  Activity,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { EstablishmentTable } from '../../components/tables/EstablishmentTable';
import { InspectionTable } from '../../components/tables/InspectionTable';
import { EstablishmentFormModal } from '../../components/forms/EstablishmentFormModal';
import { InspectionFormModal } from '../../components/forms/InspectionFormModal';
import { useNotification } from '../../components/common/Notification';
import { dashboardApi } from '../../services/dashboardApi';
import { establishmentApi } from '../../services/establishmentApi';
import { inspectionApi } from '../../services/inspectionApi';
import type {
  DashboardSummary,
  Establishment,
  Inspection,
  EstablishmentCreate,
  InspectionCreate,
} from '../../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Summary from backend
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  // Recent tables
  const [recentEstablishments, setRecentEstablishments] = useState<Establishment[]>([]);
  const [recentInspections, setRecentInspections] = useState<Inspection[]>([]);

  // Modals state
  const [isEstModalOpen, setIsEstModalOpen] = useState(false);
  const [isInspModalOpen, setIsInspModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [sumRes, estsRes, inspsRes] = await Promise.allSettled([
        dashboardApi.getDashboardSummary(),
        establishmentApi.getPaginated({ page: 1, limit: 5 }),
        inspectionApi.getPaginated({ page: 1, limit: 5 }),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (estsRes.status === 'fulfilled') setRecentEstablishments(estsRes.value.items);
      if (inspsRes.status === 'fulfilled') setRecentInspections(inspsRes.value.items);
    } catch (err: any) {
      showError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleCreateEstablishment = async (data: any) => {
    setIsSubmitting(true);
    try {
      const created = await establishmentApi.create(data as EstablishmentCreate);
      showSuccess(`Establishment "${created.name}" created successfully.`);
      setIsEstModalOpen(false);
      loadDashboardData(true);
    } catch (err: any) {
      showError(err.message || 'Failed to create establishment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInspection = async (data: any) => {
    setIsSubmitting(true);
    try {
      const created = await inspectionApi.create(data as InspectionCreate);
      showSuccess(`Inspection #${created.inspection_number} scheduled.`);
      setIsInspModalOpen(false);
      loadDashboardData(true);
    } catch (err: any) {
      showError(err.message || 'Failed to schedule inspection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Querying live compliance database & audit records..." fullHeight />;
  }

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Executive Compliance Dashboard</h1>
          <p className="page-subheading">
            Civil Defense Safety & Security Certification Monitoring Matrix
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
          >
            Refresh Data
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Building2 size={16} />}
            onClick={() => setIsEstModalOpen(true)}
          >
            + New Facility
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<ClipboardCheck size={16} />}
            onClick={() => setIsInspModalOpen(true)}
          >
            + New Inspection
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        {/* Total Establishments */}
        <div className="stat-card" onClick={() => navigate('/establishments')}>
          <div className="stat-icon-wrapper icon-blue">
            <Building2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Facilities</span>
            <div className="stat-value">{summary?.total_establishments || 0}</div>
            <span className="stat-helper">Registered establishments</span>
          </div>
        </div>

        {/* Active Inspections */}
        <div className="stat-card" onClick={() => navigate('/inspections')}>
          <div className="stat-icon-wrapper icon-amber">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Audits</span>
            <div className="stat-value">{summary?.active_inspections || 0}</div>
            <span className="stat-helper">
              {summary?.inspections_awaiting_review || 0} awaiting formal review
            </span>
          </div>
        </div>

        {/* Compliant / Completed Inspections */}
        <div className="stat-card" onClick={() => navigate('/inspections')}>
          <div className="stat-icon-wrapper icon-green">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Compliant Inspections</span>
            <div className="stat-value">{summary?.compliant_inspections || 0}</div>
            <span className="stat-helper">Pass rate: {summary?.compliance_rate || 0}%</span>
          </div>
        </div>

        {/* Certificates Issued */}
        <div className="stat-card" onClick={() => navigate('/certificates')}>
          <div className="stat-icon-wrapper icon-indigo">
            <Award size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Certificates Issued</span>
            <div className="stat-value">{summary?.certificates_issued || 0}</div>
            <span className="stat-helper">Active security certifications</span>
          </div>
        </div>
      </div>

      {/* Quick Access Action Cards */}
      <div className="quick-access-grid mb-6">
        <Link to="/requirements" className="quick-access-card">
          <div className="quick-icon-wrap" style={{ background: '#0284c7' }}>
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h4 className="font-bold text-main">Regulatory Standards Catalog</h4>
            <p className="text-xs text-secondary">
              Browse UAE Civil Defense safety codes (دليل الإمارات للسلامة والوقاية من الحريق)
            </p>
          </div>
        </Link>

        <Link to="/certificates" className="quick-access-card">
          <div className="quick-icon-wrap" style={{ background: '#059669' }}>
            <Award size={20} className="text-white" />
          </div>
          <div>
            <h4 className="font-bold text-main">Certificate Registry</h4>
            <p className="text-xs text-secondary">
              Manage issued certificates and cryptographic QR codes
            </p>
          </div>
        </Link>

        <Link to="/audit-logs" className="quick-access-card">
          <div className="quick-icon-wrap" style={{ background: '#6366f1' }}>
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h4 className="font-bold text-main">System Governance Audit</h4>
            <p className="text-xs text-secondary">
              Review full tamper-evident inspection and AI event logs
            </p>
          </div>
        </Link>
      </div>

      {/* Tables Grid */}
      <div className="dashboard-grid-2">
        {/* Recent Inspections */}
        <Card
          title="Recent Compliance Inspections"
          subtitle="Latest facility audit cycles"
          action={
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight size={14} />}
              onClick={() => navigate('/inspections')}
            >
              View All
            </Button>
          }
        >
          {recentInspections.length === 0 ? (
            <EmptyState
              title="No Inspections Scheduled"
              description="Create your first facility compliance audit."
              actionText="+ Schedule Inspection"
              onAction={() => setIsInspModalOpen(true)}
            />
          ) : (
            <InspectionTable
              inspections={recentInspections}
              onView={(inspId) => navigate(`/inspections/${inspId}`)}
              onEdit={(insp) => navigate(`/inspections/${insp.id}`)}
              onDelete={() => {}}
            />
          )}
        </Card>

        {/* Recent Establishments */}
        <Card
          title="Facility Registry"
          subtitle="Recently added establishments"
          action={
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight size={14} />}
              onClick={() => navigate('/establishments')}
            >
              View All
            </Button>
          }
        >
          {recentEstablishments.length === 0 ? (
            <EmptyState
              title="No Facilities Registered"
              description="Register an establishment to start inspections."
              actionText="+ Add Facility"
              onAction={() => setIsEstModalOpen(true)}
            />
          ) : (
            <EstablishmentTable
              establishments={recentEstablishments}
              onView={(estId) => navigate(`/establishments/${estId}`)}
              onEdit={(est) => navigate(`/establishments/${est.id}`)}
              onDelete={() => {}}
            />
          )}
        </Card>
      </div>

      {/* Modals */}
      <EstablishmentFormModal
        isOpen={isEstModalOpen}
        onClose={() => setIsEstModalOpen(false)}
        onSubmit={handleCreateEstablishment}
        isLoading={isSubmitting}
      />

      <InspectionFormModal
        isOpen={isInspModalOpen}
        onClose={() => setIsInspModalOpen(false)}
        onSubmit={handleCreateInspection}
        isLoading={isSubmitting}
      />
    </div>
  );
};
