'use client';

import React from 'react';
import { OpticalLink, OpticalSurface } from '@/components/ui/OpticalGlass';

export default function FeesPortalPage() {
  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <header className="top-bar">
        <div className="brandRow">
          <OpticalLink
            href="/dashboard"
            variant="secondary"
            style={{ width: '42px', height: '42px', padding: 0, marginRight: '10px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </OpticalLink>
          <OpticalSurface
            className="glass-title-pill brand"
            radius={999}
            style={{ padding: '7px 18px', gap: '10px' }}
          >
            <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 900, textTransform: 'uppercase' }}>
              Fee Collection Portal
            </span>
          </OpticalSurface>
        </div>
      </header>

      {/* Main Container */}
      <div className="app-container" style={{ flex: 1, padding: '30px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(38,195,234,0.1)', border: '1px solid var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <h2 style={{ color: 'var(--brand)', marginBottom: '10px' }}>Fee Collection Portal Ready for Porting</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '500px', margin: '0 auto 25px auto' }}>
            Scaffold route created. Logic from fee_portal_extracted.html will be populated into this view with Next.js state and Supabase backend endpoints.
          </p>
          <OpticalLink href="/dashboard" variant="primary">
            Return to Dashboard
          </OpticalLink>
        </div>
      </div>
    </div>
  );
}
