// components/shared/SyncLoader.tsx
'use client';

import React from 'react';
import { useDashboard } from '@/lib/dashboard-context';

export default function SyncLoader() {
  const { loaderState, user } = useDashboard();

  if (!loaderState.visible) return null;

  const logoSrc =
    user?.logo ||
    (typeof window !== 'undefined' ? localStorage.getItem('tk_saved_inst_logo') : null) ||
    'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/logo/new-ETK.png';

  return (
    <div
      id="syncLoader"
      className="glass-overlay active"
      style={{
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div className="brandRow" style={{ marginBottom: '20px', justifyContent: 'center', display: 'flex' }}>
          <img
            id="syncLoaderLogo"
            className="logo"
            style={{
              width: '65px',
              height: '65px',
              borderRadius: '16px',
              objectFit: 'contain',
              background: 'white',
              padding: '2px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
            src={logoSrc}
            alt="Ed-Trim Key"
          />
        </div>
        <h3
          id="syncText"
          style={{
            color: 'white',
            letterSpacing: '3px',
            fontSize: '14px',
            marginBottom: 0,
            fontWeight: 800,
            textTransform: 'uppercase',
          }}
        >
          {loaderState.text || 'SYNCING DATABASE...'}
        </h3>
        <div className="loading-bar-container">
          <div className="loading-bar" />
        </div>
      </div>
    </div>
  );
}
