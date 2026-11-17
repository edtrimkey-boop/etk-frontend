'use client';

import React from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { OpticalButton, OpticalLink } from '@/components/ui/OpticalGlass';

export default function DashboardOverviewPage() {
  const { user, payload, loading, refreshData, openModal } = useDashboard();

  const isOperator = user?.role === 'operator';
  const isSysAdmin = user?.role === 'super_admin' || user?.role === 'sys_admin';

  const stats = payload?.stats?.academic || { today: 0, session: 0, academic: 0 };
  const superKpi = payload?.superAdmin?.kpi;

  return (
    <div id="view-overview" className="page-view active" style={{ display: 'block' }}>
      {/* Action Buttons Row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '25px', flexWrap: 'wrap' }} id="action-buttons-row">
        {/* Submit Paper Button - Opens Modal */}
        <OpticalButton
          type="button"
          variant="primary"
          onClick={() => openModal('paperSubmit')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Submit Paper
        </OpticalButton>

        {/* Request Document Button - Opens Modal */}
        <OpticalButton
          type="button"
          variant="warning"
          onClick={() => openModal('docSubmit')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4" />
            <path d="M12 16h4" />
          </svg>
          Request Document
        </OpticalButton>

        {/* Dynamic Connected Apps */}
        <span id="dynamic-apps-container" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <OpticalLink href="/fees" variant="purple">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Fee Portal
          </OpticalLink>

          <OpticalLink href="/admission" variant="purple">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            Admission Portal
          </OpticalLink>

          <OpticalLink href="/attendance" variant="purple">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Smart Attendance
          </OpticalLink>
        </span>

        {/* Refresh Data */}
        <OpticalButton
          type="button"
          id="btn-refresh"
          variant="secondary"
          onClick={() => refreshData()}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={loading ? 'spinning' : ''}
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 22v-6h6" />
          </svg>
          {loading ? 'Syncing...' : 'Refresh Data'}
        </OpticalButton>
      </div>

      {/* Super Admin Top KPIs */}
      {isSysAdmin && superKpi && (
        <div className="grid-kpis">
          <div className="kpi-card b-success">
            <h4>Total Revenue</h4>
            <h2>₹{(superKpi.totalRev || 0).toLocaleString('en-IN')}</h2>
          </div>
          <div className="kpi-card b-brand">
            <h4>Active Institutes</h4>
            <h2>{superKpi.activeInst || 0}</h2>
          </div>
          <div className="kpi-card b-accent">
            <h4>Pending Revenue</h4>
            <h2>₹{(superKpi.pendingPay || 0).toLocaleString('en-IN')}</h2>
          </div>
          <div className="kpi-card b-info">
            <h4>System Jobs</h4>
            <h2>{(superKpi.docsGen || 0) + (superKpi.papersGen || 0)}</h2>
          </div>
        </div>
      )}

      {/* Main Standard User Dashboard Cards */}
      <div id="standard-user-dashboard" style={{ display: 'block' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
          {/* Profile Card */}
          <div className="panel" id="profileCard" style={{ flex: 1, minWidth: 'min(100%, 280px)', marginBottom: 0 }}>
            <div className="panel-header" style={{ border: 'none', padding: 0, marginBottom: '15px' }}>
              <h3 id="profileCardTitle">
                {(user?.role || 'User').toUpperCase()} PROFILE
              </h3>
            </div>
            <p style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'bottom', marginRight: '8px' }}>
                <path d="M17.925 20.056a6 6 0 0 0-11.851.001" />
                <circle cx="12" cy="11" r="4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              User:{' '}
              <span id="v1-teacher" style={{ color: 'white', fontWeight: 800 }}>
                {user?.name || 'Administrator'}
              </span>
            </p>
            <p style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'bottom', marginRight: '8px' }}>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              </svg>
              Role:{' '}
              <span id="v1-subject" style={{ color: 'var(--brand)', fontWeight: 800, textTransform: 'uppercase' }}>
                {user?.role || 'Admin'}
              </span>
            </p>
            <p id="profileInstRow" style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'bottom', marginRight: '8px' }}>
                <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
                <path d="M18 4.933V21" />
                <path d="m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6" />
                <path d="M6 4.933V21" />
                <circle cx="12" cy="9" r="2" />
              </svg>
              Institute:{' '}
              <span id="v1-institute" style={{ color: 'white', fontWeight: 800 }}>
                {user?.institute || 'Ed-Trim Key Command'}
              </span>
            </p>
            <p className="statusGreen" style={{ marginTop: '15px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="8" style={{ verticalAlign: 'bottom', marginRight: '4px' }}>
                <circle cx="12" cy="12" r="1" />
              </svg>
              Active Connection
            </p>
          </div>

          {/* Institute Details Card */}
          <div className="panel" id="instDetailsCard" style={{ display: 'block', flex: 1, minWidth: 'min(100%, 280px)', borderLeft: '4px solid var(--brand)', marginBottom: 0 }}>
            <div className="panel-header" style={{ border: 'none', padding: 0, marginBottom: '15px' }}>
              <h3>Institute Summary</h3>
            </div>
            <h2 id="inst-name" style={{ marginBottom: '8px', fontSize: '20px', color: 'var(--text)', fontWeight: 800 }}>
              {user?.institute || 'Institutional Branch'}
            </h2>
            <p id="inst-address" style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Branch Code: <span style={{ color: 'var(--brand)', fontWeight: 800 }}>{user?.code || 'KPS'}</span>
            </p>
            <p id="inst-email" style={{ marginBottom: '15px', fontSize: '13px', color: 'var(--brand)', fontWeight: 700 }}>
              {user?.email || 'admin@trimkey.in'}
            </p>
            <p className="statusGreen" style={{ marginTop: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="8" style={{ verticalAlign: 'bottom', marginRight: '4px' }}>
                <circle cx="12" cy="12" r="1" />
              </svg>
              Subscription Active ({user?.instDetails?.plan || 'Standard ERP'})
            </p>
          </div>
        </div>

        {/* Stats Meters */}
        <div className="cards" id="standardStats">
          <div className="activity">
            <h2 id="v1-today" style={{ color: 'var(--brand)' }}>
              {stats.today || 0}
            </h2>
            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>TODAY</span>
          </div>
          <div className="activity">
            <h2 id="v1-session" style={{ color: 'var(--brand)' }}>
              {stats.session || 0}
            </h2>
            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>SESSION</span>
          </div>
          <div className="activity">
            <h2 id="v1-academic" style={{ color: 'var(--brand)' }}>
              {stats.academic || 0}
            </h2>
            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>ACADEMIC</span>
          </div>
        </div>

        {/* Operator Specific KPIs */}
        {isOperator && (
          <div className="grid-kpis" id="operatorKpis">
            <div className="kpi-card b-success">
              <h4>Earnings Generated</h4>
              <h2>₹{payload?.stats?.financial?.total || 0}</h2>
            </div>
            <div className="kpi-card b-accent">
              <h4>Pending Clearance</h4>
              <h2>₹{payload?.stats?.financial?.pending || 0}</h2>
            </div>
            <div className="kpi-card b-brand">
              <h4>Total Delivered</h4>
              <h2>{stats.session || 0}</h2>
            </div>
            <div className="kpi-card b-danger">
              <h4>Pending Jobs</h4>
              <h2>{stats.today || 0}</h2>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '25px 20px', marginTop: '40px', borderTop: '1px dashed var(--border)' }}>
        <div style={{ fontSize: '14px', color: 'var(--brand)', fontWeight: 600, marginBottom: '5px' }}>
          Crafted with{' '}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="red" style={{ verticalAlign: 'middle', display: 'inline-block' }}>
            <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
          </svg>{' '}
          by Trim Key
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} Trim Key. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
