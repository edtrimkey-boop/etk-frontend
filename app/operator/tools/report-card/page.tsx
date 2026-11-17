'use client';

import React from 'react';
import Link from 'next/link';

export default function ReportCardToolPage() {
  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header className="top-bar">
        <div className="brandRow">
          <Link href="/dashboard" className="liquid-glass glass-circle-btn" style={{ marginRight: '10px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="glass-title-pill brand">
            <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 900, textTransform: 'uppercase' }}>
              Report Card Generation Engine
            </span>
          </div>
        </div>
      </header>

      <div className="app-container" style={{ flex: 1, padding: '30px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2 style={{ color: 'var(--brand)', marginBottom: '10px' }}>Report Card Tool Ready for Script Logic</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '500px', margin: '0 auto 25px auto' }}>
            Awaiting Report_Card Apps Script logic to connect the marksheet collation, template mapping, and batch PDF generation.
          </p>
          <Link href="/dashboard" className="liquid-glass btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
