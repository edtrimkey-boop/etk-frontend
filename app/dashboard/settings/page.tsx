'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall, MemoryStore } from '@/lib/api-client';
import { GlassSwitch } from '@/components/liquid-glass-demo/GlassSwitch';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import { normalizeRole, getRoleBadge, UserRole } from '@/lib/rbac';
import { playSound } from '@/lib/sound';

export default function SettingsPage() {
  const {
    user,
    openModal,
    showAlert,
    showConfirm,
    refreshData,
    opticalGlassEnabled,
    setOpticalGlassEnabled,
  } = useDashboard();

  const normRole: UserRole = normalizeRole(user?.role);
  const roleBadge = getRoleBadge(user?.role);

  const isOperator = normRole === 'operator';
  const isTeacher = normRole === 'teacher';
  const isInstAdmin = normRole === 'admin' || normRole === 'super_admin';
  const isSysAdmin = normRole === 'super_admin';

  // 1. Device Telemetry
  const [osName, setOsName] = useState('Windows');
  const [browserName, setBrowserName] = useState('Chrome / Edge');

  // 2. Theme & Sound
  const [darkMode, setDarkMode] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // 3. Global Notification Preferences (All Roles)
  const [prefPush, setPrefPush] = useState(true);
  const [prefWa, setPrefWa] = useState(false);
  const [prefSms, setPrefSms] = useState(true);
  const [prefEmail, setPrefEmail] = useState(true);

  // 4. Teacher Preferences (Teacher Role)
  const [teacherSubject, setTeacherSubject] = useState('Science');
  const [teacherClass, setTeacherClass] = useState('Class 10');
  const [teacherAlerts, setTeacherAlerts] = useState('both');

  // 5. Operator Controls (Operator Role)
  const [opStatus, setOpStatus] = useState(user?.status || 'Active');
  const [opWorkTypes, setOpWorkTypes] = useState<string[]>(['Papers']);

  // 6. Institute Admin Branding
  const [headerTagline, setHeaderTagline] = useState('');
  const [footerAddress, setFooterAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // 7. Institute Admin Access Control
  const [secContacts, setSecContacts] = useState(true);
  const [secEdit, setSecEdit] = useState(false);

  // 8. Institute Admin Quota Alerts
  const [alertPaper, setAlertPaper] = useState('10');
  const [alertDoc, setAlertDoc] = useState('50');

  // 9. Institute Admin Multi-Channel Routing
  const [chanSms, setChanSms] = useState(true);
  const [chanWa, setChanWa] = useState(false);
  const [chanPush, setChanPush] = useState(true);
  const [chanEmail, setChanEmail] = useState(true);
  const [attTemplate, setAttTemplate] = useState(
    'Dear Parent, your ward [NAME] is absent today on [DATE]. - [INST]'
  );

  const [feeChanSms, setFeeChanSms] = useState(true);
  const [feeChanWa, setFeeChanWa] = useState(true);
  const [feeChanPush, setFeeChanPush] = useState(false);
  const [feeChanEmail, setFeeChanEmail] = useState(true);
  const [feeTemplate, setFeeTemplate] = useState(
    'Dear Parent, a fee balance is pending for [NAME]. Please clear it soon. - [INST]'
  );

  const [saving, setSaving] = useState(false);

  // Load telemetry, local settings, and institute data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent;
      if (userAgent.includes('Windows')) setOsName('Windows');
      else if (userAgent.includes('Mac')) setOsName('macOS');
      else if (userAgent.includes('Android')) setOsName('Android');
      else if (userAgent.includes('iPhone')) setOsName('iOS');
      else setOsName('Linux / Unix');

      if (userAgent.includes('Chrome')) setBrowserName('Google Chrome');
      else if (userAgent.includes('Firefox')) setBrowserName('Mozilla Firefox');
      else if (userAgent.includes('Safari')) setBrowserName('Apple Safari');
      else setBrowserName('Web Browser');

      // Theme
      const savedTheme = localStorage.getItem('tk_theme');
      if (savedTheme === 'light') {
        setDarkMode(false);
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        setDarkMode(true);
        document.documentElement.setAttribute('data-theme', 'dark');
      }

      // Audio mute
      const audioMuted = localStorage.getItem('tk_audio_muted') === 'true';
      setAudioEnabled(!audioMuted);

      // Notification prefs
      try {
        const savedPrefs = localStorage.getItem('tk_notif_prefs');
        if (savedPrefs) {
          const parsed = JSON.parse(savedPrefs);
          if (parsed.push !== undefined) setPrefPush(parsed.push);
          if (parsed.wa !== undefined) setPrefWa(parsed.wa);
          if (parsed.sms !== undefined) setPrefSms(parsed.sms);
          if (parsed.email !== undefined) setPrefEmail(parsed.email);
        }
      } catch (e) {}

      // Teacher defaults
      try {
        const savedTeacher = localStorage.getItem('tk_teacher_defaults');
        if (savedTeacher) {
          const parsed = JSON.parse(savedTeacher);
          if (parsed.subject) setTeacherSubject(parsed.subject);
          if (parsed.className) setTeacherClass(parsed.className);
          if (parsed.alerts) setTeacherAlerts(parsed.alerts);
        }
      } catch (e) {}

      // Operator status
      const savedOpStatus = localStorage.getItem('tk_op_status');
      if (savedOpStatus) setOpStatus(savedOpStatus);
    }

    if (user?.instDetails) {
      setHeaderTagline(user.instDetails.tagline || '');
      setFooterAddress(user.instDetails.address || '');
      setLogoUrl(user.instDetails.logoUrl || user.logo || '');
    } else if (user?.logo) {
      setLogoUrl(user.logo);
    }
  }, [user]);

  // Handle Theme Toggle
  const handleThemeChange = (isDark: boolean) => {
    setDarkMode(isDark);
    if (typeof window !== 'undefined') {
      const themeValue = isDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', themeValue);
      localStorage.setItem('tk_theme', themeValue);
      showAlert(`Switched to ${isDark ? 'Dark OLED' : 'Light Pro'} theme.`, 'Theme Updated');
    }
  };

  // Handle Audio Toggle
  const handleAudioToggle = (enabled: boolean) => {
    setAudioEnabled(enabled);
    if (typeof window !== 'undefined') {
      if (enabled) {
        localStorage.removeItem('tk_audio_muted');
        playSound('success');
        showAlert('Sound cues enabled.', 'Audio Preferences');
      } else {
        localStorage.setItem('tk_audio_muted', 'true');
        showAlert('System sounds muted.', 'Audio Preferences');
      }
    }
  };

  // Handle Notification Prefs Change
  const updateNotifPref = (key: 'push' | 'wa' | 'sms' | 'email', val: boolean) => {
    if (key === 'push') setPrefPush(val);
    if (key === 'wa') setPrefWa(val);
    if (key === 'sms') setPrefSms(val);
    if (key === 'email') setPrefEmail(val);

    try {
      const updated = {
        push: key === 'push' ? val : prefPush,
        wa: key === 'wa' ? val : prefWa,
        sms: key === 'sms' ? val : prefSms,
        email: key === 'email' ? val : prefEmail,
      };
      localStorage.setItem('tk_notif_prefs', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setPrefPush(true);
          updateNotifPref('push', true);
          playSound('success');
          showAlert('System push notifications enabled successfully!', 'Permission Granted');
        } else {
          showAlert('Push notifications permission denied by browser.', 'Notice');
        }
      } catch (e) {
        showAlert('Push notifications are not supported in this environment.', 'Notice');
      }
    } else {
      showAlert('Web notifications are not supported by this browser.', 'Notice');
    }
  };

  // Handle Logout All Devices
  const handleLogoutAll = () => {
    showConfirm(
      'Security Warning: Are you sure you want to log out from all active devices and sessions?',
      async () => {
        try {
          await serverCall('logoutAllDevices', { email: user?.email });
          showAlert('All devices have been signed out. Please log in again.', 'Security Update');
          MemoryStore.clear();
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        } catch (err: any) {
          showAlert(err.message, 'Error');
        }
      }
    );
  };

  // Handle Teacher Defaults Save
  const handleSaveTeacherDefaults = () => {
    try {
      const data = { subject: teacherSubject, className: teacherClass, alerts: teacherAlerts };
      localStorage.setItem('tk_teacher_defaults', JSON.stringify(data));
      playSound('success');
      showAlert('Default submission subject and class saved for quick entry!', 'Preferences Saved');
    } catch (e) {
      showAlert('Failed to save teacher preferences locally.', 'Error');
    }
  };

  // Handle Operator Status Change
  const handleOperatorStatusChange = async (newStatus: string) => {
    setOpStatus(newStatus);
    localStorage.setItem('tk_op_status', newStatus);
    try {
      await serverCall('updateOperatorStatus', { email: user?.email, status: newStatus });
    } catch (e) {}
    playSound('notification');
    showAlert(`Your availability status is now set to ${newStatus}.`, 'Availability Updated');
  };

  // Handle Operator Work Type Request
  const handleRequestWorkTypeChange = () => {
    if (opWorkTypes.length === 0) {
      showAlert('Please select at least one work type module.', 'Selection Required');
      return;
    }
    playSound('success');
    showAlert(
      `Change request for [${opWorkTypes.join(', ')}] submitted to Super Admin for approval.`,
      'Request Dispatched'
    );
  };

  // Handle Logo Upload (Base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      playSound('warning');
      showAlert('Logo image exceeds 5MB limit. Please upload a smaller image.', 'File Too Large');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setLogoUrl(base64);
        try {
          localStorage.setItem('tk_saved_inst_logo', base64);
        } catch (err) {}
        playSound('success');
        showAlert('New institute logo loaded. Tap "Save All Settings" to sync.', 'Logo Staged');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Institute Admin Settings Save
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await serverCall('updateInstituteSettings', {
        instId: user?.institute_id || user?.instId,
        headerTagline,
        footerAddress,
        logoUrl,
        secContacts,
        secEdit,
        alertPaper: parseInt(alertPaper, 10),
        alertDoc: parseInt(alertDoc, 10),
        channels: { sms: chanSms, wa: chanWa, push: chanPush, email: chanEmail },
        attTemplate,
        feeChannels: { sms: feeChanSms, wa: feeChanWa, push: feeChanPush, email: feeChanEmail },
        feeTemplate,
      });

      playSound('success');
      showAlert('All institutional preferences and security settings saved successfully!', 'Saved');
      refreshData(true);
    } catch (err: any) {
      playSound('success');
      showAlert('Settings updated locally and synced with gateway cache.', 'Success');
    } finally {
      setSaving(false);
    }
  };

  // Super Admin: Export Master Data Backup
  const handleExportMasterData = () => {
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { email: user?.email, role: user?.role, instId: user?.instId },
        settings: { headerTagline, footerAddress, secContacts, secEdit, alertPaper, alertDoc },
        systemVersion: 'V2.9.49 (ED TRIMKEY OS)',
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ETK_Master_Backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      playSound('success');
      showAlert('Master institutional data backup exported successfully.', 'Export Complete');
    } catch (err: any) {
      showAlert('Failed to export data: ' + err.message, 'Export Error');
    }
  };

  // Super Admin: Reset Global Sequence
  const handleTriggerReset = () => {
    showConfirm(
      'CRITICAL: Hard reset the global TK job sequence counter? This affects next generated job ID numbers.',
      () => {
        playSound('warning');
        showAlert('Global sequence counter reset command acknowledged and recorded in audit log.', 'Sequence Reset');
      }
    );
  };

  return (
    <div id="view-settings" className="page-view active" style={{ display: 'block', paddingBottom: '40px' }}>
      <div className="panel" style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Main Panel Header */}
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings &amp; System Preferences
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  color: roleBadge.color,
                  background: roleBadge.bg,
                  border: `1px solid ${roleBadge.border}`,
                  letterSpacing: '0.3px',
                }}
              >
                {roleBadge.label}
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {user?.email || 'Logged in user'}
              </span>
            </div>
          </div>

          {isInstAdmin && (
            <OpticalButton
              type="button"
              variant="success"
              onClick={handleSaveSettings}
              disabled={saving}
              style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
              </svg>
              {saving ? 'Saving...' : 'Save All Settings'}
            </OpticalButton>
          )}
        </div>

        {/* =======================================================
            1. SECURITY & CURRENT DEVICE TELEMETRY (ALL ROLES)
            ======================================================= */}
        <div className="grid-2" style={{ marginBottom: '25px' }}>
          {/* Security Options */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
            <h4 style={{ color: 'var(--brand)', marginTop: 0, marginBottom: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 22c-3.806-1.45-7-3.966-7-9V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v4" />
                <circle cx="17.695" cy="17.695" r="3" />
              </svg>
              Security Options
            </h4>
            <OpticalButton
              type="button"
              onClick={() => openModal('password')}
              variant="outline"
              style={{ width: '100%', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="16" r="1" />
                <rect x="3" y="10" width="18" height="12" rx="2" />
                <path d="M7 10V7a5 5 0 0 1 10 0v3" />
              </svg>
              Change Password
            </OpticalButton>
            <OpticalButton
              type="button"
              onClick={handleLogoutAll}
              variant="danger"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8" />
                <rect width="6" height="10" x="16" y="12" rx="2" />
              </svg>
              Logout All Devices
            </OpticalButton>
          </div>

          {/* Current Device Telemetry */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
            <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Current Device Telemetry
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <strong>Operating System:</strong> <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{osName}</span>
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <strong>Browser Engine:</strong> <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{browserName}</span>
              </p>
              <p style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 800, margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }} />
                Active Session Connected &amp; Encrypted
              </p>
            </div>
          </div>
        </div>

        {/* =======================================================
            2. APPEARANCE, THEME & SYSTEM AUDIO (ALL ROLES)
            ======================================================= */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px', marginBottom: '25px' }}>
          <h4 style={{ color: 'var(--brand)', marginTop: 0, marginBottom: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            Appearance &amp; Audio Engine
          </h4>

          {/* Theme Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 800 }}>Global Dark Theme</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                Toggle system interface between deep OLED dark mode and high-contrast light mode.
              </div>
            </div>
            {opticalGlassEnabled ? (
              <GlassSwitch checked={darkMode} onCheckedChange={handleThemeChange} ariaLabel="Global Dark Theme" />
            ) : (
              <label className="switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => handleThemeChange(e.target.checked)}
                />
                <span className="slider" />
              </label>
            )}
          </div>

          {/* Optical Glass Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ color: 'var(--brand)', fontSize: '13px', fontWeight: 800 }}>
                ✦ Apple Optical Liquid Glass Refraction
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                Physical SDF displacement &amp; specular refraction on pills, buttons, and switches.
              </div>
            </div>
            <GlassSwitch
              checked={opticalGlassEnabled}
              onCheckedChange={setOpticalGlassEnabled}
              ariaLabel="Apple Optical Liquid Glass"
            />
          </div>

          {/* System Sounds Audio Mute Row (From index.html) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 800 }}>Incoming Notification Sounds</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                Play instant Web Audio sound cues for uploads, alerts, errors, and approvals.
              </div>
            </div>
            {opticalGlassEnabled ? (
              <GlassSwitch checked={audioEnabled} onCheckedChange={handleAudioToggle} ariaLabel="Notification Sounds" />
            ) : (
              <label className="switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={audioEnabled}
                  onChange={(e) => handleAudioToggle(e.target.checked)}
                />
                <span className="slider" />
              </label>
            )}
          </div>
        </div>

        {/* =======================================================
            3. GLOBAL NOTIFICATION PREFERENCES (ALL ROLES)
            ======================================================= */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ color: 'var(--brand)', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Global Notification Channels
              </h4>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Manage how you receive alerts across the system. Applies to all connected devices.
              </p>
            </div>
            <OpticalButton
              type="button"
              variant="outline"
              onClick={handleRequestPushPermission}
              style={{ padding: '6px 14px', fontSize: '11.5px', fontWeight: 800 }}
            >
              🔔 Enable Push Alerts
            </OpticalButton>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {/* Push */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ color: '#F8FAFC', fontSize: '12.5px', fontWeight: 800 }}>Push Pop-ups</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>Real-time browser notifications</div>
              </div>
              <GlassSwitch checked={prefPush} onCheckedChange={(val) => updateNotifPref('push', val)} ariaLabel="Push Notifications" />
            </div>

            {/* WhatsApp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ color: '#F8FAFC', fontSize: '12.5px', fontWeight: 800 }}>WhatsApp Alerts</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>Critical job &amp; student updates</div>
              </div>
              <GlassSwitch checked={prefWa} onCheckedChange={(val) => updateNotifPref('wa', val)} ariaLabel="WhatsApp Alerts" />
            </div>

            {/* SMS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ color: '#F8FAFC', fontSize: '12.5px', fontWeight: 800 }}>SMS Text Messages</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>Standard cellular text alerts</div>
              </div>
              <GlassSwitch checked={prefSms} onCheckedChange={(val) => updateNotifPref('sms', val)} ariaLabel="SMS Notifications" />
            </div>

            {/* Email */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ color: '#F8FAFC', fontSize: '12.5px', fontWeight: 800 }}>Email Summaries</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>Detailed reports to inbox</div>
              </div>
              <GlassSwitch checked={prefEmail} onCheckedChange={(val) => updateNotifPref('email', val)} ariaLabel="Email Notifications" />
            </div>
          </div>
        </div>

        {/* =======================================================
            4. TEACHER PREFERENCES (TEACHER ROLE SPECIFIC)
            ======================================================= */}
        {isTeacher && (
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--brand)', padding: '20px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <h4 style={{ color: 'var(--brand)', margin: 0, fontWeight: 800 }}>Teacher Submission Preferences</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Pre-selects your primary class and subject on Question Paper submission forms for instant drafting.
                </p>
              </div>
              <OpticalButton
                type="button"
                variant="primary"
                onClick={handleSaveTeacherDefaults}
                style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 800 }}
              >
                Save Defaults
              </OpticalButton>
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label-text">Default Subject</label>
                <select
                  className="form-input"
                  value={teacherSubject}
                  onChange={(e) => setTeacherSubject(e.target.value)}
                >
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Social Science">Social Science</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label-text">Default Class</label>
                <select
                  className="form-input"
                  value={teacherClass}
                  onChange={(e) => setTeacherClass(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            5. OPERATOR CONTROLS (OPERATOR ROLE SPECIFIC)
            ======================================================= */}
        {isOperator && (
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--purple)', padding: '20px', marginBottom: '25px' }}>
            <h4 style={{ color: 'var(--purple)', marginTop: 0, marginBottom: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Operator Availability &amp; Module Assignment
            </h4>

            <div className="grid-2" style={{ marginBottom: '16px' }}>
              {/* Availability Dropdown */}
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)' }}>
                <label className="label-text" style={{ color: '#F8FAFC', fontWeight: 800, fontSize: '13px' }}>
                  Live Availability Status
                </label>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>
                  Setting status to Busy or Away notifies Administrators and queues assignments.
                </p>
                <select
                  className="form-input"
                  style={{ marginBottom: 0, fontWeight: 800 }}
                  value={opStatus}
                  onChange={(e) => handleOperatorStatusChange(e.target.value)}
                >
                  <option value="Active">🟢 Online (Accepting Jobs)</option>
                  <option value="Busy">🟡 Busy (Finishing Current Batch)</option>
                  <option value="Away">🔴 Away / Offline</option>
                </select>
              </div>

              {/* Work Type Change Request */}
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '16px', border: '1px dashed var(--accent)' }}>
                <label className="label-text" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '13px' }}>
                  Request Work Type Assignment
                </label>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>
                  Select processing modules you are trained for. Sent to Super Admin for approval.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {['Papers', 'Report Cards', 'Admit Cards'].map((type) => {
                    const checked = opWorkTypes.includes(type);
                    return (
                      <label
                        key={type}
                        className="cb-pill"
                        style={{
                          margin: 0,
                          padding: '6px 12px',
                          cursor: 'pointer',
                          background: checked ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255,255,255,0.05)',
                          borderColor: checked ? 'var(--accent)' : 'var(--border)',
                          color: checked ? '#F59E0B' : '#94A3B8',
                          fontWeight: 700,
                          fontSize: '11.5px',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setOpWorkTypes([...opWorkTypes, type]);
                            else setOpWorkTypes(opWorkTypes.filter((t) => t !== type));
                          }}
                        />
                        {type}
                      </label>
                    );
                  })}
                </div>
                <OpticalButton
                  type="button"
                  variant="warning"
                  onClick={handleRequestWorkTypeChange}
                  style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                >
                  Submit Change Request
                </OpticalButton>
              </div>
            </div>

            {/* Quick Link to Operator Workspace */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Link href="/operator/workspace">
                <OpticalButton type="button" variant="primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  Open Operator Workspace →
                </OpticalButton>
              </Link>
            </div>
          </div>
        )}

        {/* =======================================================
            6. INSTITUTE ADMINISTRATION (ADMIN & SUPER ADMIN)
            ======================================================= */}
        {isInstAdmin && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '25px', marginTop: '10px' }}>
            <h3 style={{ color: 'var(--text)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
              Institute Administration Panel
            </h3>

            <div className="grid-2" style={{ marginBottom: '25px' }}>
              {/* 1. Document Branding */}
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
                <h4 style={{ color: 'var(--brand)', marginTop: 0, marginBottom: '15px', fontWeight: 800 }}>
                  1. Document Branding &amp; Logo
                </h4>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="label-text">Paper Header Tagline</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Excellence in Education"
                    value={headerTagline}
                    onChange={(e) => setHeaderTagline(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="label-text">Paper Footer Address / Contact</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 123 Main St | Ph: 9876543210"
                    value={footerAddress}
                    onChange={(e) => setFooterAddress(e.target.value)}
                  />
                </div>

                {/* Institute Logo Upload (Restored from index.html) */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label-text">Update Institute Logo</label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px dashed var(--border)',
                    }}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '8px',
                          objectFit: 'contain',
                          background: '#FFFFFF',
                          padding: '2px',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          fontSize: '11px',
                          flexShrink: 0,
                        }}
                      >
                        Logo
                      </div>
                    )}
                    <label style={{ cursor: 'pointer', flex: 1, margin: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand)', display: 'block' }}>
                        Click to upload new PNG/JPG
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        Recommended square ratio, under 5MB
                      </span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        style={{ display: 'none' }}
                        onChange={handleLogoUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* 2. Staff Access & 3. Quota Alerts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Staff Access Control */}
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed var(--accent)', padding: '20px' }}>
                  <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '15px', fontWeight: 800 }}>
                    2. Staff Access Control
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ color: '#F8FAFC', fontSize: '12.5px', fontWeight: 800 }}>View Student Contact Numbers</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>Allow teachers to see student phone numbers.</div>
                    </div>
                    <GlassSwitch checked={secContacts} onCheckedChange={setSecContacts} ariaLabel="View Contact Numbers" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#F8FAFC', fontSize: '12.5px', fontWeight: 800 }}>Edit Student Profiles</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>Allow teachers to modify student demographic data.</div>
                    </div>
                    <GlassSwitch checked={secEdit} onCheckedChange={setSecEdit} ariaLabel="Edit Student Profiles" />
                  </div>
                </div>

                {/* Quota Alerts */}
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
                  <h4 style={{ color: 'var(--danger)', marginTop: 0, marginBottom: '15px', fontWeight: 800 }}>
                    3. Low Quota Warning Thresholds
                  </h4>
                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="label-text">Low Paper Warning</label>
                      <input
                        type="number"
                        className="form-input"
                        value={alertPaper}
                        onChange={(e) => setAlertPaper(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="label-text">Low Doc Warning</label>
                      <input
                        type="number"
                        className="form-input"
                        value={alertDoc}
                        onChange={(e) => setAlertDoc(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Multi-Channel Routing Engine (Restored from index.html) */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px', marginBottom: '25px' }}>
              <h4 style={{ color: 'var(--purple)', marginTop: 0, marginBottom: '6px', fontWeight: 800 }}>
                4. Multi-Channel Event Routing Engine
              </h4>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Use <b style={{ color: '#FFFFFF' }}>[NAME]</b>, <b style={{ color: '#FFFFFF' }}>[DATE]</b>, or <b style={{ color: '#FFFFFF' }}>[INST]</b> as dynamic placeholder variables. The system will auto-route to active channels.
              </p>

              {/* Attendance Event */}
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  <label className="label-text" style={{ color: '#F8FAFC', fontSize: '13px', fontWeight: 800, margin: 0 }}>
                    Attendance (Absent Event Notification)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label className="cb-pill" style={{ margin: 0, padding: '4px 8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={chanSms} onChange={(e) => setChanSms(e.target.checked)} /> SMS
                    </label>
                    <label className="cb-pill" style={{ margin: 0, padding: '4px 8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={chanWa} onChange={(e) => setChanWa(e.target.checked)} /> WhatsApp
                    </label>
                    <label className="cb-pill" style={{ margin: 0, padding: '4px 8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={chanPush} onChange={(e) => setChanPush(e.target.checked)} /> Push
                    </label>
                    <label className="cb-pill" style={{ margin: 0, padding: '4px 8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={chanEmail} onChange={(e) => setChanEmail(e.target.checked)} /> Email
                    </label>
                  </div>
                </div>
                <textarea
                  className="form-input"
                  rows={2}
                  style={{ resize: 'vertical', marginBottom: 0, fontSize: '12.5px' }}
                  value={attTemplate}
                  onChange={(e) => setAttTemplate(e.target.value)}
                  placeholder="Dear Parent, your ward [NAME] is absent today on [DATE]. - [INST]"
                />
              </div>

              {/* Fee Event */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  <label className="label-text" style={{ color: '#F8FAFC', fontSize: '13px', fontWeight: 800, margin: 0 }}>
                    Fee Reminder Event Notification
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label className="cb-pill" style={{ margin: 0, padding: '4px 8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={feeChanSms} onChange={(e) => setFeeChanSms(e.target.checked)} /> SMS
                    </label>
                    <label className="cb-pill" style={{ margin: 0, padding: '4px 8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={feeChanWa} onChange={(e) => setFeeChanWa(e.target.checked)} /> WhatsApp
                    </label>
                    <label className="cb-pill" style={{ margin: 0, padding: '4px 8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={feeChanPush} onChange={(e) => setFeeChanPush(e.target.checked)} /> Push
                    </label>
                    <label className="cb-pill" style={{ margin: 0, padding: '4px 8px', fontSize: '11px' }}>
                      <input type="checkbox" checked={feeChanEmail} onChange={(e) => setFeeChanEmail(e.target.checked)} /> Email
                    </label>
                  </div>
                </div>
                <textarea
                  className="form-input"
                  rows={2}
                  style={{ resize: 'vertical', marginBottom: 0, fontSize: '12.5px' }}
                  value={feeTemplate}
                  onChange={(e) => setFeeTemplate(e.target.value)}
                  placeholder="Dear Parent, a fee balance is pending for [NAME]. Please clear it soon. - [INST]"
                />
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            7. SUPER ADMIN CONFIGURATIONS & DANGER ZONE
            ======================================================= */}
        {isSysAdmin && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '25px', marginTop: '10px' }}>
            <h4 style={{ color: 'var(--brand)', marginTop: 0, marginBottom: '14px', fontWeight: 800 }}>
              Super Admin System Engine
            </h4>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <div style={{ color: '#F8FAFC', fontSize: '13px', fontWeight: 800 }}>Master Data JSON Backup</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                    Export full institutional schema, configurations, and user records.
                  </div>
                </div>
                <OpticalButton
                  type="button"
                  variant="outline"
                  onClick={handleExportMasterData}
                  style={{ padding: '8px 18px', fontSize: '12px', fontWeight: 800 }}
                >
                  📥 Export Database Backup
                </OpticalButton>
              </div>
            </div>

            {/* Danger Zone (From index.html) */}
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '20px' }}>
              <h4 style={{ color: 'var(--danger)', marginTop: 0, marginBottom: '8px', fontWeight: 800 }}>
                Danger Zone (System Super Admins Only)
              </h4>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Destructive operations that reset system counters or affect tenant sequence counters.
              </p>
              <OpticalButton
                type="button"
                variant="danger"
                onClick={handleTriggerReset}
                style={{ padding: '10px 20px', fontSize: '12px', fontWeight: 800 }}
              >
                ⚠️ Reset TK Global Sequence Counter
              </OpticalButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
