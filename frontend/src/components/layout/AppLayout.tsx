import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <div className={`app-main-wrapper ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
        <main className="app-content-area" id="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Security Certificate & Compliance Inspection System • Phase 4 Architecture Active</span>
          <span>FastAPI REST API + React TypeScript Engine</span>
        </footer>
      </div>
    </div>
  );
};
