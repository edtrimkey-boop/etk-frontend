'use client';

import React from 'react';
import Link from 'next/link';
import { useDashboard } from '@/lib/dashboard-context';
import { getRoleBadge, normalizeRole } from '@/lib/rbac';
import { OpticalButton } from '@/components/ui/OpticalGlass';

interface AccessDeniedProps {
  requiredRole?: string;
  moduleName?: string;
}

export default function AccessDenied({
  requiredRole = 'Institute Administrator',
  moduleName = 'This Module',
}: AccessDeniedProps) {
  const { user } = useDashboard();
  const currentBadge = getRoleBadge(user?.role);
  const normRole = normalizeRole(user?.role);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
      }}
    >
      <div
        className="glass-box"
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          padding: '40px 30px',
          borderRadius: '24px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          background: 'rgba(15, 23, 42, 0.9)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* Shield Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--danger)',
            margin: '0 auto 20px auto',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'white', margin: '0 0 8px 0' }}>
          Access Restricted • Role Boundary
        </h2>

        {/* Description */}
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          <strong style={{ color: 'white' }}>{moduleName}</strong> is restricted to{' '}
          <span style={{ color: 'var(--brand)', fontWeight: 700 }}>{requiredRole}</span> accounts only under
          Ed-Trim Key privacy guardrails.
        </p>

        {/* Current User Role Pill */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Signed in as:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'white', fontWeight: 700 }}>{user?.name || 'Authorized User'}</span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 800,
                background: currentBadge.bg,
                color: currentBadge.color,
                border: `1px solid ${currentBadge.border}`,
                textTransform: 'uppercase',
              }}
            >
              {currentBadge.label}
            </span>
          </div>
        </div>

        {/* Navigation Action */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <OpticalButton variant="primary" style={{ padding: '12px 24px', fontSize: '13px' }}>
              ← Return to Dashboard
            </OpticalButton>
          </Link>
          {normRole === 'operator' && (
            <Link href="/operator/workspace" style={{ textDecoration: 'none' }}>
              <OpticalButton variant="success" style={{ padding: '12px 24px', fontSize: '13px' }}>
                Go to Workspace →
              </OpticalButton>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
