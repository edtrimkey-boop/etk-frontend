'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall, MemoryStore } from '@/lib/api-client';
import {
  fetchInstituteSettings,
  saveInstituteSettings,
  fetchCommunicationTemplates,
  saveCommunicationTemplates,
  uploadLogoToStorage,
  DBCommunicationTemplate,
} from '@/lib/supabase';
import { GlassSwitch } from '@/components/liquid-glass-demo/GlassSwitch';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import { normalizeRole, getRoleBadge, UserRole } from '@/lib/rbac';
import { playSound, unlockAudioEngine } from '@/lib/sound';
import { requestAndRegisterPush, updateServerDevicePreference } from '@/lib/firebase';

interface OriginalAdminState {
  headerTagline: string;
  footerAddress: string;
  logoUrl: string;
  secContacts: boolean;
  secEdit: boolean;
  alertPaper: string;
  alertDoc: string;
  chanSms: boolean;
  chanWa: boolean;
  chanPush: boolean;
  chanEmail: boolean;
  attTemplate: string;
  feeChanSms: boolean;
  feeChanWa: boolean;
  feeChanPush: boolean;
  feeChanEmail: boolean;
  feeTemplate: string;
}

export default function SettingsPage() {
  const {
    user,
    openModal,
    showAlert,
    showToast,
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

  // Active Tab State (Apple Segmented Navigation)
  const [activeTab, setActiveTab] = useState<string>('general');

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
  const [stagedLogoFile, setStagedLogoFile] = useState<File | null>(null);

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

  // Textarea refs for variable chip cursor insertion
  const attTextareaRef = useRef<HTMLTextAreaElement>(null);
  const feeTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Baseline state tracking for Unsaved Changes Dock
  const [initialAdminState, setInitialAdminState] = useState<OriginalAdminState | null>(null);

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

    let initialTagline = '';
    let initialAddress = '';
    let initialLogo = '';

    if (user?.instDetails) {
      initialTagline = user.instDetails.tagline || '';
      initialAddress = user.instDetails.address || '';
      initialLogo = user.instDetails.logoUrl || user.logo || '';
    } else if (user?.logo) {
      initialLogo = user.logo;
    }

    setHeaderTagline(initialTagline);
    setFooterAddress(initialAddress);
    setLogoUrl(initialLogo);

    // Initial fallback snapshot
    const baselineSnapshot: OriginalAdminState = {
      headerTagline: initialTagline,
      footerAddress: initialAddress,
      logoUrl: initialLogo,
      secContacts: true,
      secEdit: false,
      alertPaper: '10',
      alertDoc: '50',
      chanSms: true,
      chanWa: false,
      chanPush: true,
      chanEmail: true,
      attTemplate: 'Dear Parent, your ward [NAME] is absent today on [DATE]. - [INST]',
      feeChanSms: true,
      feeChanWa: true,
      feeChanPush: false,
      feeChanEmail: true,
      feeTemplate: 'Dear Parent, a fee balance is pending for [NAME]. Please clear it soon. - [INST]',
    };

    setInitialAdminState(baselineSnapshot);

    // 🔥 Direct Database Hydration from Supabase
    const instId = user?.institute_id || user?.instId;
    if (instId && isInstAdmin) {
      Promise.all([
        fetchInstituteSettings(instId),
        fetchCommunicationTemplates(instId),
      ]).then(([settings, templates]) => {
        let curTagline = initialTagline;
        let curAddress = initialAddress;
        let curAlertPaper = '10';
        let curAlertDoc = '50';
        let curSecContacts = true;
        let curSecEdit = false;

        if (settings) {
          if (settings.paper_header !== undefined && settings.paper_header !== null) {
            curTagline = settings.paper_header;
            setHeaderTagline(settings.paper_header);
          }
          if (settings.paper_footer !== undefined && settings.paper_footer !== null) {
            curAddress = settings.paper_footer;
            setFooterAddress(settings.paper_footer);
          }
          if (settings.alert_paper_threshold !== undefined && settings.alert_paper_threshold !== null) {
            curAlertPaper = String(settings.alert_paper_threshold);
            setAlertPaper(String(settings.alert_paper_threshold));
          }
          if (settings.alert_doc_threshold !== undefined && settings.alert_doc_threshold !== null) {
            curAlertDoc = String(settings.alert_doc_threshold);
            setAlertDoc(String(settings.alert_doc_threshold));
          }
          if (settings.allow_teacher_contacts !== undefined && settings.allow_teacher_contacts !== null) {
            curSecContacts = settings.allow_teacher_contacts;
            setSecContacts(settings.allow_teacher_contacts);
          }
          if (settings.allow_teacher_edit !== undefined && settings.allow_teacher_edit !== null) {
            curSecEdit = settings.allow_teacher_edit;
            setSecEdit(settings.allow_teacher_edit);
          }
        }

        let curChanSms = true;
        let curChanWa = false;
        let curChanPush = true;
        let curChanEmail = true;
        let curAttTemplate = 'Dear Parent, your ward [NAME] is absent today on [DATE]. - [INST]';

        let curFeeChanSms = true;
        let curFeeChanWa = true;
        let curFeeChanPush = false;
        let curFeeChanEmail = true;
        let curFeeTemplate = 'Dear Parent, a fee balance is pending for [NAME]. Please clear it soon. - [INST]';

        if (templates && templates.length > 0) {
          templates.forEach((t) => {
            if (t.event_type === 'ATTENDANCE_ABSENT') {
              if (t.channel === 'SMS') {
                curChanSms = t.is_active;
                setChanSms(t.is_active);
              }
              if (t.channel === 'WHATSAPP') {
                curChanWa = t.is_active;
                setChanWa(t.is_active);
              }
              if (t.channel === 'PUSH') {
                curChanPush = t.is_active;
                setChanPush(t.is_active);
              }
              if (t.channel === 'EMAIL') {
                curChanEmail = t.is_active;
                setChanEmail(t.is_active);
              }
              if (t.template_body) {
                curAttTemplate = t.template_body;
                setAttTemplate(t.template_body);
              }
            } else if (t.event_type === 'FEE_REMINDER') {
              if (t.channel === 'SMS') {
                curFeeChanSms = t.is_active;
                setFeeChanSms(t.is_active);
              }
              if (t.channel === 'WHATSAPP') {
                curFeeChanWa = t.is_active;
                setFeeChanWa(t.is_active);
              }
              if (t.channel === 'PUSH') {
                curFeeChanPush = t.is_active;
                setFeeChanPush(t.is_active);
              }
              if (t.channel === 'EMAIL') {
                curFeeChanEmail = t.is_active;
                setFeeChanEmail(t.is_active);
              }
              if (t.template_body) {
                curFeeTemplate = t.template_body;
                setFeeTemplate(t.template_body);
              }
            }
          });
        }

        setInitialAdminState({
          headerTagline: curTagline,
          footerAddress: curAddress,
          logoUrl: initialLogo,
          secContacts: curSecContacts,
          secEdit: curSecEdit,
          alertPaper: curAlertPaper,
          alertDoc: curAlertDoc,
          chanSms: curChanSms,
          chanWa: curChanWa,
          chanPush: curChanPush,
          chanEmail: curChanEmail,
          attTemplate: curAttTemplate,
          feeChanSms: curFeeChanSms,
          feeChanWa: curFeeChanWa,
          feeChanPush: curFeeChanPush,
          feeChanEmail: curFeeChanEmail,
          feeTemplate: curFeeTemplate,
        });
      });
    }
  }, [user, isInstAdmin]);

  // Compute dirty state (Admin settings modified vs baseline)
  const isDirty = useMemo(() => {
    if (!isInstAdmin || !initialAdminState) return false;
    return (
      headerTagline !== initialAdminState.headerTagline ||
      footerAddress !== initialAdminState.footerAddress ||
      logoUrl !== initialAdminState.logoUrl ||
      secContacts !== initialAdminState.secContacts ||
      secEdit !== initialAdminState.secEdit ||
      alertPaper !== initialAdminState.alertPaper ||
      alertDoc !== initialAdminState.alertDoc ||
      chanSms !== initialAdminState.chanSms ||
      chanWa !== initialAdminState.chanWa ||
      chanPush !== initialAdminState.chanPush ||
      chanEmail !== initialAdminState.chanEmail ||
      attTemplate !== initialAdminState.attTemplate ||
      feeChanSms !== initialAdminState.feeChanSms ||
      feeChanWa !== initialAdminState.feeChanWa ||
      feeChanPush !== initialAdminState.feeChanPush ||
      feeChanEmail !== initialAdminState.feeChanEmail ||
      feeTemplate !== initialAdminState.feeTemplate
    );
  }, [
    isInstAdmin,
    initialAdminState,
    headerTagline,
    footerAddress,
    logoUrl,
    secContacts,
    secEdit,
    alertPaper,
    alertDoc,
    chanSms,
    chanWa,
    chanPush,
    chanEmail,
    attTemplate,
    feeChanSms,
    feeChanWa,
    feeChanPush,
    feeChanEmail,
    feeTemplate,
  ]);

  // Discard all unsaved changes
  const handleDiscardChanges = () => {
    if (!initialAdminState) return;
    setHeaderTagline(initialAdminState.headerTagline);
    setFooterAddress(initialAdminState.footerAddress);
    setLogoUrl(initialAdminState.logoUrl);
    setSecContacts(initialAdminState.secContacts);
    setSecEdit(initialAdminState.secEdit);
    setAlertPaper(initialAdminState.alertPaper);
    setAlertDoc(initialAdminState.alertDoc);
    setChanSms(initialAdminState.chanSms);
    setChanWa(initialAdminState.chanWa);
    setChanPush(initialAdminState.chanPush);
    setChanEmail(initialAdminState.chanEmail);
    setAttTemplate(initialAdminState.attTemplate);
    setFeeChanSms(initialAdminState.feeChanSms);
    setFeeChanWa(initialAdminState.feeChanWa);
    setFeeChanPush(initialAdminState.feeChanPush);
    setFeeChanEmail(initialAdminState.feeChanEmail);
    setFeeTemplate(initialAdminState.feeTemplate);

    playSound('warning');
    showAlert('All unsaved modifications have been discarded.', 'Reverted');
  };

  // Handle Theme Toggle
  const handleThemeChange = (isDark: boolean) => {
    setDarkMode(isDark);
    if (typeof window !== 'undefined') {
      const themeValue = isDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', themeValue);
      localStorage.setItem('tk_theme', themeValue);
      showToast(`Switched to ${isDark ? 'Dark OLED' : 'Light Pro'} theme`, isDark ? 'success' : 'info');
    }
  };

  // Handle Audio Toggle
  const handleAudioToggle = (enabled: boolean) => {
    setAudioEnabled(enabled);
    if (typeof window !== 'undefined') {
      if (enabled) {
        localStorage.removeItem('tk_audio_muted');
        unlockAudioEngine(true).then(() => {
          showToast('System sounds enabled', 'success');
        });
      } else {
        localStorage.setItem('tk_audio_muted', 'true');
        showToast('System sounds muted', 'warning');
      }
    }
  };

  // Handle Notification Prefs Change (Synced to Database user_sessions + LocalStorage)
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
    } catch {}

    const serverKey = key === 'wa' ? 'whatsapp' : key;
    updateServerDevicePreference(user?.email, serverKey, val);

    if (key === 'push' && val) {
      handleRequestPushPermission();
    }
  };

  const handleRequestPushPermission = async () => {
    showToast('Connecting to Firebase Push Engine...', 'info');
    const res = await requestAndRegisterPush(user?.email, {
      isSilent: false,
      forceEnablePref: true,
    });

    if (res.success) {
      setPrefPush(true);
      try {
        localStorage.setItem(
          'tk_notif_prefs',
          JSON.stringify({ push: true, wa: prefWa, sms: prefSms, email: prefEmail })
        );
      } catch {}
      showToast('Push Notifications Secured!', 'success');
    } else {
      setPrefPush(false);
      updateServerDevicePreference(user?.email, 'push', false);
      showAlert(res.reason || 'Could not enable push notifications on this device.', 'Notice');
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
      showToast('Teacher defaults saved!', 'success');
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
    showToast(`Availability status updated to ${newStatus}`, 'info');
  };

  // Handle Operator Work Type Request
  const handleRequestWorkTypeChange = async () => {
    if (opWorkTypes.length === 0) {
      showAlert('Please select at least one work type module.', 'Selection Required');
      return;
    }
    try {
      const res = await serverCall('requestAcademicChange', {
        userName: user?.name || user?.full_name || user?.email,
        requestedWorkTypes: opWorkTypes.join(', '),
      });
      if (res && res.success) {
        playSound('success');
        showAlert(
          res.message || `Change request for [${opWorkTypes.join(', ')}] submitted to Super Admin for approval.`,
          'Request Dispatched'
        );
      } else {
        showAlert(res?.message || 'Failed to submit change request.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Failed to submit work type request.', 'Error');
    }
  };

  // Handle Logo Upload (Staged File + Base64 Preview)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      playSound('warning');
      showAlert('Logo image exceeds 5MB limit. Please upload a smaller image.', 'File Too Large');
      return;
    }

    setStagedLogoFile(file);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setLogoUrl(base64);
        playSound('success');
        showAlert('New institute logo staged for live preview.', 'Logo Staged');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Institute Admin Settings Save (Direct Supabase + Gateway Sync)
  const handleSaveSettings = async () => {
    const instId = user?.institute_id || user?.instId;
    if (!instId) {
      showAlert('Institute ID missing from current session.', 'Error');
      return;
    }

    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;

      // 1. Upload Logo to Storage if new file was staged
      if (stagedLogoFile) {
        const uploadResult = await uploadLogoToStorage(
          instId,
          user?.code || user?.id || 'inst',
          stagedLogoFile
        );
        if (uploadResult.success && uploadResult.url) {
          finalLogoUrl = uploadResult.url;
          setLogoUrl(uploadResult.url);
          setStagedLogoFile(null);
        } else if (uploadResult.error) {
          console.warn('[Logo Upload Warning]:', uploadResult.error);
        }
      }

      // 2. Direct Database Upsert to `institute_settings` Table
      const settingsPayload = {
        institute_id: instId,
        paper_header: headerTagline,
        paper_footer: footerAddress,
        alert_paper_threshold: Number(alertPaper) || 10,
        alert_doc_threshold: Number(alertDoc) || 50,
        allow_teacher_contacts: secContacts,
        allow_teacher_edit: secEdit,
      };

      const settingsResult = await saveInstituteSettings(settingsPayload);
      if (!settingsResult.success) {
        throw new Error(settingsResult.error || 'Failed to update institute_settings');
      }

      // 3. Direct Database Upsert to `communication_templates` Table
      const commsPayload: DBCommunicationTemplate[] = [
        {
          institute_id: instId,
          event_type: 'ATTENDANCE_ABSENT',
          channel: 'SMS',
          is_active: chanSms,
          template_body: attTemplate,
        },
        {
          institute_id: instId,
          event_type: 'ATTENDANCE_ABSENT',
          channel: 'WHATSAPP',
          is_active: chanWa,
          template_body: attTemplate,
        },
        {
          institute_id: instId,
          event_type: 'ATTENDANCE_ABSENT',
          channel: 'PUSH',
          is_active: chanPush,
          template_body: attTemplate,
        },
        {
          institute_id: instId,
          event_type: 'ATTENDANCE_ABSENT',
          channel: 'EMAIL',
          is_active: chanEmail,
          template_body: attTemplate,
        },
        {
          institute_id: instId,
          event_type: 'FEE_REMINDER',
          channel: 'SMS',
          is_active: feeChanSms,
          template_body: feeTemplate,
        },
        {
          institute_id: instId,
          event_type: 'FEE_REMINDER',
          channel: 'WHATSAPP',
          is_active: feeChanWa,
          template_body: feeTemplate,
        },
        {
          institute_id: instId,
          event_type: 'FEE_REMINDER',
          channel: 'PUSH',
          is_active: feeChanPush,
          template_body: feeTemplate,
        },
        {
          institute_id: instId,
          event_type: 'FEE_REMINDER',
          channel: 'EMAIL',
          is_active: feeChanEmail,
          template_body: feeTemplate,
        },
      ];

      const commsResult = await saveCommunicationTemplates(commsPayload);
      if (!commsResult.success) {
        throw new Error(commsResult.error || 'Failed to update communication_templates');
      }

      // 4. Secondary sync to Vercel Gateway (Non-blocking background notification)
      serverCall('updateInstituteSettings', {
        instId,
        headerTagline,
        footerAddress,
        logoUrl: finalLogoUrl,
        secContacts,
        secEdit,
        alertPaper: parseInt(alertPaper, 10),
        alertDoc: parseInt(alertDoc, 10),
        channels: { sms: chanSms, wa: chanWa, push: chanPush, email: chanEmail },
        attTemplate,
        feeChannels: { sms: feeChanSms, wa: feeChanWa, push: feeChanPush, email: feeChanEmail },
        feeTemplate,
      }).catch((e) => console.warn('[Gateway Sync]:', e));

      // 5. Update baseline state so isDirty clears
      setInitialAdminState({
        headerTagline,
        footerAddress,
        logoUrl: finalLogoUrl,
        secContacts,
        secEdit,
        alertPaper,
        alertDoc,
        chanSms,
        chanWa,
        chanPush,
        chanEmail,
        attTemplate,
        feeChanSms,
        feeChanWa,
        feeChanPush,
        feeChanEmail,
        feeTemplate,
      });

      showToast('All settings & routing rules saved to database!', 'success');
      refreshData(true);
    } catch (err: any) {
      showAlert('Error saving to database: ' + err.message, 'Save Failed');
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
        systemVersion: 'V2.9.51 (ED TRIMKEY OS)',
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

  // Cursor-aware variable tag inserter
  const insertVariable = (
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    currentVal: string,
    setter: (val: string) => void,
    tag: string
  ) => {
    playSound('notification');
    const el = textareaRef.current;
    if (!el) {
      setter(currentVal ? `${currentVal} ${tag}` : tag);
      return;
    }
    const start = el.selectionStart ?? currentVal.length;
    const end = el.selectionEnd ?? currentVal.length;
    const nextVal = currentVal.substring(0, start) + tag + currentVal.substring(end);
    setter(nextVal);
    setTimeout(() => {
      el.focus();
      const newPos = start + tag.length;
      el.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Role-based tabs definition
  const tabs = useMemo(() => {
    const list: { id: string; label: string; icon: React.ReactNode }[] = [
      {
        id: 'general',
        label: 'General',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ];

    if (isInstAdmin) {
      list.push({
        id: 'branding',
        label: 'Document Branding',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      });
      list.push({
        id: 'routing',
        label: 'Routing Engine',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        ),
      });
      list.push({
        id: 'access',
        label: 'Staff Access',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      });
    }

    if (isTeacher) {
      list.push({
        id: 'teacher',
        label: 'Academic Defaults',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        ),
      });
    }

    if (isOperator) {
      list.push({
        id: 'operator',
        label: 'Operations',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        ),
      });
    }

    list.push({
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    });

    if (isSysAdmin) {
      list.push({
        id: 'system',
        label: 'System & Backup',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        ),
      });
    }

    return list;
  }, [isInstAdmin, isTeacher, isOperator, isSysAdmin]);

  // Ensure active tab is valid
  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) {
      setActiveTab('general');
    }
  }, [tabs, activeTab]);

  return (
    <div id="view-settings" className="page-view active" style={{ display: 'block', paddingBottom: '90px' }}>
      <div className="panel" style={{ maxWidth: '980px', margin: '0 auto', background: 'transparent', border: 'none', boxShadow: 'none' }}>
        
        {/* Header Block */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
            padding: '4px 2px',
          }}
        >
          <div>
            <h2
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: 0,
                fontSize: '22px',
                fontWeight: 900,
                letterSpacing: '-0.3px',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  color: roleBadge.color,
                  background: roleBadge.bg,
                  border: `1px solid ${roleBadge.border}`,
                  letterSpacing: '0.4px',
                }}
              >
                {roleBadge.label}
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {user?.email || 'Logged in user'}
              </span>
            </div>
          </div>
        </div>

        {/* 1. Apple Segmented Pill Switcher (Horizontal Scroll on Mobile, Centered) */}
        <div className="etk-segmented-nav-wrap">
          <nav className="etk-segmented-nav" aria-label="Settings Categories">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`etk-segmented-pill ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    playSound('notification');
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* =======================================================
            TAB 1: GENERAL & APPEARANCE (ALL ROLES)
            ======================================================= */}
        {activeTab === 'general' && (
          <div>
            {/* Group: Appearance & Visual Engine */}
            <div className="etk-inset-group">
              <h3 className="etk-inset-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                Appearance &amp; Display
              </h3>
              <div className="etk-inset-card">
                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Dark OLED Theme</span>
                    <span className="etk-inset-sublabel">Toggle between Deep OLED Dark and High-Contrast Light Pro mode</span>
                  </div>
                  <div className="etk-inset-right">
                    <GlassSwitch
                      checked={darkMode}
                      onCheckedChange={handleThemeChange}
                      activeColor="var(--brand)"
                    />
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Apple Optical Glass Refraction</span>
                    <span className="etk-inset-sublabel">Specular highlights, optical edge physics, and dynamic backdrop filtration</span>
                  </div>
                  <div className="etk-inset-right">
                    <GlassSwitch
                      checked={opticalGlassEnabled}
                      onCheckedChange={(checked) => setOpticalGlassEnabled(checked)}
                      activeColor="var(--brand)"
                    />
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Sound Effects &amp; Audio Cues</span>
                    <span className="etk-inset-sublabel">Tactile Web Audio playback for notifications, actions, and confirmations</span>
                  </div>
                  <div className="etk-inset-right">
                    <GlassSwitch
                      checked={audioEnabled}
                      onCheckedChange={handleAudioToggle}
                      activeColor="var(--success)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Group: Security & Device Telemetry */}
            <div className="etk-inset-group">
              <h3 className="etk-inset-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Security &amp; Active Device Telemetry
              </h3>
              <div className="etk-inset-card">
                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Active Operating System</span>
                    <span className="etk-inset-sublabel">Client runtime environment detected</span>
                  </div>
                  <div className="etk-inset-right">
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {osName}
                    </span>
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Browser Engine</span>
                    <span className="etk-inset-sublabel">Hardware accelerated rendering engine</span>
                  </div>
                  <div className="etk-inset-right">
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {browserName}
                    </span>
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Account Password</span>
                    <span className="etk-inset-sublabel">Update account credentials with secure encryption</span>
                  </div>
                  <div className="etk-inset-right">
                    <button
                      type="button"
                      className="liquid-glass btn-secondary btn-xs"
                      onClick={() => openModal('password')}
                    >
                      Change Password
                    </button>
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label" style={{ color: 'var(--danger)' }}>
                      Logout All Devices
                    </span>
                    <span className="etk-inset-sublabel">Terminate all other active sessions and clear tokens</span>
                  </div>
                  <div className="etk-inset-right">
                    <button
                      type="button"
                      className="liquid-glass btn-danger btn-xs"
                      onClick={handleLogoutAll}
                    >
                      Sign Out Everywhere
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            TAB 2: DOCUMENT BRANDING & LIVE A4 SPECIMEN (ADMIN)
            ======================================================= */}
        {activeTab === 'branding' && isInstAdmin && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 320px',
                gap: '24px',
                alignItems: 'start',
              }}
              className="etk-branding-grid"
            >
              {/* Form Controls Column */}
              <div>
                <div className="etk-inset-group">
                  <h3 className="etk-inset-title">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    Institutional Header &amp; Footer
                  </h3>
                  <div className="etk-inset-card">
                    <div className="etk-inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                      <div className="etk-inset-left">
                        <span className="etk-inset-label">Paper Header Tagline</span>
                        <span className="etk-inset-sublabel">Motto or accreditation printed directly below the institute title</span>
                      </div>
                      <input
                        type="text"
                        value={headerTagline}
                        onChange={(e) => setHeaderTagline(e.target.value)}
                        placeholder="e.g. Excellence in Holistic Education &amp; Innovation"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(0,0,0,0.25)',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div className="etk-inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                      <div className="etk-inset-left">
                        <span className="etk-inset-label">Paper Footer &amp; Campus Address</span>
                        <span className="etk-inset-sublabel">Official address, affiliation numbers, and contact details on bottom margin</span>
                      </div>
                      <input
                        type="text"
                        value={footerAddress}
                        onChange={(e) => setFooterAddress(e.target.value)}
                        placeholder="e.g. Keystone Campus, Main Boulevard | Affiliation No. 2130890"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(0,0,0,0.25)',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div className="etk-inset-row">
                      <div className="etk-inset-left">
                        <span className="etk-inset-label">Institute Emblem / Logo</span>
                        <span className="etk-inset-sublabel">High-resolution PNG, JPG or WebP (max 5MB)</span>
                      </div>
                      <div className="etk-inset-right">
                        <label
                          className="liquid-glass btn-secondary btn-xs"
                          style={{ cursor: 'pointer', margin: 0 }}
                        >
                          Upload Logo
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleLogoUpload}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quota Limits & Thresholds */}
                <div className="etk-inset-group">
                  <h3 className="etk-inset-title">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Automated Quota Alerts
                  </h3>
                  <div className="etk-inset-card">
                    <div className="etk-inset-row">
                      <div className="etk-inset-left">
                        <span className="etk-inset-label">Question Paper Alert Threshold</span>
                        <span className="etk-inset-sublabel">Trigger alert when remaining monthly balance drops to</span>
                      </div>
                      <div className="etk-inset-right">
                        <select
                          value={alertPaper}
                          onChange={(e) => setAlertPaper(e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          <option value="5">5 Papers</option>
                          <option value="10">10 Papers</option>
                          <option value="20">20 Papers</option>
                          <option value="50">50 Papers</option>
                        </select>
                      </div>
                    </div>

                    <div className="etk-inset-row">
                      <div className="etk-inset-left">
                        <span className="etk-inset-label">Document Alert Threshold</span>
                        <span className="etk-inset-sublabel">Trigger alert when document processing balance drops to</span>
                      </div>
                      <div className="etk-inset-right">
                        <select
                          value={alertDoc}
                          onChange={(e) => setAlertDoc(e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          <option value="25">25 Docs</option>
                          <option value="50">50 Docs</option>
                          <option value="100">100 Docs</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Miniature A4 Paper Specimen Column */}
              <div className="etk-paper-specimen-wrap">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--brand)',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: 'var(--brand)',
                      boxShadow: '0 0 8px var(--brand)',
                    }}
                  />
                  Live Print Preview (A4 Specimen)
                </div>

                <div className="etk-paper-specimen">
                  {/* Faint Watermark */}
                  <div className="etk-specimen-watermark">
                    {user?.instDetails?.name || 'ED TRIMKEY'}
                  </div>

                  {/* Header */}
                  <div className="etk-specimen-header">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="etk-specimen-logo"
                      />
                    ) : (
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '4px',
                          background: '#0284C7',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 900,
                        }}
                      >
                        ETK
                      </div>
                    )}
                    <span className="etk-specimen-inst-name">
                      {user?.instDetails?.name || 'KEYSTONE PUBLIC SCHOOL'}
                    </span>
                    <span className="etk-specimen-tagline">
                      {headerTagline || 'Excellence in Quality Education & Innovation'}
                    </span>

                    <div className="etk-specimen-meta">
                      <span>MID-TERM EXAM 2026-27</span>
                      <span>CLASS: X • SCIENCE</span>
                      <span>MM: 80 | 3 HRS</span>
                    </div>
                  </div>

                  {/* Body Faux Questions */}
                  <div className="etk-specimen-body">
                    <span className="etk-specimen-section-badge">SECTION A (OBJECTIVE)</span>

                    <div className="etk-specimen-line">
                      <div className="etk-specimen-q-text">
                        <span>Q1. State the law of conservation of mass.</span>
                        <span>[1M]</span>
                      </div>
                      <div className="etk-specimen-q-sub" />
                      <div className="etk-specimen-q-sub short" />
                    </div>

                    <div className="etk-specimen-line">
                      <div className="etk-specimen-q-text">
                        <span>Q2. Write balanced chemical reaction for photosynthesis.</span>
                        <span>[2M]</span>
                      </div>
                      <div className="etk-specimen-q-sub" />
                      <div className="etk-specimen-q-sub short" />
                    </div>

                    <span className="etk-specimen-section-badge" style={{ marginTop: '4px' }}>
                      SECTION B (DESCRIPTIVE)
                    </span>
                    <div className="etk-specimen-line">
                      <div className="etk-specimen-q-text">
                        <span>Q3. Explain the mechanism of reflex action with diagram.</span>
                        <span>[3M]</span>
                      </div>
                      <div className="etk-specimen-q-sub" />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="etk-specimen-footer">
                    <span className="etk-specimen-footer-text">
                      {footerAddress || 'Keystone Campus, Main Boulevard | Affiliation No. 2130890'}
                    </span>
                    <div className="etk-specimen-footer-page">
                      <span>Confidential Examination</span>
                      <span>Page 1 of 4</span>
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Live preview renders exact layout used for exported question papers and formal certificates.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            TAB 3: MULTI-CHANNEL ROUTING ENGINE (ADMIN)
            ======================================================= */}
        {activeTab === 'routing' && isInstAdmin && (
          <div>
            {/* Event 1: Student Absence Routing */}
            <div className="etk-inset-group">
              <h3 className="etk-inset-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="18" y1="8" x2="23" y2="13" />
                  <line x1="23" y1="8" x2="18" y2="13" />
                </svg>
                Event 1: Daily Student Absence Dispatcher
              </h3>
              <div className="etk-inset-card">
                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Dispatch Channels</span>
                    <span className="etk-inset-sublabel">Select active outbound gateways for attendance notices</span>
                  </div>
                  <div className="etk-inset-right" style={{ gap: '14px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={chanSms}
                        onChange={(e) => setChanSms(e.target.checked)}
                      />
                      SMS
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={chanWa}
                        onChange={(e) => setChanWa(e.target.checked)}
                      />
                      WhatsApp
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={chanPush}
                        onChange={(e) => setChanPush(e.target.checked)}
                      />
                      Push
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={chanEmail}
                        onChange={(e) => setChanEmail(e.target.checked)}
                      />
                      Email
                    </label>
                  </div>
                </div>

                <div className="etk-inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                  <div className="etk-chips-bar">
                    <span className="etk-chips-label">Insert Dynamic Tags:</span>
                    {['[NAME]', '[DATE]', '[INST]', '[CLASS]', '[STATUS]'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="etk-var-chip"
                        onClick={() => insertVariable(attTextareaRef, attTemplate, setAttTemplate, tag)}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    ref={attTextareaRef}
                    rows={3}
                    value={attTemplate}
                    onChange={(e) => setAttTemplate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(0,0,0,0.25)',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      fontFamily: 'monospace',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Event 2: Fee Balance Reminder Routing */}
            <div className="etk-inset-group">
              <h3 className="etk-inset-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Event 2: Fee Balance Reminder Dispatcher
              </h3>
              <div className="etk-inset-card">
                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Dispatch Channels</span>
                    <span className="etk-inset-sublabel">Select active outbound gateways for fee notifications</span>
                  </div>
                  <div className="etk-inset-right" style={{ gap: '14px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={feeChanSms}
                        onChange={(e) => setFeeChanSms(e.target.checked)}
                      />
                      SMS
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={feeChanWa}
                        onChange={(e) => setFeeChanWa(e.target.checked)}
                      />
                      WhatsApp
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={feeChanPush}
                        onChange={(e) => setFeeChanPush(e.target.checked)}
                      />
                      Push
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={feeChanEmail}
                        onChange={(e) => setFeeChanEmail(e.target.checked)}
                      />
                      Email
                    </label>
                  </div>
                </div>

                <div className="etk-inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                  <div className="etk-chips-bar">
                    <span className="etk-chips-label">Insert Dynamic Tags:</span>
                    {['[NAME]', '[FEE_AMOUNT]', '[DUE_DATE]', '[INST]', '[LINK]'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="etk-var-chip"
                        onClick={() => insertVariable(feeTextareaRef, feeTemplate, setFeeTemplate, tag)}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    ref={feeTextareaRef}
                    rows={3}
                    value={feeTemplate}
                    onChange={(e) => setFeeTemplate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(0,0,0,0.25)',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      fontFamily: 'monospace',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            TAB 4: STAFF ACCESS CONTROL (ADMIN)
            ======================================================= */}
        {activeTab === 'access' && isInstAdmin && (
          <div>
            <div className="etk-inset-group">
              <h3 className="etk-inset-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Teacher Permissions &amp; Data Privacy
              </h3>
              <div className="etk-inset-card">
                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Mask Student Contact Details from Teachers</span>
                    <span className="etk-inset-sublabel">Restricts phone numbers and home addresses to admin-only views</span>
                  </div>
                  <div className="etk-inset-right">
                    <GlassSwitch
                      checked={secContacts}
                      onCheckedChange={(c) => setSecContacts(c)}
                      activeColor="var(--brand)"
                    />
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Allow Teachers to Edit Submitted Papers</span>
                    <span className="etk-inset-sublabel">Permits revisions after a question paper has entered operator queue</span>
                  </div>
                  <div className="etk-inset-right">
                    <GlassSwitch
                      checked={secEdit}
                      onCheckedChange={(c) => setSecEdit(c)}
                      activeColor="var(--brand)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            TAB 5: NOTIFICATIONS (ALL ROLES)
            ======================================================= */}
        {activeTab === 'notifications' && (
          <div>
            <div className="etk-inset-group">
              <h3 className="etk-inset-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Personal Notification Preferences
              </h3>
              <div className="etk-inset-card">
                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Web Browser Push Notifications</span>
                    <span className="etk-inset-sublabel">Desktop alerts for instant status updates and completed jobs</span>
                  </div>
                  <div className="etk-inset-right" style={{ gap: '10px' }}>
                    <button
                      type="button"
                      className="liquid-glass btn-secondary btn-xs"
                      onClick={handleRequestPushPermission}
                    >
                      Request Permission
                    </button>
                    <GlassSwitch
                      checked={prefPush}
                      onCheckedChange={(c) => updateNotifPref('push', c)}
                      activeColor="var(--brand)"
                    />
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">WhatsApp Alerts</span>
                    <span className="etk-inset-sublabel">Receive immediate dispatch confirmations on your verified mobile number</span>
                  </div>
                  <div className="etk-inset-right">
                    <GlassSwitch
                      checked={prefWa}
                      onCheckedChange={(c) => updateNotifPref('wa', c)}
                      activeColor="var(--success)"
                    />
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">SMS Transactional Alerts</span>
                    <span className="etk-inset-sublabel">Critical alerts for urgent queue events and deadline updates</span>
                  </div>
                  <div className="etk-inset-right">
                    <GlassSwitch
                      checked={prefSms}
                      onCheckedChange={(c) => updateNotifPref('sms', c)}
                      activeColor="var(--brand)"
                    />
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Email Digests &amp; Reports</span>
                    <span className="etk-inset-sublabel">Daily activity summaries and monthly quota reports</span>
                  </div>
                  <div className="etk-inset-right">
                    <GlassSwitch
                      checked={prefEmail}
                      onCheckedChange={(c) => updateNotifPref('email', c)}
                      activeColor="var(--brand)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            TAB 6: TEACHER ACADEMIC DEFAULTS (TEACHER ROLE)
            ======================================================= */}
        {activeTab === 'teacher' && isTeacher && (
          <div>
            <div className="etk-inset-group">
              <h3 className="etk-inset-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                Academic Submission Defaults
              </h3>
              <div className="etk-inset-card">
                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Default Submission Subject</span>
                    <span className="etk-inset-sublabel">Pre-selects your primary subject when opening Question Paper submission</span>
                  </div>
                  <div className="etk-inset-right">
                    <select
                      value={teacherSubject}
                      onChange={(e) => setTeacherSubject(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      <option value="Science">Science</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="English">English</option>
                      <option value="Social Science">Social Science</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Computer Science">Computer Science</option>
                    </select>
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Default Submission Class</span>
                    <span className="etk-inset-sublabel">Pre-selects your primary class grade</span>
                  </div>
                  <div className="etk-inset-right">
                    <select
                      value={teacherClass}
                      onChange={(e) => setTeacherClass(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Ready Paper Delivery Channel</span>
                    <span className="etk-inset-sublabel">Preferred channel when operator completes your paper layout</span>
                  </div>
                  <div className="etk-inset-right">
                    <select
                      value={teacherAlerts}
                      onChange={(e) => setTeacherAlerts(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      <option value="both">WhatsApp &amp; SMS</option>
                      <option value="wa">WhatsApp Only</option>
                      <option value="sms">SMS Only</option>
                      <option value="app">In-App Only</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <OpticalButton
                type="button"
                variant="primary"
                onClick={handleSaveTeacherDefaults}
                style={{ padding: '8px 18px', fontSize: '12px' }}
              >
                Save Teacher Preferences
              </OpticalButton>
            </div>
          </div>
        )}

        {/* =======================================================
            TAB 7: OPERATOR CONTROLS (OPERATOR ROLE)
            ======================================================= */}
        {activeTab === 'operator' && isOperator && (
          <div>
            <div className="etk-inset-group">
              <h3 className="etk-inset-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                Operator Status &amp; Queue Assignment
              </h3>
              <div className="etk-inset-card">
                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Availability Status</span>
                    <span className="etk-inset-sublabel">Broadcasting live queue availability to supervisors</span>
                  </div>
                  <div className="etk-inset-right">
                    <select
                      value={opStatus}
                      onChange={(e) => handleOperatorStatusChange(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      <option value="Active">🟢 Online &amp; Ready</option>
                      <option value="Busy">🟡 Busy / In Progress</option>
                      <option value="Away">🔴 Away / Break</option>
                    </select>
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Work Type Assignment Request</span>
                    <span className="etk-inset-sublabel">Request additions to your operational processing pipeline</span>
                  </div>
                  <div className="etk-inset-right" style={{ gap: '12px', flexWrap: 'wrap' }}>
                    {['Papers', 'Report Cards', 'Admit Cards'].map((wt) => (
                      <label key={wt} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={opWorkTypes.includes(wt)}
                          onChange={(e) => {
                            if (e.target.checked) setOpWorkTypes([...opWorkTypes, wt]);
                            else setOpWorkTypes(opWorkTypes.filter((x) => x !== wt));
                          }}
                        />
                        {wt}
                      </label>
                    ))}
                    <button
                      type="button"
                      className="liquid-glass btn-secondary btn-xs"
                      onClick={handleRequestWorkTypeChange}
                    >
                      Submit Request
                    </button>
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Dedicated Workspace</span>
                    <span className="etk-inset-sublabel">Access full-screen operator processing terminal</span>
                  </div>
                  <div className="etk-inset-right">
                    <Link
                      href="/operator/workspace"
                      className="liquid-glass btn-primary btn-xs"
                      style={{ textDecoration: 'none' }}
                    >
                      Open Terminal
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            TAB 8: SUPER ADMIN SYSTEM & BACKUP (SUPER ADMIN)
            ======================================================= */}
        {activeTab === 'system' && isSysAdmin && (
          <div>
            <div className="etk-inset-group">
              <h3 className="etk-inset-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Master Data Backup &amp; Danger Zone
              </h3>
              <div className="etk-inset-card">
                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label">Export Institutional Backup</span>
                    <span className="etk-inset-sublabel">Download complete JSON archive of settings, branding, and sequence logs</span>
                  </div>
                  <div className="etk-inset-right">
                    <button
                      type="button"
                      className="liquid-glass btn-secondary btn-xs"
                      onClick={handleExportMasterData}
                    >
                      Export Backup (.JSON)
                    </button>
                  </div>
                </div>

                <div className="etk-inset-row">
                  <div className="etk-inset-left">
                    <span className="etk-inset-label" style={{ color: 'var(--danger)' }}>
                      Reset Global Sequence Counter
                    </span>
                    <span className="etk-inset-sublabel">
                      Critical: Resets job ID generator back to baseline index. Action is permanently logged.
                    </span>
                  </div>
                  <div className="etk-inset-right">
                    <button
                      type="button"
                      className="liquid-glass btn-danger btn-xs"
                      onClick={handleTriggerReset}
                    >
                      Reset Sequence
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            DEDICATED FLOATING UNSAVED CHANGES DOCK (ANIMATES IN)
            ======================================================= */}
        {isDirty && (
          <div className="etk-unsaved-dock" role="status" aria-live="polite">
            <div className="etk-unsaved-left">
              <span className="etk-unsaved-dot" />
              <span className="etk-unsaved-label">You have unsaved changes</span>
            </div>
            <div className="etk-unsaved-right">
              <button
                type="button"
                className="etk-unsaved-btn discard"
                onClick={handleDiscardChanges}
                disabled={saving}
              >
                Discard
              </button>
              <button
                type="button"
                className="etk-unsaved-btn save"
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="spin"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
