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
      id="confirmModal"
      className="glass-overlay active"
      onClick={closeConfirm}
      style={{
        zIndex: 999998,
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '450px',
          width: '90%',
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
              aria-label="Close"
              title="Close"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="modal-scroll-body">
          <p
            style={{
              lineHeight: 1.6,
              color: 'var(--text)',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {confirmState.msg}
          </p>
        </div>
        <div className="modal-action-dock">
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
