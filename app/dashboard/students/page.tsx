'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalLink } from '@/components/ui/OpticalGlass';

export default function StudentsPage() {
  const { user, payload } = useDashboard();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  const loadStudents = async () => {
    const instId = user?.instId || user?.code;
    if (!instId) {
      if (payload?.data?.instStudents) {
        setStudents(payload.data.instStudents);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await serverCall('getStudentsList', { instId });
      if (res.success && res.students) {
        setStudents(res.students);
      } else if (payload?.data?.instStudents) {
        setStudents(payload.data.instStudents);
      }
    } catch (err: any) {
      console.warn('Students fetch notice:', err.message);
      if (payload?.data?.instStudents) {
        setStudents(payload.data.instStudents);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [user, payload]);

  // Extract unique classes
  const classes = Array.from(new Set(students.map((s) => s.class_name || s.class).filter(Boolean))).sort();

  const [displayLimit, setDisplayLimit] = useState<number>(30);

  useEffect(() => {
    setDisplayLimit(30);
  }, [search, classFilter]);

  const filtered = students.filter((s) => {
    const name = (s.student_name || s.name || '').toLowerCase();
    const father = (s.father_name || s.father || '').toLowerCase();
    const admNo = String(s.admission_no || s.adm_no || s.roll_no || '').toLowerCase();
    const sClass = (s.class_name || s.class || '').toLowerCase();

    const matchesSearch =
      search === '' ||
      name.includes(search.toLowerCase()) ||
      father.includes(search.toLowerCase()) ||
      admNo.includes(search.toLowerCase());

    const matchesClass = classFilter === 'all' || sClass === classFilter.toLowerCase();

    return matchesSearch && matchesClass;
  });

  const visible = filtered.slice(0, displayLimit);
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

          <OpticalLink
            href="/admission"
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
              <option key={c} value={c}>Class {c}</option>
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

        {/* Students Table with Vertical Scroll Containment & Sticky Headers */}
        <div className="tk-table-wrapper">
          <table className="tk-sleek-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Adm / Roll No</th>
                <th>Student &amp; Father Name</th>
                <th>Class</th>
                <th>Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div className="spinner-sm" style={{ margin: '0 auto 10px auto' }} />
                    Loading students database...
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
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>No Students Found</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                      Register students via the Admission Portal.
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((s, idx) => (
                  <tr key={s.id || idx}>
                    <td data-label="ADM / ROLL NO">
                      <span style={{ fontWeight: 800, color: 'var(--brand)', fontFamily: 'monospace' }}>
                        {s.admission_no || s.adm_no || s.roll_no || `TK-${idx + 1}`}
                      </span>
                    </td>
                    <td data-label="STUDENT">
                      <div>
                        <div style={{ fontWeight: 800, color: 'white' }}>{s.student_name || s.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Father: {s.father_name || s.father || '-'}
                        </div>
                      </div>
                    </td>
                    <td data-label="CLASS">
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
                        {s.class_name || s.class || '-'}
                      </span>
                    </td>
                    <td data-label="CONTACT">
                      <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600 }}>
                        {s.phone_number || s.contact_no || s.phone || '-'}
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
                          background: 'rgba(46,204,113,0.1)',
                          color: 'var(--success)',
                          border: '1px solid var(--success)',
                        }}
                      >
                        {s.status || 'Enrolled'}
                      </span>
                    </td>
                  </tr>
                ))
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
            Showing <b style={{ color: 'white' }}>{visible.length}</b> of <b style={{ color: 'white' }}>{filtered.length}</b> students (Load Capacity: 30 / batch)
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
              Load More Students... (+30)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
