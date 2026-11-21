'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';

export default function AdminOperatorsPage() {
  const { payload } = useDashboard();
  const [search, setSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState<number>(30);

  const operatorList = payload?.superAdmin?.operatorList || [];

  React.useEffect(() => {
    setDisplayLimit(30);
  }, [search]);

  const filtered = operatorList.filter((op: any) => {
    const name = (op.name || op.full_name || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q);
  });

  const visible = filtered.slice(0, displayLimit);
  const hasMore = displayLimit < filtered.length;

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

        <div className="tk-table-wrapper" style={{ marginTop: '20px' }}>
          <table className="tk-sleek-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Operator Name</th>
                <th>Role</th>
                <th>Assigned</th>
                <th>Completed</th>
                <th>Pending</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No operator records registered.
                  </td>
                </tr>
              ) : (
                visible.map((op: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 800, color: 'white' }}>{op.name || op.full_name}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--brand)',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {op.role || 'Operator'}
                      </span>
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
                          background: 'rgba(46,204,113,0.1)',
                          color: 'var(--success)',
                          border: '1px solid var(--success)',
                        }}
                      >
                        {op.status || 'Active'}
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
