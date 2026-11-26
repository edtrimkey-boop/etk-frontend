'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { OpticalLink } from '@/components/ui/OpticalGlass';
import AccessDenied from '@/components/shared/AccessDenied';
import { normalizeRole } from '@/lib/rbac';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/pricing';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Text highlighter matching etk-ui.txt `hl(text, q)`
 * Renders `<mark className="highlight-match">` for match segments.
 */
function highlightMatch(text: string | number | null | undefined, query: string) {
  if (text === null || text === undefined || text === '') return '-';
  const str = String(text);
  const q = query.trim();
  if (!q) return str;

  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = str.split(new RegExp(`(${escapedQ})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="highlight-match">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// Module-level in-memory cache for instant zero-latency tab switching
let memoryStudentsCache: any[] = [];

export default function StudentsPage() {
  const { user, payload } = useDashboard();
  const role = normalizeRole(user?.role);

  // Strict Privacy Route Guard: Institute Admin & Teachers Only
  if (role === 'operator') {
    return <AccessDenied requiredRole="Institute Staff or Faculty" moduleName="Students Database" />;
  }

  const [students, setStudents] = useState<any[]>(memoryStudentsCache);
  const [loading, setLoading] = useState(memoryStudentsCache.length === 0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [displayLimit, setDisplayLimit] = useState<number>(30);

  // Resolve institute UUID and fetch students directly from Supabase
  const loadStudents = useCallback(async (force = false) => {
    if (force || memoryStudentsCache.length === 0) {
      setLoading(true);
    }
    setErrorMsg(null);

    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    };

    try {
      // 1. Resolve Institute UUID
      let targetInstId: string | null = null;

      // Check direct UUID on user / payload
      if (user?.institute_id && UUID_REGEX.test(user.institute_id)) {
        targetInstId = user.institute_id;
      } else if (user?.instId && UUID_REGEX.test(user.instId)) {
        targetInstId = user.instId;
      } else if (payload?.profile?.institute_id && UUID_REGEX.test(payload.profile.institute_id)) {
        targetInstId = payload.profile.institute_id;
      }

      // If no direct UUID, resolve via Supabase institutes table
      if (!targetInstId) {
        const instCode = user?.code || user?.instId || payload?.profile?.code || payload?.code;
        const instEmail = user?.email || payload?.profile?.email;

        if (instCode && instCode !== 'all') {
          try {
            const instRes = await fetch(
              `${SUPABASE_URL}/rest/v1/institutes?institute_code=eq.${encodeURIComponent(instCode)}&select=id&limit=1`,
              { headers }
            );
            if (instRes.ok) {
              const rows = await instRes.json();
              if (rows && rows.length > 0 && rows[0]?.id) {
                targetInstId = rows[0].id;
              }
            }
          } catch (lookupErr) {
            console.warn('[Students] Institute code lookup failed:', lookupErr);
          }
        }

        if (!targetInstId && instEmail) {
          try {
            const instRes = await fetch(
              `${SUPABASE_URL}/rest/v1/institutes?admin_email=eq.${encodeURIComponent(instEmail)}&select=id&limit=1`,
              { headers }
            );
            if (instRes.ok) {
              const rows = await instRes.json();
              if (rows && rows.length > 0 && rows[0]?.id) {
                targetInstId = rows[0].id;
              }
            }
          } catch (lookupErr) {
            console.warn('[Students] Admin email lookup failed:', lookupErr);
          }
        }
      }

      // 2. Query Supabase table 'students'
      let queryUrl = '';
      if (targetInstId) {
        queryUrl = `${SUPABASE_URL}/rest/v1/students?institute_id=eq.${targetInstId}&order=class_name.asc,roll_no.asc`;
      } else if (role === 'super_admin') {
        // Super admin view
        queryUrl = `${SUPABASE_URL}/rest/v1/students?order=class_name.asc,roll_no.asc&limit=500`;
      }

      if (queryUrl) {
        const res = await fetch(queryUrl, { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            memoryStudentsCache = data;
            setStudents(data);
            setLoading(false);
            return;
          }
        } else {
          const errText = await res.text();
          console.error('[Students] Supabase error response:', errText);
          setErrorMsg('Failed to query Supabase students.');
        }
      }

      // 3. Graceful Fallback if Supabase was unreachable
      if (payload?.data?.instStudents && Array.isArray(payload.data.instStudents)) {
        setStudents(payload.data.instStudents);
      } else if (payload?.instStudents && Array.isArray(payload.instStudents)) {
        setStudents(payload.instStudents);
      }
    } catch (err: any) {
      console.error('[Students] Fetch failed:', err);
      setErrorMsg(err.message || 'Database connection error.');
      if (payload?.data?.instStudents && Array.isArray(payload.data.instStudents)) {
        setStudents(payload.data.instStudents);
      }
    } finally {
      setLoading(false);
    }
  }, [user, payload, role]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Extract unique sorted classes
  const classes = useMemo(() => {
    const setOfClasses = new Set<string>();
    students.forEach((s) => {
      const c = (s.class_name || s.class || '').trim();
      if (c) setOfClasses.add(c);
    });
    return Array.from(setOfClasses).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [students]);

  // Reset pagination when search or class filter changes
  useEffect(() => {
    setDisplayLimit(30);
  }, [search, classFilter]);

  // Filter students matching etk-ui.txt logic
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const sClass = (s.class_name || s.class || '').trim();
      const matchesClass = classFilter === 'all' || sClass === classFilter;

      if (!q) return matchesClass;

      const name = (s.student_name || s.name || '').toLowerCase();
      const father = (s.father_name || s.father || '').toLowerCase();
      const admNo = String(s.admission_no || s.adm_no || s.roll_no || '').toLowerCase();
      const village = (s.village || '').toLowerCase();

      const matchesSearch =
        name.includes(q) ||
        father.includes(q) ||
        admNo.includes(q) ||
        village.includes(q);

      return matchesClass && matchesSearch;
    });
  }, [students, search, classFilter]);

  const visible = useMemo(() => {
    return filtered.slice(0, displayLimit);
  }, [filtered, displayLimit]);

  const hasMore = displayLimit < filtered.length;

  return (
    <div id="view-inst-students" className="page-view active" style={{ display: 'block' }}>
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
            <h3 style={{ margin: 0 }}>Students Database</h3>
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
              {filtered.length} Students
            </span>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="liquid-glass btn-secondary"
              onClick={() => { void loadStudents(true); }}
              disabled={loading}
              title="Refresh database records"
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg
                width="14"
                height="14"
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
              Sync
            </button>

            <OpticalLink
              href="/admission"
              variant="outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              Admission System
            </OpticalLink>

            <OpticalLink
              href="/admission?new=1"
              variant="primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" x2="19" y1="8" y2="14" />
                <line x1="22" x2="16" y1="11" y2="11" />
              </svg>
              New Admission
            </OpticalLink>
          </div>
        </div>

        {/* Controls: Search Bar & Class Filter */}
        <div
          style={{
            display: 'flex',
            gap: '15px',
            margin: '20px 0',
            flexWrap: 'wrap',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.2)',
            padding: '15px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          <div className="search-wrapper" style={{ maxWidth: '320px', marginBottom: 0 }}>
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              id="studentSearchInput"
              className="search-input"
              placeholder="Search Adm No, Name, Father..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            id="student-class-filter"
            className="filter-select"
            style={{ marginBottom: 0, width: 'auto' }}
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c.toLowerCase().startsWith('class') ? c : `Class ${c}`}
              </option>
            ))}
          </select>

          <span
            id="studentCountBadge"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Showing <b style={{ color: 'white' }}>{visible.length}</b> of <b style={{ color: 'white' }}>{filtered.length}</b> students
          </span>
        </div>

        {/* Sleek Data Table matching etk-ui.txt 1:1 */}
        <div className="tk-table-wrapper">
          <table className="tk-sleek-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Adm No</th>
                <th>Student &amp; Father Name</th>
                <th>Class &amp; Roll</th>
                <th>Contact No</th>
                <th>Village</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="table-inst-students-body">
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div className="spinner-sm" style={{ margin: '0 auto 10px auto' }} />
                    Loading students from secure database...
                  </td>
                </tr>
              ) : errorMsg && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '35px', color: 'var(--danger)', fontWeight: 600 }}>
                    {errorMsg}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '50px 20px' }}>
                    <svg
                      width="42"
                      height="42"
                      stroke="var(--text-muted)"
                      strokeWidth="1.2"
                      fill="none"
                      style={{ marginBottom: '12px', opacity: 0.5 }}
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
                      {search || classFilter !== 'all' ? 'No students match the selected filters.' : 'No Students Found'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                      Register students via the Admission Portal.
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((s, idx) => {
                  const isActive = String(s.status || 'Active').trim().toLowerCase() === 'active';
                  const badgeClass = isActive ? 'bg-success' : 'bg-danger';
                  const contactNo = s.contact_no
                    ? String(s.contact_no).replace(/\.0$/, '')
                    : s.phone_number || s.contact || s.phone || '-';
                  const admNo = s.admission_no || s.adm_no || (s.roll_no ? `TK-${s.roll_no}` : '-');
                  const sName = s.student_name || s.name || 'Unnamed Student';
                  const fName = s.father_name || s.father || '-';
                  const village = s.village || '-';
                  const className = s.class_name || s.class || '-';
                  const rollNo = s.roll_no ?? '-';

                  return (
                    <tr key={s.id || idx}>
                      <td data-label="Adm No">
                        <span
                          className="flat-pill"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: 'var(--brand)',
                            border: '1px solid var(--border)',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                          }}
                        >
                          {highlightMatch(admNo, search)}
                        </span>
                      </td>
                      <td data-label="Student & Father">
                        <div>
                          <b style={{ color: 'white', fontSize: '13px' }}>
                            {highlightMatch(sName, search)}
                          </b>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            F: {highlightMatch(fName, search)}
                          </div>
                        </div>
                      </td>
                      <td data-label="Class & Roll">
                        <div>
                          <b style={{ color: 'white', fontSize: '12px' }}>
                            {className.toLowerCase().startsWith('class') ? className : `Class ${className}`}
                          </b>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Roll: {rollNo}
                          </div>
                        </div>
                      </td>
                      <td data-label="Contact No">
                        <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600 }}>
                          {contactNo}
                        </span>
                      </td>
                      <td data-label="Village">
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {highlightMatch(village, search)}
                        </span>
                      </td>
                      <td data-label="Status">
                        <span className={`badge ${badgeClass}`}>
                          {s.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Load Capacity Bar & Load More Action */}
        <div className="tk-table-capacity-bar" style={{ marginTop: '20px' }}>
          <div className="tk-capacity-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            Showing <b style={{ color: 'white' }}>{visible.length}</b> of <b style={{ color: 'white' }}>{filtered.length}</b> students (Load Capacity: 30 / batch)
          </div>
          {hasMore && (
            <button
              type="button"
              className="tk-load-more-btn liquid-glass"
              onClick={() => setDisplayLimit((prev) => prev + 30)}
              style={{
                padding: '10px 24px',
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--brand)',
                borderColor: 'var(--brand)',
                cursor: 'pointer',
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ marginRight: '6px' }}
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Load More Students... (+30)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
