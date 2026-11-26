'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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

function InnerAdmissionLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, openModal, activeModal, alertState, confirmState, uploadProgress } = useDashboard();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isModalActive = Boolean(activeModal || alertState?.open || confirmState?.open || uploadProgress?.open);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const handleSwitchTab = (tab: string) => {
    if (tab === 'admission') router.push('/admission');
    else if (tab === 'overview') router.push('/dashboard');
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
      <Sidebar
        userRole={user?.role || 'admin'}
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        activeTab="admission"
        onSwitchTab={handleSwitchTab}
      />

      <div className={`main-wrapper ${isModalActive ? 'canvas-depth-recessed' : ''}`}>
        <div className="header-scrim" />

        <TopBar
          title="Admission System"
          instituteName={user?.institute || ''}
          instituteLogo={user?.logo || ''}
          onToggleSidebar={toggleSidebar}
          onLogout={handleLogout}
          onOpenProfileEditor={() => openModal('userProfile')}
        />

        <div className="content-area">{children}</div>
      </div>

      <SaraWidget />

      <MobileNav
        userRole={user?.role || 'admin'}
        activeTab="admission"
        onSwitchTab={handleSwitchTab}
        onOpenAction={handleMobileAction}
      />

      <ModalHost />
      <TopProgressBar />
      <ToastContainer />
      <CommandPalette />
    </div>
  );
}

export default function AdmissionLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <InnerAdmissionLayout>{children}</InnerAdmissionLayout>
    </DashboardProvider>
  );
}
