'use client';

import React from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { OpticalButton } from '@/components/ui/OpticalGlass';

export default function BillingPage() {
  const { user, payload, loading } = useDashboard();

  const instDetails = user?.instDetails || {};
  const ledger = payload?.data?.myBilling || [];

  const openFlowCheckout = () => {
    // Handshake with Trim Key Flow
    window.open('https://flow.trimkey.in', '_blank');
  };

  return (
    <div id="view-inst-billing" className="page-view active" style={{ display: 'block' }}>
      {/* Plan Card */}
      <div className="panel" style={{ borderLeft: '4px solid var(--brand)', marginBottom: '30px' }}>
        <div className="panel-header">
          <h3>Institute Billing &amp; Quotas</h3>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
              Current Subscription Plan
            </p>
            <h2 id="billPlanType" style={{ fontSize: '20px', color: 'var(--brand)', margin: 0, fontWeight: 900 }}>
              {instDetails.plan || 'Standard Institutional ERP'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
              Renewal Date: <span style={{ color: 'white', fontWeight: 700 }}>{instDetails.renewal || 'Annual Renewal Active'}</span> | Payment:{' '}
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>{instDetails.paymentStatus || 'Cleared'}</span>
            </p>
          </div>

          <OpticalButton
            type="button"
            variant="primary"
            onClick={openFlowCheckout}
            style={{ padding: '12px 24px', fontSize: '13px' }}
          >
            ⚡ Recharge Quota via Trim Key Flow
          </OpticalButton>
        </div>

        {/* Meters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginTop: '25px' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>PAPERS LEFT</span>
            <h3 style={{ fontSize: '24px', color: 'var(--brand)', margin: '6px 0 0 0' }}>
              {instDetails.papersLeft || 0}
            </h3>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>REPORT CARDS</span>
            <h3 style={{ fontSize: '24px', color: 'var(--success)', margin: '6px 0 0 0' }}>
              {instDetails.rcLeft || 0}
            </h3>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>ADMIT CARDS</span>
            <h3 style={{ fontSize: '24px', color: 'var(--accent)', margin: '6px 0 0 0' }}>
              {instDetails.acLeft || 0}
            </h3>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>SMS UNITS</span>
            <h3 style={{ fontSize: '24px', color: 'var(--purple)', margin: '6px 0 0 0' }}>
              {instDetails.smsRemaining || 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="panel">
        <div className="panel-header">
          <h3>Transaction History</h3>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner-sm" style={{ margin: '0 auto 10px auto' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Syncing billing records...</p>
          </div>
        ) : ledger.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, padding: '20px 0' }}>
            No past recharge invoices found in this billing session.
          </p>
        ) : (
          <div className="tk-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="tk-sleek-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--brand)', fontWeight: 700 }}>
                      {row.reference || `REF-${i + 1}`}
                    </td>
                    <td>{row.date || 'Recent'}</td>
                    <td>{row.type || 'Quota Top-Up'}</td>
                    <td style={{ fontWeight: 800, color: 'white' }}>₹{row.amount || 0}</td>
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
                        {row.status || 'Success'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
