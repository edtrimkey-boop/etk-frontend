'use client';

import React from 'react';
import { OpticalLink, OpticalSurface } from '@/components/ui/OpticalGlass';

export default function AttendancePortalPage() {
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
              Smart Attendance Portal
            </span>
          </OpticalSurface>
        </div>
      </header>

      {/* Main Container */}
      <div className="app-container" style={{ flex: 1, padding: '30px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(46,204,113,0.1)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h2 style={{ color: 'var(--success)', marginBottom: '10px' }}>Smart Attendance Ready for Porting</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '500px', margin: '0 auto 25px auto' }}>
            Scaffold route created. Logic from smart_attendance_extracted.html (teacher punch in/out, class attendance roster, low attendance SMS dispatch) will be populated here.
          </p>
          <OpticalLink href="/dashboard" variant="primary">
            Return to Dashboard
          </OpticalLink>
        </div>
      </div>
    </div>
  );
}
