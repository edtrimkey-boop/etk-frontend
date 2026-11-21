'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/lib/dashboard-context';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { user, payload, loading, refreshData, openModal, showToast } = useDashboard();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isOperator = user?.role === 'operator';
  const isSysAdmin = user?.role === 'super_admin' || user?.role === 'sys_admin';

  const stats = payload?.stats?.academic || { today: 0, session: 0, academic: 0 };
  const superKpi = payload?.superAdmin?.kpi;

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshData(true);
      showToast('Dashboard data synchronized with cloud.', 'success');
    } catch (err: any) {
      showToast('Sync error: ' + (err.message || 'Connection issue'), 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div id="view-overview" className="page-view active" style={{ display: 'block' }}>
      {/* Action Buttons Row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '25px', flexWrap: 'wrap' }} id="action-buttons-row">
        {/* 1. Submit Paper (Solid Brand/Cyan) */}
        <button
          id="btn-submit-paper"
          type="button"
          onClick={() => openModal('paperSubmit')}
          style={{
            background: 'linear-gradient(135deg, rgba(38,195,234,0.95) 0%, rgba(26,156,191,0.95) 100%)',
            color: '#000',
            border: '1px solid rgba(255,255,255,0.4)',
            boxShadow: '0 4px 15px rgba(38,195,234,0.3)',
            borderRadius: '50px',
            padding: '12px 24px',
            fontWeight: 800,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Submit Paper
        </button>

        {/* 2. Request Document (Solid Orange) */}
        <button
          id="btn-request-doc"
          type="button"
          onClick={() => openModal('docSubmit')}
          style={{
            background: 'linear-gradient(135deg, var(--accent), #D97706)',
            color: '#000',
            border: '1px solid #D97706',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
            borderRadius: '50px',
            padding: '12px 24px',
            fontWeight: 800,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4" />
            <path d="M12 16h4" />
            <path d="M8 11h.01" />
            <path d="M8 16h.01" />
          </svg>
          Request Document
        </button>

        {/* 3. Generated Papers (Solid Purple) */}
        <button
          id="btn-generated"
          type="button"
          onClick={() => router.push('/dashboard/papers')}
          style={{
            background: 'linear-gradient(135deg, var(--purple), #6D28D9)',
            color: 'white',
            border: '1px solid #6D28D9',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
            borderRadius: '50px',
            padding: '12px 24px',
            fontWeight: 800,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Generated Papers
        </button>

        {/* Dynamic Connected Apps (e.g. Attendance App) */}
        <span id="dynamic-apps-container" style={{ display: 'inline-flex', gap: '12px', flexWrap: 'wrap' }}>
          {Array.isArray(payload?.dynamicApps) && payload.dynamicApps.length > 0 ? (
            payload.dynamicApps.map((app: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (app.url) {
                    window.open(app.url + '?user=' + encodeURIComponent(payload?.email || user?.email || '') + '&code=' + (payload?.code || user?.code || ''));
                  } else {
                    showToast('App URL not configured.', 'info');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, var(--purple) 0%, #6D28D9 100%)',
                  color: 'white',
                  border: '1px solid #6D28D9',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                  borderRadius: '50px',
                  padding: '12px 24px',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {app.name || 'Attendance App'}
              </button>
            ))
          ) : (
            <button
              type="button"
              onClick={() => showToast('Attendance App connecting...', 'info')}
              style={{
                background: 'linear-gradient(135deg, var(--purple) 0%, #6D28D9 100%)',
                color: 'white',
                border: '1px solid #6D28D9',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                borderRadius: '50px',
                padding: '12px 24px',
                fontWeight: 800,
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Attendance App
            </button>
          )}
        </span>

        {/* 5. Refresh Data */}
        <button
          id="btn-refresh"
          type="button"
          onClick={handleManualRefresh}
          disabled={loading || isRefreshing}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50px',
            padding: '12px 24px',
            fontWeight: 800,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          {isRefreshing ? (
            <IOSSpinner size={16} color="currentColor" />
          ) : (
            <>
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
              Refresh Data
            </>
          )}
        </button>
      </div>

      {/* Shimmer Skeleton View on Initial Load */}
      {loading && !payload && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <SkeletonCard height="130px" />
            <SkeletonCard height="130px" />
            <SkeletonCard height="130px" />
            <SkeletonCard height="130px" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
            <SkeletonTable rows={4} cols={4} />
            <SkeletonTable rows={4} cols={4} />
          </div>
        </div>
      )}

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
      <div id="standard-user-dashboard" style={{ display: loading && !payload ? 'none' : 'block' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
          {/* Profile Card */}
          <div className="panel" id="profileCard" style={{ flex: 1, minWidth: 'min(100%, 280px)', marginBottom: 0 }}>
            <div className="panel-header" style={{ border: 'none', padding: 0, marginBottom: '15px' }}>
              <h3 id="profileCardTitle" style={{ color: 'var(--brand)', textTransform: 'uppercase' }}>
                {(user?.role || 'Admin').toUpperCase()} PROFILE
              </h3>
            </div>
            <p style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'bottom', marginRight: '8px' }}>
                <path d="M17.925 20.056a6 6 0 0 0-11.851.001" />
                <circle cx="12" cy="11" r="4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span id="v1-teacher" style={{ color: 'white', fontWeight: 800 }}>
                {user?.name || 'AHMAD RAZA'}
              </span>
            </p>
            <p style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'bottom', marginRight: '8px' }}>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <path d="M12 11h4" />
                <path d="M12 16h4" />
                <path d="M8 11h.01" />
                <path d="M8 16h.01" />
              </svg>
              <span id="v1-subject" style={{ color: 'white', fontWeight: 800 }}>
                {payload?.subjects || user?.subjects || 'Science, English, Mathematics'}
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
              <span id="v1-institute" style={{ color: 'white', fontWeight: 800 }}>
                {user?.institute || 'KEYSTONE PUBLIC SCHOOL'}
              </span>
            </p>
            <p className="statusGreen" style={{ marginTop: '15px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="8" style={{ verticalAlign: 'bottom', marginRight: '4px' }}>
                <circle cx="12" cy="12" r="1" />
              </svg>
              User Active
            </p>
          </div>

          {/* Institute Details Card */}
          <div className="panel" id="instDetailsCard" style={{ display: 'block', flex: 1, minWidth: 'min(100%, 280px)', borderLeft: '4px solid var(--brand)', marginBottom: 0 }}>
            <div className="panel-header" style={{ border: 'none', padding: 0, marginBottom: '15px' }}>
              <h3 style={{ color: 'var(--brand)', textTransform: 'uppercase' }}>INSTITUTE DETAILS</h3>
            </div>
            <h2 id="inst-name" style={{ marginBottom: '8px', fontSize: '20px', color: 'var(--text)', fontWeight: 800 }}>
              {user?.institute || 'KEYSTONE PUBLIC SCHOOL'}
            </h2>
            <p id="inst-address" style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {user?.instDetails?.address || 'Address not provided'}
            </p>
            <p id="inst-email" style={{ marginBottom: '15px', fontSize: '13px', color: 'var(--brand)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', flexShrink: 0 }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {user?.instDetails?.adminEmail || 'Email not provided'}
            </p>
            <p className="statusGreen" style={{ marginTop: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="8" style={{ verticalAlign: 'bottom', marginRight: '4px' }}>
                <circle cx="12" cy="12" r="1" />
              </svg>
              Subscription {user?.instDetails?.plan || 'Annual'}
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
