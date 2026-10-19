import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { Establishment, EstablishmentCreate, EstablishmentUpdate } from '../../types';

interface EstablishmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EstablishmentCreate | EstablishmentUpdate) => Promise<void>;
  initialData?: Establishment | null;
  isLoading?: boolean;
}

const FACILITY_TYPES = [
  'Industrial / Manufacturing',
  'Commercial / Retail Complex',
  'Hospitality / Hotel & Resort',
  'Healthcare / Hospital & Clinic',
  'Educational / Campus',
  'Government & Public Facility',
  'Warehouse / Logistics Hub',
  'Residential Tower',
];

export const EstablishmentFormModal: React.FC<EstablishmentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const isEditing = Boolean(initialData);

  const [name, setName] = useState('');
  const [establishmentType, setEstablishmentType] = useState(FACILITY_TYPES[0]);
  const [address, setAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEstablishmentType(initialData.establishment_type);
      setAddress(initialData.address);
      setOwnerName(initialData.owner_name || '');
      setContactInfo(initialData.contact_information || '');
    } else {
      setName('');
      setEstablishmentType(FACILITY_TYPES[0]);
      setAddress('');
      setOwnerName('');
      setContactInfo('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Establishment name is required.';
    if (!establishmentType.trim()) errs.establishmentType = 'Facility type is required.';
    if (!address.trim()) errs.address = 'Facility physical address is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      name: name.trim(),
      establishment_type: establishmentType.trim(),
      address: address.trim(),
      owner_name: ownerName.trim() || undefined,
      contact_information: contactInfo.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Establishment' : 'Register New Establishment'}
      subtitle={
        isEditing
          ? `Updating details for #${initialData?.id} ${initialData?.name}`
          : 'Enter facility profile information with Arabic & English UTF-8 support'
      }
      maxWidth="md"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="outline" onClick={onClose} disabled={isLoading} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading} type="button">
            {isEditing ? 'Save Changes' : 'Create Establishment'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="form-stack">
        {/* Establishment Name */}
        <div className="form-group">
          <label htmlFor="est-name" className="form-label required">
            Establishment Name
          </label>
          <input
            id="est-name"
            type="text"
            className={`form-input ${errors.name ? 'input-error' : ''}`}
            placeholder="e.g. مجمع الابتكار الصناعي - Innovation Industrial Complex"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
          {errors.name && <span className="form-error-text">{errors.name}</span>}
        </div>

        {/* Facility Type */}
        <div className="form-group">
          <label htmlFor="est-type" className="form-label required">
            Facility Type / Classification
          </label>
          <select
            id="est-type"
            className="form-select"
            value={establishmentType}
            onChange={(e) => setEstablishmentType(e.target.value)}
            disabled={isLoading}
          >
            {FACILITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Address */}
        <div className="form-group">
          <label htmlFor="est-address" className="form-label required">
            Address & Location
          </label>
          <textarea
            id="est-address"
            rows={3}
            className={`form-textarea ${errors.address ? 'input-error' : ''}`}
            placeholder="e.g. القوز الصناعية الأولى، شارع الشيخ زايد، دبي - Al Quoz Industrial First, Dubai"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isLoading}
          />
          {errors.address && <span className="form-error-text">{errors.address}</span>}
        </div>

        {/* Owner & Contact Grid */}
        <div className="form-grid-2">
          <div className="form-group">
            <label htmlFor="est-owner" className="form-label">
              Owner / Representative Name
            </label>
            <input
              id="est-owner"
              type="text"
              className="form-input"
              placeholder="e.g. م. فيصل الخالدي"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="est-contact" className="form-label">
              Contact Information
            </label>
            <input
              id="est-contact"
              type="text"
              className="form-input"
              placeholder="e.g. +966 50 123 4567 / info@facility.sa"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
