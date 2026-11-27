'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import AccessDenied from '@/components/shared/AccessDenied';
import { normalizeRole } from '@/lib/rbac';
import IOSSpinner from '@/components/ui/IOSSpinner';

export default function OperatorWorkspacePage() {
  const router = useRouter();
  const { user, payload, showToast, showAlert, refreshData } = useDashboard();
  const role = normalizeRole(user?.role);

  const [activeJob, setActiveJob] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeJobs = useMemo(() => {
    const papers = Array.isArray(payload?.data?.papers) ? payload.data.papers : [];
    const docs = Array.isArray(payload?.data?.docs) ? payload.data.docs : [];
    return [...papers, ...docs]
      .filter((j: any) => ['Pending', 'Assigned', 'Pending Revision', 'In Progress'].includes(String(j.status || '').trim()))
      .sort((a: any, b: any) => new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime());
  }, [payload]);

  const loadTimeline = async (jobId: string, silent = false) => {
    if (!silent) setLoadingChat(true);
    try {
      const res = await serverCall('getJobTimeline', { jobId });
      if (res?.success && Array.isArray(res.history)) {
        setMessages(res.history);
      }
    } catch {}
    finally {
      if (!silent) setLoadingChat(false);
    }
  };

  useEffect(() => {
    if (!activeJob?.id) return;
    loadTimeline(activeJob.id);

    const poll = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      loadTimeline(activeJob.id, true);
    }, 3000);

    return () => {
      clearInterval(poll);
    };
  }, [activeJob?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Strict Privacy Route Guard: Operator or Super Admin Only
  if (role !== 'operator' && role !== 'super_admin') {
    return <AccessDenied requiredRole="Production Operator" moduleName="Operator Production Workspace" />;
  }

  const handleLaunchTool = async (job: any) => {
    setLaunching(true);
    try {
      const res = await serverCall('updateJobStatus', { jobId: job.id, status: 'In Progress' });
      if (res?.success) {
        refreshData(true);
        const toolPath = job.subject
          ? '/operator/tools/questions-formatter'
          : String(job.type || '').toLowerCase().includes('report')
          ? '/operator/tools/report-card'
          : '/operator/tools/admit-card';
        router.push(`${toolPath}?jobId=${encodeURIComponent(job.id)}`);
      } else {
        showAlert(res?.message || 'Failed to update job status.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Network error.', 'Error');
    } finally {
      setLaunching(false);
    }
  };

  const handleSendChat = async () => {
    if (!activeJob?.id || !chatInput.trim() || sending) return;
    const text = chatInput.trim();
    setChatInput('');
    setSending(true);
    try {
      const res = await serverCall('addJobTimelineEvent', {
        jobId: activeJob.id,
        actorName: user?.name || 'Operator',
        actorRole: user?.role || 'operator',
        mode: 'note',
        message: text,
      });
      if (!res?.success) {
        showToast(res?.message || 'Message failed to send.', 'error');
        setChatInput(text);
      }
    } catch (err: any) {
      showToast(err.message || 'Send error.', 'error');
      setChatInput(text);
    } finally {
      setSending(false);
    }
  };

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
              {activeJobs.length} Pending
            </span>
          </div>
          <div className="op-queue-list" id="opQueueList" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', overflowY: 'auto' }}>
            {activeJobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
                No jobs currently in active queue.
              </div>
            ) : (
              activeJobs.map((job: any) => {
                const isSelected = activeJob?.id === job.id;
                const detailLabel = job.subject ? `${job.subject} | ${job.class || '-'}` : `${job.type || 'Doc'} | ${job.class || '-'}`;
                return (
                  <div
                    key={job.id}
                    className={`op-job-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setActiveJob(job)}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--brand)' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(0,251,166,0.08)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span className="flat-pill" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{job.id}</span>
                      <span className="flat-pill" style={{ fontSize: '10px', color: 'var(--accent)' }}>{job.status}</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'white' }}>{job.inst}</div>
                    <div style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 700, marginTop: '2px' }}>{detailLabel}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Deadline: {job.deadline || '48h'}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Workspace & Chat */}
        {activeJob ? (
          <div className="op-right-pane" id="opActiveWorkspace" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="op-ws-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div className="op-ws-details">
                <h2 id="wsJobId" style={{ color: 'var(--brand)', margin: 0, fontSize: '18px', fontWeight: 900, letterSpacing: '1px' }}>
                  {activeJob.id}
                </h2>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span>{activeJob.inst}</span>
                  <span>• {activeJob.subject || activeJob.type} ({activeJob.class || '-'})</span>
                </div>
              </div>
              <button
                type="button"
                className="liquid-glass btn-sm btn-success"
                onClick={() => handleLaunchTool(activeJob)}
                disabled={launching}
                style={{ fontSize: '11px', fontWeight: 800 }}
              >
                {launching ? 'Starting...' : 'Launch Formatter Tool'}
              </button>
            </div>

            <div id="wsChatContainer" className="chat-container" style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
              {loadingChat ? (
                <div style={{ textAlign: 'center', padding: '30px' }}><IOSSpinner size={22} color="var(--brand)" /></div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No timeline messages yet.
                </div>
              ) : (
                messages.map((m, i) => {
                  const isSys = m.type === 'system' || m.actorRole === 'automation';
                  if (isSys) {
                    return <div key={i} className="chat-bubble-sys">{m.message} • {m.timestamp}</div>;
                  }
                  const isMe = String(m.actorName || '').toLowerCase() === String(user?.name || '').split(' ')[0].toLowerCase() ||
                    String(m.actorName || '').toLowerCase() === String(user?.name || '').toLowerCase();
                  return (
                    <div key={i} className={`chat-bubble ${isMe ? 'chat-bubble-user' : 'chat-bubble-other'}`}>
                      {!isMe && (
                        <div className="chat-meta">
                          <span className="chat-sender" style={{ color: 'var(--brand)' }}>
                            {m.actorName} <span className="chat-role">{m.actorRole}</span>
                          </span>
                        </div>
                      )}
                      <div>{m.message}</div>
                      <div className="chat-time">{m.timestamp}</div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-wrapper">
              <textarea
                id="wsChatInput"
                className="chat-textarea"
                rows={1}
                placeholder="Type a message to the institute..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
              />
              <button type="button" id="btnWsChatSubmit" className="chat-send-btn" onClick={handleSendChat} disabled={sending}>
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
