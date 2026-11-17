'use client';

import React from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { OpticalButton } from '@/components/ui/OpticalGlass';

export default function ConfirmModal() {
  const { confirmState, closeConfirm } = useDashboard();

  if (!confirmState.open) return null;

  const handleConfirm = () => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm();
    }
    closeConfirm();
  };

  return (
    <div
      className="glass-overlay active"
      onClick={closeConfirm}
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
          <h2 style={{ color: 'var(--brand)', margin: 0, display: 'flex', alignItems: 'center' }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ marginRight: '8px', verticalAlign: 'middle' }}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            Confirm Action
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="close-minimal"
              onClick={closeConfirm}
              style={{ position: 'relative', top: 0, right: 0 }}
            >
              ✖
            </button>
          </div>
        </div>
        <p
          style={{
            marginBottom: '30px',
            lineHeight: 1.6,
            color: 'var(--text)',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {confirmState.msg}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <OpticalButton
            type="button"
            onClick={closeConfirm}
            variant="outline"
            style={{ flex: 1 }}
          >
            Cancel
          </OpticalButton>
          <OpticalButton
            type="button"
            onClick={handleConfirm}
            variant="danger"
            style={{ flex: 1 }}
          >
            Confirm
          </OpticalButton>
        </div>
      </div>
    </div>
  );
}
