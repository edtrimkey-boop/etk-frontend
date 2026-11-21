'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import AccessDenied from '@/components/shared/AccessDenied';
import { normalizeRole } from '@/lib/rbac';

export default function TeachersPage() {
  const { user, payload, openModal, showAlert, showConfirm, refreshData } = useDashboard();
  const role = normalizeRole(user?.role);

  // Strict Privacy Route Guard: Institute Admin Only
  if (role !== 'admin') {
    return <AccessDenied requiredRole="Institute Administrator" moduleName="Faculty & Teachers Directory" />;
  }

  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadTeachers = async () => {
    const instId = user?.instId || user?.code;
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
  }, [user, payload]);

  const handleRemove = (teacher: any) => {
    showConfirm(`Are you sure you want to suspend access for ${teacher.full_name || teacher.name}?`, async () => {
      try {
        const res = await serverCall('removeTeacherAccess', { email: teacher.email, teacherId: teacher.id });
        if (res.success) {
          showAlert('Teacher access suspended.', 'Success');
          loadTeachers();
          refreshData(true);
        } else {
          showAlert(res.message || 'Failed to update teacher.', 'Error');
        }
      } catch (err: any) {
        showAlert(err.message, 'Error');
      }
    });
  };

  const handleRestore = async (teacher: any) => {
    try {
      const res = await serverCall('restoreTeacherAccess', { email: teacher.email, teacherId: teacher.id });
      if (res.success) {
        showAlert('Teacher access restored!', 'Success');
        loadTeachers();
        refreshData(true);
      } else {
        showAlert(res.message || 'Failed to restore teacher.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message, 'Error');
    }
  };

  const handleDelete = (teacher: any) => {
    showConfirm(`PERMANENT ACTION: Delete ${teacher.full_name || teacher.name} from directory?`, async () => {
      try {
        const res = await serverCall('deleteTeacherAccess', { email: teacher.email, teacherId: teacher.id });
        if (res.success) {
          showAlert('Teacher record permanently deleted.', 'Success');
          loadTeachers();
          refreshData(true);
        } else {
          showAlert(res.message || 'Failed to delete teacher.', 'Error');
        }
      } catch (err: any) {
        showAlert(err.message, 'Error');
      }
    });
  };

  const [displayLimit, setDisplayLimit] = useState<number>(30);

  useEffect(() => {
    setDisplayLimit(30);
  }, [search]);

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
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div className="spinner-sm" style={{ margin: '0 auto 10px auto' }} />
                    Loading teachers directory...
                  </td>
                </tr>
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
                        <div className="mobile-action-row" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="liquid-glass btn-sm btn-outline"
                            style={{ color: 'var(--brand)', borderColor: 'var(--brand)' }}
                            onClick={() => openModal('teacherEdit', t)}
                          >
                            Edit
                          </button>
                          {isActive ? (
                            <button
                              type="button"
                              className="liquid-glass btn-sm btn-warning"
                              onClick={() => handleRemove(t)}
                            >
                              Suspend
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="liquid-glass btn-sm btn-success"
                                onClick={() => handleRestore(t)}
                              >
                                Restore
                              </button>
                              <button
                                type="button"
                                className="liquid-glass btn-sm btn-danger"
                                onClick={() => handleDelete(t)}
                              >
                                Delete
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
