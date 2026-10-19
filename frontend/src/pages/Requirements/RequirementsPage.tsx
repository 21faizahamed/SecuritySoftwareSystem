import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../components/common/Notification';
import { requirementApi } from '../../services/requirementApi';
import type { Requirement, RequirementCreate, RequirementQueryParams } from '../../types';

export const RequirementsPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [establishmentTypeFilter, setEstablishmentTypeFilter] = useState('');

  // Modals & Expanded row
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedReqId, setExpandedReqId] = useState<number | null>(null);

  // New Requirement Form State
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('SURVEILLANCE');
  const [newDescription, setNewDescription] = useState('');
  const [newReqType, setNewReqType] = useState('MIN_QUANTITY');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newSeverity, setNewSeverity] = useState('HIGH');
  const [newMandatory] = useState(true);
  const [newSourceDoc, setNewSourceDoc] = useState('دليل نظم وقائية (2).pdf');
  const [newSourceSection] = useState('الباب الثالث');
  const [newOriginalText, setNewOriginalText] = useState('');

  const handleSeedDefaults = async () => {
    setIsSubmitting(true);
    try {
      const res = await requirementApi.seedDefaults();
      showSuccess(res.message || 'Default regulatory standards loaded successfully.');
      fetchRequirements();
    } catch (err: any) {
      showError(err.message || 'Failed to seed default standards.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchRequirements = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: RequirementQueryParams = {
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        severity: severityFilter || undefined,
        establishment_type: establishmentTypeFilter || undefined,
        page: 1,
        page_size: 50,
      };
      const res: any = await requirementApi.getRequirements(params);
      const items: Requirement[] = Array.isArray(res) ? res : (res?.items || []);
      setRequirements(items);
      setTotalCount(Array.isArray(res) ? res.length : (res?.total || items.length));
    } catch (err: any) {
      showError(err.message || 'Failed to fetch regulatory requirements.');
      setRequirements([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, categoryFilter, severityFilter, establishmentTypeFilter, showError]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newTitle.trim()) {
      showError('Code and Title are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: RequirementCreate = {
        requirement_code: newCode.trim(),
        title: newTitle.trim(),
        category: newCategory,
        description: newDescription.trim(),
        requirement_type: newReqType,
        min_quantity: newQuantity ? Number(newQuantity) : undefined,
        quantity_requirement: newQuantity ? Number(newQuantity) : undefined,
        severity: newSeverity,
        is_mandatory: newMandatory,
        source_document: newSourceDoc.trim(),
        source_section: newSourceSection.trim(),
        original_text: newOriginalText.trim(),
      };
      await requirementApi.createRequirement(payload);
      showSuccess(`Requirement "${payload.requirement_code}" registered.`);
      setIsCreateModalOpen(false);
      // Reset form
      setNewCode('');
      setNewTitle('');
      setNewDescription('');
      setNewOriginalText('');
      fetchRequirements();
    } catch (err: any) {
      showError(err.message || 'Failed to create requirement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedReqId(expandedReqId === id ? null : id);
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div className="flex items-center gap-3">
          <div className="detail-avatar" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
            <BookOpen size={28} />
          </div>
          <div>
            <h1 className="page-heading">UAE Civil Defense Regulatory Standards</h1>
            <p className="page-subheading">
              Official Safety & Security Regulatory Database (دليل الإمارات للسلامة والوقاية من الحريق)
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            leftIcon={<BookOpen size={16} />}
            onClick={handleSeedDefaults}
            isLoading={isSubmitting}
          >
            Load UAE Default Standards
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            + New Requirement Standard
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <div className="filter-grid-4">
          <div className="form-group mb-0">
            <label className="form-label">Search Standards / Arabic Text</label>
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search code, title, or Arabic keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="SURVEILLANCE">Surveillance & CCTV</option>
              <option value="EGRESS">Emergency Egress & Exits</option>
              <option value="FIRE_SAFETY">Fire Protection & Extinguishers</option>
              <option value="ACCESS_CONTROL">Access Control & Barriers</option>
              <option value="DOCUMENTATION">Documentation & Schematics</option>
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Severity Tier</label>
            <select
              className="form-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Establishment Type</label>
            <select
              className="form-select"
              value={establishmentTypeFilter}
              onChange={(e) => setEstablishmentTypeFilter(e.target.value)}
            >
              <option value="">All Types (General)</option>
              <option value="Commercial">Commercial / Retail</option>
              <option value="Industrial">Industrial / Warehouse</option>
              <option value="Residential">Residential</option>
              <option value="Healthcare">Healthcare / Hospital</option>
              <option value="Educational">Educational / School</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Requirements Table */}
      <Card
        title={`Regulatory Standards Catalog (${totalCount})`}
        subtitle="Auditable standards linked to UAE Civil Defense source provisions"
      >
        {isLoading ? (
          <LoadingSpinner message="Querying regulatory database..." />
        ) : requirements.length === 0 ? (
          <EmptyState
            title="No Requirements Match Filter"
            description="Adjust your search criteria or register a new standard."
            actionText="Clear Filters"
            onAction={() => {
              setSearchQuery('');
              setCategoryFilter('');
              setSeverityFilter('');
              setEstablishmentTypeFilter('');
            }}
          />
        ) : (
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Requirement Code</th>
                  <th>Title & Category</th>
                  <th>Type & Criteria</th>
                  <th>Severity</th>
                  <th>Mandatory</th>
                  <th>Source Document</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => {
                  const isExpanded = expandedReqId === req.id;
                  const sevVariant =
                    req.severity === 'CRITICAL'
                      ? 'danger'
                      : req.severity === 'HIGH'
                      ? 'warning'
                      : 'neutral';

                  return (
                    <React.Fragment key={req.id}>
                      <tr
                        className={`clickable-row ${isExpanded ? 'row-expanded' : ''}`}
                        onClick={() => toggleExpand(req.id)}
                      >
                        <td>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td>
                          <strong className="font-mono text-primary">{req.requirement_code}</strong>
                        </td>
                        <td>
                          <div className="font-semibold text-main">{req.title}</div>
                          <span className="text-xs text-muted">{req.category}</span>
                        </td>
                        <td>
                          <span className="text-xs font-mono">{req.requirement_type}</span>
                          {(req.quantity_requirement || req.min_quantity) && (
                            <span className="text-xs ml-1 font-semibold">
                              (Min: {req.quantity_requirement || req.min_quantity} {req.unit || 'units'})
                            </span>
                          )}
                        </td>
                        <td>
                          <Badge variant={sevVariant} size="sm">
                            {req.severity}
                          </Badge>
                        </td>
                        <td>
                          {req.is_mandatory ? (
                            <Badge variant="danger" size="sm">
                              Mandatory
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              Optional
                            </Badge>
                          )}
                        </td>
                        <td>
                          <span className="text-xs text-secondary font-medium">
                            {req.source_document || 'دليل نظم وقائية (2).pdf'}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable Regulatory Citation Row */}
                      {isExpanded && (
                        <tr className="expanded-detail-row">
                          <td colSpan={7}>
                            <div className="regulatory-citation-box">
                              <div className="citation-header">
                                <FileText size={18} className="text-primary" />
                                <h4>Official UAE Regulatory Citation</h4>
                                {req.source_section && (
                                  <Badge variant="info" size="sm">
                                    Section: {req.source_section}
                                  </Badge>
                                )}
                                {req.source_page && (
                                  <Badge variant="neutral" size="sm">
                                    Page {req.source_page}
                                  </Badge>
                                )}
                              </div>

                              <div className="citation-arabic-text" dir="rtl">
                                <strong>النص النظامي الرسمي:</strong>
                                <p>{req.original_text || 'راجع دليل نظم وقائية للمواصفة التفصيلية.'}</p>
                              </div>

                              <div className="citation-desc mt-2">
                                <strong>Compliance Interpretation:</strong>
                                <p className="text-sm text-secondary">{req.description}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE REQUIREMENT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register New Regulatory Requirement"
        subtitle="Add standard with source document traceability"
        maxWidth="lg"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateRequirement} isLoading={isSubmitting}>
              Save Standard
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateRequirement} className="form-stack">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label required">Requirement Code</label>
              <input
                type="text"
                className="form-input font-mono"
                placeholder="e.g. CCTV-REQ-001"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Category</label>
              <select
                className="form-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option value="SURVEILLANCE">Surveillance & CCTV</option>
                <option value="EGRESS">Emergency Egress & Exits</option>
                <option value="FIRE_SAFETY">Fire Safety</option>
                <option value="ACCESS_CONTROL">Access Control</option>
                <option value="DOCUMENTATION">Documentation</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Minimum CCTV Coverage at All Facility Entrances"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label required">Requirement Type</label>
              <select
                className="form-select"
                value={newReqType}
                onChange={(e) => setNewReqType(e.target.value)}
              >
                <option value="MIN_QUANTITY">Minimum Quantity</option>
                <option value="MAX_QUANTITY">Maximum Quantity</option>
                <option value="REQUIRED_PRESENCE">Required Presence</option>
                <option value="DOCUMENTATION">Documentation Proof</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                className="form-input"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Severity</label>
              <select
                className="form-select"
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value)}
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Official Source Document</label>
            <input
              type="text"
              className="form-input"
              value={newSourceDoc}
              onChange={(e) => setNewSourceDoc(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Arabic Source Text (نص اللائحة التنفيذية)</label>
            <textarea
              className="form-textarea"
              rows={3}
              dir="rtl"
              placeholder="النص النظامي المقتبس من اللائحة الرسمية..."
              value={newOriginalText}
              onChange={(e) => setNewOriginalText(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Technical Description & Scope</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Specification details for compliance audit..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
