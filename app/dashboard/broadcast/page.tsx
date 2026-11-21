'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/pricing';

interface QuickTemplate {
  id: string;
  category: string;
  priority: 'normal' | 'high' | 'urgent';
  label: string;
  icon: string;
  title: string;
  message: string;
}

const TEMPLATES: QuickTemplate[] = [
  {
    id: 'fee_due',
    category: 'Fee',
    priority: 'high',
    label: 'Fee Due Notice',
    icon: '💰',
    title: 'Academic Fee Installment Due Notice',
    message:
      'Dear Parents, this is a gentle reminder that the academic fee installment for the current term is due. Kindly clear before the 10th of this month via the Ed-Trim Key Fee Portal to ensure uninterrupted student services.',
  },
  {
    id: 'exam_admit',
    category: 'Examination',
    priority: 'urgent',
    label: 'Exam Schedule & Admit Card',
    icon: '📝',
    title: 'Term Examination Schedule & Admit Cards Released',
    message:
      'Dear Students & Parents, the final Examination Date Sheet and digitally signed Admit Cards / Hall Tickets have been released. Please download and print your verified Admit Card from the student portal.',
  },
  {
    id: 'weather_holiday',
    category: 'Holiday',
    priority: 'urgent',
    label: 'Weather / Sudden Holiday',
    icon: '🌧️',
    title: 'Urgent Notice: Unscheduled School Closure',
    message:
      'Urgent Notice: As per district administration directives regarding severe weather conditions, the school campus will remain closed tomorrow. Online revision and doubt-clearing sessions will continue on schedule.',
  },
  {
    id: 'ptm_meeting',
    category: 'PTM & Events',
    priority: 'normal',
    label: 'Parent-Teacher Meeting (PTM)',
    icon: '👨‍👩‍👧',
    title: 'Invitation: Comprehensive Parent-Teacher Meeting (PTM)',
    message:
      'Dear Parents, our upcoming Parent-Teacher Meeting (PTM) to review term academic progress and holistic evaluation is scheduled for Saturday, 09:30 AM to 01:00 PM. Your presence is cordially requested.',
  },
  {
    id: 'transport_alert',
    category: 'Transport',
    priority: 'high',
    label: 'Bus Route / Delay Notice',
    icon: '🚌',
    title: 'School Transport & Bus Route Operational Update',
    message:
      'Notice to Parents: Due to city traffic diversions and road maintenance, school bus routes may experience a brief delay of 15-20 minutes today. All students are in transit safely under institutional care.',
  },
  {
    id: 'academic_circular',
    category: 'Academic',
    priority: 'normal',
    label: 'Official Academic Circular',
    icon: '📜',
    title: 'Important Academic Guidelines & Schedule Update',
    message:
      'Circular to All Students & Staff: Please review the updated academic guidelines, upcoming project deadlines, and uniform requirements. Strict adherence to school hours is required.',
  },
];

const STANDARD_CLASSES = [
  'Pre-Nursery',
  'Nursery',
  'LKG',
  'UKG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
];

export default function BroadcastPage() {
  const { user, payload, showAlert, refreshData, playNotificationSound } = useDashboard();

  // Core Form State
  const [target, setTarget] = useState<string>('inst_students');
  const [selectedClass, setSelectedClass] = useState<string>('Class 10');
  const [channels, setChannels] = useState<string[]>(['in_app', 'push']);
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [category, setCategory] = useState<string>('Academic');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Search & Filter State for Ledger Outbox
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAudience, setFilterAudience] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [displayLimit, setDisplayLimit] = useState<number>(30);

  // Live Database Notifications State
  const [liveDbNotifs, setLiveDbNotifs] = useState<any[]>([]);

  const isSysAdmin = user?.role === 'super_admin' || user?.role === 'sys_admin';

  // 1. Extract Students Directory & Class Aggregates
  const studentsList: any[] = useMemo(() => {
    return payload?.data?.instStudents || payload?.instStudents || [];
  }, [payload]);

  const teachersList: any[] = useMemo(() => {
    return payload?.data?.instTeachers || payload?.instTeachers || [];
  }, [payload]);

  // Dynamic Class Counts from directory
  const { studentCountByClass, allClasses } = useMemo(() => {
    const map: Record<string, number> = {};
    const foundClasses = new Set<string>();

    studentsList.forEach((s) => {
      const c = s.class_name || s.class;
      if (c) {
        const cTrimmed = String(c).trim();
        map[cTrimmed] = (map[cTrimmed] || 0) + 1;
        foundClasses.add(cTrimmed);
      }
    });

    // Merge standard school classes with any custom classes in the institute
    const merged = Array.from(new Set([...STANDARD_CLASSES, ...Array.from(foundClasses)])).sort((a, b) => {
      const idxA = STANDARD_CLASSES.indexOf(a);
      const idxB = STANDARD_CLASSES.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });

    return { studentCountByClass: map, allClasses: merged };
  }, [studentsList]);

  // Set default class if current not in list
  useEffect(() => {
    if (allClasses.length > 0 && !allClasses.includes(selectedClass)) {
      setSelectedClass(allClasses[0]);
    }
  }, [allClasses, selectedClass]);

  // Toggle delivery channel
  const toggleChannel = (ch: string) => {
    setChannels((prev) => {
      if (prev.includes(ch)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((c) => c !== ch);
      }
      return [...prev, ch];
    });
  };

  // 2. Fetch Live Supabase Notifications
  const loadSupabaseNotifications = useCallback(async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/notifications?select=*&order=created_at.desc&limit=50`,
        {
          method: 'GET',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLiveDbNotifs(data);
        }
      }
    } catch (e) {
      console.warn('[Broadcast] Live notifications fetch note:', e);
    }
  }, []);

  useEffect(() => {
    loadSupabaseNotifications();
  }, [loadSupabaseNotifications]);

  // Combine and deduplicate payload notifications and Supabase notifications
  const allNotifications = useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    // 1. Live Supabase Rows
    liveDbNotifs.forEach((n, idx) => {
      const idKey = n.id || n.reference_id || `DB-${idx}`;
      if (!seenIds.has(idKey)) {
        seenIds.add(idKey);
        let targetText = 'Global';
        if (n.target_roles && n.target_roles.length > 0) {
          targetText = n.target_roles.join(', ');
        }
        list.push({
          id: idKey,
          title: n.title || 'Institutional Notice',
          message: n.message || '',
          time: n.created_at,
          target: targetText,
          priority: n.priority || 'normal',
          channels: ['in_app', 'push'],
          status: n.status === 'sent' ? 'Delivered' : (n.status || 'Delivered'),
          source: 'Supabase',
        });
      }
    });

    // 2. Context Payload Notifications
    const rawNotifs = payload?.notifications || [];
    rawNotifs.forEach((n: any, idx: number) => {
      const idKey = n.id || `PAYLOAD-${idx}-${n.title}`;
      if (!seenIds.has(idKey)) {
        seenIds.add(idKey);
        list.push({
          id: idKey,
          title: n.title || 'Broadcast Alert',
          message: n.msg || n.message || '',
          time: n.time || new Date().toISOString(),
          target: n.targetAudience || n.targetRaw || 'My Institute Students',
          priority: n.priority || 'normal',
          channels: n.channels || ['in_app', 'push'],
          status: 'Delivered',
          source: 'System',
        });
      }
    });

    return list;
  }, [liveDbNotifs, payload]);

  // Filtered Notifications for Outbox Table
  const filteredNotifications = useMemo(() => {
    let result = [...allNotifications];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.message && n.message.toLowerCase().includes(q)) ||
          (n.target && n.target.toLowerCase().includes(q)) ||
          (n.id && n.id.toLowerCase().includes(q))
      );
    }

    if (filterAudience !== 'all') {
      result = result.filter((n) => String(n.target).toLowerCase().includes(filterAudience.toLowerCase()));
    }

    if (filterPriority !== 'all') {
      result = result.filter((n) => String(n.priority).toLowerCase() === filterPriority.toLowerCase());
    }

    return result;
  }, [allNotifications, searchQuery, filterAudience, filterPriority]);

  const visibleNotifications = useMemo(() => {
    return filteredNotifications.slice(0, displayLimit);
  }, [filteredNotifications, displayLimit]);

  const hasMoreNotifs = displayLimit < filteredNotifications.length;

  useEffect(() => {
    setDisplayLimit(30);
  }, [searchQuery, filterAudience, filterPriority]);

  // Estimate audience reach
  const estimatedReach = useMemo(() => {
    if (target === 'inst_specific_class') {
      return studentCountByClass[selectedClass] || 0;
    }
    if (target === 'inst_students') {
      return studentsList.length || 142;
    }
    if (target === 'inst_teachers') {
      return teachersList.length || 18;
    }
    if (target === 'inst_staff') {
      return 12;
    }
    if (target === 'inst_emergency') {
      return (studentsList.length || 142) + (teachersList.length || 18) + 12;
    }
    if (isSysAdmin) {
      if (target === 'all_operators') return 48;
      if (target === 'all_teachers') return 240;
      if (target === 'all_admins') return 64;
      if (target === 'global') return 1200;
    }
    return studentsList.length || 100;
  }, [target, selectedClass, studentCountByClass, studentsList, teachersList, isSysAdmin]);

  // SMS Credit Estimation: 1 SMS credit per 160 characters per recipient
  const smsUnitsPerRecipient = Math.max(1, Math.ceil((message.length || 1) / 160));
  const estimatedSmsCost = channels.includes('sms') ? estimatedReach * smsUnitsPerRecipient : 0;
  const smsRemaining = user?.instDetails?.smsRemaining ?? payload?.data?.instDetails?.smsRemaining ?? 5000;

  // Apply Quick Template
  const applyTemplate = (tpl: QuickTemplate) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setCategory(tpl.category);
    setPriority(tpl.priority);
  };

  // Launch Broadcast Dispatch Handler
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showAlert('Please provide both a subject title and message content for the broadcast.', 'Validation Error');
      return;
    }

    if (channels.includes('sms') && estimatedSmsCost > smsRemaining) {
      showAlert(
        `Insufficient SMS balance! Estimated cost is ${estimatedSmsCost} credits, but your balance is ${smsRemaining}. Please top up your SMS credits in Billing or disable the SMS channel.`,
        'SMS Limit Exceeded'
      );
      return;
    }

    setLoading(true);
    const finalTarget = target === 'inst_specific_class' ? `inst_class:${selectedClass}` : target;
    const readableAudience =
      target === 'inst_specific_class'
        ? `${selectedClass} (${estimatedReach} Students)`
        : target === 'inst_students'
        ? `All Students (${estimatedReach})`
        : target === 'inst_teachers'
        ? 'All Faculty'
        : target === 'inst_emergency'
        ? 'Entire School Community'
        : target;

    try {
      // 1. Direct insertion to Supabase notifications table for instant live sync
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            sender_id: user?.id || null,
            institute_id: user?.instId || null,
            title,
            message,
            type:
              category === 'Examination'
                ? 'exam_broadcast'
                : category === 'Fee'
                ? 'fee_broadcast'
                : 'system_broadcast',
            status: 'sent',
            reference_id: `BC-${Date.now().toString().slice(-6)}`,
            target_roles:
              target === 'inst_teachers'
                ? ['teacher']
                : target === 'inst_students' || target === 'inst_specific_class'
                ? ['student', 'parent']
                : ['all'],
            target_users: [],
          }),
        });
      } catch (dbErr) {
        console.warn('[Broadcast] Direct database sync notice:', dbErr);
      }

      // 2. Gateway API call to trigger Push Notifications, FCM, and server dispatch
      const res = await serverCall('sendNotification', {
        senderEmail: user?.email,
        senderName: user?.name || user?.full_name || 'Institute Administrator',
        targetRaw: finalTarget,
        targetAudience: finalTarget,
        targetClass: target === 'inst_specific_class' ? selectedClass : undefined,
        title,
        msg: message,
        message,
        instituteId: user?.instId || user?.code,
        channels,
        priority,
        category,
        estimatedReach,
      });

      if (res && res.success !== false) {
        playNotificationSound('success');
        showAlert(
          `Broadcast successfully dispatched to ${readableAudience} via ${channels.length} delivery channels!`,
          'Broadcast Launched'
        );
        setTitle('');
        setMessage('');
        await loadSupabaseNotifications();
        refreshData(true);
      } else {
        showAlert(res?.message || 'Failed to dispatch notification broadcast.', 'Dispatch Notice');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error communicating with broadcast engine.', 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="view-notifications" className="page-view active" style={{ display: 'block' }}>
      {/* ── 1. Header Banner & Quota Pill ──────────────────────────────── */}
      <div className="panel" style={{ borderLeft: '4px solid var(--brand)', marginBottom: '24px' }}>
        <div
          className="panel-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(38, 195, 234, 0.12)',
                border: '1px solid rgba(38, 195, 234, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
                <path d="M12 2v2" />
                <path d="M18.36 4.64l-1.42 1.42" />
                <path d="M5.64 4.64l1.42 1.42" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'white' }}>
                Broadcast &amp; Communications Command Center
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Multi-channel institutional dispatch suite: In-App, Push Notifications, SMS Gateway &amp; Digital Notice Board
              </p>
            </div>
          </div>

          {/* SMS Quota Balance Pill */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '6px 12px',
                borderRadius: '999px',
                background: 'rgba(139, 92, 246, 0.15)',
                color: 'var(--purple)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--purple)' }} />
              SMS Quota: <b style={{ color: 'white' }}>{smsRemaining.toLocaleString('en-IN')}</b> Credits
            </span>
            <Link
              href="/dashboard/billing"
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '6px 12px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                textDecoration: 'none',
              }}
            >
              + Top Up
            </Link>
          </div>
        </div>

        {/* ── 2. Telemetry KPI Grid ────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '16px',
            marginTop: '20px',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                fontWeight: 800,
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Total Dispatched
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--brand)', margin: 0 }}>
              {allNotifications.length} Broadcasts
            </h2>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                fontWeight: 800,
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Delivery Channels
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#00F5A0', margin: 0 }}>
              4 Active Rails
            </h2>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                fontWeight: 800,
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Directory Reach
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'white', margin: 0 }}>
              {(studentsList.length || 142) + (teachersList.length || 18)} Contacts
            </h2>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                fontWeight: 800,
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Instant Delivery
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--purple)', margin: 0 }}>
              &lt;100ms FCM Push
            </h2>
          </div>
        </div>
      </div>

      {/* ── 3. Two-Column Dispatch Studio & Live Preview ──────────────── */}
      <div className="grid-2" style={{ marginBottom: '30px' }}>
        {/* Left Column: Composer Form */}
        <div className="panel" style={{ margin: 0, borderTop: '4px solid var(--brand)' }}>
          <div className="panel-header" style={{ marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>Compose New Institutional Announcement</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              Configure target audience, multi-channel delivery rails, and priority level.
            </p>
          </div>

          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Target Audience Dropdown */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="label-text" style={{ fontSize: '11px', fontWeight: 800, margin: 0 }}>
                  Target Audience
                </label>
                <span style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 700 }}>
                  Estimated Audience: ~{estimatedReach} recipients
                </span>
              </div>

              <select
                id="broadcastTarget"
                className="form-input"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'var(--card-light)',
                  color: 'white',
                  border: '1px solid var(--border)',
                  marginBottom: 0,
                }}
              >
                {isSysAdmin ? (
                  <>
                    <option value="all_operators">All Production Operators</option>
                    <option value="all_teachers">All System Teachers (Global)</option>
                    <option value="all_admins">All Institute Administrators</option>
                    <option value="global">Entire System Community (Global)</option>
                  </>
                ) : (
                  <>
                    <option value="inst_students">👨‍🎓 All Institute Students &amp; Parents ({studentsList.length || 142} total)</option>
                    <option value="inst_specific_class">🎯 Specific Class / Grade (Select Grade Below)</option>
                    <option value="inst_teachers">👩‍🏫 All Faculty &amp; Teaching Staff ({teachersList.length || 18} teachers)</option>
                    <option value="inst_staff">🏢 Administrative &amp; Support Staff Only</option>
                    <option value="inst_emergency">🚨 Emergency Broadcast (All Students, Parents &amp; Faculty)</option>
                  </>
                )}
              </select>
            </div>

            {/* 🎯 SPECIFIC CLASS SELECTOR (Shown only when Specific Class is picked) */}
            {target === 'inst_specific_class' && (
              <div
                style={{
                  background: 'rgba(38, 195, 234, 0.08)',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(38, 195, 234, 0.35)',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label
                    className="label-text"
                    style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 800, margin: 0 }}
                  >
                    Select Target Class / Grade
                  </label>
                  <span style={{ fontSize: '11px', color: '#00F5A0', fontWeight: 800 }}>
                    {studentCountByClass[selectedClass] !== undefined
                      ? `${studentCountByClass[selectedClass]} Students Enrolled`
                      : 'Class Selected'}
                  </span>
                </div>

                <select
                  id="targetClassPicker"
                  className="form-input"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--card)',
                    color: 'white',
                    border: '1px solid var(--brand)',
                    marginBottom: '10px',
                    fontWeight: 700,
                  }}
                >
                  {allClasses.map((cls) => {
                    const count = studentCountByClass[cls];
                    return (
                      <option key={cls} value={cls}>
                        {cls} {count !== undefined ? `(${count} Students Enrolled)` : ''}
                      </option>
                    );
                  })}
                </select>

                {/* Popular Class Quick Selection Chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['Class 10', 'Class 9', 'Class 8', 'Class 5', 'Class 12'].map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 800,
                        background: selectedClass === cls ? 'var(--brand)' : 'rgba(255,255,255,0.06)',
                        color: selectedClass === cls ? '#000' : 'var(--text-muted)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-Channel Delivery Selector */}
            <div>
              <label className="label-text" style={{ fontSize: '11px', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
                Delivery Channels (Multi-Channel Dispatch)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {/* In-App */}
                <button
                  type="button"
                  onClick={() => toggleChannel('in_app')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: channels.includes('in_app') ? 'rgba(38, 195, 234, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${channels.includes('in_app') ? 'var(--brand)' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: channels.includes('in_app') ? 'var(--brand)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '11px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>📱</span>
                  <div>
                    <div>In-App Bell</div>
                    <div style={{ fontSize: '9px', opacity: 0.8 }}>Included (Free)</div>
                  </div>
                </button>

                {/* Web Push */}
                <button
                  type="button"
                  onClick={() => toggleChannel('push')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: channels.includes('push') ? 'rgba(0, 245, 160, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${channels.includes('push') ? '#00F5A0' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: channels.includes('push') ? '#00F5A0' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '11px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>🔔</span>
                  <div>
                    <div>Browser Push</div>
                    <div style={{ fontSize: '9px', opacity: 0.8 }}>FCM Mobile/PC</div>
                  </div>
                </button>

                {/* SMS Gateway */}
                <button
                  type="button"
                  onClick={() => toggleChannel('sms')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: channels.includes('sms') ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${channels.includes('sms') ? 'var(--purple)' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: channels.includes('sms') ? 'var(--purple)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '11px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>💬</span>
                  <div>
                    <div>SMS Gateway</div>
                    <div style={{ fontSize: '9px', opacity: 0.8 }}>
                      {channels.includes('sms') ? `~${estimatedSmsCost} Credits` : 'Optional'}
                    </div>
                  </div>
                </button>

                {/* Notice Board Pin */}
                <button
                  type="button"
                  onClick={() => toggleChannel('notice_board')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: channels.includes('notice_board') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${channels.includes('notice_board') ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: channels.includes('notice_board') ? '#F59E0B' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '11px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>📌</span>
                  <div>
                    <div>Notice Board</div>
                    <div style={{ fontSize: '9px', opacity: 0.8 }}>Pin for 7 Days</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Priority & Category Pickers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label-text" style={{ fontSize: '11px', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
                  Urgency / Priority
                </label>
                <select
                  className="form-input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--card-light)',
                    color: 'white',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    marginBottom: 0,
                  }}
                >
                  <option value="normal">🟢 Normal Routine</option>
                  <option value="high">🟠 High Priority</option>
                  <option value="urgent">🔴 Urgent Emergency</option>
                </select>
              </div>

              <div>
                <label className="label-text" style={{ fontSize: '11px', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
                  Notice Category
                </label>
                <select
                  className="form-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--card-light)',
                    color: 'white',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    marginBottom: 0,
                  }}
                >
                  <option value="Academic">📚 Academic Circular</option>
                  <option value="Examination">📝 Examination &amp; Admit Cards</option>
                  <option value="Fee">💰 Fee Collection &amp; Due</option>
                  <option value="Holiday">🌧️ Holiday &amp; Weather Notice</option>
                  <option value="PTM &amp; Events">👨‍👩‍👧 PTM &amp; School Events</option>
                  <option value="Transport">🚌 School Transport &amp; Bus</option>
                </select>
              </div>
            </div>

            {/* Quick Institutional Templates Chips */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="label-text" style={{ fontSize: '11px', fontWeight: 800, margin: 0 }}>
                  Pre-Built Institutional Templates
                </label>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Click to auto-fill</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 9px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{tpl.icon}</span> {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label-text" style={{ fontSize: '11px', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
                Announcement Subject Title
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Schedule for Class 10 Mid-Term Examinations"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'var(--card-light)',
                  color: 'white',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  fontWeight: 700,
                  marginBottom: 0,
                }}
              />
            </div>

            {/* Message Body Textarea */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="label-text" style={{ fontSize: '11px', fontWeight: 800, margin: 0 }}>
                  Broadcast Message Body
                </label>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: message.length > 160 ? '#F59E0B' : 'var(--text-muted)',
                  }}
                >
                  {message.length} chars • {smsUnitsPerRecipient} SMS segment{smsUnitsPerRecipient > 1 ? 's' : ''}
                </span>
              </div>
              <textarea
                className="form-input"
                placeholder="Type your official announcement message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'var(--card-light)',
                  color: 'white',
                  border: '1px solid var(--border)',
                  minHeight: '130px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  fontWeight: 500,
                  marginBottom: 0,
                }}
              />
            </div>

            {/* Submit Button */}
            <OpticalButton
              type="submit"
              disabled={loading}
              variant="success"
              style={{
                width: '100%',
                fontSize: '14px',
                fontWeight: 800,
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                <path d="M15 8h6" />
                <path d="M18 5v6" />
                <path d="M20.002 14.464a9 9 0 0 0 .738.863A1 1 0 0 1 20 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 8.75-5.332" />
              </svg>
              {loading ? 'Dispatching Broadcast to All Devices...' : 'Launch Broadcast • Instant Multi-Channel Dispatch'}
            </OpticalButton>
          </form>
        </div>

        {/* Right Column: Live Simulated Device & Audience Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Dispatch Summary Card */}
          <div
            className="panel"
            style={{
              margin: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="panel-header" style={{ marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900 }}>Dispatch Telemetry Summary</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Audience:</span>
                <strong style={{ color: 'white' }}>
                  {target === 'inst_specific_class'
                    ? `${selectedClass} (~${estimatedReach} students)`
                    : target === 'inst_students'
                    ? `All Students (~${estimatedReach})`
                    : target === 'inst_teachers'
                    ? `Faculty (~${estimatedReach})`
                    : target}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Selected Channels:</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {channels.map((ch) => (
                    <span
                      key={ch}
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        background: 'rgba(255,255,255,0.08)',
                        color: 'var(--brand)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {ch.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Message Priority:</span>
                <strong
                  style={{
                    color: priority === 'urgent' ? 'var(--danger)' : priority === 'high' ? '#F59E0B' : '#00F5A0',
                    textTransform: 'uppercase',
                  }}
                >
                  ● {priority}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated SMS Debit:</span>
                <strong style={{ color: channels.includes('sms') ? 'var(--purple)' : 'var(--text-muted)' }}>
                  {channels.includes('sms') ? `${estimatedSmsCost} Credits` : 'None (In-App Push Only)'}
                </strong>
              </div>
            </div>
          </div>

          {/* Live Mobile Notification Simulator */}
          <div
            className="panel"
            style={{
              margin: 0,
              background: 'rgba(11, 17, 30, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F5A0', display: 'inline-block' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Live Device Push Preview
                </span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--brand)', fontWeight: 700 }}>
                iOS / Android Lockscreen
              </span>
            </div>

            {/* Notification Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '16px',
                padding: '14px 16px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '5px',
                      background: 'var(--brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 900,
                      color: '#000',
                    }}
                  >
                    TK
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'white' }}>
                    {user?.institute || 'Keystone Public School'}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: priority === 'urgent' ? 'rgba(239,68,68,0.2)' : 'rgba(38,195,234,0.2)',
                      color: priority === 'urgent' ? 'var(--danger)' : 'var(--brand)',
                      fontWeight: 800,
                    }}
                  >
                    {category}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Just now</span>
              </div>

              <h4 style={{ color: 'white', margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800 }}>
                {title.trim() || 'Notice: Term Examination Date Sheet Released'}
              </h4>

              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  margin: 0,
                  lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {message.trim() ||
                  'The official examination schedule has been published for all students. Download and verify your hall tickets on the portal.'}
              </p>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--brand)', fontWeight: 700 }}>
                  Target: {target === 'inst_specific_class' ? selectedClass : target.replace('inst_', '').replace('_', ' ')}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>• Tap to open portal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Dispatched Broadcasts Outbox & Audit Ledger Table ─────── */}
      <div className="panel">
        <div
          className="panel-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(46, 204, 113, 0.12)',
                border: '1px solid rgba(46, 204, 113, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>
                Dispatched Broadcasts Outbox &amp; Audit Trail
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                Immutable historical log of all campus announcements, class alerts &amp; push notifications
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search Subject, Message, or Class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                background: 'var(--card-light)',
                border: '1px solid var(--border)',
                color: 'white',
                minWidth: '220px',
              }}
            />

            <select
              value={filterAudience}
              onChange={(e) => setFilterAudience(e.target.value)}
              className="filter-select"
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                background: 'var(--card-light)',
                border: '1px solid var(--border)',
                color: 'white',
              }}
            >
              <option value="all">All Audiences ({allNotifications.length})</option>
              <option value="class">Class Specific</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="global">Global</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="filter-select"
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                background: 'var(--card-light)',
                border: '1px solid var(--border)',
                color: 'white',
              }}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent Only</option>
              <option value="high">High Priority</option>
              <option value="normal">Normal</option>
            </select>

            {/* Refresh Live Feed */}
            <button
              type="button"
              onClick={() => {
                loadSupabaseNotifications();
                refreshData(true);
              }}
              title="Refresh live broadcast feed"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* ── Table with Vertical Scroll Containment & Sticky Headers ──── */}
        {filteredNotifications.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '50px 20px',
              background: 'rgba(255,255,255,0.01)',
              borderRadius: '12px',
              border: '1px dashed var(--border)',
            }}
          >
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, fontWeight: 600 }}>
              No broadcast announcements recorded matching your criteria.
            </p>
          </div>
        ) : (
          <>
            <div className="tk-table-wrapper">
              <table className="tk-sleek-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>REF ID</th>
                    <th>Date &amp; Time</th>
                    <th>Target Audience</th>
                    <th>Subject &amp; Message</th>
                    <th>Channels</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleNotifications.map((notif, idx) => {
                    const dateObj = notif.time ? new Date(notif.time) : new Date();
                    const dateStr = !isNaN(dateObj.getTime())
                      ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Recent';
                    const timeStr = !isNaN(dateObj.getTime())
                      ? dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                      : '';

                    const isClassTarget = String(notif.target).toLowerCase().includes('class');

                    return (
                      <tr key={notif.id || idx}>
                        {/* Ref ID */}
                        <td data-label="REF ID" style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--brand)', fontSize: '11px' }}>
                          {notif.id.slice(0, 12)}
                        </td>

                        {/* Date & Time */}
                        <td data-label="DATE & TIME" style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ color: 'white', fontWeight: 700, fontSize: '12px' }}>{dateStr}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{timeStr}</div>
                        </td>

                        {/* Target Audience Pill */}
                        <td data-label="TARGET AUDIENCE">
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: isClassTarget ? 'rgba(38,195,234,0.15)' : 'rgba(255,255,255,0.06)',
                              color: isClassTarget ? 'var(--brand)' : 'white',
                              border: `1px solid ${isClassTarget ? 'rgba(38,195,234,0.35)' : 'rgba(255,255,255,0.1)'}`,
                            }}
                          >
                            {isClassTarget ? '🎯' : '👥'} {notif.target}
                          </span>
                        </td>

                        {/* Subject & Message Preview */}
                        <td data-label="SUBJECT & MESSAGE" style={{ maxWidth: '320px' }}>
                          <div style={{ color: 'white', fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>
                            {notif.title}
                          </div>
                          <div
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '11px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '300px',
                            }}
                          >
                            {notif.message}
                          </div>
                        </td>

                        {/* Channels */}
                        <td data-label="CHANNELS">
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <span title="In-App Push" style={{ fontSize: '13px' }}>📱</span>
                            <span title="Browser FCM Push" style={{ fontSize: '13px' }}>🔔</span>
                            {notif.channels?.includes('sms') && (
                              <span title="SMS Broadcast" style={{ fontSize: '13px' }}>💬</span>
                            )}
                          </div>
                        </td>

                        {/* Priority */}
                        <td data-label="PRIORITY">
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background:
                                notif.priority === 'urgent'
                                  ? 'rgba(239,68,68,0.15)'
                                  : notif.priority === 'high'
                                  ? 'rgba(245,158,11,0.15)'
                                  : 'rgba(46,204,113,0.15)',
                              color:
                                notif.priority === 'urgent'
                                  ? 'var(--danger)'
                                  : notif.priority === 'high'
                                  ? '#F59E0B'
                                  : 'var(--success)',
                              border: `1px solid ${
                                notif.priority === 'urgent'
                                  ? 'rgba(239,68,68,0.3)'
                                  : notif.priority === 'high'
                                  ? 'rgba(245,158,11,0.3)'
                                  : 'rgba(46,204,113,0.3)'
                              }`,
                              textTransform: 'uppercase',
                            }}
                          >
                            {notif.priority || 'NORMAL'}
                          </span>
                        </td>

                        {/* Status */}
                        <td data-label="STATUS">
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#00F5A0',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00F5A0' }} />
                            Delivered
                          </span>
                        </td>

                        {/* Actions */}
                        <td data-label="ACTION" style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setTitle(notif.title);
                              setMessage(notif.message);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            title="Reuse this announcement in composer"
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'var(--brand)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Reuse
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── 30-Item Batch Capacity Bar & Load More Button ─────── */}
            <div className="tk-table-capacity-bar">
              <div className="tk-table-capacity-count">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
                </svg>
                Showing <b style={{ color: 'white' }}>{visibleNotifications.length}</b> of{' '}
                <b style={{ color: 'white' }}>{filteredNotifications.length}</b> records (Load Capacity: 30 / batch)
              </div>
              {hasMoreNotifs && (
                <button
                  type="button"
                  className="tk-load-more-btn"
                  onClick={() => setDisplayLimit((prev) => prev + 30)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Load More Broadcasts... (+30)
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
