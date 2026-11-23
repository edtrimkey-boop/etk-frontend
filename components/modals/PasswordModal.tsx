'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import IOSSpinner from '@/components/ui/IOSSpinner';

export default function PasswordModal() {
  const { activeModal, closeModal, user, showAlert } = useDashboard();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (activeModal !== 'password') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showAlert('New password must be at least 6 characters long.', 'Validation Error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('New password and confirmation do not match.', 'Validation Error');
      return;
    }

    setLoading(true);
    try {
      const res = await serverCall('changeUserPassword', {
        email: user?.email,
        oldPassword,
        newPassword,
      });

      if (res.success) {
        closeModal();
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showAlert('Your password has been successfully updated.', 'Security Notice');
      } else {
        showAlert(res.message || 'Failed to change password. Please check your current password.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error communicating with server.', 'Network Error');
    } finally {
      setLoading(false);
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
          maxWidth: '450px',
          padding: '40px',
          textAlign: 'left',
          maxHeight: '90vh',
          overflowY: 'auto',
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
              <circle cx="12" cy="16" r="1" />
              <rect x="3" y="10" width="18" height="12" rx="2" />
              <path d="M7 10V7a5 5 0 0 1 10 0v3" />
            </svg>
            Change Password
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="close-minimal"
              onClick={closeModal}
              style={{ position: 'relative', top: 0, right: 0 }}
            >
              ✖
            </button>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '25px', fontWeight: 600 }}>
          Update your security credentials.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label className="label-text">Current Password <span className="req">*</span></label>
            <input
              type="password"
              className="form-input"
              placeholder="Current Password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label className="label-text">New Password <span className="req">*</span></label>
            <input
              type="password"
              className="form-input"
              placeholder="New Password (min 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="label-text">Confirm New Password <span className="req">*</span></label>
            <input
              type="password"
              className="form-input"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="modal-action-dock" style={{ justifyContent: 'center' }}>
            <OpticalButton
              type="submit"
              disabled={loading}
              variant="primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '44px',
              }}
            >
              {loading ? <IOSSpinner size={18} color="#05080F" /> : 'Update Security'}
            </OpticalButton>
          </div>
        </form>
      </div>
    </div>
  );
}
