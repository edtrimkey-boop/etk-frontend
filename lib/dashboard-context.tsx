'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MemoryStore, serverCall } from '@/lib/api-client';
import { playSound } from '@/lib/sound';

export interface UploadProgressState {
  open: boolean;
  state: 'uploading' | 'success' | 'error';
  percent: number;
  text: string;
  stats: string;
  jobId?: string;
  timestamp?: string;
  onCancel?: () => void;
  onRetry?: () => void;
}

export interface ToastItem {
  id: string;
  msg: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface DashboardContextType {
  user: any;
  payload: any;
  loading: boolean;
  refreshData: (silent?: boolean) => Promise<void>;
  activeModal: string | null;
  modalData: any;
  openModal: (modalName: string, data?: any) => void;
  closeModal: () => void;
  showAlert: (msg: string, title?: string) => void;
  showConfirm: (msg: string, onConfirm: () => void) => void;
  alertState: { open: boolean; title: string; msg: string };
  closeAlert: () => void;
  confirmState: { open: boolean; msg: string; onConfirm: (() => void) | null };
  closeConfirm: () => void;
  toasts: ToastItem[];
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  showLoader: (text?: string) => void;
  hideLoader: () => void;
  loaderState: { visible: boolean; text: string };
  playNotificationSound: (type: 'notification' | 'error' | 'warning' | 'success') => void;
  uploadProgress: UploadProgressState;
  showUploadProgress: (initText?: string, onCancel?: () => void) => void;
  updateUploadProgress: (percent: number, stats?: string, text?: string) => void;
  showUploadSuccess: (jobId: string, timestamp?: string) => void;
  showUploadError: (errMsg: string, onRetry?: () => void) => void;
  closeUploadProgress: () => void;
  updateUserAvatar: (url: string) => void;
  opticalGlassEnabled: boolean;
  setOpticalGlassEnabled: (enabled: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Toasts state (Apple / Linear style non-blocking notifications)
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((msg: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, msg, type }]);

    if (type === 'success') {
      playSound('success');
    } else if (type === 'warning') {
      playSound('warning');
    } else if (type === 'error') {
      playSound('error');
    } else if (type === 'info') {
      playSound('notification');
    }

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync loader state (strictly reserved for hard session wipes / critical security locks)
  const [loaderState, setLoaderState] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: 'SYNCING DATABASE...',
  });

  const showLoader = useCallback((text = 'SYNCING DATABASE...') => {
    setLoaderState({ visible: true, text });
  }, []);

  const hideLoader = useCallback(() => {
    setLoaderState((prev) => ({ ...prev, visible: false }));
  }, []);

  // Modals state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  // Upload Progress Modal State
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({
    open: false,
    state: 'uploading',
    percent: 0,
    text: 'PREPARING PIPELINE...',
    stats: '-- MB/s | --:-- left',
  });

  const showUploadProgress = useCallback((initText = 'PREPARING PIPELINE...', onCancel?: () => void) => {
    setUploadProgress({
      open: true,
      state: 'uploading',
      percent: 0,
      text: initText,
      stats: '-- MB/s | --:-- left',
      onCancel,
    });
  }, []);

  const updateUploadProgress = useCallback((percent: number, stats?: string, text?: string) => {
    setUploadProgress((prev) => ({
      ...prev,
      percent: Math.min(Math.max(percent, 0), 100),
      stats: stats || prev.stats,
      text: text || prev.text,
    }));
  }, []);

  const showUploadSuccess = useCallback((jobId: string, timestamp?: string) => {
    playSound('success');
    const timeStr = timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setUploadProgress((prev) => ({
      ...prev,
      open: true,
      state: 'success',
      percent: 100,
      jobId,
      timestamp: timeStr,
    }));
  }, []);

  const showUploadError = useCallback((errMsg: string, onRetry?: () => void) => {
    playSound('error');
    setUploadProgress((prev) => ({
      ...prev,
      state: 'error',
      text: errMsg || 'PIPELINE FAILED',
      stats: 'Transmission error',
      onRetry,
    }));
  }, []);

  const closeUploadProgress = useCallback(() => {
    setUploadProgress((prev) => ({ ...prev, open: false }));
  }, []);

  const updateUserAvatar = useCallback((url: string) => {
    setUser((prev: any) => {
      const updated = { ...prev, profile_pic_url: url, profilePic: url };
      MemoryStore.setUser(updated);
      return updated;
    });
  }, []);

  // Optical Liquid Glass (samasante/liquid-glass) live preview toggle — default ON for testing
  const [opticalGlassEnabled, setOpticalGlassEnabledState] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tk_optical_glass');
      if (saved === 'false') setOpticalGlassEnabledState(false);
    } catch (e) {}
  }, []);

  const setOpticalGlassEnabled = useCallback((enabled: boolean) => {
    setOpticalGlassEnabledState(enabled);
    try {
      localStorage.setItem('tk_optical_glass', enabled ? 'true' : 'false');
    } catch (e) {}
  }, []);

  // Alert & Confirm dialog state
  const [alertState, setAlertState] = useState<{ open: boolean; title: string; msg: string }>({
    open: false,
    title: 'System Notice',
    msg: '',
  });

  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onConfirm: (() => void) | null }>({
    open: false,
    msg: '',
    onConfirm: null,
  });

  const playNotificationSound = useCallback((type: 'notification' | 'error' | 'warning' | 'success') => {
    playSound(type);
  }, []);

  const showAlert = useCallback((msg: string, title = 'System Notice') => {
    const lowerTitle = title.toLowerCase();
    const lowerMsg = msg.toLowerCase();
    if (
      lowerTitle.includes('error') ||
      lowerMsg.includes('failed') ||
      lowerMsg.includes('error') ||
      lowerMsg.includes('invalid') ||
      lowerMsg.includes('unauthorized') ||
      lowerMsg.includes('refused')
    ) {
      playSound('error');
    } else if (
      lowerTitle.includes('warning') ||
      lowerTitle.includes('caution') ||
      lowerTitle.includes('notice') ||
      lowerMsg.includes('please fill') ||
      lowerMsg.includes('required') ||
      lowerMsg.includes('missing') ||
      lowerMsg.includes('match') ||
      lowerMsg.includes('already exist')
    ) {
      playSound('warning');
    } else {
      playSound('success');
    }

    setAlertState({ open: true, title, msg });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, open: false }));
  }, []);

  const showConfirm = useCallback((msg: string, onConfirm: () => void) => {
    playSound('warning');
    setConfirmState({ open: true, msg, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState({ open: false, msg: '', onConfirm: null });
  }, []);

  const openModal = useCallback((modalName: string, data?: any) => {
    setModalData(data || null);
    setActiveModal(modalName);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  const refreshData = useCallback(async (silent = false) => {
    const cachedUser = MemoryStore.getUser();
    if (!cachedUser?.email) return;

    if (!silent) {
      setLoading(true);
    }

    try {
      const res = await serverCall('getDashboardPayload', {
        email: cachedUser.email,
        token: MemoryStore.getToken(),
      });

      if (res && res.authFailed) {
        MemoryStore.clear();
        router.replace('/login?expired=true');
        return;
      }

      if (res && res.profile) {
        const mergedUser = { ...cachedUser, ...res.profile };
        setUser(mergedUser);
        MemoryStore.setUser(mergedUser);
        if (mergedUser.logo) {
          try {
            localStorage.setItem('tk_saved_inst_logo', mergedUser.logo);
          } catch (e) {}
        }
      }

      setPayload(res);
    } catch (err: any) {
      console.warn('Dashboard sync note:', err.message);
      if (!silent) {
        showAlert('Server sync issue: ' + err.message, 'Connection Warning');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [router, showAlert]);

  useEffect(() => {
    const token = MemoryStore.getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const cachedUser = MemoryStore.getUser();
    if (cachedUser) {
      setUser(cachedUser);
    }

    refreshData(false);
  }, [router, refreshData]);

  return (
    <DashboardContext.Provider
      value={{
        user,
        payload,
        loading,
        refreshData,
        activeModal,
        modalData,
        openModal,
        closeModal,
        showAlert,
        showConfirm,
        alertState,
        closeAlert,
        confirmState,
        closeConfirm,
        toasts,
        showToast,
        removeToast,
        showLoader,
        hideLoader,
        loaderState,
        playNotificationSound,
        uploadProgress,
        showUploadProgress,
        updateUploadProgress,
        showUploadSuccess,
        showUploadError,
        closeUploadProgress,
        updateUserAvatar,
        opticalGlassEnabled,
        setOpticalGlassEnabled,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

export function useOptionalDashboard() {
  return useContext(DashboardContext);
}
