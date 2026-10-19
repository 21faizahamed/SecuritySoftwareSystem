import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { userApi } from '../../services/userApi';
import type { User, Role } from '../../types';
import { UserFormModal } from '../../components/forms/UserFormModal';
import { formatDate } from '../../utils/formatters';

export const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRoles = async () => {
    try {
      const data = await userApi.getRoles();
      setRoles(data);
    } catch {
      // ignore
    }
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params: any = {
        page,
        limit,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedRole) params.role_id = Number(selectedRole);
      if (selectedStatus === 'active') params.is_active = true;
      if (selectedStatus === 'inactive') params.is_active = false;

      const res = await userApi.getUsers(params);
      setUsers(res.items);
      setTotal(res.total);
      setTotalPages(res.pages);
    } catch (err: any) {
      setErrorMessage(err.data?.detail || err.message || 'Failed to retrieve system users');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchTerm, selectedRole, selectedStatus]);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateNew = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await userApi.deleteUser(deletingUser.id);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.data?.detail || err.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await userApi.updateUser(user.id, { is_active: !user.is_active });
      fetchUsers();
    } catch (err: any) {
      alert(err.data?.detail || err.message || 'Failed to update user status');
    }
  };

  const getRoleBadgeClass = (roleName?: string) => {
    switch (roleName?.toUpperCase()) {
      case 'ADMIN':
        return 'badge-role-admin';
      case 'INSPECTOR':
        return 'badge-role-inspector';
      case 'REVIEWER':
        return 'badge-role-reviewer';
      case 'VIEWER':
        return 'badge-role-viewer';
      default:
        return 'badge-secondary';
    }
  };

  // Metrics
  const activeCount = users.filter((u) => u.is_active).length;
  const adminCount = users.filter((u) => u.role?.name === 'ADMIN').length;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-text-group">
          <div className="header-icon-pill">
            <Users size={22} />
          </div>
          <div>
            <h2 className="page-title">User & Access Management</h2>
            <p className="page-subtitle">
              Provision operator accounts, manage role assignments, and enforce authentication security policies
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateNew}
          >
            <UserPlus size={16} />
            <span>Provision User</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap primary">
            <Users size={20} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Total Registered</span>
            <strong className="metric-value">{total}</strong>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap success">
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Active Accounts</span>
            <strong className="metric-value">{activeCount}</strong>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap warning">
            <ShieldCheck size={20} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Administrators</span>
            <strong className="metric-value">{adminCount}</strong>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap info">
            <Shield size={20} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Defined Roles</span>
            <strong className="metric-value">{roles.length || 4}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-card">
        <div className="search-input-group">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input search-field"
            placeholder="Search by full name, username, or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="filter-controls">
          <div className="filter-select-wrapper">
            <Filter size={16} className="filter-icon" />
            <select
              className="form-select filter-select"
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Access Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select
              className="form-select filter-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Account Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Disabled Only</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => fetchUsers()}
            title="Refresh list"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Notification */}
      {errorMessage && (
        <div className="alert-banner alert-danger mb-4">
          <AlertTriangle size={18} />
          <div className="alert-content">
            <strong>System Error</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="table-card">
        {isLoading ? (
          <div className="table-loading-state">
            <RefreshCw size={28} className="animate-spin text-primary" />
            <p>Loading operator records...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="table-empty-state">
            <Users size={40} className="text-muted" />
            <h4>No Users Found</h4>
            <p>No operator accounts match the current filter criteria.</p>
            <button
              type="button"
              className="btn btn-outline mt-2"
              onClick={() => {
                setSearchTerm('');
                setSelectedRole('');
                setSelectedStatus('');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Operator Identity</th>
                <th>Access Role</th>
                <th>Account Status</th>
                <th>Last Login</th>
                <th>Created</th>
                <th style={{ textAlign: 'right', width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono text-muted">#{u.id}</td>
                  <td>
                    <div className="user-identity-cell">
                      <div className="user-avatar-small">
                        {u.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <strong className="user-display-name">{u.full_name}</strong>
                        <div className="user-sub-details">
                          <span className="user-login-name">@{u.username}</span>
                          <span className="dot-separator">•</span>
                          <span className="user-email-text">{u.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(u.role?.name)}`}>
                      <Shield size={12} />
                      <span>{u.role?.name || 'VIEWER'}</span>
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`status-toggle-pill ${u.is_active ? 'active' : 'disabled'}`}
                      onClick={() => handleToggleStatus(u)}
                      title={`Click to ${u.is_active ? 'deactivate' : 'activate'} account`}
                    >
                      {u.is_active ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={13} />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="text-muted">
                    {u.last_login_at ? (
                      <span className="timestamp-with-icon" title={u.last_login_at}>
                        <Clock size={13} />
                        {formatDate(u.last_login_at)}
                      </span>
                    ) : (
                      <span className="text-muted font-italic">Never</span>
                    )}
                  </td>
                  <td className="text-muted">{formatDate(u.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="action-icon-btn"
                        onClick={() => handleEdit(u)}
                        title="Edit user and role"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="action-icon-btn delete-btn"
                        onClick={() => setDeletingUser(u)}
                        title="Delete or deactivate user"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Footer */}
        {!isLoading && totalPages > 1 && (
          <div className="table-pagination-footer">
            <span className="pagination-summary">
              Showing page {page} of {totalPages} ({total} total operators)
            </span>
            <div className="pagination-nav-btns">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Create / Edit Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchUsers()}
        userToEdit={editingUser}
        roles={roles}
      />

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="modal-backdrop" onClick={() => setDeletingUser(null)}>
          <div className="modal-card modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge danger">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="modal-title">Confirm User Deletion</h3>
              </div>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete user <strong>{deletingUser.full_name}</strong> (<code>@{deletingUser.username}</code>)?
              </p>
              <p className="text-muted mt-2">
                This will remove the user's access credentials and role bindings from the system.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
