'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import AccessDenied from '@/components/shared/AccessDenied';
import { normalizeRole } from '@/lib/rbac';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import IOSSpinner from '@/components/ui/IOSSpinner';

export default function OperatorEarningsPage() {
  const { user, payload, showToast, showAlert, refreshData } = useDashboard();
  const role = normalizeRole(user?.role);

  const [upiId, setUpiId] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const [baseRate, setBaseRate] = useState(50);
  const [ledgerRows, setLedgerRows] = useState<any[]>([]);

  useEffect(() => {
    if (user?.upi) setUpiId(user.upi);
  }, [user?.upi]);

  useEffect(() => {
    if (role !== 'operator' || !user?.id) return;

    supabase
      .from('operator_profiles')
      .select('rate_per_paper, rate_paper, upi_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBaseRate(Number(data.rate_per_paper ?? data.rate_paper) || 50);
          if (data.upi_id) setUpiId(data.upi_id);
        }
      });

    supabase
      .from('billing_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (Array.isArray(data)) setLedgerRows(data);
      });
  }, [role, user?.id]);

  const metrics = useMemo(() => {
    const docs = Array.isArray(payload?.data?.docs) ? payload.data.docs : [];
    const papers = Array.isArray(payload?.data?.papers) ? payload.data.papers : [];
    const allJobs = [...papers, ...docs];

    let totalEarned = 0;
    let totalDelivered = 0;
    let pendingJobs = 0;

    allJobs.forEach((j: any) => {
      const st = String(j.status || '').trim();
      const payout = j.subject ? baseRate : baseRate / 10;
      if (['Completed', 'Delivered', 'PAID', 'Generated'].includes(st)) {
        totalDelivered++;
        totalEarned += Number(payout);
      } else if (['In Progress', 'Pending Revision', 'Assigned', 'Pending'].includes(st)) {
        pendingJobs++;
      }
    });

    const totalCleared = ledgerRows
      .filter((r) => r.transaction_type === 'OPERATOR_PAYMENT' && r.status === 'POSTED')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return {
      totalEarned,
      totalCleared,
      pendingClearance: Math.max(0, totalEarned - totalCleared),
      totalDelivered,
      pendingJobs,
    };
  }, [payload, baseRate, ledgerRows]);

  // Strict Privacy Route Guard: Operator Only
  if (role !== 'operator') {
    return <AccessDenied requiredRole="Production Operator" moduleName="Operator Financial Ledger" />;
  }

  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim()) {
      showAlert('Please enter a valid UPI ID.', 'Validation Error');
      return;
    }
    setSavingUpi(true);
    try {
      const res = await serverCall('updateOperatorUpi', { upi: upiId.trim() });
      if (res?.success) {
        showToast('UPI ID saved securely!', 'success');
        refreshData(true);
      } else {
        showAlert(res?.message || 'Failed to update UPI ID.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Network error.', 'Error');
    } finally {
      setSavingUpi(false);
    }
  };

  return (
    <div id="view-op-finance" className="page-view active" style={{ display: 'block' }}>
      <div className="grid-kpis" style={{ marginBottom: '22px' }}>
        <div className="kpi-card b-success">
          <h4>Total Earned</h4>
          <h2>₹{metrics.totalEarned.toLocaleString('en-IN')}</h2>
        </div>
        <div className="kpi-card b-accent">
          <h4>Pending Clearance</h4>
          <h2>₹{metrics.pendingClearance.toLocaleString('en-IN')}</h2>
        </div>
        <div className="kpi-card b-brand">
          <h4>Delivered Jobs</h4>
          <h2>{metrics.totalDelivered}</h2>
        </div>
        <div className="kpi-card b-info">
          <h4>Active Queue</h4>
          <h2>{metrics.pendingJobs}</h2>
        </div>
      </div>

      <div className="panel" style={{ borderLeft: '4px solid var(--success)', marginBottom: '22px' }}>
        <div className="panel-header">
          <h3 style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}>
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Wallet Settings &amp; UPI Payouts
          </h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
          Operator earnings and UPI payout ledger. Base rate per formatted paper: ₹{baseRate}.
        </p>

        <form onSubmit={handleSaveUpi} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 260px', marginBottom: 0 }}>
            <label className="label-text">Linked Payout UPI ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. name@okaxis"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
          <OpticalButton type="submit" variant="primary" disabled={savingUpi} style={{ minHeight: '42px', padding: '0 20px' }}>
            {savingUpi ? <IOSSpinner size={16} color="#05080F" /> : 'Save UPI ID'}
          </OpticalButton>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3 style={{ margin: 0 }}>Payout History</h3>
        </div>
        <div className="tk-table-wrapper" style={{ marginTop: '14px' }}>
          <table className="tk-sleek-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Ledger Ref</th>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No payout transactions recorded yet.
                  </td>
                </tr>
              ) : (
                ledgerRows.map((row: any, i: number) => (
                  <tr key={row.id || i}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--brand)', fontWeight: 700 }}>{row.ledger_ref || row.id}</td>
                    <td>{row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN') : '-'}</td>
                    <td>{row.transaction_type || 'PAYOUT'}</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>₹{Number(row.amount || 0).toLocaleString('en-IN')}</td>
                    <td><span className="flat-pill bg-success">{row.status || 'POSTED'}</span></td>
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
