'use client';

import React, { useEffect, useMemo } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { OpticalButton } from '@/components/ui/OpticalGlass';

export default function CustomAlertModal() {
  const { alertState, closeAlert } = useDashboard();

  // Dynamic type detection exactly matching index.html line 4301-4312
  const alertType = useMemo(() => {
    const title = (alertState.title || '').toLowerCase();
    const msg = (alertState.msg || '').toLowerCase();

    if (
      title.includes('error') ||
      msg.includes('error') ||
      msg.includes('failed') ||
      msg.includes('invalid') ||
      msg.includes('exhausted') ||
      msg.includes('null') ||
      msg.includes('cannot') ||
      msg.includes('expired')
    ) {
      return 'error';
    }

    if (
      title.includes('warning') ||
      title.includes('notice') ||
      title.includes('caution') ||
      msg.includes('please') ||
      msg.includes('required') ||
      msg.includes('enter') ||
      msg.includes('missing') ||
      msg.includes('exceeded')
    ) {
      return 'warning';
    }

    return 'success';
  }, [alertState.title, alertState.msg]);

  // Auto-dismiss safety timer (6000ms) matching index.html line 4348
  useEffect(() => {
    if (!alertState.open) return;
    const timer = setTimeout(() => {
      closeAlert();
    }, 6000);
    return () => clearTimeout(timer);
  }, [alertState.open, closeAlert]);

  if (!alertState.open) return null;

  const titleColor =
    alertType === 'error'
      ? 'var(--danger, #EF4444)'
      : alertType === 'warning'
      ? 'var(--accent, #F59E0B)'
      : 'var(--success, #00F5A0)';

  return (
    <div
      id="customAlert"
      className="glass-overlay active"
      onClick={closeAlert}
      style={{
        zIndex: 999999,
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
          maxWidth: '460px',
          width: '92%',
          padding: '35px 30px',
          textAlign: 'left',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          borderRadius: '24px',
          border: `1px solid ${
            alertType === 'error'
              ? 'rgba(239, 68, 68, 0.4)'
              : alertType === 'warning'
              ? 'rgba(245, 158, 11, 0.4)'
              : 'rgba(0, 245, 160, 0.4)'
          }`,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
          background: 'rgba(11, 17, 30, 0.98)',
        }}
      >
        <div className="premium-sticky-header" style={{ marginBottom: '15px' }}>
          <h2 id="customAlertTitle" style={{ color: titleColor, margin: 0, fontSize: '18px', fontWeight: 900 }}>
            {alertState.title || (alertType === 'error' ? 'System Error' : alertType === 'warning' ? 'Notice' : 'Success')}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="close-minimal"
              onClick={closeAlert}
              style={{ position: 'relative', top: 0, right: 0 }}
              aria-label="Close Alert"
            >
              ✖
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          {/* Animated Graphic Icon matching index.html lines 4320-4344 */}
          <div id="customAlertIcon" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            {alertType === 'error' && (
              <svg
                width="54"
                height="54"
                viewBox="0 0 52 52"
                style={{ stroke: 'var(--danger, #EF4444)', fill: 'none', strokeWidth: 3.5, strokeLinecap: 'round' }}
              >
                <circle cx="26" cy="26" r="24" stroke="rgba(239, 68, 68, 0.25)" strokeWidth="3" />
                <path d="M16 16 L36 36" />
                <path d="M36 16 L16 36" />
              </svg>
            )}

            {alertType === 'warning' && (
              <svg
                width="54"
                height="54"
                viewBox="0 0 52 52"
                style={{ stroke: 'var(--accent, #F59E0B)', fill: 'none', strokeWidth: 3.5, strokeLinecap: 'round' }}
              >
                <circle cx="26" cy="26" r="24" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="3" />
                <path d="M26 15 v14" strokeWidth="4" />
                <circle cx="26" cy="37" r="2.5" fill="var(--accent, #F59E0B)" stroke="none" />
              </svg>
            )}

            {alertType === 'success' && (
              <svg
                width="54"
                height="54"
                viewBox="0 0 52 52"
                style={{ stroke: 'var(--success, #00F5A0)', fill: 'none', strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}
              >
                <circle cx="26" cy="26" r="24" stroke="rgba(0, 245, 160, 0.25)" strokeWidth="3" />
                <path d="M14.1 27.2 l7.1 7.2 16.7-16.8" />
              </svg>
            )}
          </div>

          <p
            id="customAlertMsg"
            style={{
              marginBottom: '25px',
              lineHeight: 1.6,
              color: 'var(--text, #E2E8F0)',
              fontSize: '13.5px',
              fontWeight: 600,
            }}
          >
            {alertState.msg}
          </p>
        </div>

        <div className="modal-action-dock" style={{ justifyContent: 'center' }}>
          <OpticalButton
            type="button"
            onClick={closeAlert}
            variant={alertType === 'error' ? 'danger' : alertType === 'warning' ? 'warning' : 'primary'}
            style={{ width: '100%', padding: '12px 18px', fontSize: '13px', fontWeight: 800 }}
          >
            Acknowledge
          </OpticalButton>
        </div>
      </div>
    </div>
  );
}
