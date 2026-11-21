'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import AccessDenied from '@/components/shared/AccessDenied';
import { normalizeRole } from '@/lib/rbac';

export default function AdminBillingPage() {
  const { user, payload } = useDashboard();
  const role = normalizeRole(user?.role);

  // Strict Privacy Route Guard: Super Admin Only
  if (role !== 'super_admin') {
    return <AccessDenied requiredRole="Super Administrator" moduleName="Global Financial Ledger" />;
  }

  const [search, setSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState<number>(30);

  const transactions = payload?.superAdmin?.transactions || [];

  const filtered = transactions.filter((tx: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (tx.id && tx.id.toLowerCase().includes(q)) ||
      (tx.institute && tx.institute.toLowerCase().includes(q)) ||
      (tx.plan && tx.plan.toLowerCase().includes(q))
    );
  });

  const visible = filtered.slice(0, displayLimit);
  const hasMore = displayLimit < filtered.length;

  return (
    <div id="view-billing" className="page-view active" style={{ display: 'block' }}>
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
            <h3 style={{ margin: 0 }}>Revenue Engine Ledger</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Central financial auditing &amp; subscription transactions
            </p>
          </div>

          <div className="search-wrapper" style={{ marginBottom: 0, width: '240px' }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search reference or inst..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="tk-table-wrapper" style={{ marginTop: '20px' }}>
          <table className="tk-sleek-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Reference ID</th>
                <th>Institute</th>
                <th>Date</th>
                <th>Plan / Package</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No global billing transactions recorded yet.
                  </td>
                </tr>
              ) : (
                visible.map((tx: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--brand)', fontWeight: 700 }}>
                      {tx.id || `TXN-${idx + 1}`}
                    </td>
                    <td>{tx.institute || '-'}</td>
                    <td>{tx.date || '-'}</td>
                    <td>{tx.plan || 'Standard'}</td>
                    <td style={{ fontWeight: 800, color: 'white' }}>₹{tx.amount || 0}</td>
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
                        {tx.status || 'Paid'}
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
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Showing <b style={{ color: 'white' }}>{visible.length}</b> of <b style={{ color: 'white' }}>{filtered.length}</b> records (Load Capacity: 30 / batch)
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
