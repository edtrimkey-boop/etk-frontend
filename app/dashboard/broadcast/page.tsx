'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalButton } from '@/components/ui/OpticalGlass';

export default function BroadcastPage() {
  const { user, payload, showAlert, refreshData } = useDashboard();
  const [target, setTarget] = useState('inst_teachers');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isSysAdmin = user?.role === 'super_admin' || user?.role === 'sys_admin';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      showAlert('Please enter both subject and message for the broadcast.', 'Validation Error');
      return;
    }

    setLoading(true);
    try {
      const res = await serverCall('sendNotification', {
        targetAudience: target,
        title,
        message,
        instituteId: user?.instId,
        senderName: user?.name,
      });

      if (res.success) {
        setTitle('');
        setMessage('');
        showAlert('Broadcast notification dispatched successfully to all target devices!', 'Success');
        refreshData(true);
      } else {
        showAlert(res.message || 'Failed to dispatch broadcast.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error communicating with notification engine.', 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  const notifications = payload?.notifications || [];

  return (
    <div id="view-notifications" className="page-view active" style={{ display: 'block' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* Broadcast Sender Form */}
        <div className="panel" style={{ borderLeft: '4px solid var(--brand)', marginBottom: 0 }}>
          <div className="panel-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
              </svg>
              Broadcast Notification Center
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontWeight: 600 }}>
            Select your audience and instantly push alerts directly to their dashboards.
          </p>

          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label-text">Target Audience</label>
              <select
                id="broadcastTarget"
                className="form-input"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                style={{ marginBottom: 0 }}
              >
                {isSysAdmin ? (
                  <>
                    <option value="all_operators">All Operators</option>
                    <option value="all_teachers">All Teachers</option>
                    <option value="all_admins">All Admins</option>
                    <option value="global">Entire System (Global)</option>
                  </>
                ) : (
                  <>
                    <option value="inst_teachers">My Institute Teachers</option>
                    <option value="inst_students">My Institute Students</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label-text">Notification Subject</label>
              <input
                type="text"
                className="form-input"
                placeholder="Subject (e.g. Server Maintenance or Exam Schedule)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ marginBottom: 0, fontSize: '14px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label-text">Message Content</label>
              <textarea
                className="form-input"
                placeholder="Type your broadcast message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                style={{
                  padding: '15px',
                  borderRadius: '10px',
                  minHeight: '120px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  fontWeight: 600,
                  marginBottom: 0,
                }}
              />
            </div>

            <OpticalButton
              type="submit"
              disabled={loading}
              variant="success"
              style={{
                width: '100%',
                fontSize: '15px',
                padding: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '10px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                <path d="M15 8h6" />
                <path d="M18 5v6" />
                <path d="M20.002 14.464a9 9 0 0 0 .738.863A1 1 0 0 1 20 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 8.75-5.332" />
              </svg>
              {loading ? 'Dispatching Broadcast...' : 'Launch Broadcast'}
            </OpticalButton>
          </form>
        </div>

        {/* Recent Alerts Feed */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <h3>Recent System Alerts</h3>
          </div>
          {notifications.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              No broadcast notifications recorded yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.map((n: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    padding: '15px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <h4 style={{ color: 'var(--brand)', margin: 0, fontSize: '14px' }}>{n.title}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{n.time || 'Recent'}</span>
                  </div>
                  <p style={{ color: 'var(--text)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{n.msg}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
