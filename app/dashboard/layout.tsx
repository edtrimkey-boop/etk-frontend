'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MemoryStore } from '@/lib/api-client';
import { DashboardProvider, useDashboard } from '@/lib/dashboard-context';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import MobileNav from '@/components/layout/MobileNav';
import SaraWidget from '@/components/shared/SaraWidget';
import ModalHost from '@/components/modals/ModalHost';
import TopProgressBar from '@/components/layout/TopProgressBar';
import ToastContainer from '@/components/ui/ToastContainer';
import CommandPalette from '@/components/shared/CommandPalette';

function InnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, openModal, activeModal, alertState, confirmState, uploadProgress } = useDashboard();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isModalActive = Boolean(activeModal || alertState?.open || confirmState?.open || uploadProgress?.open);

  // Determine active tab based on current pathname
  const getActiveTab = () => {
    if (pathname === '/dashboard') return 'overview';
    if (pathname.includes('/dashboard/papers')) return 'papers';
    if (pathname.includes('/dashboard/documents')) return 'documents';
    if (pathname.includes('/dashboard/billing')) return 'inst-billing';
    if (pathname.includes('/dashboard/teachers')) return 'inst-teachers';
    if (pathname.includes('/dashboard/students')) return 'inst-students';
    if (pathname.includes('/dashboard/broadcast')) return 'notifications';
    if (pathname.includes('/dashboard/settings')) return 'settings';
    if (pathname.includes('/dashboard/admin/institutes')) return 'institutes';
    if (pathname.includes('/dashboard/admin/billing')) return 'billing';
    if (pathname.includes('/dashboard/admin/operators')) return 'operators';
    if (pathname.includes('/operator/workspace')) return 'op-workspace';
    if (pathname.includes('/operator/earnings')) return 'op-finance';
    return 'overview';
  };

  const activeTab = getActiveTab();

  // Aggressively prefetch all tab routes in background for instant lightning-fast tab switching
  React.useEffect(() => {
    const routes = [
      '/dashboard',
      '/dashboard/documents',
      '/dashboard/papers',
      '/dashboard/students',
      '/dashboard/teachers',
      '/dashboard/billing',
      '/dashboard/settings',
      '/dashboard/broadcast',
      '/dashboard/admin/institutes',
      '/dashboard/admin/billing',
      '/dashboard/admin/operators',
      '/operator/workspace',
      '/operator/earnings',
      '/admission',
    ];
    routes.forEach((r) => {
      try {
        router.prefetch(r);
      } catch {}
    });
  }, [router]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleSwitchTab = (tab: string) => {
    if (tab === 'overview') router.push('/dashboard');
    else if (tab === 'documents') router.push('/dashboard/documents');
    else if (tab === 'papers') router.push('/dashboard/papers');
    else if (tab === 'inst-billing') router.push('/dashboard/billing');
    else if (tab === 'inst-teachers') router.push('/dashboard/teachers');
    else if (tab === 'inst-students') router.push('/dashboard/students');
    else if (tab === 'op-workspace') router.push('/operator/workspace');
    else if (tab === 'op-finance') router.push('/operator/earnings');
    else if (tab === 'settings') router.push('/dashboard/settings');
    else if (tab === 'notifications') router.push('/dashboard/broadcast');
    else if (tab === 'institutes') router.push('/dashboard/admin/institutes');
    else if (tab === 'billing') router.push('/dashboard/admin/billing');
    else if (tab === 'operators') router.push('/dashboard/admin/operators');
  };

  const handleLogout = () => {
    MemoryStore.clear();
    router.replace('/login');
  };

  const handleMobileAction = (action: string) => {
    if (action === 'submitPaper') openModal('paperSubmit');
    else if (action === 'requestDoc') openModal('docSubmit');
  };

  return (
    <div className={`app-shell-root ${isModalActive ? 'has-active-modal' : ''}`}>
      {/* 1. Master Sidebar */}
      <Sidebar
        userRole={user?.role || 'admin'}
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        activeTab={activeTab}
        onSwitchTab={handleSwitchTab}
      />

      {/* 2. Main Wrapper with Canvas Depth Stacking */}
      <div className={`main-wrapper ${isModalActive ? 'canvas-depth-recessed' : ''}`}>
        <div className="header-scrim" />

        {/* Top Header */}
        <TopBar
          title={activeTab.replace('-', ' ')}
          instituteName={user?.institute || ''}
          instituteLogo={user?.logo || ''}
          onToggleSidebar={toggleSidebar}
          onLogout={handleLogout}
          onOpenProfileEditor={() => openModal('userProfile')}
        />

        {/* Content Area */}
        <div className="content-area">{children}</div>
      </div>

      {/* 3. Sara AI Chat Widget */}
      <SaraWidget />

      {/* 4. iOS Mobile Navigation */}
      <MobileNav
        userRole={user?.role || 'admin'}
        activeTab={activeTab}
        onSwitchTab={handleSwitchTab}
        onOpenAction={handleMobileAction}
      />

      {/* 5. Master Modals Host */}
      <ModalHost />

      {/* 6. Apple-grade Top Progress Bar & Toast System */}
      <TopProgressBar />
      <ToastContainer />

      {/* 7. Global ⌘K / Ctrl+K Command Palette */}
      <CommandPalette />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <InnerDashboardLayout>{children}</InnerDashboardLayout>
    </DashboardProvider>
  );
}
