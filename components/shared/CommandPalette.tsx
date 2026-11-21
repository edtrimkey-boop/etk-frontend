'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/lib/dashboard-context';
import { MemoryStore } from '@/lib/api-client';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Quick Actions' | 'Navigation' | 'System';
  shortcut?: string;
  icon: React.ReactNode;
  keywords?: string[];
  action: () => void;
  roleRequired?: string[];
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const router = useRouter();
  const { user, openModal, refreshData, showToast } = useDashboard();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const userRole = user?.role || 'admin';

  // Toggle with Ctrl+K, ⌘K or '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an existing input/textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === '/' && !isInput && !open) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleLogout = () => {
    MemoryStore.clear();
    router.replace('/login');
  };

  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // 1. Quick Actions
      {
        id: 'qa-submit-paper',
        title: 'Submit Question Paper',
        subtitle: 'Upload question paper job for operators',
        category: 'Quick Actions',
        shortcut: 'P',
        keywords: ['paper', 'exam', 'submit', 'question', 'upload', 'test'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          openModal('paperSubmit');
        },
      },
      {
        id: 'qa-request-doc',
        title: 'Request Documents',
        subtitle: 'Order question banks, test series & materials',
        category: 'Quick Actions',
        shortcut: 'D',
        keywords: ['doc', 'material', 'bank', 'notes', 'order', 'request'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          openModal('docSubmit');
        },
      },
      {
        id: 'qa-register-teacher',
        title: 'Register New Teacher',
        subtitle: 'Add faculty member to institute directory',
        category: 'Quick Actions',
        shortcut: 'T',
        keywords: ['teacher', 'faculty', 'staff', 'add', 'new', 'register'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          openModal('teacherReg');
        },
      },
      {
        id: 'qa-send-broadcast',
        title: 'New Broadcast Message',
        subtitle: 'Compose circular or announcement to parents/staff',
        category: 'Quick Actions',
        shortcut: 'B',
        keywords: ['broadcast', 'announce', 'message', 'circular', 'notice', 'sms'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard/broadcast');
        },
      },
      {
        id: 'qa-sync-cloud',
        title: 'Synchronize Cloud Data',
        subtitle: 'Fetch latest updates from ED TRIMKEY database',
        category: 'Quick Actions',
        shortcut: 'S',
        keywords: ['sync', 'refresh', 'reload', 'fetch', 'update'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        ),
        action: async () => {
          setOpen(false);
          await refreshData(true);
          showToast('Dashboard data synchronized with cloud.', 'success');
        },
      },
      {
        id: 'qa-edit-profile',
        title: 'Edit My Profile',
        subtitle: 'Change name, contact info and details',
        category: 'Quick Actions',
        shortcut: 'U',
        keywords: ['profile', 'account', 'user', 'settings', 'details'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          openModal('userProfile');
        },
      },

      // 2. Navigation
      {
        id: 'nav-overview',
        title: 'Dashboard Overview',
        subtitle: 'KPIs, live metrics and recent activity',
        category: 'Navigation',
        keywords: ['overview', 'home', 'main', 'kpi', 'stats'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard');
        },
      },
      {
        id: 'nav-papers',
        title: 'Question Papers Hub',
        subtitle: 'Manage question paper submissions and status',
        category: 'Navigation',
        keywords: ['papers', 'exam', 'test', 'question', 'tracker'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard/papers');
        },
      },
      {
        id: 'nav-documents',
        title: 'Documents Repository',
        subtitle: 'Study materials, worksheets & test series',
        category: 'Navigation',
        keywords: ['documents', 'materials', 'study', 'worksheets', 'bank'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard/documents');
        },
      },
      {
        id: 'nav-teachers',
        title: 'Teachers Directory',
        subtitle: 'Faculty profiles, subject handles & contacts',
        category: 'Navigation',
        keywords: ['teachers', 'faculty', 'staff', 'teachers directory'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard/teachers');
        },
      },
      {
        id: 'nav-students',
        title: 'Students Directory',
        subtitle: 'Student records, classes and enrollments',
        category: 'Navigation',
        keywords: ['students', 'pupils', 'kids', 'classes', 'roll'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="7" r="4" />
            <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard/students');
        },
      },
      {
        id: 'nav-billing',
        title: 'Institute Billing & Payments',
        subtitle: 'Invoices, transaction history and statement',
        category: 'Navigation',
        keywords: ['billing', 'invoice', 'fees', 'payment', 'money', 'statement', 'receipt'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard/billing');
        },
      },
      {
        id: 'nav-broadcast',
        title: 'Broadcast Center',
        subtitle: 'Institute communications, templates & channels',
        category: 'Navigation',
        keywords: ['broadcast', 'notification', 'announcements', 'alerts'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
            <circle cx="12" cy="12" r="2" />
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard/broadcast');
        },
      },
      {
        id: 'nav-settings',
        title: 'Institute Settings',
        subtitle: 'Customization, appearance, security and configuration',
        category: 'Navigation',
        keywords: ['settings', 'config', 'security', 'password', 'theme'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard/settings');
        },
      },

      // Super Admin commands
      {
        id: 'admin-institutes',
        title: 'Master Institutes Directory',
        subtitle: 'Manage registered coaching institutes',
        category: 'Navigation',
        roleRequired: ['superadmin'],
        keywords: ['institutes', 'admin', 'coaching', 'schools'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M3 7l9-4 9 4v14H3V7z" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard/admin/institutes');
        },
      },
      {
        id: 'admin-billing',
        title: 'Master Billing & Revenue',
        subtitle: 'Overall platform financials and cash flow',
        category: 'Navigation',
        roleRequired: ['superadmin'],
        keywords: ['billing', 'admin', 'revenue', 'finance'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard/admin/billing');
        },
      },
      {
        id: 'admin-operators',
        title: 'Operator Fleet Management',
        subtitle: 'Manage DTP operators and workspace allocation',
        category: 'Navigation',
        roleRequired: ['superadmin'],
        keywords: ['operators', 'dtp', 'staff', 'admin'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          router.push('/dashboard/admin/operators');
        },
      },

      // 3. System
      {
        id: 'sys-logout',
        title: 'Sign Out / Log Out',
        subtitle: 'Securely terminate session on this device',
        category: 'System',
        keywords: ['logout', 'signout', 'exit', 'quit', 'leave'],
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        ),
        action: () => {
          setOpen(false);
          handleLogout();
        },
      },
    ];

    return list.filter((item) => {
      if (item.roleRequired && !item.roleRequired.includes(userRole)) {
        return false;
      }
      return true;
    });
  }, [userRole, router, openModal, refreshData, showToast]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter((cmd) => {
      const matchTitle = cmd.title.toLowerCase().includes(q);
      const matchSubtitle = cmd.subtitle?.toLowerCase().includes(q) || false;
      const matchCategory = cmd.category.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords?.some((k) => k.toLowerCase().includes(q)) || false;
      return matchTitle || matchSubtitle || matchCategory || matchKeywords;
    });
  }, [commands, query]);

  // Ensure index is within range
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  // Keyboard navigation within list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('.cmd-item-selected') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="command-palette-backdrop"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        background: 'rgba(4, 7, 13, 0.72)',
        backdropFilter: 'blur(22px) saturate(190%)',
        WebkitBackdropFilter: 'blur(22px) saturate(190%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 'clamp(50px, 12vh, 120px)',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
    >
      <div
        className="command-palette-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '640px',
          background: 'rgba(14, 22, 37, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '20px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
          animation: 'commandPaletteFadeIn 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '12px',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command, action or destination..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              padding: 0,
              boxShadow: 'none',
            }}
          />

          <kbd
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '3px 7px',
              letterSpacing: '0.5px',
              flexShrink: 0,
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            overflowY: 'auto',
            padding: '10px',
            flex: 1,
            maxHeight: '440px',
          }}
        >
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>No commands found</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                No results matching <span style={{ color: 'var(--brand)' }}>&ldquo;{query}&rdquo;</span>
              </div>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  className={`cmd-item ${isSelected ? 'cmd-item-selected' : ''}`}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    gap: '12px',
                    marginBottom: '4px',
                    transition: 'all 0.12s ease',
                    background: isSelected ? 'rgba(38, 195, 234, 0.12)' : 'transparent',
                    border: isSelected
                      ? '1px solid rgba(38, 195, 234, 0.35)'
                      : '1px solid transparent',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? 'var(--brand)' : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#05080F' : 'var(--brand)',
                      flexShrink: 0,
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {cmd.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: isSelected ? 'white' : 'var(--text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {cmd.title}
                      </span>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: isSelected ? 'var(--brand)' : 'var(--text-muted)',
                          background: isSelected ? 'rgba(38, 195, 234, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          letterSpacing: '0.4px',
                        }}
                      >
                        {cmd.category}
                      </span>
                    </div>
                    {cmd.subtitle && (
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {cmd.subtitle}
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                      }}
                    >
                      <kbd
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: 'var(--brand)',
                          background: 'rgba(38, 195, 234, 0.15)',
                          border: '1px solid rgba(38, 195, 234, 0.4)',
                          borderRadius: '5px',
                          padding: '3px 7px',
                        }}
                      >
                        ↵ Enter
                      </kbd>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Bar */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(8, 13, 23, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span><kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>↑</kbd> <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>↓</kbd> navigate</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>↵</kbd> select</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>esc</kbd> close</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--brand)', fontWeight: 800 }}>ED TRIMKEY OS</span>
            <span>Spotlight</span>
          </div>
        </div>
      </div>
    </div>
  );
}
