'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { normalizeRole } from '@/lib/rbac';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { OpticalButton } from '@/components/ui/OpticalGlass';

export default function UserProfileModal() {
  const { activeModal, closeModal, user, openModal, showConfirm, showAlert, showToast, updateUserAvatar, refreshData } = useDashboard();

  const normRole = normalizeRole(user?.role);
  const isPrivileged = normRole === 'admin' || normRole === 'super_admin';
  const isOperator = normRole === 'operator';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedClass, setAssignedClass] = useState('');
  const [subjects, setSubjects] = useState('');

  // Teacher / Operator change request composer state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqClass, setReqClass] = useState('');
  const [reqSubjects, setReqSubjects] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [requesting, setRequesting] = useState(false);

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          openModal('adjustProfilePic', { imageSrc: ev.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRemovePic = () => {
    showConfirm('Are you sure you want to remove your profile picture?', async () => {
      try {
        const res = await serverCall('updateProfilePic', { email: user?.email, url: '' });
        if (res && res.success) {
          updateUserAvatar('');
          showToast('Profile picture removed.', 'success');
        } else {
          showAlert(res?.message || 'Failed to remove photo.', 'Error');
        }
      } catch (err: any) {
        showAlert(err.message || 'Network error.', 'Error');
      }
    });
  };

  useEffect(() => {
    if (user) {
      setName(user.name || user.full_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || user.phone_number || '');
      setAssignedClass(user.assignedClass || '');
      setSubjects(user.subjects && user.subjects !== 'Not Assigned' ? user.subjects : '');
      setShowRequestForm(false);
      setReqClass('');
      setReqSubjects('');
      setReqNote('');
    }
  }, [user, activeModal]);

  if (activeModal !== 'userProfile') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: Record<string, any> = {
        name,
        email,
        phone,
        role: user?.role,
      };
      if (isPrivileged) {
        payload.assignedClass = assignedClass;
        payload.subjects = subjects;
      }

      const res = await serverCall('updateMyProfile', payload);

      if (res.success) {
        closeModal();
        showAlert('Your profile information has been updated.', 'Success');
        refreshData(true);
      } else {
        showAlert(res.message || 'Failed to update profile.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error updating profile.', 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProfileRequest = async () => {
    if (isPrivileged) return;
    if (!reqClass.trim() && !reqSubjects.trim() && !reqNote.trim()) {
      showAlert(
        `Please specify the requested ${isOperator ? 'work type / subjects' : 'class / subjects'} or reason before submitting.`,
        'Validation Error'
      );
      return;
    }

    setRequesting(true);
    try {
      const res = await serverCall('requestAcademicChange', {
        userName: user?.name || name,
        requestedClass: isOperator ? '' : reqClass.trim(),
        requestedSubjects: reqSubjects.trim(),
        requestedWorkTypes: isOperator ? reqClass.trim() : '',
        note: reqNote.trim(),
      });
      if (res && res.success) {
        setShowRequestForm(false);
        closeModal();
        showAlert(
          res.message ||
            (isOperator
              ? 'Work profile change request submitted to Super Admin for approval.'
              : 'Academic profile change request submitted to your Institute Admin for approval.'),
          'Request Sent'
        );
      } else {
        showAlert(res?.message || 'Failed to submit change request.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Failed to submit change request.', 'Error');
    } finally {
      setRequesting(false);
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
          maxWidth: '500px',
          textAlign: 'left',
          position: 'relative',
        }}
      >
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--brand)', margin: 0, display: 'flex', alignItems: 'center' }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ marginRight: '8px', verticalAlign: 'middle' }}
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Edit My Profile
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

        <form onSubmit={handleSubmit} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 0 }}>
          <div className="modal-scroll-body">
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>
              {isPrivileged
                ? 'Administrator access: you can update your profile and academic credentials directly.'
                : `Update your personal details. Changes to ${isOperator ? 'work profile' : 'academic roles'} require ${isOperator ? 'Super Admin' : 'Institute Admin'} approval.`}
            </p>

            {/* Profile Picture Block */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '22px',
                background: 'rgba(0,0,0,0.2)',
                padding: '15px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--brand)',
                  color: '#05080F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 900,
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.2)',
                }}
              >
                {user?.profile_pic_url || user?.profilePic ? (
                  <img
                    src={user.profile_pic_url || user.profilePic}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (user?.name || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>
                  Profile Picture
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="liquid-glass btn-xs btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Photo
                  </button>
                  {(user?.profile_pic_url || user?.profilePic) && (
                    <button
                      type="button"
                      className="liquid-glass btn-xs btn-danger"
                      onClick={handleRemovePic}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileSelect}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="label-text">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="label-text">Email Address (Login ID)</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="label-text">Contact Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                padding: '15px',
                marginBottom: '20px',
              }}
            >
              {isPrivileged ? (
                <>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="label-text" style={{ color: 'var(--brand)' }}>
                      Assigned Class / Scope
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. All"
                      value={assignedClass}
                      onChange={(e) => setAssignedClass(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '6px' }}>
                    <label className="label-text" style={{ color: 'var(--brand)' }}>
                      Subjects (Comma Separated)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Mathematics, Science"
                      value={subjects}
                      onChange={(e) => setSubjects(e.target.value)}
                    />
                  </div>
                  {normRole === 'admin' && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.45 }}>
                      As an Institute Administrator, your updates save immediately. Teacher change requests for your institute appear in your Teachers Directory and notification bell for Approve/Reject review.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="label-text" style={{ color: 'var(--accent)' }}>
                      {isOperator ? 'Assigned Work Types (Read-Only)' : 'Assigned Class (Read-Only)'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      disabled
                      value={user?.assignedClass || (isOperator ? 'Managed by Super Admin' : 'Not Assigned')}
                      style={{ opacity: 0.6 }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="label-text" style={{ color: 'var(--accent)' }}>
                      Subjects (Read-Only)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      disabled
                      value={user?.subjects || 'Not Assigned'}
                      style={{ opacity: 0.6 }}
                    />
                  </div>

                  {!showRequestForm ? (
                    <OpticalButton
                      type="button"
                      variant="warning"
                      style={{ width: '100%' }}
                      onClick={() => setShowRequestForm(true)}
                    >
                      {isOperator ? 'Request Work Profile Change' : 'Request Change to Class/Subjects'}
                    </OpticalButton>
                  ) : (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', marginBottom: '10px' }}>
                        {isOperator ? 'Submit Request to Super Admin' : 'Submit Request to Institute Admin'}
                      </div>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label className="label-text" style={{ fontSize: '11px' }}>
                          {isOperator ? 'Requested Work Types' : 'Requested Class'}
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={isOperator ? 'e.g. Papers, Report Cards' : 'e.g. Class 9, Class 10'}
                          value={reqClass}
                          onChange={(e) => setReqClass(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label className="label-text" style={{ fontSize: '11px' }}>Requested Subjects</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Physics, Mathematics"
                          value={reqSubjects}
                          onChange={(e) => setReqSubjects(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label className="label-text" style={{ fontSize: '11px' }}>Reason / Note (Optional)</label>
                        <textarea
                          className="form-input"
                          rows={2}
                          placeholder="Explain what needs updating..."
                          value={reqNote}
                          onChange={(e) => setReqNote(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="liquid-glass btn-xs btn-secondary"
                          onClick={() => setShowRequestForm(false)}
                          disabled={requesting}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="liquid-glass btn-xs btn-warning"
                          onClick={handleSubmitProfileRequest}
                          disabled={requesting}
                        >
                          {requesting ? 'Sending...' : 'Send Request'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="modal-action-dock dock-center">
            <OpticalButton
              type="submit"
              disabled={loading}
              variant="primary"
              style={{
                maxWidth: '280px',
                width: '100%',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '44px',
              }}
            >
              {loading ? <IOSSpinner size={18} color="#05080F" /> : 'Save Changes'}
            </OpticalButton>
          </div>
        </form>
      </div>
    </div>
  );
}
