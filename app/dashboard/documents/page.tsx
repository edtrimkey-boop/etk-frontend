'use client';

import React, { useState, useMemo } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import SleekJobsTable from '@/components/shared/SleekJobsTable';
import { OpticalButton } from '@/components/ui/OpticalGlass';

function getSessionFromDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const yr = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 4 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
}

export default function DocumentsPage() {
  const { user, payload, loading, openModal, showAlert } = useDashboard();
  const [search, setSearch] = useState('');
  const [instFilter, setInstFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const userRole = (user?.role || '').toLowerCase();
  const isSuperAdmin = userRole === 'super admin' || userRole === 'system admin' || userRole === 'all';
  const showInstFilter = isSuperAdmin || userRole === 'operator';

  const documents = useMemo(() => {
    return Array.isArray(payload?.data?.docs) ? payload.data.docs : [];
  }, [payload]);

  // Dynamic dropdown options extracted from records
  const dynamicOptions = useMemo(() => {
    const insts = new Set<string>();
    const classes = new Set<string>();
    const sessions = new Set<string>();
    const types = new Set<string>();
    const statuses = new Set<string>();

    documents.forEach((d: any) => {
      if (d.inst) insts.add(String(d.inst).trim());
      if (d.class) classes.add(String(d.class).trim());
      const sess = d.session || getSessionFromDate(d.date);
      if (sess) sessions.add(String(sess).trim());
      if (d.type) types.add(String(d.type).trim());
      if (d.status) statuses.add(String(d.status).trim());
    });

    return {
      insts: Array.from(insts).sort(),
      classes: Array.from(classes).sort(),
      sessions: Array.from(sessions).sort(),
      types: Array.from(types).sort(),
      statuses: Array.from(statuses).sort(),
    };
  }, [documents]);

  // Filter & Sort Documents
  const filteredAndSortedDocs = useMemo(() => {
    let result = documents.filter((d: any) => {
      const q = search.trim().toLowerCase();
      const dSess = (d.session || getSessionFromDate(d.date) || '').toLowerCase();
      const dType = String(d.type || '').trim().toLowerCase();
      const dStat = String(d.status || '').trim().toLowerCase();
      const dCls = String(d.class || '').trim().toLowerCase();
      const dInst = String(d.inst || '').trim().toLowerCase();

      const mSearch =
        !q ||
        [d.id, d.inst, d.type, d.class, d.status, d.exam]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);

      const mInst = !showInstFilter || instFilter === 'all' || dInst === instFilter.toLowerCase();
      const mClass = classFilter === 'all' || dCls === classFilter.toLowerCase();
      const mSess = sessionFilter === 'all' || dSess === sessionFilter.toLowerCase();
      const mType = typeFilter === 'all' || dType === typeFilter.toLowerCase();
      const mStat = statusFilter === 'all' || dStat === statusFilter.toLowerCase();

      return mSearch && mInst && mClass && mSess && mType && mStat;
    });

    // Sorting
    result.sort((a: any, b: any) => {
      if (sortBy === 'newest') {
        const tA = new Date(a.date || a.createdAt || 0).getTime();
        const tB = new Date(b.date || b.createdAt || 0).getTime();
        return tB - tA;
      }
      if (sortBy === 'oldest') {
        const tA = new Date(a.date || a.createdAt || 0).getTime();
        const tB = new Date(b.date || b.createdAt || 0).getTime();
        return tA - tB;
      }
      if (sortBy === 'deadline') {
        const tA = new Date(a.deadline || a.date || 0).getTime();
        const tB = new Date(b.deadline || b.date || 0).getTime();
        return tA - tB;
      }
      if (sortBy === 'students') {
        return (parseInt(b.numStudents, 10) || 0) - (parseInt(a.numStudents, 10) || 0);
      }
      if (sortBy === 'class') {
        return String(a.class || '').localeCompare(String(b.class || ''));
      }
      if (sortBy === 'status') {
        return String(a.status || '').localeCompare(String(b.status || ''));
      }
      return 0;
    });

    return result;
  }, [documents, search, instFilter, classFilter, sessionFilter, typeFilter, statusFilter, sortBy, showInstFilter]);

  const handleAction = (action: string, job: any) => {
    if (action === 'chat') {
      openModal('jobChat', { jobId: job.id, mode: 'chat', job });
    } else if (action === 'revision') {
      openModal('jobChat', { jobId: job.id, mode: 'revision', job });
    } else if (action === 'assign') {
      showAlert(`Assignment dispatcher opened for job ${job.id}.`, `Assign Job`);
    }
  };

  return (
    <div id="view-documents" className="page-view active" style={{ display: 'block' }}>
      <div className="panel">
        <div
          className="panel-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            borderBottom: 'none',
            marginBottom: '10px',
            paddingBottom: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h3 style={{ margin: 0 }}>Document Jobs Queue</h3>
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
              {filteredAndSortedDocs.length} Documents
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
                id="docSearchInput"
                className="search-input"
                placeholder="Search ID, Inst, Class..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <OpticalButton
              type="button"
              variant="warning"
              onClick={() => openModal('docSubmit')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <path d="M12 11h4" />
                <path d="M12 16h4" />
              </svg>
              Request Document
            </OpticalButton>
          </div>
        </div>

        {/* Dynamic Filter Controls Bar — Matching index.html lines 3163-3169 */}
        <div
          style={{
            display: 'flex',
            gap: '15px',
            marginBottom: '25px',
            flexWrap: 'wrap',
            background: 'rgba(0,0,0,0.25)',
            padding: '15px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          {showInstFilter && (
            <select
              id="doc-inst-filter"
              className="filter-select"
              value={instFilter}
              onChange={(e) => setInstFilter(e.target.value)}
              style={{ marginBottom: 0, width: 'auto' }}
            >
              <option value="all">All Institutes</option>
              {dynamicOptions.insts.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          )}

          <select
            id="doc-class-filter"
            className="filter-select"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            style={{ marginBottom: 0, width: 'auto' }}
          >
            <option value="all">All Classes</option>
            {dynamicOptions.classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            id="doc-session-filter"
            className="filter-select"
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            style={{ marginBottom: 0, width: 'auto' }}
          >
            <option value="all">All Sessions</option>
            {dynamicOptions.sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            id="doc-type-filter"
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ marginBottom: 0, width: 'auto' }}
          >
            <option value="all">All Types</option>
            <option value="Report Card">Report Card</option>
            <option value="Admit Card">Admit Card</option>
            <option value="ID Card">ID Card</option>
            <option value="Certificate">Certificate</option>
            {dynamicOptions.types
              .filter((t) => !['Report Card', 'Admit Card', 'ID Card', 'Certificate'].includes(t))
              .map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </select>

          <select
            id="doc-status-filter"
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginBottom: 0, width: 'auto' }}
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Revision">Pending Revision</option>
            <option value="Completed">Completed</option>
            <option value="Delivered">Delivered</option>
          </select>

          {/* Dynamic Sorting Filter */}
          <select
            id="doc-sort-filter"
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ marginBottom: 0, width: 'auto', marginLeft: 'auto', border: '1px solid var(--brand)' }}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="deadline">Sort: Deadline</option>
            <option value="students">Sort: Student Count</option>
            <option value="class">Sort: Class</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>

        {/* Sleek Jobs Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner-sm" style={{ margin: '0 auto 10px auto' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Syncing documents queue...</p>
          </div>
        ) : (
          <SleekJobsTable
            data={filteredAndSortedDocs}
            type="docs"
            userRole={user?.role || 'admin'}
            searchQuery={search}
            onOpenAction={handleAction}
          />
        )}
      </div>
    </div>
  );
}
