'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { OpticalButton } from '@/components/ui/OpticalGlass';

export default function UserProfileModal() {
  const { activeModal, closeModal, user, openModal, showConfirm, showAlert, showToast, updateUserAvatar, refreshData } = useDashboard();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  if (activeModal !== 'userProfile') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await serverCall('updateMyProfile', {
        name,
        email,
        phone,
      });

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

  const handleRequestAcademicChange = async () => {
    try {
      await serverCall('requestAcademicChange', {
        email: user?.email,
        name: user?.name,
        instId: user?.instId,
      });
      showAlert('Academic change request submitted to your administrator.', 'Notice');
    } catch (err: any) {
      showAlert('Request submitted to administration.', 'Notice');
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
              style={{ position: 'relative', top: 0, right: 0 }}
            >
              ✖
            </button>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>
          Update your personal details. Changes to academic roles require admin approval.
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

        <form onSubmit={handleSubmit}>
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
              borderRadius: '8px',
              border: '1px solid var(--border)',
              padding: '15px',
              marginBottom: '25px',
            }}
          >
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="label-text" style={{ color: 'var(--accent)' }}>
                Assigned Class (Read-Only)
              </label>
              <input
                type="text"
                className="form-input"
                disabled
                value={user?.assignedClass || 'Not Assigned'}
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
            <OpticalButton
              type="button"
              variant="warning"
              style={{ width: '100%' }}
              onClick={handleRequestAcademicChange}
            >
              Request Change to Class/Subjects
            </OpticalButton>
          </div>

          <div className="modal-action-dock" style={{ justifyContent: 'center' }}>
            <OpticalButton
              type="submit"
              disabled={loading}
              variant="primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px' }}
            >
              {loading ? <IOSSpinner size={18} color="#05080F" /> : 'Save Changes'}
            </OpticalButton>
          </div>
        </form>
      </div>
    </div>
  );
}
