'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';

export default function AdminInstitutesPage() {
  const { payload } = useDashboard();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [displayLimit, setDisplayLimit] = useState<number>(30);

  const institutes = payload?.superAdmin?.institutes || [];

  React.useEffect(() => {
    setDisplayLimit(30);
  }, [search, statusFilter]);

  const filtered = institutes.filter((inst: any) => {
    const name = (inst.name || '').toLowerCase();
    const code = (inst.code || '').toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = name.includes(q) || code.includes(q);
    const matchesStatus = statusFilter === 'all' || (inst.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const visible = filtered.slice(0, displayLimit);
  const hasMore = displayLimit < filtered.length;

  return (
    <div id="view-institutes" className="page-view active" style={{ display: 'block' }}>
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
            <h3 style={{ margin: 0 }}>Client Control Center</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Enterprise directory of registered institutional branches
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="search-wrapper" style={{ marginBottom: 0, width: '220px' }}>
              <input
                type="text"
                className="search-input"
                placeholder="Search branch name / code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              style={{ marginBottom: 0, width: 'auto' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="tk-table-wrapper" style={{ marginTop: '20px' }}>
          <table className="tk-sleek-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Institute Name</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Quotas (Pap / Doc)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No institute records found in database.
                  </td>
                </tr>
              ) : (
                visible.map((inst: any, idx: number) => (
                  <tr key={idx}>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--brand)', fontFamily: 'monospace' }}>
                        {inst.code || 'KPS'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'white' }}>{inst.name}</td>
                    <td>
                      <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '12px' }}>
                        {inst.plan || 'Standard ERP'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: inst.status === 'Active' ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
                          color: inst.status === 'Active' ? 'var(--success)' : 'var(--danger)',
                          border: `1px solid ${inst.status === 'Active' ? 'var(--success)' : 'var(--danger)'}`,
                        }}
                      >
                        {inst.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        P: <b style={{ color: 'white' }}>{inst.papers || 0}</b> | D:{' '}
                        <b style={{ color: 'white' }}>{inst.rc || 0}</b>
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="liquid-glass btn-sm btn-outline"
                        style={{ color: 'var(--brand)' }}
                      >
                        Manage
                      </button>
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
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Showing <b style={{ color: 'white' }}>{visible.length}</b> of <b style={{ color: 'white' }}>{filtered.length}</b> institutes (Load Capacity: 30 / batch)
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
