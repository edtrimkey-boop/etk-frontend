// components/modals/JobChatModal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { playSound } from '@/lib/sound';

interface TimelineEvent {
  type?: string;
  actorName: string;
  actorRole: string;
  message: string;
  timestamp: string;
  isOptimistic?: boolean;
}

export default function JobChatModal() {
  const { activeModal, modalData, closeModal, user, showAlert } = useDashboard();
  const [messages, setMessages] = useState<TimelineEvent[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOpen = activeModal === 'jobChat';
  const jobId = modalData?.jobId || '';
  const mode = (modalData?.mode || 'chat') as 'chat' | 'revision';
  const isRevision = mode === 'revision';

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const fetchTimeline = async (silent = false) => {
    if (!jobId) return;
    if (!silent) setLoading(true);

    try {
      const res = await serverCall('getJobTimeline', { jobId });
      if (res && res.success && Array.isArray(res.history)) {
        setMessages(res.history);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      console.warn('Failed to load job timeline:', err);
    } finally {
      if (!silent) setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    if (isOpen && jobId) {
      setInputText('');
      fetchTimeline(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [isOpen, jobId]);

  if (!isOpen) return null;

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      showAlert('Please type a message before submitting.', 'Notice');
      return;
    }

    const currentUserName = user?.name ? user.name.split(' ')[0] : 'Me';
    const currentUserRole = user?.role || 'Staff';
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Optimistic UI update
    const optimisticMsg: TimelineEvent = {
      actorName: currentUserName,
      actorRole: currentUserRole,
      message: trimmed,
      timestamp: timeNow,
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setTimeout(scrollToBottom, 50);

    setSending(true);
    try {
      const payload = {
        jobId,
        mode,
        message: trimmed,
        actorName: currentUserName,
        actorRole: currentUserRole,
      };

      const res = await serverCall('addJobTimelineEvent', payload);
      if (res && res.success) {
        playSound('notification');
        setTimeout(() => {
          fetchTimeline(true);
        }, 500);
      } else {
        showAlert('Failed to send message: ' + (res?.message || 'Unknown error'), 'Error');
        fetchTimeline(true);
      }
    } catch (err: any) {
      showAlert('Network error: ' + err.message, 'Network Error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass-overlay active" onClick={closeModal} style={{ zIndex: 99999 }}>
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '550px',
          width: '95%',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '85vh',
          maxHeight: '800px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Sticky Header */}
        <div
          className="premium-sticky-header"
          style={{
            flexShrink: 0,
            margin: 0,
            padding: '20px 25px',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(15, 15, 20, 0.95)',
            borderRadius: '20px 20px 0 0',
            zIndex: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2
              id="corrModalTitle"
              style={{
                color: isRevision ? 'var(--danger)' : 'var(--brand)',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                margin: 0,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ marginRight: '8px' }}
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{isRevision ? 'Request Revision' : 'Group Communication'}</span>
            </h2>
            <p id="corrModalDesc" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>
              {isRevision
                ? `Job ID: ${jobId} | This sends the job back to the operator.`
                : `Job ID: ${jobId} | Visible to Admins, Teachers & Operators.`}
            </p>
          </div>
          <button
            type="button"
            className="close-minimal"
            onClick={closeModal}
            style={{ position: 'static', padding: '8px', fontSize: '16px' }}
          >
            ✖
          </button>
        </div>

        {/* Scrollable Chat Body */}
        <div id="jobTimelineContainer" ref={chatContainerRef} className="chat-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <IOSSpinner size={24} color="var(--brand)" />
              <p style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Fetching secure chat...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
              No messages yet in this timeline.
            </div>
          ) : (
            messages.map((ev, idx) => {
              const isSys = ev.actorRole === 'automation' || ev.type === 'system';
              if (isSys) {
                return (
                  <div key={idx} className="chat-bubble-sys">
                    {ev.message} • {ev.timestamp}
                  </div>
                );
              }

              const myFirstName = user?.name ? user.name.split(' ')[0] : '';
              const isMe = ev.actorName === myFirstName && ev.actorRole === user?.role;
              const bubbleClass = isMe ? 'chat-bubble-user' : 'chat-bubble-other';

              return (
                <div key={idx} className={`chat-bubble ${bubbleClass}`}>
                  {!isMe && (
                    <div className="chat-meta">
                      <span className="chat-sender" style={{ color: 'var(--brand)' }}>
                        {ev.actorName} <span className="chat-role">{ev.actorRole}</span>
                      </span>
                    </div>
                  )}
                  <div style={{ whiteSpace: 'pre-wrap' }}>{ev.message}</div>
                  <div
                    className="chat-time"
                    style={{ color: isMe ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)' }}
                  >
                    {ev.timestamp} {ev.isOptimistic && '• Sending...'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Bottom Input */}
        <div className="chat-input-wrapper" id="timelineActionZone">
          <textarea
            ref={textareaRef}
            id="correctionNoteText"
            className="chat-textarea"
            rows={1}
            placeholder="Type a message to the group..."
            value={inputText}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            id="corrSubmitBtn"
            className="chat-send-btn"
            onClick={handleSend}
            disabled={sending}
            style={{
              background: isRevision ? 'var(--danger) !important' : 'var(--brand) !important',
              color: isRevision ? '#fff !important' : '#05080F !important',
            }}
          >
            {sending ? (
              <IOSSpinner size={18} color={isRevision ? '#fff' : '#05080F'} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
