'use client';

import React from 'react';

export default function OperatorEarningsPage() {
  return (
    <div id="view-op-finance" className="page-view active" style={{ display: 'block' }}>
      <div className="panel" style={{ borderLeft: '4px solid var(--success)' }}>
        <div className="panel-header">
          <h3 style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}>
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Wallet Settings & Payouts
          </h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Operator earnings and UPI payout ledger. Automatic credit tracking per delivered question paper and document page.
        </p>
      </div>
    </div>
  );
}
