'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import AccessDenied from '@/components/shared/AccessDenied';
import { normalizeRole } from '@/lib/rbac';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { SkeletonBlock } from '@/components/ui/Skeleton';

export default function TeachersPage() {
  const { user, payload, openModal, showAlert, showConfirm, showToast, refreshData } = useDashboard();
  const role = normalizeRole(user?.role);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [reqBusyId, setReqBusyId] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(30);

  const loadPendingRequests = async () => {
    if (role !== 'admin') return;
    try {
      const res = await serverCall('getPendingProfileRequests', {});
      if (res?.success && Array.isArray(res.requests)) {
        setPendingRequests(res.requests);
      }
    } catch {}
  };

  const loadTeachers = async () => {
    if (role !== 'admin') return;
    const instId = user?.institute_id || user?.instId || user?.code;
    if (!instId) {
      if (payload?.data?.instTeachers) {
        setTeachers(payload.data.instTeachers);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await serverCall('getTeachersList', { instId });
      if (res.success && res.teachers) {
        setTeachers(res.teachers);
      } else if (payload?.data?.instTeachers) {
        setTeachers(payload.data.instTeachers);
      }
    } catch (err: any) {
      console.warn('Teachers fetch notice:', err.message);
      if (payload?.data?.instTeachers) {
        setTeachers(payload.data.instTeachers);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
    loadPendingRequests();
  }, [user, payload, role]);

  useEffect(() => {
    setDisplayLimit(30);
  }, [search]);

  // Strict Privacy Route Guard: Institute Admin Only
  if (role !== 'admin') {
    return <AccessDenied requiredRole="Institute Administrator" moduleName="Faculty & Teachers Directory" />;
  }

  const handleReviewRequest = (req: any) => {
    openModal('teacherEdit', {
      ...req.user,
      isApprovalRequest: true,
      requestMessage: req.message,
      requestNotifId: req.notifId,
      onResolved: () => {
        loadPendingRequests();
        loadTeachers();
      },
    });
  };

  const handleQuickReject = (req: any) => {
    const reqName = req.user?.full_name || req.user?.name || 'this teacher';
    showConfirm(`Reject profile change request from ${reqName}?`, async () => {
      setReqBusyId(req.notifId || req.targetUserId);
      try {
        const res = await serverCall('rejectProfileChange', {
          targetUserId: req.targetUserId,
          notifId: req.notifId,
        });
        if (res?.success) {
          showToast(`Declined profile request from ${reqName}.`, 'warning');
          loadPendingRequests();
          refreshData(true);
        } else {
          showAlert(res?.message || 'Failed to reject request.', 'Error');
        }
      } catch (err: any) {
        showAlert(err.message || 'Failed to reject request.', 'Error');
      } finally {
        setReqBusyId(null);
      }
    });
  };

  const handleRemove = (teacher: any) => {
    const tId = teacher.id || teacher.userId || teacher.teacherId;
    showConfirm(`Are you sure you want to suspend access for ${teacher.full_name || teacher.name}?`, async () => {
      setActionLoadingId(tId);
      try {
        const res = await serverCall('removeTeacherAccess', {
          userId: tId,
          teacherId: tId,
          email: teacher.email,
        });
        if (res.success) {
          showAlert('Teacher access suspended.', 'Success');
          loadTeachers();
          refreshData(true);
        } else {
          showAlert(res.message || 'Failed to update teacher.', 'Error');
        }
      } catch (err: any) {
        showAlert(err.message, 'Error');
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  const handleRestore = async (teacher: any) => {
    const tId = teacher.id || teacher.userId || teacher.teacherId;
    setActionLoadingId(tId);
    try {
      const res = await serverCall('restoreTeacherAccess', {
        userId: tId,
        teacherId: tId,
        email: teacher.email,
      });
      if (res.success) {
        showAlert('Teacher access restored!', 'Success');
        loadTeachers();
        refreshData(true);
      } else {
        showAlert(res.message || 'Failed to restore teacher.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message, 'Error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = (teacher: any) => {
    const tId = teacher.id || teacher.userId || teacher.teacherId;
    showConfirm(`PERMANENT ACTION: Delete ${teacher.full_name || teacher.name} from directory?`, async () => {
      setActionLoadingId(tId);
      try {
        const res = await serverCall('deleteTeacherAccess', {
          userId: tId,
          teacherId: tId,
          email: teacher.email,
        });
        if (res.success) {
          showAlert('Teacher record permanently deleted.', 'Success');
          loadTeachers();
          refreshData(true);
        } else {
          showAlert(res.message || 'Failed to delete teacher.', 'Error');
        }
      } catch (err: any) {
        showAlert(err.message, 'Error');
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  const filtered = teachers.filter((t) => {
    const name = (t.full_name || t.name || '').toLowerCase();
    const email = (t.email || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const visible = filtered.slice(0, displayLimit);
  const hasMore = displayLimit < filtered.length;

  return (
    <div id="view-inst-teachers" className="page-view active" style={{ display: 'block' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h3 style={{ margin: 0 }}>Teachers Directory</h3>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--brand)',
                background: 'rgba(0,251,166,0.1)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 800,
              }}
            >
              {filtered.length} Teachers
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', maxWidth: '100%' }}>
            <div className="search-wrapper" style={{ marginBottom: 0, width: '220px', maxWidth: '100%', flex: '1 1 180px' }}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search teacher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <OpticalButton
              type="button"
              variant="primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => openModal('teacherReg')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 21a8 8 0 0 1 13.292-6" />
                <circle cx="10" cy="8" r="5" />
                <path d="M19 16v6" />
                <path d="M22 19h-6" />
              </svg>
              Add Teacher
            </OpticalButton>
          </div>
        </div>

        {/* Pending Profile Change Requests Approval Queue (Institute Admin) */}
        {pendingRequests.length > 0 && (
          <div
            style={{
              marginTop: '18px',
              marginBottom: '6px',
              padding: '16px',
              borderRadius: '14px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Pending Profile Change Requests
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: 'var(--accent)',
                  }}
                >
                  {pendingRequests.length}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Review, approve, or reject faculty requests for your institute
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingRequests.map((req: any) => {
                const prof = req.user?.teacher_profiles?.[0] || req.user?.teacher_profiles || {};
                const busy = reqBusyId === (req.notifId || req.targetUserId);
                return (
                  <div
                    key={req.notifId || req.targetUserId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.28)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ flex: '1 1 260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: 'white', fontSize: '13px' }}>
                          {req.user?.full_name || 'Teacher'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 700 }}>
                          Current: {prof.assigned_class || 'No Class'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>• {req.time}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '4px', lineHeight: 1.4 }}>
                        {req.message}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="liquid-glass btn-sm btn-success"
                        disabled={busy}
                        onClick={() => handleReviewRequest(req)}
                        style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700 }}
                      >
                        Review &amp; Approve
                      </button>
                      <button
                        type="button"
                        className="liquid-glass btn-sm btn-danger"
                        disabled={busy}
                        onClick={() => handleQuickReject(req)}
                        style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700 }}
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

        {/* Sleek Data Table Wrapper with Vertical Scroll Containment & Sticky Headers */}
        <div className="tk-table-wrapper" style={{ marginTop: '20px' }}>
          <table className="tk-sleek-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Subject &amp; Class</th>
                <th>Contact No</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody id="table-inst-teachers">
              {loading ? (
                Array.from({ length: 4 }).map((_, r) => (
                  <tr key={r}>
                    <td data-label="NAME">
                      <SkeletonBlock width="140px" height="15px" style={{ marginBottom: '6px' }} />
                      <SkeletonBlock width="180px" height="11px" />
                    </td>
                    <td data-label="SUBJECT & CLASS">
                      <SkeletonBlock width="90px" height="13px" style={{ marginBottom: '6px' }} />
                      <SkeletonBlock width="160px" height="11px" />
                    </td>
                    <td data-label="CONTACT NO">
                      <SkeletonBlock width="100px" height="13px" />
                    </td>
                    <td data-label="STATUS">
                      <SkeletonBlock width="60px" height="20px" borderRadius="6px" />
                    </td>
                    <td data-label="ACTION" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <SkeletonBlock width="60px" height="28px" borderRadius="6px" />
                        <SkeletonBlock width="70px" height="28px" borderRadius="6px" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '50px 20px' }}>
                    <svg
                      width="42"
                      height="42"
                      stroke="var(--text-muted)"
                      strokeWidth="1.2"
                      fill="none"
                      style={{ marginBottom: '12px', opacity: 0.5 }}
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>No Teachers Found</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                      Register a teacher using the &quot;Add Teacher&quot; button above.
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((t, idx) => {
                  const prof = t.teacher_profiles?.[0] || t.teacher_profiles || {};
                  const assignedClass = prof.assigned_class || t.assigned_class || '-';
                  let subjects: string[] = [];
                  if (Array.isArray(prof.subject_handles)) {
                    subjects = prof.subject_handles;
                  } else if (typeof prof.subject_handles === 'string') {
                    subjects = prof.subject_handles.split(',').map((s: string) => s.trim());
                  }

                  const isActive = String(t.status || 'Active').toLowerCase() === 'active';

                  return (
                    <tr key={t.id || idx}>
                      <td data-label="NAME">
                        <div>
                          <div style={{ fontWeight: 800, color: 'white' }}>{t.full_name || t.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.email}</div>
                        </div>
                      </td>
                      <td data-label="SUBJECT & CLASS">
                        <div>
                          <div style={{ marginBottom: '4px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: 'var(--accent)',
                                background: 'rgba(38,195,234,0.1)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              Class: {assignedClass}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {subjects.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                style={{
                                  fontSize: '10px',
                                  background: 'rgba(255,255,255,0.08)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  color: 'var(--text)',
                                }}
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td data-label="CONTACT NO">
                        <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600 }}>
                          {t.phone_number || t.phone || '-'}
                        </span>
                      </td>
                      <td data-label="STATUS">
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: isActive ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
                            color: isActive ? 'var(--success)' : 'var(--danger)',
                            border: `1px solid ${isActive ? 'var(--success)' : 'var(--danger)'}`,
                          }}
                        >
                          {t.status || 'Active'}
                        </span>
                      </td>
                      <td data-label="ACTION" style={{ textAlign: 'right' }}>
                        <div className="mobile-action-row" style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="liquid-glass btn-sm btn-outline"
                            style={{
                              color: 'var(--brand)',
                              borderColor: 'var(--brand)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                            onClick={() => openModal('teacherEdit', t)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            EDIT
                          </button>
                          {isActive ? (
                            <button
                              type="button"
                              className="liquid-glass btn-sm btn-warning"
                              style={{
                                color: 'var(--accent)',
                                borderColor: 'var(--accent)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                              disabled={actionLoadingId === (t.id || t.userId)}
                              onClick={() => handleRemove(t)}
                            >
                              {actionLoadingId === (t.id || t.userId) ? (
                                <IOSSpinner size={13} color="currentColor" />
                              ) : (
                                <>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                  </svg>
                                  SUSPEND
                                </>
                              )}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="liquid-glass btn-sm btn-success"
                                style={{
                                  color: 'var(--success)',
                                  borderColor: 'var(--success)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                                disabled={actionLoadingId === (t.id || t.userId)}
                                onClick={() => handleRestore(t)}
                              >
                                {actionLoadingId === (t.id || t.userId) ? (
                                  <IOSSpinner size={13} color="currentColor" />
                                ) : (
                                  <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="1 4 1 10 7 10" />
                                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                    </svg>
                                    RESTORE
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                className="liquid-glass btn-sm btn-danger"
                                style={{
                                  color: 'var(--danger)',
                                  borderColor: 'var(--danger)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                                disabled={actionLoadingId === (t.id || t.userId)}
                                onClick={() => handleDelete(t)}
                              >
                                {actionLoadingId === (t.id || t.userId) ? (
                                  <IOSSpinner size={13} color="currentColor" />
                                ) : (
                                  <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      <line x1="10" y1="11" x2="10" y2="17" />
                                      <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                    DELETE
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
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
            Showing <b style={{ color: 'white' }}>{visible.length}</b> of <b style={{ color: 'white' }}>{filtered.length}</b> faculty members (Load Capacity: 30 / batch)
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
              Load More Teachers... (+30)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
