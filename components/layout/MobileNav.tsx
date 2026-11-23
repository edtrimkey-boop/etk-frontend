'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OpticalSurface } from '@/components/ui/OpticalGlass';

interface MobileNavProps {
  userRole?: string;
  activeTab?: string;
  onSwitchTab?: (tab: string) => void;
  onOpenAction?: (action: string) => void;
}

export default function MobileNav({
  userRole = 'admin',
  activeTab = 'overview',
  onSwitchTab,
  onOpenAction,
}: MobileNavProps) {
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const [optimisticTab, setOptimisticTab] = useState<string | null>(null);

  // Synchronize optimistic tab with actual activeTab
  useEffect(() => {
    setOptimisticTab(null);
  }, [activeTab]);

  const currentTab = optimisticTab || activeTab;

  const normalizedRole = String(userRole || 'admin').toLowerCase().trim();
  const isTeacher = normalizedRole === 'teacher';
  const isOperator = normalizedRole === 'operator';
  const isSysAdmin =
    normalizedRole === 'super_admin' ||
    normalizedRole === 'sys_admin' ||
    normalizedRole === 'super admin' ||
    normalizedRole === 'system admin' ||
    normalizedRole === 'all';
  const isInstAdmin = normalizedRole === 'admin';

  const toggleFabMenu = () => setFabOpen((prev) => !prev);
  const closeFabMenu = () => setFabOpen(false);

  const handleTabSelect = (tab: string) => {
    setOptimisticTab(tab);
    closeFabMenu();
    if (onSwitchTab) onSwitchTab(tab);
  };

  const handleActionClick = (action: string) => {
    closeFabMenu();
    if (onOpenAction) onOpenAction(action);
  };

  const handleNavigate = (href: string) => {
    closeFabMenu();
    router.push(href);
  };

  const renderTabs = () => {
    if (isOperator) {
      return (
        <>
          <Link
            href="/dashboard"
            prefetch={true}
            className={`nav-tab ${currentTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabSelect('overview')}
            onTouchStart={() => setOptimisticTab('overview')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <span>Home</span>
          </Link>

          <Link
            href="/operator/workspace"
            prefetch={true}
            className={`nav-tab ${currentTab === 'op-workspace' ? 'active' : ''}`}
            onClick={() => handleTabSelect('op-workspace')}
            onTouchStart={() => setOptimisticTab('op-workspace')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            </svg>
            <span>Workspace</span>
          </Link>

          <Link
            href="/operator/earnings"
            prefetch={true}
            className={`nav-tab ${currentTab === 'op-finance' ? 'active' : ''}`}
            onClick={() => handleTabSelect('op-finance')}
            onTouchStart={() => setOptimisticTab('op-finance')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span>Wallet</span>
          </Link>

          <Link
            href="/dashboard/settings"
            prefetch={true}
            className={`nav-tab ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabSelect('settings')}
            onTouchStart={() => setOptimisticTab('settings')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </Link>
        </>
      );
    }

    if (isSysAdmin) {
      return (
        <>
          <Link
            href="/dashboard"
            prefetch={true}
            className={`nav-tab ${currentTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabSelect('overview')}
            onTouchStart={() => setOptimisticTab('overview')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <span>Home</span>
          </Link>

          <Link
            href="/dashboard/admin/institutes"
            prefetch={true}
            className={`nav-tab ${currentTab === 'institutes' ? 'active' : ''}`}
            onClick={() => handleTabSelect('institutes')}
            onTouchStart={() => setOptimisticTab('institutes')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
              <path d="M18 12h.01" />
              <path d="M18 16h.01" />
              <path d="M22 7a1 1 0 0 0-1-1h-2a2 2 0 0 1-1.143-.359L13.143 2.36a2 2 0 0 0-2.286-.001L6.143 5.64A2 2 0 0 1 5 6H3a1 1 0 0 0-1 1v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2z" />
            </svg>
            <span>Clients</span>
          </Link>

          <Link
            href="/dashboard/admin/billing"
            prefetch={true}
            className={`nav-tab ${currentTab === 'billing' ? 'active' : ''}`}
            onClick={() => handleTabSelect('billing')}
            onTouchStart={() => setOptimisticTab('billing')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            </svg>
            <span>Ledger</span>
          </Link>

          <Link
            href="/dashboard/settings"
            prefetch={true}
            className={`nav-tab ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabSelect('settings')}
            onTouchStart={() => setOptimisticTab('settings')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </Link>
        </>
      );
    }

    return (
      <>
        <Link
          href="/dashboard"
          prefetch={true}
          className={`nav-tab ${currentTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabSelect('overview')}
          onTouchStart={() => setOptimisticTab('overview')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span>Home</span>
        </Link>

        <Link
          href="/dashboard/documents"
          prefetch={true}
          className={`nav-tab ${currentTab === 'documents' ? 'active' : ''}`}
          onClick={() => handleTabSelect('documents')}
          onTouchStart={() => setOptimisticTab('documents')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4" />
            <path d="M12 16h4" />
            <path d="M8 11h.01" />
            <path d="M8 16h.01" />
          </svg>
          <span>Docs</span>
        </Link>

        <Link
          href="/dashboard/papers"
          prefetch={true}
          className={`nav-tab ${currentTab === 'papers' ? 'active' : ''}`}
          onClick={() => handleTabSelect('papers')}
          onTouchStart={() => setOptimisticTab('papers')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span>Papers</span>
        </Link>

        <Link
          href="/dashboard/settings"
          prefetch={true}
          className={`nav-tab ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleTabSelect('settings')}
          onTouchStart={() => setOptimisticTab('settings')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </Link>
      </>
    );
  };

  return (
    <>
      {/* 1. iOS Separated Bottom Pill & Floating FAB Bar with Apple Optical Liquid Glass */}
      <div id="mobile-nav-bar">
        <OpticalSurface
          className="nav-pill-box"
          radius={35}
          interactive={false}
          style={{
            display: 'flex',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            padding: '0 5px',
          }}
        >
          {renderTabs()}
        </OpticalSurface>

        {/* Separated Circular Plus FAB Dock Button with Apple Optical Liquid Glass */}
        <OpticalSurface
          className={`fab-dock ${fabOpen ? 'open' : ''}`}
          radius={999}
          onClick={toggleFabMenu}
          style={{
            width: '60px',
            height: '60px',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--brand)',
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: fabOpen ? 'rotate(45deg)' : 'none',
            }}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </OpticalSurface>
      </div>

      {/* 2. FAB Overlay */}
      <div
        id="fab-overlay"
        className={`glass-overlay ${fabOpen ? 'active' : ''}`}
        style={{ zIndex: 4998 }}
        onClick={closeFabMenu}
      />

      {/* 3. Floating List Modal (#fab-action-sheet.active matches index.html 1:1) */}
      <div id="fab-action-sheet" className={fabOpen ? 'active' : ''}>
        <div
          style={{
            width: '40px',
            height: '5px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '10px',
            margin: '0 auto 25px auto',
          }}
        />
        <div className="fab-grid" id="fab-grid-container">
          {/* Operator Menu */}
          {isOperator && (
            <>
              <Link
                href="/dashboard/papers"
                prefetch={true}
                className="fab-item"
                onClick={() => handleTabSelect('papers')}
                style={{ textDecoration: 'none' }}
              >
                <div style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span>Paper Queue</span>
              </Link>
              <Link
                href="/dashboard/documents"
                prefetch={true}
                className="fab-item"
                onClick={() => handleTabSelect('documents')}
                style={{ textDecoration: 'none' }}
              >
                <div style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  </svg>
                </div>
                <span>Doc Queue</span>
              </Link>
              <div className="fab-item" onClick={() => handleNavigate('/operator/tools/questions-formatter')}>
                <div style={{ color: 'var(--purple)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </div>
                <span>MCQ Formatter</span>
              </div>
            </>
          )}

          {/* Super Admin Menu */}
          {isSysAdmin && (
            <>
              <Link
                href="/dashboard/documents"
                prefetch={true}
                className="fab-item"
                onClick={() => handleTabSelect('documents')}
                style={{ textDecoration: 'none' }}
              >
                <div style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  </svg>
                </div>
                <span>Doc Queue</span>
              </Link>
              <Link
                href="/dashboard/papers"
                prefetch={true}
                className="fab-item"
                onClick={() => handleTabSelect('papers')}
                style={{ textDecoration: 'none' }}
              >
                <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span>Paper Queue</span>
              </Link>
              <Link
                href="/dashboard/admin/operators"
                prefetch={true}
                className="fab-item"
                onClick={() => handleTabSelect('operators')}
                style={{ textDecoration: 'none' }}
              >
                <div style={{ color: 'var(--purple)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M8 15H7a4 4 0 0 0-4 4v2" />
                    <circle cx="10" cy="7" r="4" />
                  </svg>
                </div>
                <span>Workforce</span>
              </Link>
              <Link
                href="/dashboard/broadcast"
                prefetch={true}
                className="fab-item"
                onClick={() => handleTabSelect('notifications')}
                style={{ textDecoration: 'none' }}
              >
                <div style={{ color: 'var(--text)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <span>Broadcast</span>
              </Link>
            </>
          )}

          {/* Institute Admin & Teacher Menu */}
          {(isInstAdmin || isTeacher || (!isOperator && !isSysAdmin)) && (
            <>
              <div className="fab-item" onClick={() => handleActionClick('submitPaper')}>
                <div style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span>Submit Paper</span>
              </div>

              <div className="fab-item" onClick={() => handleActionClick('requestDoc')}>
                <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  </svg>
                </div>
                <span>Request Document</span>
              </div>

              {isInstAdmin && (
                <>
                  <Link
                    href="/dashboard/teachers"
                    prefetch={true}
                    className="fab-item"
                    onClick={() => handleTabSelect('inst-teachers')}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" x2="19" y1="8" y2="14" />
                        <line x1="22" x2="16" y1="11" y2="11" />
                      </svg>
                    </div>
                    <span>Directory</span>
                  </Link>

                  <Link
                    href="/dashboard/students"
                    prefetch={true}
                    className="fab-item"
                    onClick={() => handleTabSelect('inst-students')}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                    </div>
                    <span>Students</span>
                  </Link>

                  <Link
                    href="/dashboard/billing"
                    prefetch={true}
                    className="fab-item"
                    onClick={() => handleTabSelect('inst-billing')}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <span>Billing</span>
                  </Link>

                  <Link
                    href="/dashboard/broadcast"
                    prefetch={true}
                    className="fab-item"
                    onClick={() => handleTabSelect('notifications')}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{ color: 'var(--purple)', display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
                      </svg>
                    </div>
                    <span>Broadcast</span>
                  </Link>
                </>
              )}

              <Link
                href="/fees"
                prefetch={true}
                className="fab-item"
                onClick={() => closeFabMenu()}
                style={{ textDecoration: 'none' }}
              >
                <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <span>Fee Portal</span>
              </Link>

              <Link
                href="/admission"
                prefetch={true}
                className="fab-item"
                onClick={() => closeFabMenu()}
                style={{ textDecoration: 'none' }}
              >
                <div style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
                <span>Admission Portal</span>
              </Link>

              <Link
                href="/attendance"
                prefetch={true}
                className="fab-item"
                onClick={() => closeFabMenu()}
                style={{ textDecoration: 'none' }}
              >
                <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <span>Smart Attendance</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
