'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import AccessDenied from '@/components/shared/AccessDenied';
import { normalizeRole } from '@/lib/rbac';

export default function AdminOperatorsPage() {
  const { user, payload, openModal, showConfirm, showToast, showAlert, refreshData } = useDashboard();
  const role = normalizeRole(user?.role);

  const [search, setSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState<number>(30);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPendingRequests = useCallback(async () => {
    if (role !== 'super_admin') return;
    try {
      const res = await serverCall('getPendingProfileRequests', {});
      if (res?.success && Array.isArray(res.requests)) {
        setPendingRequests(res.requests);
      }
    } catch {}
  }, [role]);

  useEffect(() => {
    loadPendingRequests();
  }, [loadPendingRequests, payload]);

  useEffect(() => {
    setDisplayLimit(30);
  }, [search]);

  // Strict Privacy Route Guard: Super Admin Only
  if (role !== 'super_admin') {
    return <AccessDenied requiredRole="Super Administrator" moduleName="Operations Team Administration" />;
  }

  const operatorList = payload?.superAdmin?.operatorList || [];

  const filtered = operatorList.filter((op: any) => {
    const name = (op.name || op.full_name || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q);
  });

  const visible = filtered.slice(0, displayLimit);
  const hasMore = displayLimit < filtered.length;

  const handleReject = (req: any) => {
    const reqName = req.user?.full_name || req.user?.name || 'operator';
    showConfirm(`Reject work profile request from ${reqName}?`, async () => {
      setBusyId(req.notifId || req.targetUserId);
      try {
        const res = await serverCall('rejectProfileChange', {
          targetUserId: req.targetUserId,
          notifId: req.notifId,
        });
        if (res?.success) {
          showToast(`Declined request from ${reqName}.`, 'warning');
          loadPendingRequests();
          refreshData(true);
        } else {
          showAlert(res?.message || 'Failed to reject request.', 'Error');
        }
      } catch (err: any) {
        showAlert(err.message || 'Network error.', 'Error');
      } finally {
        setBusyId(null);
      }
    });
  };

  return (
    <div id="view-operators" className="page-view active" style={{ display: 'block' }}>
      <div className="panel">
        <div
          className="panel-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>Operator Workforce Roster</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Production and formatting staff operations team
            </p>
          </div>

          <div className="search-wrapper" style={{ marginBottom: 0, width: '220px' }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search operator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {pendingRequests.length > 0 && (
          <div
            style={{
              marginTop: '18px',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', marginBottom: '10px', textTransform: 'uppercase' }}>
              Pending Operator Change Requests ({pendingRequests.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingRequests.map((req: any) => {
                const busy = busyId === (req.notifId || req.targetUserId);
                return (
                  <div
                    key={req.notifId || req.targetUserId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.28)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'white', fontSize: '13px' }}>{req.user?.full_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.message}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="liquid-glass btn-xs btn-success"
                        disabled={busy}
                        onClick={() =>
                          openModal('operatorEdit', {
                            ...req.user,
                            isApprovalRequest: true,
                            requestMessage: req.message,
                            requestNotifId: req.notifId,
                            onResolved: loadPendingRequests,
                          })
                        }
                      >
                        Review &amp; Approve
                      </button>
                      <button
                        type="button"
                        className="liquid-glass btn-xs btn-danger"
                        disabled={busy}
                        onClick={() => handleReject(req)}
                      >
                        {busy ? '...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="tk-table-wrapper" style={{ marginTop: '20px' }}>
          <table className="tk-sleek-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Operator Name</th>
                <th>Work / Subjects</th>
                <th>Assigned</th>
                <th>Completed</th>
                <th>Pending</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No operator records registered.
                  </td>
                </tr>
              ) : (
                visible.map((op: any, idx: number) => {
                  const isActive = ['active', 'connected', 'busy'].includes(String(op.status || 'Active').toLowerCase());
                  return (
                    <tr key={op.id || idx}>
                      <td style={{ fontWeight: 800, color: 'white' }}>
                        <div>{op.name || op.full_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{op.email || op.role}</div>
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        <div style={{ color: 'var(--brand)', fontWeight: 700 }}>{op.workType || 'Unassigned'}</div>
                        <div>{op.subjects || '-'}</div>
                      </td>
                      <td>{op.assigned || 0}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>{op.completed || 0}</td>
                      <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{op.pending || 0}</td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: isActive ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
                            color: isActive ? 'var(--success)' : 'var(--danger)',
                            border: `1px solid ${isActive ? 'var(--success)' : 'var(--danger)'}`,
                          }}
                        >
                          {op.status || 'Active'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="liquid-glass btn-sm btn-outline"
                          style={{ color: 'var(--brand)', borderColor: 'var(--brand)' }}
                          onClick={() => openModal('operatorEdit', op)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Load Capacity Bar & Load More Action */}
        <div className="tk-table-capacity-bar">
          <div className="tk-capacity-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            Showing <b style={{ color: 'white' }}>{visible.length}</b> of <b style={{ color: 'white' }}>{filtered.length}</b> operators (Load Capacity: 30 / batch)
          </div>
          {hasMore && (
            <button
              type="button"
              className="tk-load-more-btn"
              onClick={() => setDisplayLimit((prev) => prev + 30)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Load More (+30)...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
