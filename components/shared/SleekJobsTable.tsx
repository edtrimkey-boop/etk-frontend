'use client';

import React, { useState, useEffect } from 'react';

interface JobItem {
  id: string;
  date?: string;
  inst?: string;
  class?: string;
  subject?: string;
  type?: string;
  exam?: string;
  students?: number;
  deadline?: string;
  status: string;
  row?: string; // Download URL
  latestCorrectionNote?: string;
}

interface SleekJobsTableProps {
  data: JobItem[];
  type: 'papers' | 'docs';
  userRole?: string;
  searchQuery?: string;
  onOpenAction?: (action: string, job: JobItem) => void;
}

export default function SleekJobsTable({
  data,
  type,
  userRole = 'admin',
  searchQuery = '',
  onOpenAction,
}: SleekJobsTableProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isSuperAdmin = ['super admin', 'super_admin', 'system admin', 'sys_admin', 'all'].includes(
    String(userRole).toLowerCase().trim()
  );
  const isOperator = String(userRole).toLowerCase().trim() === 'operator';
  const showInst = isSuperAdmin || isOperator;

  // Status Badge Helper
  const renderStatusBadge = (st: string) => {
    const s = String(st || 'Pending').trim();
    if (s === 'Pending Revision') {
      return (
        <span
          className="flat-pill"
          style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
        >
          {s}
        </span>
      );
    }
    if (s === 'Pending') {
      return (
        <span
          className="flat-pill"
          style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
        >
          {s}
        </span>
      );
    }
    if (s === 'Assigned') {
      return (
        <span
          className="flat-pill"
          style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--purple)', border: '1px solid var(--purple)' }}
        >
          {s}
        </span>
      );
    }
    if (s === 'In Progress' || s === 'Accepted') {
      return (
        <span
          className="flat-pill"
          style={{ background: 'rgba(38, 195, 234, 0.1)', color: 'var(--brand)', border: '1px solid var(--brand)' }}
        >
          {s}
        </span>
      );
    }
    if (['Completed', 'Delivered', 'Generated', 'PAID'].includes(s)) {
      return <span className="flat-pill bg-success">{s}</span>;
    }
    return <span className="flat-pill bg-warning">{s}</span>;
  };

  // Deadline UI Helper with Live Countdown
  const renderDeadline = (deadlineStr?: string, status?: string) => {
    const st = String(status || '').trim();
    if (st === 'Completed' || st === 'Delivered') {
      return <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>Deadline Closed</span>;
    }

    if (!deadlineStr || deadlineStr === 'No Deadline') {
      return <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>No Deadline</span>;
    }

    const dTime = new Date(deadlineStr).getTime();
    if (isNaN(dTime)) {
      return <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{deadlineStr}</span>;
    }

    const diff = dTime - now;
    if (diff <= 0) {
      return (
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--danger)', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          DEADLINE PASSED
        </div>
      );
    }

    let color = '#10b981';
    if (diff <= 12 * 3600000) color = '#ef4444';
    else if (diff <= 24 * 3600000) color = '#f59e0b';

    const dObj = new Date(dTime);
    const dateFormatted = dObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const timeFormatted = dObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    const countStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    return (
      <div style={{ fontSize: '11px', fontWeight: 700, color, lineHeight: 1.4, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {countStr}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {dateFormatted}, {timeFormatted}
        </div>
      </div>
    );
  };

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 700, margin: 0 }}>
          No records found for selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className="tk-table-wrapper" style={{ margin: '15px 0' }}>
      <table className="tk-sleek-table">
        <thead>
          <tr>
            <th>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              JOB ID
            </th>
            <th>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {showInst ? 'INSTITUTE & DETAILS' : 'CLASS & DETAILS'}
            </th>
            <th>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              STATUS
            </th>
            <th>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              DEADLINE
            </th>
            <th style={{ textAlign: 'right' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '6px' }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              ACTIONS
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, idx) => {
            const st = String(r.status || 'Pending').trim();
            const rawClass = String(r.class || '-').toUpperCase().trim();
            let classString = rawClass;
            if (!['PRE-NURSERY', 'NURSERY', 'LKG', 'UKG'].includes(rawClass)) {
              classString = rawClass.includes('CLASS') ? rawClass : `CLASS ${rawClass}`;
            }

            const subDetail = type === 'papers' ? r.subject || 'Question Paper' : r.type || 'Document';
            const detailLine = `${subDetail} | ${classString}`.toUpperCase();

            const isDone = st === 'Completed' || st === 'Delivered' || st === 'Generated';

            return (
              <tr key={r.id || idx}>
                <td data-label="JOB ID">
                  <span
                    className="flat-pill"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'white',
                      border: '1px solid var(--border)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {r.id || `JOB-${idx + 1}`}
                  </span>
                </td>
                <td data-label="DETAILS">
                  {showInst ? (
                    <div style={{ textAlign: 'left' }}>
                      <b style={{ color: 'white', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                        {r.inst || 'INSTITUTE'}
                      </b>
                      <br />
                      <span style={{ color: 'var(--brand)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                        {detailLine}
                      </span>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'left' }}>
                      <b style={{ color: 'white', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                        {detailLine}
                      </b>
                      <br />
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                        {r.exam || (type === 'docs' ? `${r.students || 1} Students` : 'Standard Exam')}
                      </span>
                    </div>
                  )}
                </td>
                <td data-label="STATUS">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    {renderStatusBadge(st)}
                  </div>
                </td>
                <td data-label="DEADLINE" style={{ textAlign: 'left' }}>
                  {renderDeadline(r.deadline, st)}
                </td>
                <td data-label="ACTIONS">
                  <div className="mobile-action-row" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {isOperator ? (
                      <>
                        {!isDone ? (
                          <button
                            type="button"
                            className="liquid-glass"
                            style={{ color: 'var(--success)', borderColor: 'var(--success)', padding: '8px 14px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => (window.location.href = '/operator/workspace')}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                            WORKSPACE
                          </button>
                        ) : (
                          r.row && (
                            <a
                              href={r.row}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="liquid-glass"
                              style={{ color: 'var(--brand)', borderColor: 'var(--brand)', padding: '8px 14px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              DOWNLOAD
                            </a>
                          )
                        )}
                      </>
                    ) : (
                      <>
                        {isDone && r.row && (
                          <a
                            href={r.row}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="liquid-glass"
                            style={{ color: 'var(--brand)', borderColor: 'var(--brand)', padding: '8px 14px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            DOWNLOAD
                          </a>
                        )}

                        {isDone && (
                          <button
                            type="button"
                            className="liquid-glass"
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '8px 14px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => onOpenAction && onOpenAction('revision', r)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1 4 1 10 7 10" />
                              <polyline points="23 20 23 14 17 14" />
                              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                            </svg>
                            REVISION
                          </button>
                        )}

                        {!isDone && isSuperAdmin && (
                          <button
                            type="button"
                            className="liquid-glass"
                            style={{ color: 'var(--purple)', borderColor: 'var(--purple)', padding: '8px 14px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => onOpenAction && onOpenAction('assign', r)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="20" y1="8" x2="20" y2="14" />
                              <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            ASSIGN
                          </button>
                        )}

                        <button
                          type="button"
                          className="liquid-glass"
                          style={{ color: 'var(--brand)', borderColor: 'var(--brand)', padding: '8px 14px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => onOpenAction && onOpenAction('chat', r)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          CHAT
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
