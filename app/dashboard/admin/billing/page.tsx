'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';

export default function AdminBillingPage() {
  const { payload } = useDashboard();
  const [search, setSearch] = useState('');

  const transactions = payload?.superAdmin?.transactions || [];

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

        <div className="tk-table-wrapper" style={{ marginTop: '20px', overflowX: 'auto' }}>
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
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No global billing transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any, idx: number) => (
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
      </div>
    </div>
  );
}
