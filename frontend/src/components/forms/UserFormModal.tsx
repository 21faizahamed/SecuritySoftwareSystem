import React, { useState, useEffect } from 'react';
import { X, Shield, Lock, Mail, User as UserIcon, UserCheck, AlertCircle } from 'lucide-react';
import type { User, UserCreate, UserUpdate, Role } from '../../types';
import { userApi } from '../../services/userApi';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: User | null;
  roles: Role[];
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userToEdit,
  roles,
}) => {
  const isEditing = !!userToEdit;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number>(2); // Default to INSPECTOR (id 2) or first role
  const [isActive, setIsActive] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userToEdit) {
      setUsername(userToEdit.username);
      setEmail(userToEdit.email);
      setFullName(userToEdit.full_name);
      setPassword(''); // keep blank unless updating
      setRoleId(userToEdit.role_id);
      setIsActive(userToEdit.is_active);
    } else {
      setUsername('');
      setEmail('');
      setFullName('');
      setPassword('');
      setRoleId(roles[1]?.id || roles[0]?.id || 2);
      setIsActive(true);
    }
    setErrorMessage(null);
  }, [userToEdit, roles, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!username.trim()) {
      setErrorMessage('Username is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid email address is required.');
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!isEditing && !password) {
      setErrorMessage('A secure password is required for new accounts.');
      return;
    }
    if (!isEditing && password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && userToEdit) {
        const updatePayload: UserUpdate = {
          username: username.trim(),
          email: email.trim(),
          full_name: fullName.trim(),
          role_id: Number(roleId),
          is_active: isActive,
        };
        if (password.trim()) {
          updatePayload.password = password;
        }
        await userApi.updateUser(userToEdit.id, updatePayload);
      } else {
        const createPayload: UserCreate = {
          username: username.trim(),
          email: email.trim(),
          full_name: fullName.trim(),
          password: password,
          role_id: Number(roleId),
          is_active: isActive,
        };
        await userApi.createUser(createPayload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.data?.detail || err.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="modal-title">
                {isEditing ? `Edit User: ${userToEdit.username}` : 'Provision New System User'}
              </h3>
              <p className="modal-subtitle">
                {isEditing
                  ? 'Update user identity, access role, or reset password credentials'
                  : 'Create a new operator account and assign role-based permissions'}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="alert-banner alert-danger m-4 mb-0" role="alert">
            <AlertCircle size={16} />
            <div className="alert-content">
              <strong>Error</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body form-grid">
          <div className="form-group col-span-2">
            <label className="form-label" htmlFor="user-fullname">
              Full Name <span className="text-danger">*</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-left-icon"><UserCheck size={16} /></span>
              <input
                id="user-fullname"
                type="text"
                className="form-input with-left-icon"
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="user-username">
              Username <span className="text-danger">*</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-left-icon"><UserIcon size={16} /></span>
              <input
                id="user-username"
                type="text"
                className="form-input with-left-icon"
                placeholder="e.g. jdoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="user-email">
              Email Address <span className="text-danger">*</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-left-icon"><Mail size={16} /></span>
              <input
                id="user-email"
                type="email"
                className="form-input with-left-icon"
                placeholder="e.g. jdoe@securitysystem.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="user-role">
              System Role <span className="text-danger">*</span>
            </label>
            <select
              id="user-role"
              className="form-select"
              value={roleId}
              onChange={(e) => setRoleId(Number(e.target.value))}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.description || 'System Access Role'}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="user-password">
              {isEditing ? 'New Password (leave blank to keep current)' : 'Account Password *'}
            </label>
            <div className="input-icon-wrapper">
              <span className="input-left-icon"><Lock size={16} /></span>
              <input
                id="user-password"
                type="password"
                className="form-input with-left-icon"
                placeholder={isEditing ? '••••••••' : 'Min 8 characters'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEditing}
              />
            </div>
          </div>

          <div className="form-group col-span-2">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Account Active (enabled for system login)</span>
            </label>
          </div>

          <div className="modal-footer col-span-2">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner" />
                  <span>Saving Account...</span>
                </>
              ) : isEditing ? (
                'Update User'
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
