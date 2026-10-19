import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/Auth/LoginPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { EstablishmentListPage } from '../pages/Establishments/EstablishmentListPage';
import { EstablishmentDetailPage } from '../pages/Establishments/EstablishmentDetailPage';
import { InspectionListPage } from '../pages/Inspections/InspectionListPage';
import { InspectionDetailPage } from '../pages/Inspections/InspectionDetailPage';
import { DocumentListPage } from '../pages/Documents/DocumentListPage';
import { RequirementsPage } from '../pages/Requirements/RequirementsPage';
import { CertificatesPage } from '../pages/Certificates/CertificatesPage';
import { AuditLogsPage } from '../pages/Audit/AuditLogsPage';
import { PublicVerifyPage } from '../pages/Verify/PublicVerifyPage';
import { UserListPage } from '../pages/Admin/UserListPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Public Certificate Verification Routes (No login required) */}
          <Route path="/verify" element={<PublicVerifyPage />} />
          <Route path="/verify/:certNumber" element={<PublicVerifyPage />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="establishments" element={<EstablishmentListPage />} />
              <Route path="establishments/:id" element={<EstablishmentDetailPage />} />
              <Route path="inspections" element={<InspectionListPage />} />
              <Route path="inspections/:id" element={<InspectionDetailPage />} />
              <Route path="documents" element={<DocumentListPage />} />
              <Route path="requirements" element={<RequirementsPage />} />
              <Route path="certificates" element={<CertificatesPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />

              {/* Admin Only Route */}
              <Route
                path="users"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <UserListPage />
                  </ProtectedRoute>
                }
              />

              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
