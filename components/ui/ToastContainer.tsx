// components/ui/ToastContainer.tsx
'use client';

import React from 'react';
import { useDashboard } from '@/lib/dashboard-context';

export default function ToastContainer() {
  const { toasts, removeToast } = useDashboard();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      id="toastContainer"
      style={{
        position: 'fixed',
        top: 'calc(16px + env(safe-area-inset-top, 0px))',
        right: '16px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        width: 'calc(100vw - 32px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const borderColor =
          toast.type === 'error'
            ? 'var(--danger, #ef4444)'
            : toast.type === 'warning'
            ? 'var(--accent, #f59e0b)'
            : toast.type === 'info'
            ? 'var(--brand, #26c3ea)'
            : 'var(--success, #00fba6)';

        return (
          <div
            key={toast.id}
            className="tk-toast show"
            style={{
              background: 'rgba(11, 17, 30, 0.94)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderLeft: `4px solid ${borderColor}`,
              borderRadius: '14px',
              padding: '12px 16px',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 14px 36px rgba(0, 0, 0, 0.65)',
              pointerEvents: 'auto',
              animation: 'slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          >
            {/* SVG Status Icon */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              {toast.type === 'error' ? (
                <svg width="20" height="20" stroke="var(--danger, #ef4444)" viewBox="0 0 52 52" style={{ strokeWidth: 4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <circle cx="26" cy="26" r="25" />
                  <path d="M17 17 L35 35 M35 17 L17 35" />
                </svg>
              ) : toast.type === 'warning' ? (
                <svg width="20" height="20" stroke="var(--accent, #f59e0b)" viewBox="0 0 52 52" style={{ strokeWidth: 4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <circle cx="26" cy="26" r="25" />
                  <line x1="26" y1="14" x2="26" y2="28" />
                  <circle cx="26" cy="36" r="2" fill="var(--accent, #f59e0b)" stroke="none" />
                </svg>
              ) : toast.type === 'info' ? (
                <svg width="20" height="20" stroke="var(--brand, #26c3ea)" viewBox="0 0 52 52" style={{ strokeWidth: 4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <circle cx="26" cy="26" r="25" />
                  <circle cx="26" cy="18" r="2" fill="var(--brand, #26c3ea)" stroke="none" />
                  <line x1="26" y1="24" x2="26" y2="36" />
                </svg>
              ) : (
                <svg width="20" height="20" stroke="var(--success, #00fba6)" viewBox="0 0 52 52" style={{ strokeWidth: 4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <circle cx="26" cy="26" r="25" />
                  <path d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
              )}
            </div>

            <div style={{ flex: 1, lineHeight: 1.4, wordBreak: 'break-word', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {toast.title && (
                <span style={{ fontWeight: 800, fontSize: '13px', color: '#FFFFFF' }}>
                  {toast.title}
                </span>
              )}
              <span style={{ fontSize: toast.title ? '11.5px' : '13px', color: toast.title ? 'rgba(255,255,255,0.75)' : '#FFFFFF' }}>
                {toast.msg}
              </span>
            </div>

            <button
              type="button"
              className="close-minimal"
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.45)',
                cursor: 'pointer',
                padding: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                position: 'static',
                width: '24px',
                height: '24px',
              }}
              aria-label="Close notification"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
