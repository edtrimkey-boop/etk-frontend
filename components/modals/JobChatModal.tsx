// components/modals/JobChatModal.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { fetchJobCommunications, DBJobCommunication } from '@/lib/supabase';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { playSound } from '@/lib/sound';

interface ChatMessage {
  id?: string;
  type?: string;
  actorName: string;
  actorRole: string;
  message: string;
  timestamp: string;
  isOptimistic?: boolean;
  status?: 'sending' | 'delivered';
}

export default function JobChatModal() {
  const { activeModal, modalData, closeModal, user, showAlert } = useDashboard();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const latestMessageIdsRef = useRef<Set<string>>(new Set());

  const isOpen = activeModal === 'jobChat';
  const jobId = modalData?.jobId || '';
  const mode = (modalData?.mode || 'chat') as 'chat' | 'revision';
  const isRevision = mode === 'revision';

  const myFirstName = user?.name ? user.name.split(' ')[0] : 'Me';
  const myRole = user?.role || 'Staff';

  const scrollToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  // Convert DB row to UI ChatMessage
  const formatDBMessage = useCallback((row: DBJobCommunication): ChatMessage => {
    const timeStr = row.created_at
      ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      id: row.id,
      type: row.message_type,
      actorName: row.actor_name,
      actorRole: row.actor_role,
      message: row.message,
      timestamp: timeStr,
      status: 'delivered',
    };
  }, []);

  // Fetch timeline from Supabase directly with fallback to serverCall
  const fetchTimeline = useCallback(async (silent = false) => {
    if (!jobId) return;
    if (!silent) setLoading(true);

    try {
      // Load timeline exclusively through authenticated backend gateway
      const dbRows = await fetchJobCommunications(jobId);
      const formatted = dbRows.map(formatDBMessage);
      const incomingNonMe = formatted.filter(
        (m) =>
          m.id &&
          !latestMessageIdsRef.current.has(m.id) &&
          !(
            m.actorName.toLowerCase() === myFirstName.toLowerCase() &&
            m.actorRole.toLowerCase() === myRole.toLowerCase()
          )
      );
      if (latestMessageIdsRef.current.size > 0 && incomingNonMe.length > 0 && silent) {
        playSound('notification');
      }
      latestMessageIdsRef.current = new Set(dbRows.map((r, i) => r.id || `${r.created_at || i}-${r.message}`));

      setMessages((prev) => {
        const stillPending = prev.filter(
          (m) =>
            m.isOptimistic &&
            !formatted.slice(-5).some(
              (dbm) =>
                dbm.message === m.message &&
                dbm.actorName.toLowerCase() === m.actorName.toLowerCase()
            )
        );
        return [...formatted, ...stillPending];
      });
      setIsLiveConnected(true);
    } catch (err: any) {
      setIsLiveConnected(false);
      console.warn('[JobChatModal] Failed to load messages:', err);
    } finally {
      if (!silent) setLoading(false);
      setTimeout(() => scrollToBottom(false), 80);
    }
  }, [jobId, myFirstName, myRole, formatDBMessage]);

  // Adaptive Live Polling Sync via Authenticated Backend Gateway
  useEffect(() => {
    if (!isOpen || !jobId) return;

    fetchTimeline(false);

    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchTimeline(true);
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      setIsLiveConnected(false);
    };
  }, [isOpen, jobId, fetchTimeline]);

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

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempId = `temp-${Date.now()}`;

    // 1. WhatsApp Optimistic Instant UI Insertion
    const optimisticMsg: ChatMessage = {
      id: tempId,
      type: mode === 'revision' ? 'revision' : 'note',
      actorName: myFirstName,
      actorRole: myRole,
      message: trimmed,
      timestamp: timeNow,
      isOptimistic: true,
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setTimeout(() => scrollToBottom(true), 40);

    setSending(true);

    try {
      // Single authoritative backend call: inserts once into job_communications, updates job status/meta, creates in-app notification & fires FCM push
      const res = await serverCall('addJobTimelineEvent', {
        jobId,
        mode,
        message: trimmed,
        actorName: myFirstName,
        actorRole: myRole,
      });

      if (res && res.success) {
        playSound('notification');
        // Mark optimistic message as delivered (WhatsApp Double Check); realtime or fallback poll reconciles exact DB id
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, isOptimistic: false, status: 'delivered' } : m
          )
        );
        setTimeout(() => fetchTimeline(true), 450);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        showAlert('Failed to send message: ' + (res?.message || 'Unknown error'), 'Error');
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      showAlert('Network error: ' + err.message, 'Message Delivery');
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
          maxWidth: '560px',
          width: '95%',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '86vh',
          maxHeight: '820px',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 30px rgba(38,195,234,0.15)',
        }}
      >
        {/* WhatsApp-Style Sticky Header */}
        <div
          className="premium-sticky-header"
          style={{
            flexShrink: 0,
            margin: 0,
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            zIndex: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: isRevision ? 'rgba(239, 68, 68, 0.15)' : 'rgba(38, 195, 234, 0.15)',
                border: `1px solid ${isRevision ? 'rgba(239, 68, 68, 0.3)' : 'rgba(38, 195, 234, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isRevision ? 'var(--danger)' : 'var(--brand)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 800,
                    margin: 0,
                    letterSpacing: '-0.2px',
                  }}
                >
                  {isRevision ? 'Revision Request' : 'Job Group Chat'}
                </h3>

                {isLiveConnected && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: '#22C55E',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: '#22C55E',
                        boxShadow: '0 0 6px #22C55E',
                      }}
                    />
                    LIVE
                  </span>
                )}
              </div>

              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {jobId} • {isRevision ? 'Sends job back to operator' : 'Instant updates for all assigned staff'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="close-minimal"
            onClick={closeModal}
            aria-label="Close"
            title="Close"
            style={{ position: 'static' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* WhatsApp-Style Scrollable Chat Body */}
        <div
          id="jobTimelineContainer"
          ref={chatContainerRef}
          className="chat-container"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'radial-gradient(circle at 50% 20%, rgba(38,195,234,0.03) 0%, rgba(5,8,15,0.7) 100%)',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <IOSSpinner size={26} color="var(--brand)" />
              <p style={{ marginTop: '12px', fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Connecting to encrypted real-time channel...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--text-muted)',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>No messages yet in this timeline.</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                Type below to communicate instantly with operators and teachers.
              </span>
            </div>
          ) : (
            messages.map((ev, idx) => {
              const isSys = ev.actorRole === 'automation' || ev.type === 'system';
              if (isSys) {
                return (
                  <div
                    key={ev.id || idx}
                    className="chat-bubble-sys"
                    style={{
                      alignSelf: 'center',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '999px',
                      padding: '4px 12px',
                      fontSize: '10.5px',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      margin: '6px 0',
                    }}
                  >
                    {ev.message} • {ev.timestamp}
                  </div>
                );
              }

              const isMe =
                ev.actorName?.toLowerCase() === myFirstName.toLowerCase() ||
                (ev.actorRole === myRole && ev.actorName === 'Me');

              const isRevMsg = ev.type === 'revision';

              return (
                <div
                  key={ev.id || idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: isMe ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                      background: isMe
                        ? isRevMsg
                          ? 'linear-gradient(135deg, #DC2626, #B91C1C)'
                          : 'linear-gradient(135deg, #0284C7, #0369A1)'
                        : 'rgba(255, 255, 255, 0.08)',
                      border: isMe
                        ? '1px solid rgba(255,255,255,0.2)'
                        : '1px solid rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {!isMe && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color:
                              ev.actorRole === 'operator'
                                ? 'var(--brand)'
                                : ev.actorRole === 'admin'
                                ? 'var(--purple)'
                                : 'var(--accent)',
                          }}
                        >
                          {ev.actorName}
                        </span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.08)',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {ev.actorRole}
                        </span>
                      </div>
                    )}

                    <div style={{ fontSize: '13px', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                      {ev.message}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '4px',
                        marginTop: '4px',
                        fontSize: '10px',
                        color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                        fontWeight: 600,
                      }}
                    >
                      <span>{ev.timestamp}</span>
                      {isMe && (
                        <span>
                          {ev.isOptimistic ? (
                            // Single Gray Check (Sending)
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            // Double Blue/Cyan Check (Delivered, WhatsApp Style)
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#67E8F9" strokeWidth="2.5">
                              <polyline points="17 6 9 17 4 12" />
                              <polyline points="21 8 13 17 11 15" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* WhatsApp-Style Sticky Bottom Input Zone */}
        <div
          className="chat-input-wrapper"
          id="timelineActionZone"
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <textarea
            ref={textareaRef}
            id="correctionNoteText"
            className="chat-textarea"
            rows={1}
            placeholder={
              isRevision
                ? 'Type details for the operator revision request...'
                : 'Type an instant message to the group...'
            }
            value={inputText}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(0,0,0,0.35)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'none',
              maxHeight: '120px',
              lineHeight: '1.4',
            }}
          />

          <button
            type="button"
            id="corrSubmitBtn"
            className="chat-send-btn"
            onClick={handleSend}
            disabled={sending || !inputText.trim()}
            style={{
              width: '42px',
              height: '42px',
              minWidth: '42px',
              minHeight: '42px',
              borderRadius: '50%',
              background: isRevision ? '#DC2626' : 'var(--brand)',
              color: isRevision ? '#FFFFFF' : '#05080F',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: sending || !inputText.trim() ? 'not-allowed' : 'pointer',
              opacity: !inputText.trim() ? 0.6 : 1,
              transition: 'all 0.2s ease',
              boxShadow: !inputText.trim() ? 'none' : '0 4px 14px rgba(38,195,234,0.3)',
            }}
          >
            {sending ? (
              <IOSSpinner size={18} color={isRevision ? '#fff' : '#05080F'} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
