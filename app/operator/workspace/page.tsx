'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/lib/dashboard-context';
import AccessDenied from '@/components/shared/AccessDenied';
import { normalizeRole } from '@/lib/rbac';

export default function OperatorWorkspacePage() {
  const { user } = useDashboard();
  const role = normalizeRole(user?.role);

  // Strict Privacy Route Guard: Operator or Super Admin Only
  if (role !== 'operator' && role !== 'super_admin') {
    return <AccessDenied requiredRole="Production Operator" moduleName="Operator Production Workspace" />;
  }

  const [activeJob, setActiveJob] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  return (
    <div id="view-op-workspace" className="page-view active" style={{ display: 'block', height: '100%' }}>
      <div className="op-split-container">
        {/* Left Pane: Priority Queue */}
        <div className="op-left-pane">
          <div className="op-queue-header">
            <h3 style={{ color: 'var(--text)', fontSize: '14px', margin: 0, fontWeight: 800, textTransform: 'uppercase' }}>
              Priority Queue
            </h3>
            <span className="badge bg-danger" id="opQueueCount">
              0 Pending
            </span>
          </div>
          <div className="op-queue-list" id="opQueueList">
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
              No jobs currently in active queue.
            </div>
          </div>
        </div>

        {/* Right Pane: Active Workspace & Chat */}
        {activeJob ? (
          <div className="op-right-pane" id="opActiveWorkspace" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="op-ws-header">
              <div className="op-ws-details">
                <h2 id="wsJobId" style={{ color: 'var(--brand)', margin: 0, fontSize: '18px', fontWeight: 900, letterSpacing: '1px' }}>
                  {activeJob.id}
                </h2>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', gap: '10px' }}>
                  <span>{activeJob.institute}</span>
                  <span>📄 {activeJob.details}</span>
                </div>
              </div>
            </div>

            <div id="wsChatContainer" className="chat-container" style={{ flex: 1, overflowY: 'auto' }}>
              {messages.map((m, i) => (
                <div key={i} className="chat-msg">
                  {m.text}
                </div>
              ))}
            </div>

            <div className="chat-input-wrapper">
              <textarea
                id="wsChatInput"
                className="chat-textarea"
                rows={1}
                placeholder="Type a message to the group..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="button" id="btnWsChatSubmit" className="chat-send-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div
            className="op-right-pane"
            id="opIdleWorkspace"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)', height: '100%' }}
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" style={{ marginBottom: '20px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: 800 }}>No Job Selected</h3>
            <p style={{ color: 'var(--border)', fontSize: '12px', fontWeight: 600 }}>Select a priority task from the queue to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
