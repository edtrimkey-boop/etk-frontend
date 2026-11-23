'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalSurface } from '@/components/ui/OpticalGlass';

interface TopBarProps {
  title?: string;
  instituteName?: string;
  instituteLogo?: string;
  onToggleSidebar?: () => void;
  onOpenProfileEditor?: () => void;
  onLogout?: () => void;
}

export default function TopBar({
  title = 'Dashboard',
  instituteName = '',
  instituteLogo = '',
  onToggleSidebar,
  onOpenProfileEditor,
  onLogout,
}: TopBarProps) {
  const {
    user,
    payload,
    openModal,
    showConfirm,
    showAlert,
    showToast,
    updateUserAvatar,
    playNotificationSound,
    opticalGlassEnabled,
    setOpticalGlassEnabled,
  } = useDashboard();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [unreadOverride, setUnreadOverride] = useState<number | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleRemovePhoto = () => {
    setProfileDropdownOpen(false);
    showConfirm('Are you sure you want to remove your profile picture?', async () => {
      try {
        const res = await serverCall('updateProfilePic', { email: user?.email, url: '' });
        if (res && res.success) {
          updateUserAvatar('');
          playNotificationSound('success');
          showToast('Profile picture removed.', 'success');
        } else {
          playNotificationSound('error');
          showAlert(res?.message || 'Failed to remove photo.', 'Error');
        }
      } catch (err: any) {
        playNotificationSound('error');
        showAlert(err.message || 'Network error removing photo.', 'Error');
      }
    });
  };

  const notifications = payload?.notifications || [];
  const calculatedUnread = notifications.filter((n: any) => !n.isRead).length;
  const unreadCount = unreadOverride !== null ? unreadOverride : calculatedUnread;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    setUnreadOverride(0);
    try {
      await serverCall('markNotificationsRead', { email: user?.email });
    } catch (err: any) {
      console.warn('Mark notifs error:', err.message);
    }
  };

  const displayName = user?.name || 'Administrator';
  const displayRole = user?.role || 'Admin';
  const displayEmail = user?.email || 'admin@trimkey.in';
  const displayInst = instituteName || user?.institute || 'Ed-Trim Key';
  const displayLogo = instituteLogo || user?.logo || 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/logo/new-ETK.png';

  return (
    <header className="top-bar">
      <div className="brandRow">
        {/* Sidebar Toggle Button (Desktop Only - Mobile uses Floating Bottom Pill & FAB like index.html) */}
        <OpticalSurface
          className="sidebar-toggle-btn desktop-only liquid-glass glass-circle-btn"
          onClick={onToggleSidebar}
          radius={999}
          style={{
            marginRight: '10px',
            width: '42px',
            height: '42px',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </OpticalSurface>

        {/* Glass Title Pill */}
        <OpticalSurface
          className="glass-title-pill brand"
          radius={999}
        >
          {displayLogo && (
            <img
              id="headerInstLogo"
              src={displayLogo}
              alt="Logo"
            />
          )}
          {displayInst && (
            <span
              id="headerInstName"
              className="desktop-only"
              style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}
            >
              {displayInst}
            </span>
          )}

          {displayInst && <div className="title-separator desktop-only" id="titleSeparatorDiv" />}

          <span
            id="top-title"
            style={{
              fontSize: '14px',
              color: 'var(--text)',
              fontWeight: 900,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </span>
        </OpticalSurface>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Global Command Palette Trigger (Ctrl+K / ⌘K) */}
        <div title="Command Palette (Ctrl+K or ⌘K)" className="desktop-only" style={{ display: 'inline-flex' }}>
          <OpticalSurface
            className="liquid-glass glass-circle-btn"
            radius={999}
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
            }}
            style={{
              width: '42px',
              height: '42px',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </OpticalSurface>
        </div>

        {/* Notification Bell */}
        <div
          ref={notifRef}
          id="bellWrapper"
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
        >
          <OpticalSurface
            className="liquid-glass glass-circle-btn notification-wrapper"
            radius={999}
            onClick={(e) => {
              e.stopPropagation();
              setNotifDropdownOpen(!notifDropdownOpen);
            }}
            style={{
              width: '42px',
              height: '42px',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </OpticalSurface>
          {unreadCount > 0 && (
            <span className="notification-badge" id="notifBadge" style={{ pointerEvents: 'none' }}>
              {unreadCount}
            </span>
          )}

          <div
            className={`notif-dropdown ${notifDropdownOpen ? 'active' : ''}`}
            id="notifDropdown"
            style={{
              display: notifDropdownOpen ? 'block' : 'none',
              background: 'rgba(15, 23, 42, 0.96)',
              backdropFilter: 'blur(20px)',
              padding: '15px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="notif-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '10px',
                borderBottom: '1px solid var(--border)',
                marginBottom: '10px',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '13px', color: 'white' }}>System Alerts</span>
              <span
                style={{ fontSize: '11px', color: 'var(--brand)', cursor: 'pointer', fontWeight: 700 }}
                onClick={handleMarkAllRead}
              >
                Mark all read
              </span>
            </div>
            <div className="notif-list" id="notifList" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '25px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
                  No unread alerts
                </div>
              ) : (
                notifications.map((n: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      marginBottom: '6px',
                      background: n.isRead ? 'transparent' : 'rgba(0,251,166,0.05)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--brand)', marginBottom: '2px' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.4 }}>
                      {n.msg}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {n.time || 'Recent'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* User Profile Dropdown */}
        <div
          ref={profileRef}
          id="userHeaderInfo"
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
        >
          <OpticalSurface
            className={`liquid-glass user-profile-container ${profileDropdownOpen ? 'active' : ''}`}
            radius={999}
            onClick={(e) => {
              e.stopPropagation();
              setProfileDropdownOpen(!profileDropdownOpen);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="avatar-circle" id="userAvatar">
              {user?.profile_pic_url || user?.profilePic ? (
                <img
                  src={user.profile_pic_url || user.profilePic}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }} id="userNameDisplay">
                {displayName}
              </span>
            </div>
            <span className="profile-chevron" id="profileChevron" style={{ color: 'var(--text-muted)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </OpticalSurface>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleProfileFileChange}
          />

          <div
            className={`profile-dropdown ${profileDropdownOpen ? 'active' : ''}`}
            id="profileDropdown"
            style={{
              display: profileDropdownOpen ? 'block' : 'none',
              position: 'absolute',
              top: '50px',
              right: 0,
              width: '260px',
              background: 'rgba(15, 23, 42, 0.96)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              zIndex: 9999,
              padding: '18px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-header" style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'white' }} id="dropName">
                {displayName}
              </div>
              <div className="dropdown-email" id="dropEmail" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {displayEmail}
              </div>
              <div className="dropdown-role" id="dropRole" style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 800, textTransform: 'uppercase', marginTop: '4px' }}>
                {displayRole}
              </div>
            </div>

            <div
              className="dropdown-menu-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
              }}
              onClick={() => {
                setProfileDropdownOpen(false);
                if (onOpenProfileEditor) onOpenProfileEditor();
                else openModal('userProfile');
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Profile
            </div>

            <div
              className="dropdown-menu-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
              }}
              onClick={() => {
                setProfileDropdownOpen(false);
                fileInputRef.current?.click();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21" />
                <path d="m14 19.5 3-3 3 3" />
                <path d="M17 22v-5.5" />
                <circle cx="9" cy="9" r="2" />
              </svg>
              Upload Photo
            </div>

            <div
              className="dropdown-menu-item text-danger"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--danger)',
                fontSize: '13px',
                fontWeight: 600,
              }}
              onClick={handleRemovePhoto}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                <line x1="16" x2="22" y1="5" y2="5" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              Remove Photo
            </div>

            <div
              className="dropdown-menu-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
              }}
              onClick={() => {
                setProfileDropdownOpen(false);
                openModal('password');
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="16" r="1" />
                <rect x="3" y="10" width="18" height="12" rx="2" />
                <path d="M7 10V7a5 5 0 0 1 10 0v3" />
              </svg>
              Change Password
            </div>

            <hr style={{ border: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '12px 0' }} />
            <button
              className="logout-btn"
              onClick={onLogout}
              type="button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                background: 'rgba(231,76,60,0.15)',
                border: '1px solid var(--danger)',
                borderRadius: '8px',
                color: 'var(--danger)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Secure Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
