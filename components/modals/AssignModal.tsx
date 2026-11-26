'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import IOSSpinner from '@/components/ui/IOSSpinner';

export default function AssignModal() {
  const { activeModal, modalData, closeModal, payload, showAlert, showToast, refreshData } = useDashboard();
  const [assigningId, setAssigningId] = useState<string | null>(null);

  if (activeModal !== 'assignModal' || !modalData?.jobId) return null;

  const jobId = modalData.jobId;
  const rawOps: any[] = Array.isArray(payload?.superAdmin?.operatorList) ? payload.superAdmin.operatorList : [];
  const activeOps = [...rawOps]
    .filter((o) => {
      const st = String(o.status || '').trim().toLowerCase();
      return st === 'active' || st === 'connected';
    })
    .sort((a, b) => (a.pending || 0) - (b.pending || 0));

  const handleAssign = async (op: any) => {
    setAssigningId(op.id || op.name);
    try {
      const res = await serverCall('assignJobToOperator', {
        jobId,
        jobType: modalData.jobType || modalData.job?.type || 'Paper',
        operatorId: op.id,
        operatorName: op.name,
        subject: modalData.job?.subject || modalData.job?.type,
        instName: modalData.job?.inst,
        deadline: modalData.job?.deadline,
      });
      if (res && res.success) {
        closeModal();
        showToast(res.message || `Assigned ${jobId} to ${op.name}`, 'success');
        refreshData(true);
      } else {
        showAlert(res?.message || 'Failed to assign job.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Failed to assign job.', 'Network Error');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="glass-overlay active" onClick={closeModal} style={{ zIndex: 99999 }}>
      <div className="glass-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '92%', position: 'relative' }}>
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--purple)', margin: 0, fontSize: '16px' }}>
            Assign Operator • {jobId}
          </h2>
          <button type="button" className="close-minimal" onClick={closeModal} aria-label="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-scroll-body">
          {activeOps.length === 0 ? (
            <p style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
              No active operators found in roster.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeOps.map((op, i) => {
                const key = op.id || op.name || String(i);
                const busy = assigningId === key;
                const loadColor = (op.pending || 0) === 0 ? 'var(--success)' : 'var(--accent)';
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={Boolean(assigningId)}
                    onClick={() => handleAssign(op)}
                    className="op-roster-item"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ color: 'white', fontWeight: 800, fontSize: '14px' }}>{op.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {op.workType || op.subjects || 'General Operator'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {busy ? (
                        <IOSSpinner size={16} color="var(--brand)" />
                      ) : (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(0,0,0,0.35)',
                            color: loadColor,
                            border: `1px solid ${loadColor}`,
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '8px',
                          }}
                        >
                          Pending: {op.pending || 0}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
