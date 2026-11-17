'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';

export default function AdminOperatorsPage() {
  const { payload } = useDashboard();
  const [search, setSearch] = useState('');

  const operatorList = payload?.superAdmin?.operatorList || [];

  const filtered = operatorList.filter((op: any) => {
    const name = (op.name || op.full_name || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q);
  });

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

        <div className="tk-table-wrapper" style={{ marginTop: '20px', overflowX: 'auto' }}>
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
                filtered.map((op: any, idx: number) => (
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
      </div>
    </div>
  );
}
