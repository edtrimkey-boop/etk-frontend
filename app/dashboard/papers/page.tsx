'use client';

import React, { useState, useMemo } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import SleekJobsTable from '@/components/shared/SleekJobsTable';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import { normalizeRole } from '@/lib/rbac';

function getSessionFromDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const yr = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 4 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
}

export default function PapersPage() {
  const { user, payload, loading, openModal, showAlert } = useDashboard();
  const [search, setSearch] = useState('');
  const [instFilter, setInstFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const normRole = normalizeRole(user?.role);
  const isSuperAdmin = normRole === 'super_admin';
  const showInstFilter = isSuperAdmin || normRole === 'operator';

  const papers = useMemo(() => {
    return Array.isArray(payload?.data?.papers) ? payload.data.papers : [];
  }, [payload]);

  // Dynamic filter options extracted from data
  const dynamicOptions = useMemo(() => {
    const insts = new Set<string>();
    const classes = new Set<string>();
    const sessions = new Set<string>();
    const subjects = new Set<string>();
    const statuses = new Set<string>();

    papers.forEach((p: any) => {
      if (p.inst) insts.add(String(p.inst).trim());
      if (p.class) classes.add(String(p.class).trim());
      const sess = p.session || getSessionFromDate(p.date);
      if (sess) sessions.add(String(sess).trim());
      if (p.subject) subjects.add(String(p.subject).trim());
      if (p.status) statuses.add(String(p.status).trim());
    });

    return {
      insts: Array.from(insts).sort(),
      classes: Array.from(classes).sort(),
      sessions: Array.from(sessions).sort(),
      subjects: Array.from(subjects).sort(),
      statuses: Array.from(statuses).sort(),
    };
  }, [papers]);

  // Filter & Sort Papers
  const filteredAndSortedPapers = useMemo(() => {
    let result = papers.filter((p: any) => {
      const q = search.trim().toLowerCase();
      const pSess = (p.session || getSessionFromDate(p.date) || '').toLowerCase();
      const pSub = String(p.subject || '').trim().toLowerCase();
      const pStat = String(p.status || '').trim().toLowerCase();
      const pCls = String(p.class || '').trim().toLowerCase();
      const pInst = String(p.inst || '').trim().toLowerCase();

      const mSearch =
        !q ||
        [p.id, p.inst, p.subject, p.class, p.status, p.exam, p.teacherName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);

      const mInst = !showInstFilter || instFilter === 'all' || pInst === instFilter.toLowerCase();
      const mClass = classFilter === 'all' || pCls === classFilter.toLowerCase();
      const mSess = sessionFilter === 'all' || pSess === sessionFilter.toLowerCase();
      const mSub = subjectFilter === 'all' || pSub === subjectFilter.toLowerCase();
      const mStat = statusFilter === 'all' || pStat === statusFilter.toLowerCase();

      return mSearch && mInst && mClass && mSess && mSub && mStat;
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
        const tA = new Date(a.deadline || a.testDate || 0).getTime();
        const tB = new Date(b.deadline || b.testDate || 0).getTime();
        return tA - tB;
      }
      if (sortBy === 'subject') {
        return String(a.subject || '').localeCompare(String(b.subject || ''));
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
  }, [papers, search, instFilter, classFilter, sessionFilter, subjectFilter, statusFilter, sortBy, showInstFilter]);

  const handleAction = (action: string, job: any) => {
    if (action === 'chat') {
      openModal('jobChat', { jobId: job.id, mode: 'chat', job });
    } else if (action === 'revision') {
      openModal('jobChat', { jobId: job.id, mode: 'revision', job });
    } else if (action === 'assign') {
      openModal('assignModal', { jobId: job.id, jobType: 'Paper', job });
    }
  };

  return (
    <div id="view-papers" className="page-view active" style={{ display: 'block' }}>
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
            <h3 style={{ margin: 0 }}>Paper Jobs Queue</h3>
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
              {filteredAndSortedPapers.length} Papers
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
                id="paperSearchInput"
                className="search-input"
                placeholder="Search ID, Inst, Subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <OpticalButton
              type="button"
              variant="primary"
              onClick={() => openModal('paperSubmit')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Submit Paper
            </OpticalButton>
          </div>
        </div>

        {/* Dynamic Filter Controls Bar — Matching index.html lines 3184-3190 */}
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
              id="paper-inst-filter"
              className="filter-select"
              value={instFilter}
              onChange={(e) => setInstFilter(e.target.value)}
              style={{ marginBottom: 0 }}
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
            id="paper-class-filter"
            className="filter-select"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="all">All Classes</option>
            {dynamicOptions.classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            id="paper-session-filter"
            className="filter-select"
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="all">All Sessions</option>
            {dynamicOptions.sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            id="paper-subject-filter"
            className="filter-select"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="all">All Subjects</option>
            {dynamicOptions.subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>

          <select
            id="paper-status-filter"
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginBottom: 0 }}
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
            id="paper-sort-filter"
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ marginBottom: 0, width: 'auto', marginLeft: 'auto', border: '1px solid var(--brand)' }}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="deadline">Sort: Deadline</option>
            <option value="subject">Sort: Subject (A-Z)</option>
            <option value="class">Sort: Class</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>

        {/* Sleek Jobs Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner-sm" style={{ margin: '0 auto 10px auto' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Syncing paper queue...</p>
          </div>
        ) : (
          <SleekJobsTable
            data={filteredAndSortedPapers}
            type="papers"
            userRole={user?.role || 'admin'}
            searchQuery={search}
            onOpenAction={handleAction}
          />
        )}
      </div>
    </div>
  );
}
