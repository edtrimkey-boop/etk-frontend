'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  userRole?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
  activeTab?: string;
  onSwitchTab?: (tab: string) => void;
}

export default function Sidebar({
  userRole = 'admin',
  isCollapsed = false,
  onToggle,
  activeTab = 'overview',
  onSwitchTab,
}: SidebarProps) {
  const pathname = usePathname();

  const isSysAdmin = userRole === 'super_admin' || userRole === 'sys_admin';
  const isInstAdmin = userRole === 'admin' || isSysAdmin;
  const isOperator = userRole === 'operator' || isSysAdmin;

  const handleNavClick = (tab: string, e: React.MouseEvent) => {
    if (onSwitchTab) {
      onSwitchTab(tab);
    }
  };

  const isActive = (tab: string, path: string) => {
    if (activeTab === tab) return true;
    if (pathname === path) return true;
    return false;
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} id="sidebar">
      {/* Brand Header */}
      <div
        className="brandRow"
        style={{
          marginBottom: '40px',
          padding: '0 25px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            className="logo"
            style={{ width: '35px', height: '35px' }}
            src="https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/logo/EKT_GIF.gif"
            alt="Ed-Trim Key"
          />
          <div className="brand" style={{ fontSize: '18px' }}>
            Ed-Trim Key
          </div>
        </div>
        <button
          className="mobile-close-btn liquid-glass glass-circle-btn"
          onClick={onToggle}
          type="button"
          aria-label="Close Sidebar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Navigation Items */}
      <div
        id="nav-overview"
        className={`nav-item ${isActive('overview', '/dashboard') ? 'active' : ''}`}
        onClick={(e) => handleNavClick('overview', e)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
        </svg>
        Dashboard Overview
      </div>

      <div
        id="nav-documents"
        className={`nav-item ${isActive('documents', '/dashboard/documents') ? 'active' : ''}`}
        onClick={(e) => handleNavClick('documents', e)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M12 11h4" />
          <path d="M12 16h4" />
          <path d="M8 11h.01" />
          <path d="M8 16h.01" />
        </svg>
        Documents System
      </div>

      <div
        id="nav-papers"
        className={`nav-item ${isActive('papers', '/dashboard/papers') ? 'active' : ''}`}
        onClick={(e) => handleNavClick('papers', e)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        Paper System
      </div>

      {/* Dynamic Sub-Apps Links (Fees, Admission, Attendance) */}
      <div id="sidebar-dynamic-apps">
        <Link
          href="/fees"
          className={`nav-item ${pathname.startsWith('/fees') ? 'active' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
          Fee Portal
        </Link>
        <Link
          href="/admission"
          className={`nav-item ${pathname.startsWith('/admission') ? 'active' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
          Admission Portal
        </Link>
        <Link
          href="/attendance"
          className={`nav-item ${pathname.startsWith('/attendance') ? 'active' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Smart Attendance
        </Link>
      </div>

      {/* Admin Broadcast Center */}
      {isInstAdmin && (
        <div
          id="nav-notifications"
          className={`nav-item ${isActive('notifications', '/dashboard/broadcast') ? 'active' : ''}`}
          onClick={(e) => handleNavClick('notifications', e)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
          </svg>
          Broadcast Center
        </div>
      )}

      {/* Institute Admin Specific Tabs */}
      {isInstAdmin && (
        <>
          <div
            id="nav-inst-billing"
            className={`nav-item ${isActive('inst-billing', '/dashboard/billing') ? 'active' : ''}`}
            onClick={(e) => handleNavClick('inst-billing', e)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
            Institute Billing
          </div>
          <div
            id="nav-inst-teachers"
            className={`nav-item ${isActive('inst-teachers', '/dashboard/teachers') ? 'active' : ''}`}
            onClick={(e) => handleNavClick('inst-teachers', e)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 13a3 3 0 1 0-6 0" />
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
              <circle cx="12" cy="8" r="2" />
            </svg>
            Teachers Directory
          </div>
          <div
            id="nav-inst-students"
            className={`nav-item ${isActive('inst-students', '/dashboard/students') ? 'active' : ''}`}
            onClick={(e) => handleNavClick('inst-students', e)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
              <path d="M22 10v6" />
              <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
            </svg>
            Students Database
          </div>
        </>
      )}

      {/* Super Admin Specific Tabs */}
      {isSysAdmin && (
        <>
          <div
            id="nav-institutes"
            className={`nav-item ${isActive('institutes', '/dashboard/admin/institutes') ? 'active' : ''}`}
            onClick={(e) => handleNavClick('institutes', e)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
              <path d="M18 4.933V21" />
              <path d="m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6" />
              <path d="m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11" />
              <path d="M6 4.933V21" />
              <circle cx="12" cy="9" r="2" />
            </svg>
            Global Institutes
          </div>
          <div
            id="nav-billing"
            className={`nav-item ${isActive('billing', '/dashboard/admin/billing') ? 'active' : ''}`}
            onClick={(e) => handleNavClick('billing', e)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            </svg>
            Global Ledger
          </div>
          <div
            id="nav-operators"
            className={`nav-item ${isActive('operators', '/dashboard/admin/operators') ? 'active' : ''}`}
            onClick={(e) => handleNavClick('operators', e)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z" />
              <path d="M8 15H7a4 4 0 0 0-4 4v2" />
              <circle cx="10" cy="7" r="4" />
            </svg>
            Operations Team
          </div>
        </>
      )}

      {/* Operator Workspace & Tools */}
      {isOperator && (
        <>
          <div
            id="nav-op-workspace"
            className={`nav-item ${isActive('op-workspace', '/operator/workspace') ? 'active' : ''}`}
            onClick={(e) => handleNavClick('op-workspace', e)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
            </svg>
            Production Workspace
          </div>
          <div
            id="nav-op-finance"
            className={`nav-item ${isActive('op-finance', '/operator/earnings') ? 'active' : ''}`}
            onClick={(e) => handleNavClick('op-finance', e)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Financial Ledger
          </div>
          <Link
            href="/operator/tools/questions-formatter"
            className={`nav-item ${pathname.includes('questions-formatter') ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            MCQ Formatter
          </Link>
        </>
      )}

      {/* Master Settings */}
      <div
        id="nav-settings"
        className={`nav-item ${isActive('settings', '/dashboard/settings') ? 'active' : ''}`}
        onClick={(e) => handleNavClick('settings', e)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        Master Settings
      </div>

      <div
        style={{
          marginTop: 'auto',
          padding: '20px 30px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontWeight: 600,
          borderTop: '1px solid var(--border)',
        }}
      >
        Version V2.9.2 (ED TRIMKEY OS)
      </div>
    </div>
  );
}
