'use client';

import React, { useState } from 'react';
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

  const handleTabClick = (tab: string) => {
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
          <a
            href="#overview"
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleTabClick('overview');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <span>Home</span>
          </a>

          <a
            href="#workspace"
            className={`nav-tab ${activeTab === 'op-workspace' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleTabClick('op-workspace');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            </svg>
            <span>Workspace</span>
          </a>

          <a
            href="#wallet"
            className={`nav-tab ${activeTab === 'op-finance' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleTabClick('op-finance');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span>Wallet</span>
          </a>

          <a
            href="#settings"
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleTabClick('settings');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </a>
        </>
      );
    }

    if (isSysAdmin) {
      return (
        <>
          <a
            href="#overview"
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleTabClick('overview');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <span>Home</span>
          </a>

          <a
            href="#clients"
            className={`nav-tab ${activeTab === 'institutes' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleTabClick('institutes');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
              <path d="M18 12h.01" />
              <path d="M18 16h.01" />
              <path d="M22 7a1 1 0 0 0-1-1h-2a2 2 0 0 1-1.143-.359L13.143 2.36a2 2 0 0 0-2.286-.001L6.143 5.64A2 2 0 0 1 5 6H3a1 1 0 0 0-1 1v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2z" />
            </svg>
            <span>Clients</span>
          </a>

          <a
            href="#ledger"
            className={`nav-tab ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleTabClick('billing');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            </svg>
            <span>Ledger</span>
          </a>

          <a
            href="#settings"
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleTabClick('settings');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </a>
        </>
      );
    }

    return (
      <>
        <a
          href="#overview"
          className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            handleTabClick('overview');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span>Home</span>
        </a>

        <a
          href="#documents"
          className={`nav-tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            handleTabClick('documents');
          }}
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
        </a>

        <a
          href="#papers"
          className={`nav-tab ${activeTab === 'papers' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            handleTabClick('papers');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span>Papers</span>
        </a>

        <a
          href="#settings"
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            handleTabClick('settings');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </a>
      </>
    );
  };

  return (
    <>
      {/* 1. iOS Separated Bottom Pill & Floating FAB Bar (Matches index.html 1:1) */}
      <div id="mobile-nav-bar">
        <OpticalSurface
          className="nav-pill-box"
          radius={35}
          interactive={false}
          glassBg="rgba(255, 255, 255, 0.065)"
          style={{
            display: 'flex',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            padding: '0 5px',
          }}
        >
          {renderTabs()}
        </OpticalSurface>

        {/* Separated Circular Plus FAB Dock Button */}
        <OpticalSurface
          className={`fab-dock ${fabOpen ? 'open' : ''}`}
          radius={999}
          glassBg="rgba(255, 255, 255, 0.065)"
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
              <div className="fab-item" onClick={() => handleTabClick('papers')}>
                <div style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span>Paper Queue</span>
              </div>
              <div className="fab-item" onClick={() => handleTabClick('documents')}>
                <div style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  </svg>
                </div>
                <span>Doc Queue</span>
              </div>
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
              <div className="fab-item" onClick={() => handleTabClick('documents')}>
                <div style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  </svg>
                </div>
                <span>Doc Queue</span>
              </div>
              <div className="fab-item" onClick={() => handleTabClick('papers')}>
                <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span>Paper Queue</span>
              </div>
              <div className="fab-item" onClick={() => handleTabClick('operators')}>
                <div style={{ color: 'var(--purple)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M8 15H7a4 4 0 0 0-4 4v2" />
                    <circle cx="10" cy="7" r="4" />
                  </svg>
                </div>
                <span>Workforce</span>
              </div>
              <div className="fab-item" onClick={() => handleTabClick('notifications')}>
                <div style={{ color: 'var(--text)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <span>Broadcast</span>
              </div>
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
                  <div className="fab-item" onClick={() => handleTabClick('inst-teachers')}>
                    <div style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" x2="19" y1="8" y2="14" />
                        <line x1="22" x2="16" y1="11" y2="11" />
                      </svg>
                    </div>
                    <span>Directory</span>
                  </div>

                  <div className="fab-item" onClick={() => handleTabClick('inst-students')}>
                    <div style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                    </div>
                    <span>Students</span>
                  </div>

                  <div className="fab-item" onClick={() => handleTabClick('inst-billing')}>
                    <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <span>Billing</span>
                  </div>

                  <div className="fab-item" onClick={() => handleTabClick('notifications')}>
                    <div style={{ color: 'var(--purple)', display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
                      </svg>
                    </div>
                    <span>Broadcast</span>
                  </div>
                </>
              )}

              <div className="fab-item" onClick={() => handleNavigate('/fees')}>
                <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <span>Fee Portal</span>
              </div>

              <div className="fab-item" onClick={() => handleNavigate('/admission')}>
                <div style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
                <span>Admission Portal</span>
              </div>

              <div className="fab-item" onClick={() => handleNavigate('/attendance')}>
                <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <span>Smart Attendance</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
