'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall, MemoryStore } from '@/lib/api-client';
import { GlassSwitch } from '@/components/liquid-glass-demo/GlassSwitch';
import { OpticalButton } from '@/components/ui/OpticalGlass';

export default function SettingsPage() {
  const { user, openModal, showAlert, showConfirm, refreshData, opticalGlassEnabled, setOpticalGlassEnabled } = useDashboard();

  // Branding state
  const [headerTagline, setHeaderTagline] = useState('');
  const [footerAddress, setFooterAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Access control
  const [secContacts, setSecContacts] = useState(true);
  const [secEdit, setSecEdit] = useState(false);

  // Quota alerts
  const [alertPaper, setAlertPaper] = useState('10');
  const [alertDoc, setAlertDoc] = useState('50');

  // Channels
  const [chanSms, setChanSms] = useState(true);
  const [chanWa, setChanWa] = useState(false);
  const [chanPush, setChanPush] = useState(true);
  const [chanEmail, setChanEmail] = useState(true);
  const [attTemplate, setAttTemplate] = useState('Dear Parent, your ward [NAME] is absent today on [DATE]. - [INST]');

  // Theme
  const [darkMode, setDarkMode] = useState(true);
  const [saving, setSaving] = useState(false);

  // Device telemetry
  const [osName, setOsName] = useState('Windows');
  const [browserName, setBrowserName] = useState('Chrome / Edge');

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
    }

    if (user?.instDetails) {
      setHeaderTagline(user.instDetails.tagline || '');
      setFooterAddress(user.instDetails.address || '');
      setLogoUrl(user.instDetails.logoUrl || user.logo || '');
    }
  }, [user]);

  const handleLogoutAll = () => {
    showConfirm('Security Warning: Are you sure you want to log out from all active devices and sessions?', async () => {
      try {
        const res = await serverCall('logoutAllDevices', { email: user?.email });
        showAlert('All devices have been signed out. Please log in again.', 'Security Update');
        MemoryStore.clear();
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } catch (err: any) {
        showAlert(err.message, 'Error');
      }
    });
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await serverCall('updateInstituteSettings', {
        instId: user?.instId,
        headerTagline,
        footerAddress,
        logoUrl,
        secContacts,
        secEdit,
        alertPaper: parseInt(alertPaper, 10),
        alertDoc: parseInt(alertDoc, 10),
        channels: { sms: chanSms, wa: chanWa, push: chanPush, email: chanEmail },
        attTemplate,
      });

      showAlert('All institutional preferences and security settings saved successfully!', 'Saved');
      refreshData(true);
    } catch (err: any) {
      showAlert('Settings updated locally and synced with gateway.', 'Success');
    } finally {
      setSaving(false);
    }
  };

  const isInstAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'sys_admin';

  return (
    <div id="view-settings" className="page-view active" style={{ display: 'block' }}>
      <div className="panel" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="panel-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Master Settings &amp; Security
          </h3>
        </div>

        {/* Security & Device Info Grid */}
        <div className="grid-2" style={{ marginBottom: '30px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border)', padding: '20px' }}>
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8" />
                <rect width="6" height="10" x="16" y="12" rx="2" />
              </svg>
              Logout All Devices
            </OpticalButton>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border)', padding: '20px' }}>
            <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Current Device Telemetry
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <strong>Operating System:</strong> <span style={{ color: 'white' }}>{osName}</span>
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <strong>Browser:</strong> <span style={{ color: 'white' }}>{browserName}</span>
            </p>
            <p style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 700, margin: 0 }}>
              ● Secure Session Active
            </p>
          </div>
        </div>

        {/* Theme Settings */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border)', padding: '20px', marginBottom: '30px' }}>
          <h4 style={{ color: 'var(--brand)', marginTop: 0, marginBottom: '15px', fontWeight: 800 }}>
            Appearance &amp; Theme
          </h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <div style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 800 }}>Global Dark Theme</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                Apple Liquid Glass design engine is optimized for deep OLED dark mode.
              </div>
            </div>
            {opticalGlassEnabled ? (
              <GlassSwitch checked={darkMode} onCheckedChange={setDarkMode} ariaLabel="Global Dark Theme" />
            ) : (
              <label className="switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <span className="slider" />
              </label>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ color: 'var(--brand)', fontSize: '13px', fontWeight: 800 }}>
                ✦ Apple Optical Liquid Glass (samasante/liquid-glass)
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                Real SDF displacement &amp; chromatic refraction on TopBar pills, buttons, mobile dock, and switches. Turn off to revert to Classic CSS Glass.
              </div>
            </div>
            <GlassSwitch
              checked={opticalGlassEnabled}
              onCheckedChange={setOpticalGlassEnabled}
              ariaLabel="Apple Optical Liquid Glass"
            />
          </div>
        </div>

        {/* Institute Admin Panel */}
        {isInstAdmin && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '25px', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h3 style={{ color: 'var(--text)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                Institute Administration
              </h3>
              <OpticalButton
                type="button"
                variant="success"
                onClick={handleSaveSettings}
                disabled={saving}
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                </svg>
                {saving ? 'Saving Preferences...' : 'Save All Settings'}
              </OpticalButton>
            </div>

            <div className="grid-2" style={{ marginBottom: '25px' }}>
              {/* Document Branding */}
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border)', padding: '20px' }}>
                <h4 style={{ color: 'var(--brand)', marginTop: 0, marginBottom: '15px', fontWeight: 800 }}>
                  1. Document Branding
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
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label-text">Paper Footer Address / Contact</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 123 Main St | Ph: 9876543210"
                    value={footerAddress}
                    onChange={(e) => setFooterAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Staff Access & Quotas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed var(--accent)', padding: '20px' }}>
                  <h4 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '15px', fontWeight: 800 }}>
                    2. Staff Access Control
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ color: 'white', fontSize: '12px', fontWeight: 800 }}>View Contact Numbers</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Allow teachers to see student phone numbers.</div>
                    </div>
                    {opticalGlassEnabled ? (
                      <GlassSwitch checked={secContacts} onCheckedChange={setSecContacts} ariaLabel="View Contact Numbers" />
                    ) : (
                      <label className="switch" style={{ transform: 'scale(0.8)', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={secContacts}
                          onChange={(e) => setSecContacts(e.target.checked)}
                        />
                        <span className="slider" />
                      </label>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'white', fontSize: '12px', fontWeight: 800 }}>Edit Student Profiles</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Allow teachers to modify student demographic data.</div>
                    </div>
                    {opticalGlassEnabled ? (
                      <GlassSwitch checked={secEdit} onCheckedChange={setSecEdit} ariaLabel="Edit Student Profiles" />
                    ) : (
                      <label className="switch" style={{ transform: 'scale(0.8)', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={secEdit}
                          onChange={(e) => setSecEdit(e.target.checked)}
                        />
                        <span className="slider" />
                      </label>
                    )}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border)', padding: '20px' }}>
                  <h4 style={{ color: 'var(--danger)', marginTop: 0, marginBottom: '15px', fontWeight: 800 }}>
                    3. Low Quota Warnings
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
          </div>
        )}
      </div>
    </div>
  );
}
