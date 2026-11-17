'use client';

import React from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { OpticalButton } from '@/components/ui/OpticalGlass';

export default function CustomAlertModal() {
  const { alertState, closeAlert } = useDashboard();

  if (!alertState.open) return null;

  return (
    <div
      className="glass-overlay active"
      onClick={closeAlert}
      style={{ zIndex: 99999 }}
    >
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '450px',
          padding: '40px',
          textAlign: 'left',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--brand)', margin: 0 }}>{alertState.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="close-minimal"
              onClick={closeAlert}
              style={{ position: 'relative', top: 0, right: 0 }}
            >
              ✖
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <p
            style={{
              marginBottom: '25px',
              lineHeight: 1.6,
              color: 'var(--text)',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {alertState.msg}
          </p>
        </div>
        <OpticalButton
          type="button"
          onClick={closeAlert}
          variant="primary"
          style={{ width: '100%' }}
        >
          Acknowledge
        </OpticalButton>
      </div>
    </div>
  );
}
