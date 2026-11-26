'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import IOSSpinner from '@/components/ui/IOSSpinner';

const SUBJECT_OPTIONS = ['Hindi', 'English', 'Maths', 'Mathematics', 'Science', 'Writing', 'Drawing', 'Computer', 'Social Science'];
const WORK_TYPE_OPTIONS = ['Paper Formatting', 'Papers', 'Report Cards', 'Admit Cards'];

export default function OperatorEditModal() {
  const { activeModal, modalData, closeModal, showAlert, showConfirm, showToast, refreshData } = useDashboard();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>([]);
  const [ratePaper, setRatePaper] = useState('0');
  const [rateUnit, setRateUnit] = useState('0');
  const [loading, setLoading] = useState(false);

  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (modalData) {
      setName(modalData.full_name || modalData.name || '');
      setPhone(modalData.phone_number || modalData.phone || '');
      const st = String(modalData.status || 'Active').trim().toLowerCase();
      setIsActive(st === 'active' || st === 'connected' || st === 'busy');

      const prof = Array.isArray(modalData.operator_profiles)
        ? (modalData.operator_profiles[0] || {})
        : (modalData.operator_profiles || {});

      const rawSubs = prof.subjects || prof.subject_handles || modalData.subjects || '';
      const subs = Array.isArray(rawSubs)
        ? rawSubs.map((s: any) => String(s).trim()).filter(Boolean)
        : String(rawSubs).split(',').map((s) => s.trim()).filter(Boolean);
      setSelectedSubjects(subs);

      const rawWorks = prof.work_types || prof.work_type || modalData.workType || '';
      const works = Array.isArray(rawWorks)
        ? rawWorks.map((w: any) => String(w).trim()).filter(Boolean)
        : String(rawWorks).split(',').map((w) => w.trim()).filter(Boolean);
      setSelectedWorkTypes(works);

      setRatePaper(String(prof.rate_paper ?? prof.rate_per_paper ?? modalData.ratePaper ?? '0'));
      setRateUnit(String(prof.rate_unit ?? modalData.rateUnit ?? '0'));
      setShowRejectBox(false);
      setRejectReason('');
    }
  }, [modalData, activeModal]);

  if (activeModal !== 'operatorEdit') return null;

  const isApprovalRequest = Boolean(modalData?.isApprovalRequest);
  const opUserId = modalData?.id || modalData?.userId;
  const originalName = modalData?.full_name || modalData?.name || name;

  const toggleItem = (item: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const hasPaperRate = selectedWorkTypes.some((w) => w.toLowerCase().includes('paper'));
  const hasUnitRate = selectedWorkTypes.some((w) => w.toLowerCase().includes('card'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await serverCall('updateOperatorDetails', {
        userId: opUserId,
        originalName,
        name,
        phone,
        status: isActive ? 'Active' : 'Inactive',
        subjects: selectedSubjects.join(', '),
        workType: selectedWorkTypes.join(', '),
        subject_handles: selectedSubjects,
        work_types: selectedWorkTypes,
        ratePaper: Number(ratePaper) || 0,
        rateUnit: Number(rateUnit) || 0,
      });

      if (res && res.success !== false) {
        if (typeof modalData?.onResolved === 'function') modalData.onResolved();
        closeModal();
        showToast(
          isApprovalRequest
            ? 'Operator profile change approved and applied!'
            : 'Operator settings updated successfully!',
          'success'
        );
        refreshData(true);
      } else {
        showAlert(res?.message || 'Failed to update operator.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Network error updating operator.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!opUserId) return;
    setRejecting(true);
    try {
      const res = await serverCall('rejectProfileChange', {
        targetUserId: opUserId,
        notifId: modalData?.requestNotifId || undefined,
        reason: rejectReason.trim(),
      });
      if (res && res.success) {
        if (typeof modalData?.onResolved === 'function') modalData.onResolved();
        closeModal();
        showToast('Operator change request declined.', 'warning');
        refreshData(true);
      } else {
        showAlert(res?.message || 'Failed to decline request.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Network error.', 'Error');
    } finally {
      setRejecting(false);
    }
  };

  const handleDeleteOperator = () => {
    showConfirm(`Are you sure you want to permanently delete ${originalName}?`, async () => {
      setLoading(true);
      try {
        const res = await serverCall('deleteOperatorAccess', { name: originalName });
        if (res && res.success) {
          if (typeof modalData?.onResolved === 'function') modalData.onResolved();
          closeModal();
          showToast('Operator permanently removed.', 'success');
          refreshData(true);
        } else {
          showAlert(res?.message || 'Failed to delete operator.', 'Error');
        }
      } catch (err: any) {
        showAlert(err.message || 'Failed to delete operator.', 'Error');
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="glass-overlay active" onClick={closeModal} style={{ zIndex: 99999 }}>
      <div className="glass-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '92%', position: 'relative' }}>
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            {isApprovalRequest ? 'Review Operator Request' : `Edit Operator (${originalName})`}
          </h2>
          <button type="button" className="close-minimal" onClick={closeModal} aria-label="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-scroll-body">
            {isApprovalRequest && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', marginBottom: '4px' }}>Pending Work Profile Change Request</div>
                <div style={{ fontSize: '12px', color: 'var(--text)' }}>{modalData?.requestMessage || 'Operator requested a profile update.'}</div>
              </div>
            )}

            <div className="grid-2" style={{ marginBottom: '15px' }}>
              <div className="form-group">
                <label className="label-text">Operator Name</label>
                <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="label-text">Account Active</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)' }}>
                  <label className="switch" style={{ margin: 0 }}>
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    <span className="slider" />
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: isActive ? 'var(--success)' : 'var(--danger)' }}>
                    {isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <label className="label-text" style={{ color: 'var(--brand)', marginBottom: '8px', display: 'block' }}>Subject Handles</label>
              <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                {SUBJECT_OPTIONS.map((sub) => {
                  const checked = selectedSubjects.includes(sub);
                  return (
                    <label key={sub} className="cb-pill" style={{ cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', background: checked ? 'rgba(0,251,166,0.15)' : 'rgba(255,255,255,0.05)', border: checked ? '1px solid var(--brand)' : '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleItem(sub, selectedSubjects, setSelectedSubjects)} />
                      {sub}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <label className="label-text" style={{ color: 'var(--accent)', marginBottom: '8px', display: 'block' }}>Work Types</label>
              <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                {WORK_TYPE_OPTIONS.map((wt) => {
                  const checked = selectedWorkTypes.includes(wt);
                  return (
                    <label key={wt} className="cb-pill" style={{ cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', background: checked ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', border: checked ? '1px solid var(--accent)' : '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleItem(wt, selectedWorkTypes, setSelectedWorkTypes)} />
                      {wt}
                    </label>
                  );
                })}
              </div>
            </div>

            {(hasPaperRate || hasUnitRate || ratePaper !== '0' || rateUnit !== '0') && (
              <div className="grid-2" style={{ marginBottom: '15px', padding: '14px', borderRadius: '12px', border: '1px dashed var(--success)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label-text" style={{ color: 'var(--success)' }}>Rate per Paper (₹)</label>
                  <input type="number" className="form-input" value={ratePaper} onChange={(e) => setRatePaper(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label-text" style={{ color: 'var(--success)' }}>Rate per Unit (₹)</label>
                  <input type="number" className="form-input" value={rateUnit} onChange={(e) => setRateUnit(e.target.value)} />
                </div>
              </div>
            )}

            {isApprovalRequest && showRejectBox && (
              <div style={{ marginBottom: '15px', padding: '12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
                <label className="label-text" style={{ color: 'var(--danger)', fontSize: '11px' }}>Decline Reason (Optional)</label>
                <textarea className="form-input" rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={{ marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="liquid-glass btn-xs btn-secondary" onClick={() => setShowRejectBox(false)}>Back</button>
                  <button type="button" className="liquid-glass btn-xs btn-danger" onClick={handleReject} disabled={rejecting}>
                    {rejecting ? 'Declining...' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="modal-action-dock" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {!isApprovalRequest ? (
              <button type="button" className="liquid-glass btn-danger btn-sm" onClick={handleDeleteOperator} disabled={loading}>
                Remove Operator
              </button>
            ) : !showRejectBox ? (
              <button type="button" className="liquid-glass btn-danger btn-sm" onClick={() => setShowRejectBox(true)} disabled={loading || rejecting}>
                Reject Request
              </button>
            ) : <span />}

            <OpticalButton type="submit" disabled={loading || rejecting} variant="primary" style={{ minHeight: '42px', padding: '0 22px' }}>
              {loading ? <IOSSpinner size={18} color="#05080F" /> : isApprovalRequest ? 'Approve & Apply' : 'Save Changes'}
            </OpticalButton>
          </div>
        </form>
      </div>
    </div>
  );
}
