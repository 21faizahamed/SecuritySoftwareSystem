import { useEffect, useState, useCallback } from 'react';
import {
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNotification } from '../../components/common/Notification';
import { systemApi } from '../../services/systemApi';
import type { SystemHealth, DatabaseStatus } from '../../types';

export const SettingsPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();

  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>('');

  const fetchDiagnostics = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [hRes, dbRes] = await Promise.all([
        systemApi.getHealth(),
        systemApi.getDatabaseStatus(),
      ]);
      setHealth(hRes);
      setDbStatus(dbRes);
      setLastChecked(new Date().toLocaleTimeString());
      if (manual) showSuccess('System diagnostics refreshed from live MySQL query.');
    } catch (err: any) {
      showError(err.message || 'Error querying system diagnostics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showSuccess, showError]);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  if (isLoading) {
    return <LoadingSpinner message="Querying live backend and database diagnostics..." fullHeight />;
  }

  const isBackendConnected = health?.status === 'ok';
  const isDbConnected = dbStatus?.status === 'connected';

  const phases = [
    { num: 'Phase 1', title: 'Local Development Environment & Base Stack', status: 'completed' },
    { num: 'Phase 2', title: 'MySQL + XAMPP Database & utf8mb4 Schema', status: 'completed' },
    { num: 'Phase 3', title: 'Modular FastAPI Backend Architecture & Services', status: 'completed' },
    { num: 'Phase 4', title: 'React Frontend Architecture & Enterprise UI', status: 'active' },
    { num: 'Phase 5', title: 'User Authentication, JWT & Role Permissions', status: 'future' },
    { num: 'Phase 6', title: 'AI Computer Vision & YOLO Evidence Ingestion', status: 'future' },
    { num: 'Phase 7', title: 'Compliance Engine & Multi-Factor Scoring', status: 'future' },
    { num: 'Phase 8', title: 'Auditor Decision & Approval Workflow', status: 'future' },
    { num: 'Phase 9', title: 'Security Certificate PDF Generation & QR Verification', status: 'future' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">System Settings & Live Diagnostics</h1>
          <p className="page-subheading">
            Backend API integration status, database connection parameters, and architectural roadmap
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />}
          onClick={() => fetchDiagnostics(true)}
          disabled={isRefreshing}
        >
          Run Live Diagnostics
        </Button>
      </div>

      {/* Live Health Overview Grid */}
      <div className="dashboard-grid-2">
        {/* Backend Server Status Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Server size={20} className="text-primary" />
              <span>FastAPI Backend Service</span>
            </div>
          }
          subtitle="Python asynchronous REST API server health"
          action={
            <span
              className={`status-pill ${isBackendConnected ? 'running' : 'disconnected'}`}
            >
              {isBackendConnected ? '✓ Operational' : '✗ Offline'}
            </span>
          }
        >
          <div className="settings-kv-list">
            <div className="settings-kv-row">
              <span className="settings-kv-key">Application Name:</span>
              <span className="settings-kv-val">{health?.application || 'Security Certificate System'}</span>
            </div>
            <div className="settings-kv-row">
              <span className="settings-kv-key">Architecture Version:</span>
              <span className="settings-kv-val font-mono">{health?.version || 'v0.3.0'}</span>
            </div>
            <div className="settings-kv-row">
              <span className="settings-kv-key">Environment Mode:</span>
              <span className="settings-kv-val uppercase font-semibold">{health?.environment || 'development'}</span>
            </div>
            <div className="settings-kv-row">
              <span className="settings-kv-key">API Base URL:</span>
              <span className="settings-kv-val font-mono text-sm text-primary">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}
              </span>
            </div>
            <div className="settings-kv-row">
              <span className="settings-kv-key">Interactive Documentation:</span>
              <span className="settings-kv-val font-mono text-sm">
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  /docs (Swagger UI)
                </a>{' '}
                •{' '}
                <a
                  href="http://localhost:8000/redoc"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  /redoc (ReDoc)
                </a>
              </span>
            </div>
          </div>
        </Card>

        {/* Database Connection Status Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Database size={20} className="text-primary" />
              <span>MySQL Database Engine</span>
            </div>
          }
          subtitle="Real-time SQL query health check via XAMPP MySQL"
          action={
            <span className={`status-pill ${isDbConnected ? 'running' : 'disconnected'}`}>
              {isDbConnected ? '✓ Connected' : '✗ Disconnected'}
            </span>
          }
        >
          <div className="settings-kv-list">
            <div className="settings-kv-row">
              <span className="settings-kv-key">Target Database:</span>
              <span className="settings-kv-val font-bold text-main">
                {dbStatus?.database || 'security_certificate_system'}
              </span>
            </div>
            <div className="settings-kv-row">
              <span className="settings-kv-key">Server Engine / Version:</span>
              <span className="settings-kv-val font-mono">{dbStatus?.version || '10.4.32-MariaDB'}</span>
            </div>
            <div className="settings-kv-row">
              <span className="settings-kv-key">Host & Port:</span>
              <span className="settings-kv-val font-mono">
                {dbStatus?.host || 'localhost'}:{dbStatus?.port || 4306}
              </span>
            </div>
            <div className="settings-kv-row">
              <span className="settings-kv-key">Character Set:</span>
              <span className="settings-kv-val font-mono text-sm">utf8mb4 (Arabic & Unicode Ready)</span>
            </div>
            <div className="settings-kv-row">
              <span className="settings-kv-key">Verified Active Tables:</span>
              <div className="table-tags-flex">
                {dbStatus?.tables && dbStatus.tables.length > 0 ? (
                  dbStatus.tables.map((tbl) => (
                    <span key={tbl} className="table-tag-pill">
                      {tbl}
                    </span>
                  ))
                ) : (
                  <span className="text-muted">No tables returned</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Raw Health JSON & Diagnostics Output */}
      <Card
        title="Live Diagnostic Payload"
        subtitle={`Last query executed at ${lastChecked || 'just now'}`}
      >
        <pre className="diagnostic-json-box">
          {JSON.stringify(
            {
              api_health: health,
              database_diagnostics: dbStatus,
              client_timestamp: new Date().toISOString(),
              frontend_stack: 'React 19 + Vite 8 + TypeScript',
              backend_stack: 'FastAPI + SQLAlchemy 2.0 + PyMySQL',
            },
            null,
            2
          )}
        </pre>
      </Card>

      {/* System Roadmap Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-primary" />
            <span>Development Roadmap & Phase Progress</span>
          </div>
        }
        subtitle="Current project progress and modular milestones"
      >
        <div className="roadmap-list">
          {phases.map((p) => (
            <div key={p.num} className={`roadmap-item roadmap-${p.status}`}>
              <div className="roadmap-marker">
                {p.status === 'completed' && <CheckCircle2 size={16} />}
                {p.status === 'active' && <span className="active-dot" />}
                {p.status === 'future' && <span className="future-dot" />}
              </div>
              <div className="roadmap-details">
                <span className="roadmap-phase-tag">{p.num}</span>
                <span className="roadmap-title">{p.title}</span>
              </div>
              <div className="roadmap-badge-slot">
                {p.status === 'completed' && (
                  <span className="phase-pill completed">Completed</span>
                )}
                {p.status === 'active' && (
                  <span className="phase-pill active">Active Phase</span>
                )}
                {p.status === 'future' && (
                  <span className="phase-pill future">Scheduled</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
