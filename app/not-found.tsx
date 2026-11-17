'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-black, #07090e)',
        color: 'white',
        textAlign: 'center',
        padding: '20px',
      }}
    >
      <div className="glass-box" style={{ maxWidth: '450px', padding: '40px' }}>
        <h1 style={{ fontSize: '48px', color: 'var(--brand)', margin: '0 0 10px 0' }}>404</h1>
        <h2 style={{ fontSize: '18px', margin: '0 0 15px 0' }}>Page Not Found</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '25px' }}>
          The requested system route does not exist or has been moved.
        </p>
        <Link href="/dashboard" className="liquid-glass btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
