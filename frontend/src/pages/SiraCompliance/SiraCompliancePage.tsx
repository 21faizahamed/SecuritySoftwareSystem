import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  Eye,
  FileSearch,
  FileText,
  Info,
  Layers,
  LayoutGrid,
  Lock,
  PanelLeft,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import {
  siraComplianceApi,
  type SiraDefinitionItem,
  type SiraEstablishmentSummary,
  type SiraFovTypeItem,
  type SiraSectorRequirementItem,
  type SiraTechnicalStandardItem,
} from '../../services/siraComplianceApi';

type ActiveTab =
  | 'WORKSPACE'
  | 'CAMERA_FOV_MATRIX'
  | 'TECHNICAL_STANDARDS'
  | 'COMPLIANCE_PROJECTS'
  | 'GLOBAL_SEARCH';

type ExplorerViewMode = 'SPLIT' | 'GRID';

export const SiraCompliancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('WORKSPACE');
  const [explorerViewMode, setExplorerViewMode] = useState<ExplorerViewMode>('SPLIT');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Overview & global metadata
  const [overview, setOverview] = useState<any>(null);

  // Establishment Directory & Filters
  const [establishments, setEstablishments] = useState<SiraEstablishmentSummary[]>([]);
  const [allEstablishments, setAllEstablishments] = useState<SiraEstablishmentSummary[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [estSearch, setEstSearch] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('ALL');
  const [selectedFov, setSelectedFov] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('chapter');

  // Selected Establishment Dossier state
  const [selectedSlug, setSelectedSlug] = useState<string>('est-ch08');
  const [selectedSubtypeCode, setSelectedSubtypeCode] = useState<string>('EST-CH08-NURSERY');
  const [estDetail, setEstDetail] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [detailSearch, setDetailSearch] = useState<string>('');
  const [camFovFilter, setCamFovFilter] = useState<string>('ALL');
  const [camObligationFilter, setCamObligationFilter] = useState<string>('ALL');
  const [activeDetailSection, setActiveDetailSection] = useState<string>('ALL');

  // Interactive Conditional Applicability Simulator state
  const [simOperating247, setSimOperating247] = useState<boolean>(false);
  const [simUnitsCount, setSimUnitsCount] = useState<number>(60);
  const [simHighValueItems, setSimHighValueItems] = useState<boolean>(true);

  // Technical & Operational Standards state
  const [standards, setStandards] = useState<SiraTechnicalStandardItem[]>([]);
  const [stdCategories, setStdCategories] = useState<string[]>([]);
  const [stdPartFilter, setStdPartFilter] = useState<number | undefined>(undefined);
  const [stdCategoryFilter, setStdCategoryFilter] = useState<string>('ALL');
  const [stdSearch, setStdSearch] = useState<string>('');

  // Compliance Checklist Projects state
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectClient, setNewProjectClient] = useState<string>('');
  const [newProjectLicense, setNewProjectLicense] = useState<string>('');
  const [newProjectSlug, setNewProjectSlug] = useState<string>('est-ch08');
  const [newProjectSubtype, setNewProjectSubtype] = useState<string>('EST-CH08-NURSERY');
  const [checklistFilterStatus, setChecklistFilterStatus] = useState<string>('ALL');
  const [checklistSearch, setChecklistSearch] = useState<string>('');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemStatusDraft, setItemStatusDraft] = useState<string>('COMPLIANT');
  const [itemNotesDraft, setItemNotesDraft] = useState<string>('');
  const [itemNaExplanationDraft, setItemNaExplanationDraft] = useState<string>('');
  const [itemEvidenceDraft, setItemEvidenceDraft] = useState<string>('');
  const [itemUpdateError, setItemUpdateError] = useState<string | null>(null);

  // Global Search state
  const [globalQuery, setGlobalQuery] = useState<string>('camera placement');
  const [globalModuleFilter, setGlobalModuleFilter] = useState<string>('ALL');
  const [globalResults, setGlobalResults] = useState<any>(null);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState<boolean>(false);

  // Glossary Modal & Source PDF Modal state
  const [isGlossaryOpen, setIsGlossaryOpen] = useState<boolean>(false);
  const [glossarySearch, setGlossarySearch] = useState<string>('');
  const [definitions, setDefinitions] = useState<SiraDefinitionItem[]>([]);
  const [fovTypes, setFovTypes] = useState<SiraFovTypeItem[]>([]);

  const [sourceModalPage, setSourceModalPage] = useState<number | null>(null);
  const [sourceModalHighlight, setSourceModalHighlight] = useState<string>('');
  const [sourcePageData, setSourcePageData] = useState<any>(null);
  const [isLoadingSourcePage, setIsLoadingSourcePage] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ov, estList, stdList, defData, projList, defaultSearch] = await Promise.all([
        siraComplianceApi.getOverview(),
        siraComplianceApi.listEstablishments({ sort_by: 'chapter' }),
        siraComplianceApi.listTechnicalStandards(),
        siraComplianceApi.listDefinitions(),
        siraComplianceApi.listProjects(),
        siraComplianceApi.globalSearch({ q: 'camera placement', module_filter: 'ALL' }),
      ]);
      setOverview(ov);
      setEstablishments(estList.items);
      setAllEstablishments(estList.items);
      setIndustries(estList.industries);
      setStandards(stdList.items);
      setStdCategories(stdList.categories);
      setDefinitions(defData.definitions);
      setFovTypes(defData.fov_types);
      setProjects(projList.items || []);
      setGlobalResults(defaultSearch);

      if (projList.items && projList.items.length > 0) {
        const firstDetail = await siraComplianceApi.getProjectDetail(projList.items[0].id);
        setActiveProject(firstDetail);
      }

      await loadEstablishmentDetail('est-ch08', 'EST-CH08-NURSERY');
    } catch (err: any) {
      setError(err?.message || 'Failed to load SIRA Preventive Systems Compliance Explorer');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered Establishments fetch
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await siraComplianceApi.listEstablishments({
          search: estSearch || undefined,
          industry_sector: selectedIndustry !== 'ALL' ? selectedIndustry : undefined,
          equipment_filter: selectedEquipment !== 'ALL' ? selectedEquipment : undefined,
          fov_filter: selectedFov !== 'ALL' ? selectedFov : undefined,
          sort_by: sortBy,
        });
        setEstablishments(res.items);
      } catch {
        // ignore transient filter error
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [estSearch, selectedIndustry, selectedEquipment, selectedFov, sortBy]);

  // Filtered Technical Standards fetch
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await siraComplianceApi.listTechnicalStandards({
          part_number: stdPartFilter,
          technical_category: stdCategoryFilter !== 'ALL' ? stdCategoryFilter : undefined,
          search: stdSearch || undefined,
        });
        setStandards(res.items);
      } catch {
        // ignore
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [stdPartFilter, stdCategoryFilter, stdSearch]);

  const loadEstablishmentDetail = async (slug: string, subtypeCode?: string) => {
    setIsDetailLoading(true);
    setSelectedSlug(slug);
    if (subtypeCode) setSelectedSubtypeCode(subtypeCode);
    try {
      const detail = await siraComplianceApi.getEstablishmentDetail(slug, subtypeCode);
      setEstDetail(detail);
      if (detail?.active_subtype?.subtype_code) {
        setSelectedSubtypeCode(detail.active_subtype.subtype_code);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load establishment requirements');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const openSourceCitation = async (pageNumber: number, highlightText: string = '') => {
    setSourceModalPage(pageNumber);
    setSourceModalHighlight(highlightText);
    setIsLoadingSourcePage(true);
    try {
      const data = await siraComplianceApi.getSourcePage(pageNumber);
      setSourcePageData(data);
    } catch {
      setSourcePageData(null);
    } finally {
      setIsLoadingSourcePage(false);
    }
  };

  const executeGlobalSearch = async (queryText: string, modFilter: string = globalModuleFilter) => {
    setGlobalQuery(queryText);
    setGlobalModuleFilter(modFilter);
    setIsSearchingGlobal(true);
    try {
      const res = await siraComplianceApi.globalSearch({
        q: queryText,
        module_filter: modFilter,
      });
      setGlobalResults(res);
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  const handleRunGlobalSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await executeGlobalSearch(globalQuery, globalModuleFilter);
  };

  const handleCreateProjectFromCurrentEstablishment = async () => {
    if (!estDetail) return;
    const catName = estDetail.category.display_name;
    const subName = estDetail.active_subtype?.name || catName;
    try {
      const created = await siraComplianceApi.createProject({
        project_name: `${subName} — SIRA Resolution 13/2025 Audit`,
        client_or_entity_name: `${subName} Facility`,
        trade_license_no: 'DED-NEW-AUDIT',
        category_slug: estDetail.category.slug,
        subtype_code: estDetail.active_subtype?.subtype_code,
        facility_operating_hours: simOperating247 ? '24/7' : 'Standard Hours',
        has_on_site_safe: true,
        residential_units_count: simUnitsCount,
      });
      const projList = await siraComplianceApi.listProjects();
      setProjects(projList.items || []);
      setActiveProject(created);
      setActiveTab('COMPLIANCE_PROJECTS');
    } catch (err: any) {
      alert(err?.message || 'Failed to create project');
    }
  };

  const handleCreateCustomProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await siraComplianceApi.createProject({
        project_name: newProjectName || 'SIRA Compliance Audit Project',
        client_or_entity_name: newProjectClient || 'Dubai Establishment',
        trade_license_no: newProjectLicense || 'DED-2025',
        category_slug: newProjectSlug,
        subtype_code: newProjectSubtype || undefined,
      });
      const projList = await siraComplianceApi.listProjects();
      setProjects(projList.items || []);
      setActiveProject(created);
      setIsCreatingProject(false);
      setNewProjectName('');
      setNewProjectClient('');
      setNewProjectLicense('');
    } catch (err: any) {
      alert(err?.message || 'Failed to create project');
    }
  };

  const handleSaveItemAssessment = async (itemId: number) => {
    if (!activeProject?.project?.id) return;
    setItemUpdateError(null);
    if (itemStatusDraft === 'NOT_APPLICABLE' && !itemNaExplanationDraft.trim()) {
      setItemUpdateError(
        'Mandatory Rule: You must enter an engineering/regulatory justification when marking a SIRA requirement as NOT APPLICABLE.'
      );
      return;
    }
    try {
      const updated = await siraComplianceApi.updateProjectItem(activeProject.project.id, itemId, {
        compliance_status: itemStatusDraft,
        assessor_notes: itemNotesDraft,
        not_applicable_explanation: itemNaExplanationDraft,
        evidence_reference: itemEvidenceDraft,
      });
      setActiveProject(updated);
      const projList = await siraComplianceApi.listProjects();
      setProjects(projList.items || []);
      setEditingItemId(null);
    } catch (err: any) {
      setItemUpdateError(err?.message || 'Failed to update requirement status');
    }
  };

  const handleExportProjectCsv = () => {
    if (!activeProject?.items) return;
    const headers = [
      'Code',
      'Section',
      'Location / Requirement',
      'FOV / Threshold',
      'Applicability',
      'Compliance Status',
      'N/A Justification',
      'Assessor Notes',
      'Evidence Ref',
      'Source Citation',
      'PDF Page',
    ];
    const rows = activeProject.items.map((i: any) => [
      i.requirement_code,
      i.section_group,
      `"${(i.area_or_title || '').replace(/"/g, '""')}"`,
      `"${(i.required_fov_or_threshold || '').replace(/"/g, '""')}"`,
      i.applicability_type,
      i.compliance_status,
      `"${(i.not_applicable_explanation || '').replace(/"/g, '""')}"`,
      `"${(i.assessor_notes || '').replace(/"/g, '""')}"`,
      `"${(i.evidence_reference || '').replace(/"/g, '""')}"`,
      `"${(i.source_citation_text || '').replace(/"/g, '""')}"`,
      `Page ${i.pdf_page}`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.project?.project_code || 'SIRA_Checklist'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered Camera Placements inside Establishment Detail
  const filteredCameraPlacements = useMemo(() => {
    const cams: SiraSectorRequirementItem[] =
      estDetail?.sections?.['4_camera_placement_requirements'] || [];
    return cams.filter((c) => {
      if (camFovFilter !== 'ALL' && !(c.required_fov || '').toLowerCase().includes(camFovFilter.toLowerCase())) {
        return false;
      }
      if (camObligationFilter !== 'ALL' && c.applicability_type !== camObligationFilter) {
        return false;
      }
      if (detailSearch.trim()) {
        const q = detailSearch.toLowerCase();
        const match =
          c.area_or_location.toLowerCase().includes(q) ||
          (c.required_fov || '').toLowerCase().includes(q) ||
          c.exact_wording.toLowerCase().includes(q) ||
          (c.remarks_and_conditions || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [estDetail, camFovFilter, camObligationFilter, detailSearch]);

  // Camera breakdown counts by FOV for the active establishment
  const fovBreakdown = useMemo(() => {
    const cams: SiraSectorRequirementItem[] =
      estDetail?.sections?.['4_camera_placement_requirements'] || [];
    const counts: Record<string, number> = {
      Identification: 0,
      Recognition: 0,
      Observation: 0,
      Detection: 0,
      Monitoring: 0,
      ANPR: 0,
    };
    cams.forEach((c) => {
      const f = (c.required_fov || '').toUpperCase();
      if (f.includes('IDENTIFICATION')) counts.Identification++;
      else if (f.includes('RECOGNITION')) counts.Recognition++;
      else if (f.includes('OBSERVATION')) counts.Observation++;
      else if (f.includes('DETECTION')) counts.Detection++;
      else if (f.includes('MONITORING')) counts.Monitoring++;
      else if (f.includes('ANPR') || f.includes('PLATE')) counts.ANPR++;
    });
    return counts;
  }, [estDetail]);

  const getFovBadgeClass = (fov: string | null) => {
    const f = (fov || '').toUpperCase();
    if (f.includes('IDENTIFICATION')) return 'badge-pill badge-danger';
    if (f.includes('RECOGNITION')) return 'badge-pill badge-warning';
    if (f.includes('OBSERVATION')) return 'badge-pill badge-info';
    if (f.includes('DETECTION')) return 'badge-pill badge-success';
    if (f.includes('MONITORING')) return 'badge-pill badge-purple';
    if (f.includes('ANPR') || f.includes('PLATE')) return 'badge-pill badge-info';
    return 'badge-pill badge-neutral';
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="enterprise-card">
          <div className="loading-spinner-wrapper full-height">
            <RefreshCw className="animate-spin text-primary" size={36} />
            <div className="empty-state-title">
              Loading SIRA Preventive Systems Manual Database (140 Pages, 43 Chapters)...
            </div>
            <div className="loading-spinner-text">
              Initializing 17 official definitions, 7 camera Field-of-View standards, 45 technical controls, and 43 establishment chapters.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* ==================== 1. EXECUTIVE HERO BANNER ==================== */}
      <div className="sira-hero-card">
        <div className="sira-hero-top">
          <div style={{ flex: '1 1 520px' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="badge-pill badge-purple">
                <ShieldCheck size={12} /> SIRA ADMINISTRATIVE RESOLUTION NO. (13) OF 2025
              </span>
              <span className="badge-pill badge-success">
                <CheckCircle2 size={12} /> 140 PDF PAGES • 43 CHAPTERS • 68 SUBTYPES
              </span>
              <span className="badge-pill badge-info">ISSUED 14 APRIL 2025 (DUBAI, UAE)</span>
            </div>
            <h1 className="page-heading" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '23px' }}>
              <ShieldCheck size={26} className="text-primary" />
              SIRA Preventive Systems Compliance Explorer
            </h1>
            <p className="page-subheading" style={{ marginTop: '4px', maxWidth: '880px', lineHeight: 1.5 }}>
              Interactive regulatory intelligence workspace, camera placement &amp; Field-of-View (FOV) optical matrix, Part One/Two technical standards library, and inspection checklist engine extracted directly from the Preventive Systems Manual.
            </p>
          </div>

          <div className="sira-hero-actions">
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => setIsGlossaryOpen(true)}
            >
              <BookOpen size={16} />
              Definitions &amp; FOV Glossary
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => openSourceCitation(1, 'Administrative Resolution No. (13) of 2025')}
            >
              <FileText size={16} />
              Official 140-Page PDF
            </button>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={handleCreateProjectFromCurrentEstablishment}
            >
              <ClipboardCheck size={16} />
              + Audit Current Sector
            </button>
          </div>
        </div>

        {/* LEGAL NOTICE & QUICK PAGE JUMP STRIP */}
        <div className="sira-notice-bar">
          <div className="flex items-center gap-2" style={{ flex: '1 1 500px' }}>
            <Info size={16} className="text-primary" style={{ flexShrink: 0 }} />
            <span>
              <strong>Legal Notice (Page 1, Footnote 1):</strong> This English manual is an official translation; in case of conflict in interpretation or application, the <strong>original Arabic text prevails</strong>. Checklists assist engineering design and do not substitute official SIRA approval.
            </span>
          </div>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openSourceCitation(1, 'Resolution')}>
              p.1 Resolution
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openSourceCitation(6, 'Definitions')}>
              p.6 Definitions
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openSourceCitation(8, 'Cameras')}>
              p.8 IP Cameras
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openSourceCitation(24, 'Field of View')}>
              p.24 Camera FOV
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openSourceCitation(35, 'Luxury Hotels')}>
              p.34–140 Sectors
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-danger">
          <ShieldAlert size={18} />
          <div className="alert-content">
            <strong>Error</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ==================== 2. KPI METRICS STRIP ==================== */}
      {overview?.metrics && (
        <div className="stats-grid">
          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('WORKSPACE')}
          >
            <div className="stat-icon-wrapper stat-blue">
              <Building2 size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Part Three Sectors</span>
              <div className="stat-value">
                {overview.metrics.total_chapters} <span style={{ fontSize: '15px', fontWeight: 600 }}>Chapters</span>
              </div>
              <span className="stat-meta">{overview.metrics.total_subtypes} specialized establishment subtypes (pp. 34–140)</span>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('CAMERA_FOV_MATRIX')}
          >
            <div className="stat-icon-wrapper stat-green">
              <Camera size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Extracted Sector Rules</span>
              <div className="stat-value">
                {overview.metrics.total_sector_requirements}{' '}
                <span style={{ fontSize: '15px', fontWeight: 600 }}>({overview.metrics.total_camera_placements} Cameras)</span>
              </div>
              <span className="stat-meta">7 optical FOV classes + alarms, access control &amp; guarding</span>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('TECHNICAL_STANDARDS')}
          >
            <div className="stat-icon-wrapper stat-purple">
              <Sliders size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Technical &amp; Operational</span>
              <div className="stat-value">
                {overview.metrics.total_technical_standards} <span style={{ fontSize: '15px', fontWeight: 600 }}>Controls</span>
              </div>
              <span className="stat-meta">Part One hardware specs (pp. 7–22) &amp; Part Two ops (pp. 23–33)</span>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('COMPLIANCE_PROJECTS')}
          >
            <div className="stat-icon-wrapper stat-amber">
              <ClipboardCheck size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Traceability &amp; Audits</span>
              <div className="stat-value">
                {overview.metrics.total_pages_indexed} <span style={{ fontSize: '15px', fontWeight: 600 }}>Pages / {projects.length} Audits</span>
              </div>
              <span className="stat-meta">17 official definitions • Full PDF page-level source links</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. SEGMENTED WORKSPACE NAVIGATION TABS ==================== */}
      <div className="sira-tabs-bar">
        <button
          type="button"
          className={`sira-tab-btn ${activeTab === 'WORKSPACE' ? 'active' : ''}`}
          onClick={() => setActiveTab('WORKSPACE')}
        >
          <Building2 size={16} />
          <span>Sector &amp; Establishment Workspace</span>
          <span className="sira-tab-count">43 Chapters</span>
        </button>

        <button
          type="button"
          className={`sira-tab-btn ${activeTab === 'CAMERA_FOV_MATRIX' ? 'active' : ''}`}
          onClick={() => setActiveTab('CAMERA_FOV_MATRIX')}
        >
          <Camera size={16} />
          <span>Camera Placement &amp; FOV Matrix</span>
          <span className="sira-tab-count">{filteredCameraPlacements.length} Locations</span>
        </button>

        <button
          type="button"
          className={`sira-tab-btn ${activeTab === 'TECHNICAL_STANDARDS' ? 'active' : ''}`}
          onClick={() => setActiveTab('TECHNICAL_STANDARDS')}
        >
          <Layers size={16} />
          <span>Part 1 &amp; 2 Technical Standards</span>
          <span className="sira-tab-count">{standards.length}</span>
        </button>

        <button
          type="button"
          className={`sira-tab-btn ${activeTab === 'COMPLIANCE_PROJECTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('COMPLIANCE_PROJECTS')}
        >
          <ClipboardCheck size={16} />
          <span>Compliance Audit Checklists</span>
          <span className="sira-tab-count">{projects.length}</span>
        </button>

        <button
          type="button"
          className={`sira-tab-btn ${activeTab === 'GLOBAL_SEARCH' ? 'active' : ''}`}
          onClick={() => setActiveTab('GLOBAL_SEARCH')}
        >
          <FileSearch size={16} />
          <span>Global Search &amp; Extraction QA</span>
          <span className="sira-tab-count">140 Pages</span>
        </button>
      </div>

      {/* ==================== TAB 1: UNIFIED SECTOR & ESTABLISHMENT WORKSPACE ==================== */}
      {activeTab === 'WORKSPACE' && (
        <div className="flex-col gap-4">
          {/* QUICK SECTOR PILLS + VIEW MODE TOGGLE BAR */}
          <div className="sira-toolbar" style={{ justifyContent: 'space-between' }}>
            <div className="flex items-center gap-2" style={{ flexWrap: 'wrap', flex: '1 1 600px' }}>
              <span className="text-xs font-bold text-secondary" style={{ textTransform: 'uppercase', marginRight: '4px' }}>
                Popular Sectors:
              </span>
              {[
                { label: 'Nurseries & KG (Ch. 8)', slug: 'est-ch08', sub: 'EST-CH08-NURSERY' },
                { label: 'Schools (Ch. 8)', slug: 'est-ch08', sub: 'EST-CH08-SCHOOL' },
                { label: 'Universities (Ch. 8)', slug: 'est-ch08', sub: 'EST-CH08-UNIVERSITY' },
                { label: 'Hospitals (Ch. 9)', slug: 'est-ch09', sub: 'EST-CH09-MAIN' },
                { label: 'Luxury Hotels (Ch. 1)', slug: 'est-ch01', sub: 'EST-CH01-MAIN' },
                { label: 'Shopping Malls (Ch. 3)', slug: 'est-ch03', sub: 'EST-CH03-MAIN' },
                { label: 'Residential Towers (Ch. 4)', slug: 'est-ch04', sub: 'EST-CH04-SUB1' },
                { label: 'Gold & Jewelry (Ch. 11)', slug: 'est-ch11', sub: 'EST-CH11-STORE' },
                { label: 'Banks & ATMs (Ch. 12)', slug: 'est-ch12', sub: 'EST-CH12-BANK' },
                { label: 'Warehouses (Ch. 19)', slug: 'est-ch19', sub: 'EST-CH19-HAZVAL' },
                { label: 'Factories (Ch. 22)', slug: 'est-ch22', sub: 'EST-CH22-GENERAL' },
                { label: 'Data Centers (Ch. 29)', slug: 'est-ch29', sub: 'EST-CH29-MAIN' },
                { label: 'Pharmacies (Ch. 30)', slug: 'est-ch30', sub: 'EST-CH30-MAIN' },
              ].map((q) => {
                const isSelected =
                  selectedSlug === q.slug &&
                  (estDetail?.active_subtype?.subtype_code || selectedSubtypeCode) === q.sub;
                return (
                  <button
                    key={`${q.slug}-${q.sub}`}
                    type="button"
                    className={`sira-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      loadEstablishmentDetail(q.slug, q.sub);
                      setExplorerViewMode('SPLIT');
                    }}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`btn btn-sm ${explorerViewMode === 'SPLIT' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setExplorerViewMode('SPLIT')}
              >
                <PanelLeft size={14} /> Split Inspector View
              </button>
              <button
                type="button"
                className={`btn btn-sm ${explorerViewMode === 'GRID' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setExplorerViewMode('GRID')}
              >
                <LayoutGrid size={14} /> 43-Chapter Grid Catalog
              </button>
            </div>
          </div>

          {/* VIEW MODE A: 43-CHAPTER FULL CATALOG GRID */}
          {explorerViewMode === 'GRID' && (
            <div className="flex-col gap-4">
              <div className="sira-toolbar">
                <div className="sira-search-wrap">
                  <Search size={16} />
                  <input
                    type="text"
                    className="sira-search-input"
                    placeholder="Search establishment name, synonym (e.g., nursery, kindergarten, hospital, mall, gold, data centre, pharmacy)..."
                    value={estSearch}
                    onChange={(e) => setEstSearch(e.target.value)}
                  />
                </div>

                <select
                  className="sira-select"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                >
                  <option value="ALL">All Industry Sectors ({industries.length})</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>

                <select
                  className="sira-select"
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                >
                  <option value="ALL">All Security Systems</option>
                  <option value="IP Cameras">Video Surveillance (IP Cameras)</option>
                  <option value="ANPR">ANPR Vehicle Plate Camera</option>
                  <option value="Intruder Alarm">3rd-Gen Intruder Alarm</option>
                  <option value="Access Control">Access Control System</option>
                  <option value="Security Personnel">24/7 Security Guards</option>
                  <option value="Penetration-Resistant Glass">Penetration-Resistant Glass</option>
                  <option value="HVM">HVM Vehicle Barriers</option>
                  <option value="Lock">SIRA Lock / Safe</option>
                </select>

                <select
                  className="sira-select"
                  value={selectedFov}
                  onChange={(e) => setSelectedFov(e.target.value)}
                >
                  <option value="ALL">All Camera FOV Views</option>
                  <option value="Identification">Identification View (120%)</option>
                  <option value="Recognition">Recognition View (50%)</option>
                  <option value="Observation">Observation View (25%)</option>
                  <option value="Detection">Detection View (10%)</option>
                  <option value="Monitoring">Monitoring View (5%)</option>
                  <option value="ANPR">ANPR View</option>
                </select>

                <select className="sira-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="chapter">Sort: Manual Chapter (1–43)</option>
                  <option value="alpha">Sort: Alphabetical (A–Z)</option>
                  <option value="requirements">Sort: Requirement Count</option>
                </select>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '16px',
                }}
              >
                {establishments.map((est) => (
                  <div
                    key={est.slug}
                    className="enterprise-card"
                    style={{
                      border:
                        selectedSlug === est.slug
                          ? '2px solid var(--color-primary)'
                          : '1px solid var(--border-card)',
                    }}
                  >
                    <div className="card-header-bar">
                      <span className="badge-pill badge-info">
                        Chapter {est.chapter_number} • pp. {est.start_page}–{est.end_page}
                      </span>
                      <span className="text-xs font-semibold text-muted">{est.industry_sector}</span>
                    </div>

                    <div className="card-body-content flex-col justify-between gap-3">
                      <div>
                        <h3 className="card-main-title" style={{ fontSize: '16px', marginBottom: '6px' }}>
                          {est.display_name}
                        </h3>

                        {est.matched_synonym && (
                          <div className="badge-pill badge-warning" style={{ marginBottom: '8px' }}>
                            Synonym match: &ldquo;{est.matched_synonym}&rdquo; → {est.chapter_title}
                          </div>
                        )}

                        <p className="text-secondary text-sm" style={{ lineHeight: 1.5, marginBottom: '12px' }}>
                          {est.overview_text}
                        </p>

                        <div className="flex gap-1" style={{ flexWrap: 'wrap', marginBottom: '10px' }}>
                          <span className="badge-pill badge-success">{est.total_requirements} Total Rules</span>
                          {est.camera_count > 0 && (
                            <span className="badge-pill badge-info">{est.camera_count} Cameras</span>
                          )}
                          {est.alarm_count > 0 && (
                            <span className="badge-pill badge-danger">{est.alarm_count} Alarms</span>
                          )}
                          {est.access_control_count > 0 && (
                            <span className="badge-pill badge-purple">{est.access_control_count} Access Ctrl</span>
                          )}
                        </div>

                        {est.subtypes.length > 1 && (
                          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                            <div className="text-xs font-bold text-secondary" style={{ marginBottom: '6px' }}>
                              Subtypes ({est.subtypes.length}):
                            </div>
                            <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                              {est.subtypes.map((sub) => (
                                <button
                                  key={sub.subtype_code}
                                  type="button"
                                  className="sira-chip"
                                  style={{ fontSize: '11px', padding: '3px 8px' }}
                                  onClick={() => {
                                    loadEstablishmentDetail(est.slug, sub.subtype_code);
                                    setExplorerViewMode('SPLIT');
                                  }}
                                >
                                  {sub.name} ({sub.requirement_count})
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card-footer-bar flex justify-between items-center">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openSourceCitation(est.start_page, est.display_name)}
                      >
                        <Eye size={13} /> PDF p.{est.start_page}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          loadEstablishmentDetail(est.slug, est.subtypes[0]?.subtype_code);
                          setExplorerViewMode('SPLIT');
                        }}
                      >
                        Inspect Dossier ({est.total_requirements}) →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW MODE B: MASTER-DETAIL SPLIT INSPECTOR WORKSPACE */}
          {explorerViewMode === 'SPLIT' && (
            <div className="sira-split-workspace">
              {/* LEFT DIRECTORY SIDEBAR (ALL 43 CHAPTERS) */}
              <div className="sira-directory-panel">
                <div className="sira-directory-header">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-main text-sm">
                      Part Three Directory ({establishments.length}/43)
                    </span>
                    <select
                      className="rows-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{ fontSize: '11px' }}
                    >
                      <option value="chapter">By Ch. 1–43</option>
                      <option value="alpha">A–Z</option>
                      <option value="requirements">Most Rules</option>
                    </select>
                  </div>

                  <div className="sira-search-wrap" style={{ flex: 'none' }}>
                    <Search size={14} />
                    <input
                      type="text"
                      className="sira-search-input"
                      style={{ padding: '7px 10px 7px 32px', fontSize: '12px' }}
                      placeholder="Filter 43 chapters or synonyms..."
                      value={estSearch}
                      onChange={(e) => setEstSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className="sira-select"
                    style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                  >
                    <option value="ALL">All Industry Sectors ({industries.length})</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sira-directory-list">
                  {establishments.map((est) => {
                    const isActive = selectedSlug === est.slug;
                    return (
                      <button
                        key={est.slug}
                        type="button"
                        className={`sira-chapter-item ${isActive ? 'active' : ''}`}
                        onClick={() => loadEstablishmentDetail(est.slug, est.subtypes[0]?.subtype_code)}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="text-xs font-bold text-primary">
                            Ch. {est.chapter_number} • pp. {est.start_page}–{est.end_page}
                          </span>
                          <span className="badge-pill badge-neutral" style={{ fontSize: '10px', padding: '2px 6px' }}>
                            {est.total_requirements} rules
                          </span>
                        </div>
                        <div className="font-bold text-main" style={{ fontSize: '13px', lineHeight: 1.3 }}>
                          {est.display_name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span>{est.camera_count} cams</span>
                          {est.alarm_count > 0 && <span>• {est.alarm_count} alarms</span>}
                          {est.subtypes.length > 1 && <span>• {est.subtypes.length} subtypes</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT MAIN ESTABLISHMENT REGULATORY DOSSIER */}
              <div className="sira-dossier-main">
                {estDetail && (
                  <>
                    {/* DOSSIER HEADER CARD */}
                    <div className="enterprise-card">
                      <div className="card-header-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div className="flex items-center gap-2" style={{ marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span className="badge-pill badge-info">
                              Part Three • {estDetail.category.chapter_title}
                            </span>
                            <span className="badge-pill badge-success">
                              PDF Pages {estDetail.active_subtype?.start_page || estDetail.category.start_page}–
                              {estDetail.active_subtype?.end_page || estDetail.category.end_page} of 140
                            </span>
                            <span className="badge-pill badge-purple">
                              {estDetail.category.industry_sector}
                            </span>
                          </div>
                          <h2 className="page-heading" style={{ fontSize: '20px' }}>
                            {estDetail.active_subtype?.name || estDetail.category.display_name}
                          </h2>
                          <p className="text-secondary text-sm" style={{ marginTop: '4px', lineHeight: 1.5 }}>
                            {estDetail.active_subtype?.description || estDetail.category.overview_text}
                          </p>
                        </div>

                        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() =>
                              openSourceCitation(
                                estDetail.active_subtype?.start_page || estDetail.category.start_page,
                                estDetail.active_subtype?.name || estDetail.category.display_name
                              )
                            }
                          >
                            <Eye size={14} /> View Source PDF (p.{' '}
                            {estDetail.active_subtype?.start_page || estDetail.category.start_page})
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleCreateProjectFromCurrentEstablishment}
                          >
                            <ClipboardCheck size={14} /> Generate Audit Checklist
                          </button>
                        </div>
                      </div>

                      <div className="card-body-content flex-col gap-4">
                        {/* SUBTYPE SELECTOR PILLS IF MULTIPLE SUBTYPES EXIST */}
                        {estDetail.subtypes && estDetail.subtypes.length > 1 && (
                          <div
                            style={{
                              padding: '12px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--bg-surface-subtle)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <div className="text-xs font-bold text-secondary" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>
                              Specialized Subtypes in {estDetail.category.chapter_title} ({estDetail.subtypes.length}) — Select Subtype:
                            </div>
                            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                              {estDetail.subtypes.map((sub: any) => {
                                const isSubActive =
                                  (estDetail.active_subtype?.subtype_code || selectedSubtypeCode) === sub.subtype_code;
                                return (
                                  <button
                                    key={sub.subtype_code}
                                    type="button"
                                    disabled={isDetailLoading}
                                    className={`sira-chip ${isSubActive ? 'active' : ''}`}
                                    onClick={() => loadEstablishmentDetail(estDetail.category.slug, sub.subtype_code)}
                                  >
                                    {sub.name} ({sub.requirement_count} rules • pp. {sub.start_page}–{sub.end_page})
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 5 MINI-KPI SUMMARY BOXES FOR THIS SUBTYPE */}
                        <div className="sira-mini-kpi-grid">
                          <div className="sira-mini-kpi">
                            <span className="text-xs font-semibold text-muted">VSS CAMERA LOCATIONS</span>
                            <div className="font-bold text-main" style={{ fontSize: '20px' }}>
                              {estDetail.sections['3_required_security_systems_summary'].camera_locations_count}{' '}
                              <span className="text-xs text-primary">Positions</span>
                            </div>
                            <span className="text-xs text-secondary">
                              ID:{fovBreakdown.Identification} • Rec:{fovBreakdown.Recognition} • Obs:{fovBreakdown.Observation} • Det:{fovBreakdown.Detection}
                            </span>
                          </div>

                          <div className="sira-mini-kpi">
                            <span className="text-xs font-semibold text-muted">RECORDING RETENTION</span>
                            <div className="font-bold text-main" style={{ fontSize: '20px' }}>
                              {estDetail.sections['3_required_security_systems_summary'].minimum_retention_days}{' '}
                              <span className="text-xs text-green">Days Min</span>
                            </div>
                            <span className="text-xs text-secondary">&gt;= 10 fps • 1920x1080 Full HD</span>
                          </div>

                          <div className="sira-mini-kpi">
                            <span className="text-xs font-semibold text-muted">INTRUDER ALARM SYSTEM</span>
                            <div className="font-bold text-main" style={{ fontSize: '20px' }}>
                              {estDetail.sections['3_required_security_systems_summary'].alarm_points_count}{' '}
                              <span className="text-xs text-amber">Points</span>
                            </div>
                            <span className="text-xs text-secondary">
                              {estDetail.sections['3_required_security_systems_summary'].intruder_alarm_required
                                ? '3rd-Gen Alarm + >=110 dBA Siren'
                                : 'Not mandated by sector table'}
                            </span>
                          </div>

                          <div className="sira-mini-kpi">
                            <span className="text-xs font-semibold text-muted">ACCESS CONTROL ZONES</span>
                            <div className="font-bold text-main" style={{ fontSize: '20px' }}>
                              {estDetail.sections['3_required_security_systems_summary'].access_control_zones_count}{' '}
                              <span className="text-xs text-primary">Restricted</span>
                            </div>
                            <span className="text-xs text-secondary">Civil Defense fire release linked</span>
                          </div>

                          <div className="sira-mini-kpi">
                            <span className="text-xs font-semibold text-muted">GUARDING &amp; PHYSICAL</span>
                            <div className="font-bold text-main" style={{ fontSize: '20px' }}>
                              {estDetail.sections['3_required_security_systems_summary'].other_security_controls_count}{' '}
                              <span className="text-xs text-green">Controls</span>
                            </div>
                            <span className="text-xs text-secondary">Guards, Locks, Glass, HVM &amp; SIRA Link</span>
                          </div>
                        </div>

                        {/* REAL-TIME CONDITIONAL APPLICABILITY SIMULATOR + SECTION FILTER */}
                        <div
                          className="flex justify-between items-center gap-3"
                          style={{
                            flexWrap: 'wrap',
                            paddingTop: '10px',
                            borderTop: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                            {[
                              { id: 'ALL', label: 'All Dossier Sections' },
                              { id: 'CAMERA_TABLE', label: `Camera Matrix (${filteredCameraPlacements.length})` },
                              { id: 'ALARM_ACCESS', label: 'Alarms, Access Control & Guarding' },
                              { id: 'PART1_PART2', label: 'Linked Part 1 & 2 Standards' },
                            ].map((sec) => (
                              <button
                                key={sec.id}
                                type="button"
                                className={`btn btn-sm ${
                                  activeDetailSection === sec.id ? 'btn-primary' : 'btn-secondary'
                                }`}
                                onClick={() => setActiveDetailSection(sec.id)}
                              >
                                {sec.label}
                              </button>
                            ))}
                          </div>

                          <div
                            className="flex items-center gap-3"
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--bg-surface-subtle)',
                              border: '1px solid var(--border-card)',
                              fontSize: '12px',
                            }}
                          >
                            <span className="font-bold text-primary flex items-center gap-1">
                              <Sparkles size={13} /> Rules Simulator:
                            </span>
                            <label className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={simOperating247}
                                onChange={(e) => setSimOperating247(e.target.checked)}
                              />
                              <span>Operates 24/7</span>
                            </label>
                            <label className="flex items-center gap-1">
                              <span>Units:</span>
                              <input
                                type="number"
                                value={simUnitsCount}
                                onChange={(e) => setSimUnitsCount(Number(e.target.value) || 0)}
                                style={{
                                  width: '54px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-card)',
                                  background: 'var(--bg-surface)',
                                  color: 'var(--text-main)',
                                }}
                              />
                            </label>
                            <label className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={simHighValueItems}
                                onChange={(e) => setSimHighValueItems(e.target.checked)}
                              />
                              <span>Valuables &gt;=100k AED</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: CAMERA PLACEMENT MATRIX CARD */}
                    {(activeDetailSection === 'ALL' || activeDetailSection === 'CAMERA_TABLE') && (
                      <div className="enterprise-card">
                        <div className="card-header-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
                          <div>
                            <h3 className="card-main-title flex items-center gap-2">
                              <Camera size={18} className="text-primary" />
                              Section 4: Camera Placement &amp; Field of View Matrix ({filteredCameraPlacements.length} Locations)
                            </h3>
                            <p className="card-sub-title">
                              Extracted from {estDetail.category.chapter_title} ({estDetail.active_subtype?.name}) with exact SIRA Field of View and page reference.
                            </p>
                          </div>

                          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                            <div className="sira-search-wrap" style={{ minWidth: '220px', flex: 'none' }}>
                              <Search size={14} />
                              <input
                                type="text"
                                className="sira-search-input"
                                style={{ padding: '6px 10px 6px 30px', fontSize: '12px' }}
                                placeholder="Filter location (e.g., classroom, entrance)..."
                                value={detailSearch}
                                onChange={(e) => setDetailSearch(e.target.value)}
                              />
                            </div>
                            <select
                              className="sira-select"
                              style={{ padding: '6px 10px', fontSize: '12px', minWidth: '140px' }}
                              value={camFovFilter}
                              onChange={(e) => setCamFovFilter(e.target.value)}
                            >
                              <option value="ALL">All FOV Types</option>
                              <option value="Identification">Identification View</option>
                              <option value="Recognition">Recognition View</option>
                              <option value="Observation">Observation View</option>
                              <option value="Detection">Detection View</option>
                              <option value="Monitoring">Monitoring View</option>
                              <option value="ANPR">ANPR</option>
                            </select>
                            <select
                              className="sira-select"
                              style={{ padding: '6px 10px', fontSize: '12px', minWidth: '130px' }}
                              value={camObligationFilter}
                              onChange={(e) => setCamObligationFilter(e.target.value)}
                            >
                              <option value="ALL">All Obligations</option>
                              <option value="MANDATORY">Mandatory</option>
                              <option value="CONDITIONAL">Conditional</option>
                            </select>
                          </div>
                        </div>

                        {filteredCameraPlacements.length === 0 ? (
                          <div className="empty-state-container">
                            <div className="empty-state-title">No Camera Placements Match Filter</div>
                            <div className="empty-state-desc">
                              Try clearing the location or Field of View filter above.
                            </div>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="enterprise-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '56px' }}>SN</th>
                                  <th>Establishment Location / Area</th>
                                  <th>Required Camera FOV</th>
                                  <th>Remarks, Mounting Angles &amp; Special Conditions</th>
                                  <th>Obligation</th>
                                  <th style={{ textAlign: 'right' }}>Source PDF</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredCameraPlacements.map((cam) => (
                                  <tr key={cam.requirement_code} className="table-row-hover">
                                    <td className="font-mono font-bold text-muted">#{cam.sn}</td>
                                    <td>
                                      <div className="font-bold text-main">{cam.area_or_location}</div>
                                      <div className="text-xs text-muted font-mono">
                                        {cam.requirement_code} • {cam.table_title}
                                      </div>
                                    </td>
                                    <td>
                                      <span className={getFovBadgeClass(cam.required_fov)}>
                                        {cam.required_fov || 'Specified View'}
                                      </span>
                                    </td>
                                    <td style={{ maxWidth: '380px' }}>
                                      {cam.remarks_and_conditions ? (
                                        <span className="text-main font-medium text-sm">
                                          {cam.remarks_and_conditions}
                                        </span>
                                      ) : (
                                        <span className="text-secondary text-xs">
                                          Standard SIRA mounting (&lt;=5% edge obstruction, 0% center obstruction)
                                        </span>
                                      )}
                                      {cam.condition_trigger && (
                                        <div className="badge-pill badge-warning mt-2">
                                          Condition: {cam.condition_trigger}
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <span
                                        className={
                                          cam.applicability_type === 'MANDATORY'
                                            ? 'badge-pill badge-success'
                                            : 'badge-pill badge-warning'
                                        }
                                      >
                                        {cam.applicability_type}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => openSourceCitation(cam.pdf_page, cam.area_or_location)}
                                      >
                                        <Eye size={13} /> Page {cam.pdf_page}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SECTIONS 8 & 9: ACCESS CONTROL, GUARDING, PHYSICAL SECURITY & INTRUDER ALARMS */}
                    {(activeDetailSection === 'ALL' || activeDetailSection === 'ALARM_ACCESS') && (
                      <div className="dashboard-grid-2">
                        {/* SECTION 8 */}
                        <div className="enterprise-card">
                          <div className="card-header-bar">
                            <div>
                              <h3 className="card-main-title flex items-center gap-2">
                                <Lock size={17} className="text-primary" />
                                Section 8: Access Control, Guarding, Locks, Glass, HVM &amp; SIRA Link
                              </h3>
                              <p className="card-sub-title">
                                Operational staffing, physical security barriers, and Video Guard connectivity
                              </p>
                            </div>
                          </div>
                          <div className="card-body-content flex-col gap-3">
                            {[
                              ...(estDetail.sections['8_access_control_locks_and_barriers'].access_control_items || []),
                              ...(estDetail.sections['8_access_control_locks_and_barriers'].other_physical_security_items || []),
                            ].map((item: SiraSectorRequirementItem) => {
                              let simNote: string | null = null;
                              if (item.condition_trigger?.includes('50 residential units')) {
                                simNote =
                                  simUnitsCount >= 50
                                    ? `MANDATORY (Simulator: ${simUnitsCount} units >= 50)`
                                    : `OPTIONAL/EXEMPT (Simulator: ${simUnitsCount} units < 50)`;
                              }
                              return (
                                <div
                                  key={item.requirement_code}
                                  style={{
                                    padding: '12px 14px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--bg-surface-subtle)',
                                    border: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  <div className="flex justify-between items-center gap-2" style={{ marginBottom: '4px' }}>
                                    <strong className="text-main text-sm">{item.area_or_location}</strong>
                                    <div className="flex items-center gap-2">
                                      <span className="badge-pill badge-purple">{item.system_or_equipment}</span>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => openSourceCitation(item.pdf_page, item.exact_wording)}
                                      >
                                        Page {item.pdf_page}
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-secondary text-xs" style={{ lineHeight: 1.45 }}>
                                    {item.exact_wording}
                                  </p>
                                  {simNote && (
                                    <div className="badge-pill badge-info mt-2">{simNote}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* SECTION 9 */}
                        <div className="enterprise-card">
                          <div className="card-header-bar">
                            <div>
                              <h3 className="card-main-title flex items-center gap-2">
                                <ShieldAlert size={17} className="text-amber" />
                                Section 9: Intruder Alarm &amp; Detection System ({estDetail.sections['9_alarm_and_intruder_detection'].length})
                              </h3>
                              <p className="card-sub-title">
                                3rd-Generation Intruder Alarm sensors, panic buttons, and &gt;=110 dBA siren rules
                              </p>
                            </div>
                          </div>
                          <div className="card-body-content flex-col gap-3">
                            {estDetail.sections['9_alarm_and_intruder_detection'].length === 0 ? (
                              <div
                                style={{
                                  padding: '16px',
                                  borderRadius: '8px',
                                  backgroundColor: 'var(--bg-surface-subtle)',
                                  border: '1px solid var(--border-subtle)',
                                }}
                              >
                                <div className="font-bold text-main text-sm" style={{ marginBottom: '4px' }}>
                                  No Separate Intruder Alarm Table Required for {estDetail.active_subtype?.name}
                                </div>
                                <p className="text-secondary text-xs" style={{ lineHeight: 1.5 }}>
                                  Under Part Three, {estDetail.category.chapter_title}, this establishment subtype relies on Video Surveillance (VSS), physical locks/access control, and SIRA Video Guard health connectivity.
                                </p>
                              </div>
                            ) : (
                              estDetail.sections['9_alarm_and_intruder_detection'].map((al: SiraSectorRequirementItem) => {
                                let simStatus: string | null = null;
                                if (al.condition_trigger?.includes('24/7')) {
                                  simStatus = simOperating247
                                    ? 'EXEMPTED BY RULE (Simulator: Operates 24/7)'
                                    : 'MANDATORY (Simulator: Operates < 24 hours)';
                                } else if (al.condition_trigger?.includes('100,000')) {
                                  simStatus = simHighValueItems
                                    ? 'MANDATORY (Simulator: Valuables >= 100k AED)'
                                    : 'EXEMPTED (Simulator: Valuables < 100k AED)';
                                }
                                return (
                                  <div
                                    key={al.requirement_code}
                                    style={{
                                      padding: '12px 14px',
                                      borderRadius: '8px',
                                      backgroundColor: 'var(--bg-surface-subtle)',
                                      border: '1px solid var(--border-subtle)',
                                    }}
                                  >
                                    <div className="flex justify-between items-center gap-2" style={{ marginBottom: '4px' }}>
                                      <strong className="text-main text-sm">{al.area_or_location}</strong>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => openSourceCitation(al.pdf_page, al.area_or_location)}
                                      >
                                        Page {al.pdf_page}
                                      </button>
                                    </div>
                                    <p className="text-secondary text-xs" style={{ lineHeight: 1.45 }}>
                                      {al.exact_wording}
                                    </p>
                                    {simStatus && (
                                      <div className="badge-pill badge-warning mt-2">{simStatus}</div>
                                    )}
                                  </div>
                                );
                              })
                            )}

                            {/* SECTIONS 6 & 7 ENGINEERING BASELINE SUMMARY */}
                            <div
                              style={{
                                marginTop: '6px',
                                padding: '12px 14px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-surface-subtle)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              <div className="font-bold text-main text-xs" style={{ textTransform: 'uppercase', marginBottom: '6px' }}>
                                Sections 6 &amp; 7: Network, Cabling, Power &amp; Sustainability Baseline
                              </div>
                              <ul className="text-xs text-secondary" style={{ paddingLeft: '16px', lineHeight: 1.6 }}>
                                <li>
                                  <strong>Network:</strong> {estDetail.sections['7_network_power_and_sustainability'].network_isolation}
                                </li>
                                <li>
                                  <strong>Cabling:</strong> {estDetail.sections['7_network_power_and_sustainability'].cabling_standard}
                                </li>
                                <li>
                                  <strong>UPS Backup:</strong> {estDetail.sections['7_network_power_and_sustainability'].backup_power_ups}
                                </li>
                                <li>
                                  <strong>Impact Rating:</strong> {estDetail.sections['7_network_power_and_sustainability'].vandal_resistance}
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTIONS 10, 11 & 13: LINKED PART ONE & PART TWO STANDARDS */}
                    {(activeDetailSection === 'ALL' || activeDetailSection === 'PART1_PART2') && (
                      <div className="enterprise-card">
                        <div className="card-header-bar">
                          <div>
                            <h3 className="card-main-title">
                              Sections 10, 11 &amp; 13: Linked Part One Technical Specs &amp; Part Two Operational Controls
                            </h3>
                            <p className="card-sub-title">
                              Mandatory hardware and operational standards from Pages 7–33 applicable to {estDetail.active_subtype?.name}
                            </p>
                          </div>
                        </div>
                        <div className="table-responsive">
                          <table className="enterprise-table">
                            <thead>
                              <tr>
                                <th>Code</th>
                                <th>Manual Part &amp; Category</th>
                                <th>Requirement Title &amp; Verbatim SIRA Wording</th>
                                <th>Threshold / Spec</th>
                                <th style={{ textAlign: 'right' }}>Source PDF</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                ...(estDetail.sections['13_technical_standards_part_one'] || []).slice(0, 14),
                                ...(estDetail.sections['10_operational_responsibilities_and_maintenance'] || []).slice(0, 10),
                              ].map((s: SiraTechnicalStandardItem) => (
                                <tr key={s.standard_code} className="table-row-hover">
                                  <td className="font-mono font-bold text-xs">{s.standard_code}</td>
                                  <td>
                                    <span className="badge-pill badge-info">
                                      Part {s.part_number} • {s.technical_category}
                                    </span>
                                  </td>
                                  <td style={{ maxWidth: '460px' }}>
                                    <div className="font-bold text-main text-sm">{s.title}</div>
                                    <div className="text-secondary text-xs">{s.exact_wording}</div>
                                  </td>
                                  <td>
                                    <span className="badge-pill badge-success">
                                      {s.numeric_threshold || 'Mandatory'}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => openSourceCitation(s.pdf_page, s.title)}
                                    >
                                      Page {s.pdf_page}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: CAMERA PLACEMENT & FOV OPTICAL MATRIX ==================== */}
      {activeTab === 'CAMERA_FOV_MATRIX' && (
        <div className="flex-col gap-4">
          {/* 7 OFFICIAL SIRA CAMERA FIELD-OF-VIEW OPTICAL CARDS (PAGES 24-26) */}
          <div className="enterprise-card">
            <div className="card-header-bar">
              <div>
                <h3 className="card-main-title flex items-center gap-2">
                  <Camera size={18} className="text-primary" />
                  Part Two, Chapter 1: Official SIRA Camera Field-of-View (FOV) Optical &amp; Pixel Density Standards (Pages 24–26)
                </h3>
                <p className="card-sub-title">
                  Reference target height = 1.6m human standard target. Click any FOV card to filter camera placements below.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openSourceCitation(24, 'Camera View Range')}
              >
                <Eye size={14} /> Open FOV Pages (pp. 24–26)
              </button>
            </div>

            <div className="card-body-content">
              <div className="sira-fov-grid">
                {fovTypes.map((f) => (
                  <div key={f.fov_code} className="sira-fov-card">
                    <div>
                      <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                        <span className={getFovBadgeClass(f.name)}>{f.name}</span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          onClick={() => openSourceCitation(f.pdf_page, f.name)}
                        >
                          Page {f.pdf_page}
                        </button>
                      </div>
                      <div className="font-bold text-main text-sm" style={{ marginBottom: '4px' }}>
                        Screen Target: <span className="text-primary">{f.min_screen_percentage}</span>
                      </div>
                      <div className="text-xs font-semibold text-secondary" style={{ marginBottom: '6px' }}>
                        Pixel Density (PPM): {f.min_pixel_density_ppm}
                      </div>
                      <div className="text-xs text-muted" style={{ lineHeight: 1.45 }}>
                        <strong>Angles:</strong> H: {f.horizontal_angle_limit} | V: {f.vertical_angle_limit}
                        <br />
                        <strong>WDR:</strong> {f.wdr_requirement}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CAMERA PLACEMENT SELECTOR & MATRIX */}
          <div className="sira-toolbar">
            <select
              className="sira-select"
              style={{ minWidth: '260px', fontWeight: 600 }}
              value={selectedSlug}
              onChange={(e) => loadEstablishmentDetail(e.target.value)}
            >
              {allEstablishments.map((c) => (
                <option key={c.slug} value={c.slug}>
                  Ch. {c.chapter_number}: {c.display_name} ({c.camera_count} cameras)
                </option>
              ))}
            </select>

            {estDetail?.subtypes?.length > 1 && (
              <select
                className="sira-select"
                value={estDetail.active_subtype?.subtype_code || ''}
                onChange={(e) => loadEstablishmentDetail(selectedSlug, e.target.value)}
              >
                {estDetail.subtypes.map((s: any) => (
                  <option key={s.subtype_code} value={s.subtype_code}>
                    Subtype: {s.name} ({s.requirement_count} rules)
                  </option>
                ))}
              </select>
            )}

            <div className="sira-search-wrap">
              <Search size={15} />
              <input
                type="text"
                className="sira-search-input"
                placeholder="Filter camera locations (e.g., entrance, elevator, classroom, safe, perimeter)..."
                value={detailSearch}
                onChange={(e) => setDetailSearch(e.target.value)}
              />
            </div>

            <select
              className="sira-select"
              value={camFovFilter}
              onChange={(e) => setCamFovFilter(e.target.value)}
            >
              <option value="ALL">All FOV Classifications</option>
              <option value="Identification">Identification View</option>
              <option value="Recognition">Recognition View</option>
              <option value="Observation">Observation View</option>
              <option value="Detection">Detection View</option>
              <option value="Monitoring">Monitoring View</option>
              <option value="ANPR">ANPR View</option>
            </select>
          </div>

          <div className="enterprise-card">
            <div className="card-header-bar">
              <div>
                <h3 className="card-main-title">
                  Camera Placement Matrix for {estDetail?.active_subtype?.name || estDetail?.category?.display_name} ({filteredCameraPlacements.length} Positions)
                </h3>
                <p className="card-sub-title">
                  Part Three, {estDetail?.category?.chapter_title} • Minimum Video Retention: {estDetail?.sections?.['3_required_security_systems_summary']?.minimum_retention_days || 31} Days
                </p>
              </div>
            </div>
            <div className="table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>SN</th>
                    <th>Camera Location / Facility Zone</th>
                    <th>Required Field of View (FOV)</th>
                    <th>Verbatim SIRA Requirement &amp; Mounting Remarks</th>
                    <th>Obligation</th>
                    <th style={{ textAlign: 'right' }}>Source PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCameraPlacements.map((cam) => (
                    <tr key={cam.requirement_code} className="table-row-hover">
                      <td className="font-mono font-bold text-muted">#{cam.sn}</td>
                      <td>
                        <div className="font-bold text-main">{cam.area_or_location}</div>
                        <div className="text-xs text-muted font-mono">{cam.requirement_code}</div>
                      </td>
                      <td>
                        <span className={getFovBadgeClass(cam.required_fov)}>
                          {cam.required_fov || 'Specified View'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '420px' }}>
                        <div className="text-sm text-main">{cam.exact_wording}</div>
                        {cam.remarks_and_conditions && (
                          <div className="text-xs text-primary font-semibold mt-1">
                            Note: {cam.remarks_and_conditions}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge-pill badge-success">{cam.applicability_type}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openSourceCitation(cam.pdf_page, cam.area_or_location)}
                        >
                          <Eye size={13} /> Page {cam.pdf_page}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: TECHNICAL & OPERATIONAL STANDARDS LIBRARY ==================== */}
      {activeTab === 'TECHNICAL_STANDARDS' && (
        <div className="flex-col gap-4">
          {/* HORIZONTAL FILTER BAR */}
          <div className="sira-toolbar">
            <div className="sira-search-wrap">
              <Search size={16} />
              <input
                type="text"
                className="sira-search-input"
                placeholder="Search Part 1 & 2 standards (e.g., 1080, H.265, 31 days, 110 dBA, CAT 6, IK10, 2320, 90 seconds, HVM)..."
                value={stdSearch}
                onChange={(e) => setStdSearch(e.target.value)}
              />
            </div>

            <select
              className="sira-select"
              value={stdPartFilter || 'ALL'}
              onChange={(e) =>
                setStdPartFilter(e.target.value === 'ALL' ? undefined : Number(e.target.value))
              }
            >
              <option value="ALL">All Parts (Part One + Part Two)</option>
              <option value="1">Part One: Technical Specifications (pp. 7–22)</option>
              <option value="2">Part Two: Operational Controls (pp. 23–33)</option>
            </select>

            <select
              className="sira-select"
              value={stdCategoryFilter}
              onChange={(e) => setStdCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Technical Categories ({stdCategories.length})</option>
              {stdCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* CLICKABLE CATEGORY PILLS */}
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`sira-chip ${stdCategoryFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStdCategoryFilter('ALL')}
            >
              All Categories ({standards.length})
            </button>
            {stdCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`sira-chip ${stdCategoryFilter === cat ? 'active' : ''}`}
                onClick={() => setStdCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="enterprise-card">
            <div className="card-header-bar">
              <div>
                <h3 className="card-main-title">
                  Part One Technical Specifications &amp; Part Two Operational Controls ({standards.length} Standards)
                </h3>
                <p className="card-sub-title">
                  Mandatory engineering thresholds, units, conditions, and SIRA prior-approval triggers from Pages 7–33
                </p>
              </div>
            </div>
            <div className="table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Manual Part &amp; Section</th>
                    <th>Category</th>
                    <th>Requirement Title, Verbatim Text &amp; Engineering Summary</th>
                    <th>Threshold / Spec</th>
                    <th>Conditions &amp; Approvals</th>
                    <th style={{ textAlign: 'right' }}>Source PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {standards.map((std) => (
                    <tr key={std.standard_code} className="table-row-hover">
                      <td className="font-mono font-bold text-xs">{std.standard_code}</td>
                      <td>
                        <div className="font-bold text-main text-xs">Part {std.part_number}</div>
                        <div className="text-xs text-muted">{std.section_title}</div>
                      </td>
                      <td>
                        <span className="badge-pill badge-purple">{std.technical_category}</span>
                      </td>
                      <td style={{ maxWidth: '430px' }}>
                        <div className="font-bold text-main text-sm">{std.title}</div>
                        <div className="text-xs text-main" style={{ marginTop: '2px' }}>
                          &ldquo;{std.exact_wording}&rdquo;
                        </div>
                        {std.simplified_explanation && (
                          <div className="text-xs text-secondary" style={{ marginTop: '3px' }}>
                            Summary: {std.simplified_explanation}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge-pill badge-info">
                          {std.numeric_threshold || 'Mandatory'}
                          {std.unit_of_measurement ? ` (${std.unit_of_measurement})` : ''}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px', fontSize: '12px' }}>
                        <span className="text-secondary">
                          {std.conditions_and_exceptions || 'Applies to all regulated systems'}
                        </span>
                        {std.approval_requirement && (
                          <div className="badge-pill badge-warning mt-2">
                            {std.approval_requirement}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openSourceCitation(std.pdf_page, std.title)}
                        >
                          <Eye size={13} /> Page {std.pdf_page}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: COMPLIANCE AUDIT CHECKLISTS ==================== */}
      {activeTab === 'COMPLIANCE_PROJECTS' && (
        <div className="flex-col gap-4">
          {/* PROJECT SELECTOR & EXPORT TOOLBAR */}
          <div className="sira-toolbar" style={{ justifyContent: 'space-between' }}>
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap', flex: '1 1 420px' }}>
              <span className="font-bold text-main text-sm">Active Audit Project:</span>
              <select
                className="sira-select"
                style={{ minWidth: '340px', fontWeight: 600 }}
                value={activeProject?.project?.id || ''}
                onChange={async (e) => {
                  const id = Number(e.target.value);
                  if (id) {
                    const d = await siraComplianceApi.getProjectDetail(id);
                    setActiveProject(d);
                  }
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code} — {p.project_name} ({p.metrics?.compliance_score_pct ?? 0}% Compliant)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsCreatingProject(!isCreatingProject)}
              >
                + New Audit Project
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleExportProjectCsv}
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => window.print()}
              >
                <Printer size={14} /> Print / Save PDF Report
              </button>
            </div>
          </div>

          {/* CREATE PROJECT FORM */}
          {isCreatingProject && (
            <form onSubmit={handleCreateCustomProject} className="enterprise-card">
              <div className="card-header-bar">
                <h4 className="card-main-title">Create New Establishment SIRA Compliance Audit Project</h4>
              </div>
              <div className="card-body-content flex-col gap-3">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Project Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Dubai Marina Mall SIRA Audit"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client / Facility Entity Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Marina Retail LLC"
                      value={newProjectClient}
                      onChange={(e) => setNewProjectClient(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">DED Trade License No.</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., DED-884920"
                      value={newProjectLicense}
                      onChange={(e) => setNewProjectLicense(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Establishment Chapter (1–43)</label>
                    <select
                      className="form-select"
                      value={newProjectSlug}
                      onChange={(e) => {
                        const slug = e.target.value;
                        setNewProjectSlug(slug);
                        const found = allEstablishments.find((item) => item.slug === slug);
                        setNewProjectSubtype(found?.subtypes?.[0]?.subtype_code || '');
                      }}
                    >
                      {allEstablishments.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          Ch. {c.chapter_number}: {c.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="card-footer-bar flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsCreatingProject(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Generate SIRA Checklist Project
                </button>
              </div>
            </form>
          )}

          {activeProject && (
            <>
              {/* PROJECT PROGRESS & METRICS CARD */}
              <div className="enterprise-card">
                <div className="card-body-content flex-col gap-3">
                  <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 className="card-main-title" style={{ fontSize: '17px' }}>
                        {activeProject.project?.project_name}
                      </h3>
                      <div className="text-xs text-secondary mt-1">
                        Code: <strong>{activeProject.project?.project_code}</strong> • Entity:{' '}
                        <strong>{activeProject.project?.client_or_entity_name}</strong> • License:{' '}
                        <strong>{activeProject.project?.trade_license_no}</strong> • Lead Assessor:{' '}
                        <strong>{activeProject.project?.lead_assessor}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                      <span className="badge-pill badge-success">
                        Compliant: {activeProject.project?.metrics?.compliant || 0}
                      </span>
                      <span className="badge-pill badge-danger">
                        Non-Compliant: {activeProject.project?.metrics?.non_compliant || 0}
                      </span>
                      <span className="badge-pill badge-warning">
                        N/A (Justified): {activeProject.project?.metrics?.not_applicable || 0}
                      </span>
                      <span className="badge-pill badge-neutral">
                        Not Assessed: {activeProject.project?.metrics?.not_assessed || 0}
                      </span>
                      <span className="badge-pill badge-info">
                        Score: {activeProject.project?.metrics?.compliance_score_pct ?? 0}%
                      </span>
                    </div>
                  </div>

                  <div className="sira-progress-track">
                    <div
                      className="sira-progress-fill"
                      style={{ width: `${activeProject.project?.metrics?.compliance_score_pct ?? 0}%` }}
                    />
                  </div>

                  <div className="sira-toolbar" style={{ padding: '8px 12px', backgroundColor: 'var(--bg-surface-subtle)' }}>
                    <div className="sira-search-wrap">
                      <Search size={14} />
                      <input
                        type="text"
                        className="sira-search-input"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                        placeholder="Filter checklist items by location, code, or requirement..."
                        value={checklistSearch}
                        onChange={(e) => setChecklistSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="sira-select"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                      value={checklistFilterStatus}
                      onChange={(e) => setChecklistFilterStatus(e.target.value)}
                    >
                      <option value="ALL">All Statuses ({activeProject.items?.length || 0})</option>
                      <option value="NOT_ASSESSED">Not Assessed</option>
                      <option value="COMPLIANT">Compliant</option>
                      <option value="NON_COMPLIANT">Non-Compliant</option>
                      <option value="NOT_APPLICABLE">Not Applicable</option>
                      <option value="PENDING_VERIFICATION">Pending Verification</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CHECKLIST ITEMS TABLE */}
              <div className="enterprise-card">
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Section</th>
                        <th>Requirement / Camera Location</th>
                        <th>FOV / Threshold</th>
                        <th>Status</th>
                        <th>Assessor Notes &amp; N/A Justification</th>
                        <th>Source</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeProject.items || [])
                        .filter((item: any) => {
                          if (
                            checklistFilterStatus !== 'ALL' &&
                            item.compliance_status !== checklistFilterStatus
                          ) {
                            return false;
                          }
                          if (checklistSearch.trim()) {
                            const q = checklistSearch.toLowerCase();
                            return (
                              item.area_or_title.toLowerCase().includes(q) ||
                              item.requirement_code.toLowerCase().includes(q) ||
                              item.exact_wording.toLowerCase().includes(q)
                            );
                          }
                          return true;
                        })
                        .map((item: any) => (
                          <React.Fragment key={item.id}>
                            <tr className="table-row-hover">
                              <td className="font-mono font-bold text-xs">{item.requirement_code}</td>
                              <td>
                                <span className="badge-pill badge-neutral">{item.section_group}</span>
                              </td>
                              <td style={{ maxWidth: '340px' }}>
                                <div className="font-bold text-main text-sm">{item.area_or_title}</div>
                                <div className="text-xs text-secondary">{item.exact_wording}</div>
                              </td>
                              <td>
                                <span className={getFovBadgeClass(item.required_fov_or_threshold)}>
                                  {item.required_fov_or_threshold}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={
                                    item.compliance_status === 'COMPLIANT'
                                      ? 'badge-pill badge-success'
                                      : item.compliance_status === 'NON_COMPLIANT'
                                      ? 'badge-pill badge-danger'
                                      : item.compliance_status === 'NOT_APPLICABLE'
                                      ? 'badge-pill badge-warning'
                                      : 'badge-pill badge-neutral'
                                  }
                                >
                                  {item.compliance_status}
                                </span>
                              </td>
                              <td style={{ fontSize: '12px', maxWidth: '250px' }}>
                                {item.not_applicable_explanation && (
                                  <div className="text-amber font-bold">
                                    N/A Reason: {item.not_applicable_explanation}
                                  </div>
                                )}
                                <span className="text-secondary">{item.assessor_notes || '—'}</span>
                                {item.evidence_reference && (
                                  <div className="text-primary text-xs font-semibold">
                                    Evidence: {item.evidence_reference}
                                  </div>
                                )}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openSourceCitation(item.pdf_page, item.area_or_title)}
                                >
                                  Page {item.pdf_page}
                                </button>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => {
                                    setEditingItemId(item.id);
                                    setItemStatusDraft(
                                      item.compliance_status === 'NOT_ASSESSED' ? 'COMPLIANT' : item.compliance_status
                                    );
                                    setItemNotesDraft(item.assessor_notes || '');
                                    setItemNaExplanationDraft(item.not_applicable_explanation || '');
                                    setItemEvidenceDraft(item.evidence_reference || '');
                                    setItemUpdateError(null);
                                  }}
                                >
                                  Assess
                                </button>
                              </td>
                            </tr>

                            {editingItemId === item.id && (
                              <tr>
                                <td colSpan={8} style={{ backgroundColor: 'var(--bg-surface-subtle)', padding: '16px' }}>
                                  <div className="flex-col gap-3">
                                    <div className="font-bold text-main text-sm">
                                      Update Compliance Assessment: {item.requirement_code} — {item.area_or_title}
                                    </div>
                                    {itemUpdateError && (
                                      <div className="alert-banner alert-danger">{itemUpdateError}</div>
                                    )}
                                    <div className="sira-toolbar" style={{ padding: '10px' }}>
                                      <select
                                        className="sira-select"
                                        value={itemStatusDraft}
                                        onChange={(e) => setItemStatusDraft(e.target.value)}
                                      >
                                        <option value="COMPLIANT">COMPLIANT</option>
                                        <option value="NON_COMPLIANT">NON_COMPLIANT</option>
                                        <option value="NOT_APPLICABLE">NOT_APPLICABLE (Mandatory Justification)</option>
                                        <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
                                        <option value="NOT_ASSESSED">NOT_ASSESSED</option>
                                      </select>

                                      <input
                                        type="text"
                                        className="sira-search-input"
                                        style={{ flex: '1 1 240px', paddingLeft: '12px' }}
                                        placeholder="Assessor inspection notes / camera ID..."
                                        value={itemNotesDraft}
                                        onChange={(e) => setItemNotesDraft(e.target.value)}
                                      />

                                      <input
                                        type="text"
                                        className="sira-search-input"
                                        style={{ flex: '1 1 200px', paddingLeft: '12px' }}
                                        placeholder="Evidence Ref (e.g., Drawing CAD-02, Photo #4)"
                                        value={itemEvidenceDraft}
                                        onChange={(e) => setItemEvidenceDraft(e.target.value)}
                                      />
                                    </div>

                                    {itemStatusDraft === 'NOT_APPLICABLE' && (
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="MANDATORY: Enter regulatory/engineering justification why this requirement is Not Applicable..."
                                        value={itemNaExplanationDraft}
                                        onChange={(e) => setItemNaExplanationDraft(e.target.value)}
                                        style={{ borderColor: '#d97706' }}
                                      />
                                    )}

                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setEditingItemId(null)}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleSaveItemAssessment(item.id)}
                                      >
                                        Save Assessment
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== TAB 5: GLOBAL SEARCH & EXTRACTION QA ==================== */}
      {activeTab === 'GLOBAL_SEARCH' && (
        <div className="flex-col gap-4">
          {/* HORIZONTAL GLOBAL SEARCH BAR */}
          <form onSubmit={handleRunGlobalSearch} className="sira-toolbar">
            <div className="sira-search-wrap">
              <Search size={16} />
              <input
                type="text"
                className="sira-search-input"
                placeholder="Search across all 140 PDF pages, 43 chapters, camera placements, FOV views, definitions, and technical specs..."
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
              />
            </div>

            <select
              className="sira-select"
              value={globalModuleFilter}
              onChange={(e) => setGlobalModuleFilter(e.target.value)}
            >
              <option value="ALL">All Modules &amp; 140 PDF Pages</option>
              <option value="ESTABLISHMENTS">Establishments (43 Chapters)</option>
              <option value="SECTOR_REQUIREMENTS">Sector Camera/Alarm Requirements</option>
              <option value="TECHNICAL_STANDARDS">Part 1 &amp; 2 Technical Standards</option>
              <option value="DEFINITIONS">Official Definitions</option>
              <option value="PDF_PAGES">Full-Text 140 PDF Pages</option>
            </select>

            <button type="submit" className="btn btn-primary btn-md" disabled={isSearchingGlobal}>
              <Search size={15} />
              {isSearchingGlobal ? 'Searching...' : 'Search Manual'}
            </button>
          </form>

          {/* INSTANT QUICK-SEARCH SUGGESTION CHIPS */}
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <span className="text-xs font-bold text-secondary" style={{ textTransform: 'uppercase' }}>
              Quick Search Topics:
            </span>
            {[
              'camera placement',
              'Identification View',
              'Recognition View',
              'classroom',
              'elevator',
              'safe',
              'ANPR',
              '31 days',
              '110 dBA',
              'penetration-resistant glass',
              'HVM',
              'nursery',
              'hospital',
              'gold',
              'data center',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                className={`sira-chip ${globalQuery.toLowerCase() === chip.toLowerCase() ? 'active' : ''}`}
                onClick={() => executeGlobalSearch(chip, globalModuleFilter)}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* GLOBAL SEARCH RESULTS */}
          {globalResults && (
            <div className="enterprise-card">
              <div className="card-header-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 className="card-main-title">
                    Global Search Results for &ldquo;{globalResults.query || 'All Modules'}&rdquo;
                  </h3>
                  <p className="card-sub-title">
                    Multi-token search across Establishments, Sector Requirements, Technical Standards, Definitions, and 140 PDF Pages
                  </p>
                </div>
                <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                  <span className="badge-pill badge-success">
                    Establishments: {globalResults.counts.establishments}
                  </span>
                  <span className="badge-pill badge-info">
                    Sector Rules: {globalResults.counts.sector_requirements}
                  </span>
                  <span className="badge-pill badge-purple">
                    Technical Standards: {globalResults.counts.technical_standards}
                  </span>
                  <span className="badge-pill badge-warning">
                    Matching PDF Pages: {globalResults.counts.pdf_pages}
                  </span>
                </div>
              </div>

              <div className="card-body-content flex-col gap-4">
                {globalResults.sector_requirements?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-main text-sm" style={{ marginBottom: '8px' }}>
                      Matching Establishment Sector Requirements ({globalResults.sector_requirements.length})
                    </h4>
                    <div className="table-responsive">
                      <table className="enterprise-table">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Establishment Chapter &amp; Subtype</th>
                            <th>Location / Requirement</th>
                            <th>Required FOV / System</th>
                            <th style={{ textAlign: 'right' }}>Source PDF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {globalResults.sector_requirements.slice(0, 25).map((r: any) => (
                            <tr key={r.requirement_code} className="table-row-hover">
                              <td className="font-mono font-bold text-xs">{r.requirement_code}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    loadEstablishmentDetail(r.category_slug);
                                    setActiveTab('WORKSPACE');
                                    setExplorerViewMode('SPLIT');
                                  }}
                                >
                                  {r.chapter_title}
                                </button>
                              </td>
                              <td className="font-semibold text-main">{r.area_or_location}</td>
                              <td>
                                <span className={getFovBadgeClass(r.required_fov)}>
                                  {r.required_fov || r.system_or_equipment}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openSourceCitation(r.pdf_page, r.area_or_location)}
                                >
                                  <Eye size={13} /> Page {r.pdf_page}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {globalResults.technical_standards?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-main text-sm" style={{ marginBottom: '8px' }}>
                      Matching Part One &amp; Part Two Technical Standards ({globalResults.technical_standards.length})
                    </h4>
                    <div className="table-responsive">
                      <table className="enterprise-table">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Category</th>
                            <th>Title &amp; Verbatim Text</th>
                            <th>Threshold</th>
                            <th style={{ textAlign: 'right' }}>Source PDF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {globalResults.technical_standards.slice(0, 15).map((s: any) => (
                            <tr key={s.standard_code} className="table-row-hover">
                              <td className="font-mono font-bold text-xs">{s.standard_code}</td>
                              <td>
                                <span className="badge-pill badge-purple">{s.technical_category}</span>
                              </td>
                              <td>
                                <div className="font-bold text-main text-sm">{s.title}</div>
                                <div className="text-xs text-secondary">{s.exact_wording}</div>
                              </td>
                              <td>
                                <span className="badge-pill badge-info">{s.numeric_threshold || 'Mandatory'}</span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openSourceCitation(s.pdf_page, s.title)}
                                >
                                  Page {s.pdf_page}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {globalResults.pdf_pages?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-main text-sm" style={{ marginBottom: '8px' }}>
                      Full-Text Matches in the 140-Page SIRA PDF ({globalResults.pdf_pages.length})
                    </h4>
                    <div className="flex-col gap-2">
                      {globalResults.pdf_pages.slice(0, 15).map((p: any) => (
                        <div
                          key={p.pdf_page_number}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-surface-subtle)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '14px',
                          }}
                        >
                          <div>
                            <div className="font-bold text-main text-sm">
                              PDF Page {p.pdf_page_number} — {p.chapter_title || p.part_title}
                            </div>
                            <div className="text-xs text-secondary">{p.snippet}</div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openSourceCitation(p.pdf_page_number, globalQuery)}
                          >
                            Open Page {p.pdf_page_number}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EXTRACTION QA & VERIFICATION LOG */}
          <div className="enterprise-card">
            <div className="card-header-bar">
              <div>
                <h3 className="card-main-title">
                  Data Extraction Quality Assurance &amp; Verification Registry
                </h3>
                <p className="card-sub-title">
                  In accordance with Source-of-Truth Rule #8, any external annex dependency, translation notation, or multi-chapter overlap in the 140-page PDF is explicitly logged below rather than guessed.
                </p>
              </div>
            </div>
            <div className="table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Record Code</th>
                    <th>Target Section</th>
                    <th>Issue Classification</th>
                    <th>Original Extracted Text</th>
                    <th>Engineering &amp; Regulatory Verification Note</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Page</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.extraction_reviews || []).map((rev: any) => (
                    <tr key={rev.record_code} className="table-row-hover">
                      <td className="font-mono font-bold text-xs">{rev.record_code}</td>
                      <td className="font-semibold text-main">{rev.target_reference}</td>
                      <td>
                        <span className="badge-pill badge-warning">{rev.issue_type}</span>
                      </td>
                      <td style={{ maxWidth: '280px', fontSize: '12px' }}>&ldquo;{rev.original_extracted_text}&rdquo;</td>
                      <td style={{ maxWidth: '340px', fontSize: '12px' }} className="text-secondary">
                        {rev.review_note}
                      </td>
                      <td>
                        <span className="badge-pill badge-info">{rev.status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openSourceCitation(rev.pdf_page, rev.target_reference)}
                        >
                          Page {rev.pdf_page}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 1: DEFINITIONS & FOV GLOSSARY ==================== */}
      {isGlossaryOpen && (
        <div className="modal-backdrop" onClick={() => setIsGlossaryOpen(false)}>
          <div
            className="modal-container max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  Module A: Official SIRA Definitions (Page 6) &amp; Camera Field-of-View Glossary (Pages 24–26)
                </h3>
                <p className="modal-subtitle">
                  Searchable reference of all 17 official terms and 7 camera Field-of-View classifications.
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setIsGlossaryOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body flex-col gap-4">
              <div className="sira-search-wrap" style={{ flex: 'none' }}>
                <Search size={16} />
                <input
                  type="text"
                  className="sira-search-input"
                  placeholder="Filter definitions or camera views (e.g., Identification, Recognition, Corridors, Standard Target)..."
                  value={glossarySearch}
                  onChange={(e) => setGlossarySearch(e.target.value)}
                />
              </div>

              <div>
                <h4 className="font-bold text-main text-sm" style={{ marginBottom: '8px' }}>
                  Official Definitions Table (Page 6 of 140)
                </h4>
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>SN</th>
                        <th>Official Term</th>
                        <th>Verbatim SIRA Definition (Page 6)</th>
                        <th>Practical Engineering Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {definitions
                        .filter(
                          (d) =>
                            !glossarySearch.trim() ||
                            d.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
                            d.definition_text.toLowerCase().includes(glossarySearch.toLowerCase())
                        )
                        .map((d) => (
                          <tr key={d.sn}>
                            <td className="font-mono font-bold">#{d.sn}</td>
                            <td className="font-bold text-primary">{d.term}</td>
                            <td className="text-sm">{d.definition_text}</td>
                            <td className="text-xs text-secondary">{d.simplified_explanation}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-main text-sm" style={{ marginBottom: '8px' }}>
                  Camera Field-of-View (FOV) Optical &amp; Pixel Density Standards (Pages 24–26)
                </h4>
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>FOV Classification</th>
                        <th>Min Screen %</th>
                        <th>Min Pixel Density (PPM)</th>
                        <th>Mounting Angles &amp; WDR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fovTypes.map((f) => (
                        <tr key={f.fov_code}>
                          <td className="font-bold text-main">{f.name}</td>
                          <td>{f.min_screen_percentage}</td>
                          <td>{f.min_pixel_density_ppm}</td>
                          <td className="text-xs text-secondary">
                            H: {f.horizontal_angle_limit} | V: {f.vertical_angle_limit} ({f.wdr_requirement})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: SOURCE PDF PAGE & CITATION VIEWER ==================== */}
      {sourceModalPage !== null && (
        <div className="modal-backdrop" onClick={() => setSourceModalPage(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '1220px', width: '96%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  Source Reference Viewer — PDF Page {sourceModalPage} of 140
                </h3>
                <p className="modal-subtitle">
                  Administrative Resolution No. (13) of 2025 Approving the Preventive Systems Manual (SIRA, Dubai)
                  {sourceModalHighlight ? ` • Highlighting: "${sourceModalHighlight}"` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={sourceModalPage <= 1}
                  onClick={() => openSourceCitation(Math.max(1, sourceModalPage - 1))}
                >
                  ← Prev Page
                </button>
                <span className="font-bold text-sm">Page {sourceModalPage} / 140</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={sourceModalPage >= 140}
                  onClick={() => openSourceCitation(Math.min(140, sourceModalPage + 1))}
                >
                  Next Page →
                </button>
                <a
                  href={siraComplianceApi.getSourcePdfUrl(sourceModalPage)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  <ExternalLink size={13} /> Open Full PDF
                </a>
                <button type="button" className="modal-close-btn" onClick={() => setSourceModalPage(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div
              className="modal-body"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(420px, 1.25fr) minmax(340px, 1fr)',
                gap: '16px',
              }}
            >
              <div
                style={{
                  border: '1px solid var(--border-card)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  minHeight: '540px',
                  background: '#1e293b',
                }}
              >
                <iframe
                  key={sourceModalPage}
                  src={siraComplianceApi.getSourcePdfUrl(sourceModalPage)}
                  title={`SIRA PDF Page ${sourceModalPage}`}
                  style={{ width: '100%', height: '560px', border: 'none' }}
                />
              </div>

              <div className="flex-col gap-3" style={{ maxHeight: '560px', overflowY: 'auto' }}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="font-bold text-main text-sm" style={{ marginBottom: '6px' }}>
                    Extracted Verbatim Text (Page {sourceModalPage} of 140)
                  </div>
                  {isLoadingSourcePage ? (
                    <div className="text-xs text-secondary">Loading page text...</div>
                  ) : (
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {sourcePageData?.extracted_text || 'Page text indexed.'}
                    </pre>
                  )}
                </div>

                {sourcePageData?.citations?.length > 0 && (
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="font-bold text-main text-sm" style={{ marginBottom: '8px' }}>
                      Structured Requirements Cited on Page {sourceModalPage} ({sourcePageData.citations.length})
                    </div>
                    <div className="flex-col gap-2">
                      {sourcePageData.citations.map((c: any, idx: number) => (
                        <div
                          key={`${c.entity_code}-${idx}`}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '12px',
                          }}
                        >
                          <strong className="text-main">
                            [{c.entity_code}] {c.chapter_name} ({c.section_name})
                          </strong>
                          <div className="text-secondary mt-1">{c.excerpt}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
