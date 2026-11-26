'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import IOSSpinner from '@/components/ui/IOSSpinner';

const SUBJECT_OPTIONS = [
  'Hindi', 'English', 'Mathematics', 'Science',
  'Social Science', 'Computer', 'Writing', 'Drawing',
  'Physics', 'Chemistry', 'Biology', 'Sanskrit'
];

export default function TeacherEditModal() {
  const { activeModal, modalData, closeModal, showAlert, showToast, refreshData } = useDashboard();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedClass, setAssignedClass] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  // Reject confirmation state for Profile Change Requests
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (modalData) {
      setName(modalData.full_name || modalData.name || '');
      setPhone(modalData.phone_number || modalData.phone || '');
      setIsActive(String(modalData.status || 'Active').toLowerCase() === 'active');
      const prof = modalData.teacher_profiles?.[0] || modalData.teacher_profiles || {};
      setAssignedClass(prof.assigned_class || modalData.assigned_class || modalData.assignedClass || '');

      let subs: string[] = [];
      const rawSubjects = prof.subject_handles || modalData.subject_handles || modalData.subjects || prof.subjects;
      if (Array.isArray(rawSubjects)) {
        subs = rawSubjects.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (typeof rawSubjects === 'string') {
        subs = rawSubjects.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      setSelectedSubjects(subs);
      setShowRejectBox(false);
      setRejectReason('');
    }
  }, [modalData, activeModal]);

  if (activeModal !== 'teacherEdit') return null;

  const isApprovalRequest = Boolean(modalData?.isApprovalRequest);
  const teacherIdentifier = modalData?.id || modalData?.userId || modalData?.teacherId;

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const subjectStr = Array.isArray(selectedSubjects)
        ? selectedSubjects.join(', ')
        : String(selectedSubjects || '');

      const payload = {
        userId: teacherIdentifier,
        teacherId: teacherIdentifier,
        name,
        phone,
        status: isActive ? 'Active' : 'Inactive',
        assignedClass,
        subjects: subjectStr,
        subject_handles: selectedSubjects,
      };

      const res = await serverCall('updateTeacherDetails', payload);

      if (res && res.success !== false) {
        if (typeof modalData?.onResolved === 'function') {
          modalData.onResolved();
        }
        closeModal();
        showToast(
          isApprovalRequest
            ? 'Teacher profile request approved and applied!'
            : 'Teacher details updated successfully!',
          'success'
        );
        refreshData(true);
      } else {
        showAlert(res?.message || 'Failed to update teacher.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error updating teacher.', 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!teacherIdentifier) return;
    setRejecting(true);
    try {
      const res = await serverCall('rejectProfileChange', {
        targetUserId: teacherIdentifier,
        notifId: modalData?.requestNotifId || undefined,
        reason: rejectReason.trim(),
      });
      if (res && res.success) {
        if (typeof modalData?.onResolved === 'function') {
          modalData.onResolved();
        }
        closeModal();
        showToast('Profile change request declined and teacher notified.', 'warning');
        refreshData(true);
      } else {
        showAlert(res?.message || 'Failed to reject request.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error rejecting request.', 'Network Error');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div
      className="glass-overlay active"
      onClick={closeModal}
      style={{ zIndex: 99999 }}
    >
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '650px',
          width: '90%',
          position: 'relative',
        }}
      >
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            {isApprovalRequest ? 'Review Teacher Profile Request' : 'Edit Teacher Profile'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="close-minimal"
              onClick={closeModal}
              aria-label="Close"
              title="Close"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-scroll-body">
            {isApprovalRequest && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', marginBottom: '4px' }}>
                  Pending Profile Change Request
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.45 }}>
                  {modalData?.requestMessage || `${name} has requested an academic profile update.`}
                </div>
              </div>
            )}

            <div className="grid-2" style={{ marginBottom: '15px' }}>
              <div className="form-group">
                <label className="label-text">Teacher Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label-text">Contact No.</label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '15px', alignItems: 'center' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label-text">Assigned Class</label>
                <input
                  type="text"
                  className="form-input"
                  value={assignedClass}
                  onChange={(e) => setAssignedClass(e.target.value)}
                  placeholder="e.g. Class 10"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label-text">Account Access</label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <label className="switch" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span className="slider" />
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: isActive ? 'var(--success)' : 'var(--danger)' }}>
                    {isActive ? 'Account Active' : 'Suspended'}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="form-group"
              style={{
                marginBottom: '20px',
                background: 'rgba(0,0,0,0.2)',
                padding: '15px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
              }}
            >
              <label className="label-text" style={{ color: 'var(--brand)', marginBottom: '10px', display: 'block' }}>
                Subject Handles
              </label>
              <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {SUBJECT_OPTIONS.map((sub) => {
                  const checked = selectedSubjects.includes(sub);
                  return (
                    <label
                      key={sub}
                      className="cb-pill"
                      style={{
                        cursor: 'pointer',
                        background: checked ? 'rgba(0,251,166,0.15)' : 'rgba(255,255,255,0.05)',
                        border: checked ? '1px solid var(--brand)' : '1px solid var(--border)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSubject(sub)}
                      />
                      {sub}
                    </label>
                  );
                })}
              </div>
            </div>

            {isApprovalRequest && showRejectBox && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                }}
              >
                <label className="label-text" style={{ color: 'var(--danger)', fontSize: '11px' }}>
                  Decline Reason (Optional — sent to teacher)
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Subject allocation already assigned to another faculty member..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="liquid-glass btn-xs btn-secondary"
                    onClick={() => setShowRejectBox(false)}
                    disabled={rejecting}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="liquid-glass btn-xs btn-danger"
                    onClick={handleRejectRequest}
                    disabled={rejecting}
                  >
                    {rejecting ? 'Declining...' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="modal-action-dock dock-center" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {isApprovalRequest && !showRejectBox && (
              <button
                type="button"
                className="liquid-glass btn-danger"
                onClick={() => setShowRejectBox(true)}
                disabled={loading || rejecting}
                style={{ minHeight: '44px', padding: '0 20px', fontSize: '12px', fontWeight: 800 }}
              >
                Reject Request
              </button>
            )}
            <OpticalButton
              type="submit"
              disabled={loading || rejecting}
              variant="primary"
              style={{
                maxWidth: '280px',
                flex: '1 1 200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '44px',
              }}
            >
              {loading ? <IOSSpinner size={18} color="#05080F" /> : isApprovalRequest ? 'Approve & Apply Changes' : 'Update Teacher'}
            </OpticalButton>
          </div>
        </form>
      </div>
    </div>
  );
}
