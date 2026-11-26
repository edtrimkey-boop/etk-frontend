'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/pricing';
import { normalizeRole, getRoleBadge, UserRole } from '@/lib/rbac';

interface QuickTemplate {
  id: string;
  category: string;
  priority: 'normal' | 'high' | 'urgent';
  label: string;
  icon: string;
  title: string;
  message: string;
  targetAudience?: string;
  badge?: string;
}

function renderTemplateSvg(icon: string) {
  switch (icon) {
    case 'fee':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 18V6" />
        </svg>
      );
    case 'exam':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'holiday':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          <line x1="8" y1="19" x2="8" y2="21" />
          <line x1="12" y1="19" x2="12" y2="21" />
          <line x1="16" y1="19" x2="16" y2="21" />
        </svg>
      );
    case 'ptm':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'bus':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="14" rx="3" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
          <path d="M3 9h18" />
          <path d="M3 13h18" />
        </svg>
      );
    case 'circular':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'staff':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'system':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case 'release':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      );
    case 'security':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'operator':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case 'admin':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'paper':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
        </svg>
      );
    case 'leave':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'counsel':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'supplies':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case 'homework':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case 'revision':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
  }
}

// 1. Institute Admin Templates (School & Campus wide)
const INST_ADMIN_TEMPLATES: QuickTemplate[] = [
  {
    id: 'fee_due',
    category: 'Fee',
    priority: 'high',
    label: 'Fee Due Notice',
    icon: 'fee',
    badge: 'Campus',
    targetAudience: 'inst_students',
    title: 'Academic Fee Installment Due Notice',
    message:
      'Dear Parents, this is a gentle reminder that the academic fee installment for the current term is due. Kindly clear before the 10th of this month via the Ed-Trim Key Fee Portal to ensure uninterrupted student services.',
  },
  {
    id: 'exam_admit',
    category: 'Examination',
    priority: 'urgent',
    label: 'Exam Schedule & Admit Card',
    icon: 'exam',
    badge: 'Campus',
    targetAudience: 'inst_students',
    title: 'Term Examination Schedule & Admit Cards Released',
    message:
      'Dear Students & Parents, the final Examination Date Sheet and digitally signed Admit Cards / Hall Tickets have been released. Please download and print your verified Admit Card from the student portal.',
  },
  {
    id: 'weather_holiday',
    category: 'Holiday',
    priority: 'urgent',
    label: 'Weather / Sudden Holiday',
    icon: 'holiday',
    badge: 'Emergency',
    targetAudience: 'inst_emergency',
    title: 'Urgent Notice: Unscheduled School Closure',
    message:
      'Urgent Notice: As per district administration directives regarding severe weather conditions, the school campus will remain closed tomorrow. Online revision and doubt-clearing sessions will continue on schedule.',
  },
  {
    id: 'ptm_meeting',
    category: 'PTM & Events',
    priority: 'normal',
    label: 'Parent-Teacher Meeting (PTM)',
    icon: 'ptm',
    badge: 'Campus',
    targetAudience: 'inst_students',
    title: 'Invitation: Comprehensive Parent-Teacher Meeting (PTM)',
    message:
      'Dear Parents, our upcoming Parent-Teacher Meeting (PTM) to review term academic progress and holistic evaluation is scheduled for Saturday, 09:30 AM to 01:00 PM. Your presence is cordially requested.',
  },
  {
    id: 'transport_alert',
    category: 'Transport',
    priority: 'high',
    label: 'Bus Route / Delay Notice',
    icon: 'bus',
    badge: 'Transport',
    targetAudience: 'inst_students',
    title: 'School Transport & Bus Route Operational Update',
    message:
      'Notice to Parents: Due to city traffic diversions and road maintenance, school bus routes may experience a brief delay of 15-20 minutes today. All students are in transit safely under institutional care.',
  },
  {
    id: 'academic_circular',
    category: 'Academic',
    priority: 'normal',
    label: 'Official Academic Circular',
    icon: 'circular',
    badge: 'Campus',
    targetAudience: 'inst_students',
    title: 'Important Academic Guidelines & Schedule Update',
    message:
      'Circular to All Students & Staff: Please review the updated academic guidelines, upcoming project deadlines, and uniform requirements. Strict adherence to school hours is required.',
  },
  {
    id: 'faculty_staff_meeting',
    category: 'Academic',
    priority: 'high',
    label: 'Faculty Staff Meeting',
    icon: 'staff',
    badge: 'Staff',
    targetAudience: 'inst_teachers',
    title: 'Mandatory Faculty Academic & Review Meeting',
    message:
      'Notice to All Teaching Faculty: A comprehensive staff review meeting is scheduled for 03:30 PM today in the Conference Hall to finalize term question paper moderation and syllabus audit.',
  },
];

// 2. Super Admin Templates (System & Platform wide)
const SUPER_ADMIN_TEMPLATES: QuickTemplate[] = [
  {
    id: 'sys_maintenance',
    category: 'System',
    priority: 'high',
    label: 'System Maintenance',
    icon: 'system',
    badge: 'Global',
    targetAudience: 'global',
    title: 'Scheduled System Maintenance Advisory',
    message:
      'Attention All Administrators & Operators: Ed-Trim Key cloud services will undergo scheduled infrastructure optimization on Sunday between 02:00 AM and 04:00 AM IST. All databases will remain read-only during this window.',
  },
  {
    id: 'new_release',
    category: 'Platform',
    priority: 'normal',
    label: 'New Feature Release',
    icon: 'release',
    badge: 'Platform',
    targetAudience: 'all_admins',
    title: 'Ed-Trim Key V2.9.2 Engine Update Released',
    message:
      'Announcement: We have deployed real-time pricing synchronization, in-app checkout modals, and granular class-specific broadcast targeting. Refresh your dashboard to utilize the latest features.',
  },
  {
    id: 'security_advisory',
    category: 'Security',
    priority: 'urgent',
    label: 'Security Advisory',
    icon: 'security',
    badge: 'Security',
    targetAudience: 'global',
    title: 'Mandatory Security & Credential Compliance Notice',
    message:
      'Important Security Circular: In accordance with data privacy standards, all institutional staff and operators are requested to verify their two-factor contact details and audit active session tokens.',
  },
  {
    id: 'operator_dispatch',
    category: 'Operations',
    priority: 'high',
    label: 'Operator Queue Notice',
    icon: 'operator',
    badge: 'Operators',
    targetAudience: 'all_operators',
    title: 'Urgent: High Volume Examination Typesetting Queue',
    message:
      'Notice to All Production Operators: Multiple schools have submitted term examination papers. Please prioritize MCQ Formatting and Question Paper proofreading jobs with expedited deadlines.',
  },
];

// 3. Teacher Templates (Pre-filled to Institute Admin + Assigned Classes)
const TEACHER_TEMPLATES: QuickTemplate[] = [
  // ── PRE-FILLED TO INSTITUTE ADMIN ─────────────────────────────
  {
    id: 'note_to_admin',
    category: 'Administrative',
    priority: 'normal',
    label: 'Note to Admin: Syllabus Progress',
    icon: 'admin',
    badge: 'To Admin',
    targetAudience: 'notice_to_admin',
    title: 'Faculty Academic Note: Syllabus Progress & Schedule Update',
    message:
      'Respected Institute Administrator / Principal, the academic syllabus for my assigned classes has progressed in alignment with the institutional term calendar. Requesting administrative sanction for upcoming revision schedules and laboratory practical slots.',
  },
  {
    id: 'paper_submission_admin',
    category: 'Administrative',
    priority: 'high',
    label: 'Paper Ready for Vetting',
    icon: 'paper',
    badge: 'To Admin',
    targetAudience: 'notice_to_admin',
    title: 'Term Question Paper Ready for Institutional Vetting',
    message:
      'Attention School Administration: The question paper draft with marks allocation, syllabus blueprint, and answer key has been submitted for term exam typesetting. Kindly review and approve for production dispatch.',
  },
  {
    id: 'leave_handover_admin',
    category: 'Administrative',
    priority: 'high',
    label: 'Leave Notice & Duty Handover',
    icon: 'leave',
    badge: 'To Admin',
    targetAudience: 'notice_to_admin',
    title: 'Faculty Leave Application & Class Duty Substitution Handover',
    message:
      'Respected Admin, submitting official leave application for [Date/Duration]. I have assigned student coursework and coordinated class substitution duties with department colleagues to ensure seamless learning continuity.',
  },
  {
    id: 'student_report_admin',
    category: 'Administrative',
    priority: 'normal',
    label: 'Student Counseling Advisory',
    icon: 'counsel',
    badge: 'To Admin',
    targetAudience: 'notice_to_admin',
    title: 'Student Academic Review & Parent Counseling Advisory',
    message:
      'Attention Institute Admin: Recommending structured academic intervention and parent-teacher counseling for identified students in Class [Grade]. Performance analysis sheet submitted to office.',
  },
  {
    id: 'lab_supplies_admin',
    category: 'Administrative',
    priority: 'normal',
    label: 'Stationery & Exam Requisition',
    icon: 'supplies',
    badge: 'To Admin',
    targetAudience: 'notice_to_admin',
    title: 'Requisition: Academic Stationery & Exam Materials',
    message:
      'Respected Administration, requesting allocation of exam answer booklets, graph sheets, and departmental laboratory consumables for the upcoming assessments.',
  },

  // ── CLASSROOM & STUDENT ANNOUNCEMENTS ─────────────────────────
  {
    id: 'homework_notice',
    category: 'Academic',
    priority: 'normal',
    label: 'Homework & Assignment',
    icon: 'homework',
    badge: 'Classroom',
    targetAudience: 'inst_specific_class',
    title: 'Class Assignment & Homework Submission Guidelines',
    message:
      'Dear Students, please complete Chapter Exercises 4.1 to 4.3 in your revision notebook. The completed assignment must be submitted during tomorrow morning roll call.',
  },
  {
    id: 'unit_test',
    category: 'Examination',
    priority: 'high',
    label: 'Unit Test Announcement',
    icon: 'exam',
    badge: 'Classroom',
    targetAudience: 'inst_specific_class',
    title: 'Announcement: Upcoming Class Unit Assessment',
    message:
      'Notice to Class Students: A 25-mark Unit Assessment will be conducted this Thursday during the second period. The syllabus covers Sections 1 through 3. Please prepare thoroughly.',
  },
  {
    id: 'extra_class',
    category: 'Academic',
    priority: 'normal',
    label: 'Extra Revision Class',
    icon: 'revision',
    badge: 'Classroom',
    targetAudience: 'inst_specific_class',
    title: 'Special Doubt-Clearing & Revision Class Schedule',
    message:
      'Notice: An optional revision and numerical doubt-clearing session will be held tomorrow after school hours from 02:30 PM to 03:30 PM. All interested students are welcome to attend.',
  },
];

// 4. Full Omnipresent Institute Admin Suite (Admin is also a Teacher with 100% full campus access)
const ALL_INSTITUTE_TEMPLATES: QuickTemplate[] = [
  ...INST_ADMIN_TEMPLATES,
  {
    id: 'homework_notice_admin',
    category: 'Academic',
    priority: 'normal',
    label: 'Class Homework Assignment',
    icon: 'homework',
    badge: 'Classroom',
    targetAudience: 'inst_specific_class',
    title: 'Class Assignment & Homework Submission Guidelines',
    message:
      'Dear Students, please complete Chapter Exercises 4.1 to 4.3 in your revision notebook. The completed assignment must be submitted during tomorrow morning roll call.',
  },
  {
    id: 'unit_test_admin',
    category: 'Examination',
    priority: 'high',
    label: 'Class Unit Assessment',
    icon: 'exam',
    badge: 'Classroom',
    targetAudience: 'inst_specific_class',
    title: 'Announcement: Upcoming Class Unit Assessment',
    message:
      'Notice to Class Students: A 25-mark Unit Assessment will be conducted this Thursday during the second period. The syllabus covers Sections 1 through 3. Please prepare thoroughly.',
  },
  {
    id: 'extra_class_admin',
    category: 'Academic',
    priority: 'normal',
    label: 'Extra Revision Class',
    icon: 'revision',
    badge: 'Classroom',
    targetAudience: 'inst_specific_class',
    title: 'Special Doubt-Clearing & Revision Class Schedule',
    message:
      'Notice: An optional revision and numerical doubt-clearing session will be held tomorrow after school hours from 02:30 PM to 03:30 PM. All interested students are welcome to attend.',
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

  // Determine normalized role & RBAC permissions
  const role: UserRole = normalizeRole(user?.role);
  const roleBadge = getRoleBadge(user?.role);

  const isSuperAdmin = role === 'super_admin';
  const isInstAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isOperator = role === 'operator';

  // Default target based on role
  const defaultTarget = useMemo(() => {
    if (isSuperAdmin) return 'global';
    if (isTeacher) return 'inst_specific_class';
    if (isOperator) return 'operator_alerts';
    return 'inst_students';
  }, [isSuperAdmin, isTeacher, isOperator]);

  // Core Form State
  const [target, setTarget] = useState<string>(defaultTarget);
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

  // Update target when role stabilizes
  useEffect(() => {
    setTarget(defaultTarget);
  }, [defaultTarget]);

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
        `${SUPABASE_URL}/rest/v1/notifications?select=*&order=created_at.desc&limit=60`,
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
  // STRICT PRIVACY FILTERING: Filter notifications based on role!
  const allNotifications = useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    const myInstId = String(user?.institute_id || user?.instId || '').toLowerCase();

    const matchesRolePrivacy = (n: any) => {
      if (isSuperAdmin) return true; // Super admin sees all system activity

      if (!isOperator && n.instituteId && myInstId && String(n.instituteId).toLowerCase() !== myInstId) {
        return false;
      }

      const targetText = String(n.target || n.target_roles || n.targetAudience || n.targetRaw || '').toLowerCase();

      if (isOperator) {
        // Operators only see operator alerts, job alerts, or global broadcasts
        return (
          targetText.includes('operator') ||
          targetText.includes('global') ||
          targetText.includes('all') ||
          n.type === 'job_assigned' ||
          n.type === 'system_broadcast'
        );
      }

      if (isTeacher) {
        // Teachers see teacher announcements, their school notices, or global
        return (
          targetText.includes('teacher') ||
          targetText.includes('class') ||
          targetText.includes('student') ||
          targetText.includes('inst_') ||
          targetText.includes('all') ||
          targetText.includes('global')
        );
      }

      if (isInstAdmin) {
        // Institute Admin sees all campus notices, but NOT other institutes' isolated traffic
        return !targetText.includes('other_inst');
      }

      return true;
    };

    // 1. Live Supabase Rows
    liveDbNotifs.forEach((n, idx) => {
      const idKey = n.id || n.reference_id || `DB-${idx}`;
      if (!seenIds.has(idKey)) {
        seenIds.add(idKey);
        let targetText = 'Global Network';
        if (n.target_roles && n.target_roles.length > 0) {
          targetText = n.target_roles.join(', ');
        }
        const record = {
          id: idKey,
          instituteId: n.institute_id || null,
          title: n.title || 'Institutional Notice',
          message: n.message || '',
          time: n.created_at,
          target: targetText,
          priority: n.priority || 'normal',
          channels: ['in_app', 'push'],
          status: n.status === 'sent' ? 'Delivered' : (n.status || 'Delivered'),
          source: 'Supabase',
        };

        if (matchesRolePrivacy(record)) {
          list.push(record);
        }
      }
    });

    // 2. Context Payload Notifications
    const rawNotifs = payload?.notifications || [];
    rawNotifs.forEach((n: any, idx: number) => {
      const idKey = n.id || `PAYLOAD-${idx}-${n.title}`;
      if (!seenIds.has(idKey)) {
        seenIds.add(idKey);
        const record = {
          id: idKey,
          title: n.title || 'Broadcast Alert',
          message: n.msg || n.message || '',
          time: n.time || new Date().toISOString(),
          target: n.targetAudience || n.targetRaw || 'My Institute Students',
          priority: n.priority || 'normal',
          channels: n.channels || ['in_app', 'push'],
          status: 'Delivered',
          source: 'System',
        };

        if (matchesRolePrivacy(record)) {
          list.push(record);
        }
      }
    });

    return list;
  }, [liveDbNotifs, payload, isSuperAdmin, isOperator, isTeacher, isInstAdmin]);

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

  // Estimate audience reach based on current role and target
  const estimatedReach = useMemo(() => {
    if (isSuperAdmin) {
      if (target === 'all_operators') return 48;
      if (target === 'all_teachers') return 240;
      if (target === 'all_admins') return 64;
      if (target === 'global') return 1200;
    }
    if (target === 'inst_specific_class') {
      return studentCountByClass[selectedClass] || 0;
    }
    if (target === 'notice_to_admin') {
      return 3; // Principal, Vice-Principal, Admin Office
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
    return studentsList.length || 100;
  }, [target, selectedClass, studentCountByClass, studentsList, teachersList, isSuperAdmin]);

  // SMS Credit Estimation: 1 SMS credit per 160 characters per recipient
  const smsUnitsPerRecipient = Math.max(1, Math.ceil((message.length || 1) / 160));
  const estimatedSmsCost = channels.includes('sms') ? estimatedReach * smsUnitsPerRecipient : 0;
  const smsRemaining = user?.instDetails?.smsRemaining ?? payload?.data?.instDetails?.smsRemaining ?? 5000;

  // Active templates based on role (Institute Admin has full access to ALL templates)
  const activeTemplates = useMemo(() => {
    if (isSuperAdmin) return SUPER_ADMIN_TEMPLATES;
    if (isTeacher) return TEACHER_TEMPLATES;
    return ALL_INSTITUTE_TEMPLATES;
  }, [isSuperAdmin, isTeacher]);

  // Apply Quick Template with audience synchronization
  const applyTemplate = (tpl: QuickTemplate) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setCategory(tpl.category);
    setPriority(tpl.priority);
    if (tpl.targetAudience) {
      setTarget(tpl.targetAudience);
    }
  };

  // Launch Broadcast Dispatch Handler
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showAlert('Please provide both a subject title and message content for the broadcast.', 'Validation Error');
      return;
    }

    if (channels.includes('sms') && estimatedSmsCost > smsRemaining && !isSuperAdmin) {
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
        : target === 'notice_to_admin'
        ? 'School Administration'
        : target === 'global'
        ? 'Global System Network'
        : target;

    try {
      // Authoritative Server Gateway Dispatch: inserts verified notification row + sends FCM push notifications
      const res = await serverCall('sendNotification', {
        senderEmail: user?.email,
        senderName: user?.name || user?.full_name || `${roleBadge.label} User`,
        senderRole: role,
        targetRaw: finalTarget,
        targetAudience: finalTarget,
        targetClass: target === 'inst_specific_class' ? selectedClass : undefined,
        title: title.trim(),
        msg: message.trim(),
        message: message.trim(),
        instituteId: user?.institute_id || user?.instId || user?.code,
        channels,
        priority,
        category,
        estimatedReach,
        referenceId: `BC-${Date.now().toString().slice(-6)}`,
      });

      if (res && res.success) {
        playNotificationSound('success');
        const pushInfo =
          channels.includes('push') && typeof res.pushSentCount === 'number'
            ? ` (${res.pushSentCount} push notification${res.pushSentCount === 1 ? '' : 's'} dispatched)`
            : '';
        showAlert(
          `Broadcast dispatched to ${readableAudience} via ${channels.length} channel(s)${pushInfo}.`,
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
      {/* ── 1. Header Banner & Dynamic Role Indicator ───────────────── */}
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
                background: roleBadge.bg,
                border: `1px solid ${roleBadge.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: roleBadge.color,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'white' }}>
                  Broadcast &amp; Communications Hub
                </h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: roleBadge.bg,
                    color: roleBadge.color,
                    border: `1px solid ${roleBadge.border}`,
                    textTransform: 'uppercase',
                  }}
                >
                  {roleBadge.label}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                {isSuperAdmin
                  ? 'Global platform broadcast network: Dispatch system maintenance, operator directives & administrative circulars.'
                  : isTeacher
                  ? 'Classroom communication hub: Dispatch homework guidelines, unit test announcements & notices to students.'
                  : isOperator
                  ? 'Operator incoming broadcast stream: Operational directives, formatting guidelines & system alerts.'
                  : 'Multi-channel institutional dispatch suite: In-App, Push Notifications, SMS Gateway & Digital Notice Board.'}
              </p>
            </div>
          </div>

          {/* Role-Specific Telemetry Badge */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isInstAdmin && (
              <>
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
              </>
            )}

            {isSuperAdmin && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'rgba(38, 195, 234, 0.15)',
                  color: 'var(--brand)',
                  border: '1px solid rgba(38, 195, 234, 0.35)',
                }}
              >
                ● System Wide Authority (Unrestricted Broadcast)
              </span>
            )}

            {isTeacher && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#F59E0B',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                }}
              >
                ● Class Notice Privileges
              </span>
            )}
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
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              Visible Records
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
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              Authorized Scope
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#00F5A0', margin: 0 }}>
              {isSuperAdmin ? 'Global Network' : isTeacher ? 'Assigned Classes' : isOperator ? 'Operator Queue' : 'Campus Wide'}
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
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              Target Capacity
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'white', margin: 0 }}>
              {isSuperAdmin
                ? '1,200+ Nodes'
                : isOperator
                ? '48 Operators'
                : `${(studentsList.length || 142) + (teachersList.length || 18)} Contacts`}
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
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              Privacy Boundary
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--purple)', margin: 0 }}>
              Role Isolated 🔒
            </h2>
          </div>
        </div>
      </div>

      {/* ── 3. Role-Aware Composer vs Operator Notice Board ───────────── */}
      {isOperator ? (
        /* Operator Privacy View: Read-only Dispatch Stream */
        <div
          className="panel"
          style={{
            marginBottom: '30px',
            borderTop: '4px solid var(--purple)',
            background: 'rgba(11, 17, 30, 0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--purple)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: 'white' }}>
                Operator Production Dispatch Stream
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                You have read-only access to operational guidelines, proofing directives &amp; urgent queue notifications.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span><strong style={{ color: 'white' }}>Role Privacy Notice:</strong> Outbound broadcast dispatching is reserved for Institute &amp; Super Administrators. You can view all announcements below.</span>
            </div>
            <Link href="/operator/workspace" style={{ textDecoration: 'none' }}>
              <OpticalButton variant="success" style={{ padding: '8px 16px', fontSize: '12px' }}>
                Open Production Workspace →
              </OpticalButton>
            </Link>
          </div>
        </div>
      ) : (
        /* Composer Studio for Super Admin, Institute Admin & Teacher */
        <div className="grid-2" style={{ marginBottom: '30px' }}>
          {/* Left Column: Composer Form */}
          <div className="panel" style={{ margin: 0, borderTop: `4px solid ${roleBadge.color}` }}>
            <div className="panel-header" style={{ marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>
                {isSuperAdmin
                  ? 'Compose Global Network Announcement'
                  : isTeacher
                  ? 'Post Classroom Notice or Note'
                  : 'Compose Campus Announcement'}
              </h3>
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
                    Estimated Reach: ~{estimatedReach} recipients
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
                  {isSuperAdmin ? (
                    <>
                      <option value="global">Entire System Community (Global Network)</option>
                      <option value="all_admins">All Institute Administrators</option>
                      <option value="all_teachers">All System Teachers (Global)</option>
                      <option value="all_operators">All Production Operators</option>
                    </>
                  ) : isTeacher ? (
                    <>
                      <option value="notice_to_admin">Pre-filled Note / Requisition to Institute Admin (Principal)</option>
                      <option value="inst_specific_class">My Assigned Class / Grade (Select Grade Below)</option>
                    </>
                  ) : (
                    <>
                      <option value="inst_students">All Institute Students &amp; Parents ({studentsList.length || 142} total)</option>
                      <option value="inst_specific_class">Specific Class / Grade (Select Grade Below)</option>
                      <option value="inst_teachers">All Faculty &amp; Teaching Staff ({teachersList.length || 18} teachers)</option>
                      <option value="inst_staff">Administrative &amp; Support Staff Only</option>
                      <option value="inst_emergency">Emergency Broadcast (All Students, Parents &amp; Faculty)</option>
                      <option value="notice_to_admin">Internal Admin &amp; Academic Log (Self / Co-Admins)</option>
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
                    <label className="label-text" style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 800, margin: 0 }}>
                      Select Target Class / Grade
                    </label>
                    <span style={{ fontSize: '11px', color: '#00F5A0', fontWeight: 800 }}>
                      {studentCountByClass[selectedClass] !== undefined
                        ? `${studentCountByClass[selectedClass]} Students Enrolled`
                        : 'Grade Selected'}
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
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
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
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 11a9 9 0 0 1 9 9" />
                      <path d="M4 4a16 16 0 0 1 16 16" />
                      <circle cx="5" cy="19" r="1" />
                    </svg>
                    <div>
                      <div>Browser Push</div>
                      <div style={{ fontSize: '9px', opacity: 0.8 }}>FCM Mobile/PC</div>
                    </div>
                  </button>

                  {/* SMS Gateway (Only for Institute Admin and Super Admin) */}
                  {!isTeacher && (
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
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <div>
                        <div>SMS Gateway</div>
                        <div style={{ fontSize: '9px', opacity: 0.8 }}>
                          {channels.includes('sms') ? `~${estimatedSmsCost} Credits` : 'Optional'}
                        </div>
                      </div>
                    </button>
                  )}

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
                    <option value="normal">Normal Routine</option>
                    <option value="high">High Priority</option>
                    {!isTeacher && <option value="urgent">Urgent Emergency</option>}
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
                    <option value="Academic">Academic Circular</option>
                    <option value="Examination">Examination &amp; Admit Cards</option>
                    {(isInstAdmin || isTeacher) && <option value="Homework">Homework &amp; Classwork</option>}
                    {isInstAdmin && <option value="Fee">Fee Collection &amp; Due</option>}
                    {isInstAdmin && <option value="Holiday">Holiday &amp; Weather Notice</option>}
                    {isInstAdmin && <option value="PTM &amp; Events">PTM &amp; School Events</option>}
                    {isInstAdmin && <option value="Transport">School Transport &amp; Bus</option>}
                    {(isInstAdmin || isTeacher) && <option value="Administrative">Administrative Notes &amp; Requests</option>}
                    {isSuperAdmin && <option value="System">System Maintenance &amp; API</option>}
                  </select>
                </div>
              </div>

              {/* Quick Role-Specific Templates Chips */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="label-text" style={{ fontSize: '11px', fontWeight: 800, margin: 0 }}>
                    {isSuperAdmin
                      ? 'Super Admin Platform Directives'
                      : isTeacher
                      ? 'Teacher Templates (Pre-filled to Admin & Classes)'
                      : 'Institute Templates (Full Campus & Classroom Suite)'}
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Click to auto-fill</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {activeTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      title={`Load: ${tpl.title}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        background: tpl.badge === 'To Admin'
                          ? 'rgba(245, 158, 11, 0.12)'
                          : tpl.badge === 'Emergency'
                          ? 'rgba(239, 68, 68, 0.12)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: tpl.badge === 'To Admin'
                          ? '1px solid rgba(245, 158, 11, 0.35)'
                          : tpl.badge === 'Emergency'
                          ? '1px solid rgba(239, 68, 68, 0.35)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        color: tpl.badge === 'To Admin'
                          ? '#F59E0B'
                          : tpl.badge === 'Emergency'
                          ? '#EF4444'
                          : 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {renderTemplateSvg(tpl.icon)}
                      </span>
                      <span>{tpl.label}</span>
                      {tpl.badge && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {tpl.badge}
                        </span>
                      )}
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
                {loading ? (
                  <IOSSpinner size={18} color="#05080F" />
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                      <path d="M15 8h6" />
                      <path d="M18 5v6" />
                      <path d="M20.002 14.464a9 9 0 0 0 .738.863A1 1 0 0 1 20 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 8.75-5.332" />
                    </svg>
                    {isSuperAdmin
                      ? 'Launch Global Network Broadcast'
                      : isTeacher
                      ? 'Post Classroom Announcement'
                      : 'Launch Campus Broadcast • Multi-Channel'}
                  </>
                )}
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
                      : target === 'global'
                      ? 'Global Network (~1,200)'
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
                      {user?.institute || 'Ed-Trim Key'}
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
      )}

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
                {isOperator
                  ? 'Operator Incoming Dispatch Trail'
                  : isTeacher
                  ? 'Classroom Announcements History'
                  : 'Dispatched Broadcasts Outbox & Audit Trail'}
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
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span title="In-App Push" style={{ display: 'inline-flex', alignItems: 'center', color: '#00F5A0' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                              </svg>
                            </span>
                            <span title="Browser FCM Push" style={{ display: 'inline-flex', alignItems: 'center', color: '#26C3EA' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 11a9 9 0 0 1 9 9" />
                                <path d="M4 4a16 16 0 0 1 16 16" />
                                <circle cx="5" cy="19" r="1" />
                              </svg>
                            </span>
                            {notif.channels?.includes('sms') && (
                              <span title="SMS Broadcast" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--purple)' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                              </span>
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
                          {!isOperator && (
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
                          )}
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
