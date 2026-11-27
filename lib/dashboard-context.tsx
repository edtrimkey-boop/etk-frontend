'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MemoryStore, serverCall } from '@/lib/api-client';
import { playSound } from '@/lib/sound';
import { syncDeviceSession, requestAndRegisterPush, subscribeForegroundPush } from '@/lib/firebase';

let lastDashboardSyncAt = 0;

function hydrateNotificationsFromPayload(res: any): NotificationItem[] {
  if (!Array.isArray(res?.notifications)) return [];
  let localHashes: string[] = [];
  try {
    localHashes = JSON.parse(localStorage.getItem('read_notif_hashes') || '[]');
  } catch {}
  return res.notifications.map((n: any) => {
    const hash = (String(n.title || '') + String(n.msg || '')).substring(0, 50);
    return {
      title: n.title,
      msg: n.msg,
      time: n.time || 'Recent',
      isRead: Boolean(n.isRead) || localHashes.includes(hash),
      refId: n.refId,
    };
  });
}

export interface NotificationItem {
  id?: string;
  title: string;
  msg: string;
  time: string;
  isRead: boolean;
  refId?: string;
}

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
  title?: string;
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
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info', title?: string) => void;
  removeToast: (id: string) => void;
  notifications: NotificationItem[];
  markAllNotificationsRead: () => Promise<void>;
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
  const [user, setUser] = useState<any>(() => MemoryStore.getUser());
  const [payload, setPayload] = useState<any>(() => MemoryStore.getPayload());
  const [loading, setLoading] = useState<boolean>(() => !MemoryStore.getPayload());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    hydrateNotificationsFromPayload(MemoryStore.getPayload())
  );

  // Toasts state (Apple / Linear style non-blocking notifications)
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (msg: string, type: 'success' | 'warning' | 'error' | 'info' = 'success', title?: string) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      setToasts((prev) => [...prev, { id, title, msg, type }]);

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
    },
    []
  );

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

  const lastUserJsonRef = useRef<string>('');
  const lastPayloadJsonRef = useRef<string>('');
  const lastNotifsJsonRef = useRef<string>('');

  const refreshData = useCallback(async (silent = false) => {
    const cachedUser = MemoryStore.getUser();
    if (!cachedUser?.email) return;

    const now = Date.now();
    if (silent && MemoryStore.getPayload() && now - lastDashboardSyncAt < 3500) {
      return;
    }

    if (!silent && !MemoryStore.getPayload()) {
      setLoading(true);
    }

    try {
      const res = await serverCall('getDashboardPayload', {
        email: cachedUser.email,
        token: MemoryStore.getToken(),
      });
      lastDashboardSyncAt = Date.now();

      if (res && res.authFailed) {
        MemoryStore.clear();
        router.replace('/login?expired=true');
        return;
      }

      if (res && res.profile) {
        const mergedUser = { ...cachedUser, ...res.profile };
        const userJson = JSON.stringify(mergedUser);
        if (userJson !== lastUserJsonRef.current) {
          lastUserJsonRef.current = userJson;
          setUser(mergedUser);
          MemoryStore.setUser(mergedUser);
        }
        if (mergedUser.logo) {
          try {
            localStorage.setItem('tk_saved_inst_logo', mergedUser.logo);
          } catch (e) {}
        }
      }

      const payloadJson = JSON.stringify(res);
      if (payloadJson !== lastPayloadJsonRef.current) {
        lastPayloadJsonRef.current = payloadJson;
        setPayload(res);
        MemoryStore.setPayload(res);
      }

      if (Array.isArray(res?.notifications)) {
        const nextNotifs = hydrateNotificationsFromPayload(res);
        const notifsJson = JSON.stringify(nextNotifs);
        if (notifsJson !== lastNotifsJsonRef.current) {
          lastNotifsJsonRef.current = notifsJson;
          setNotifications(nextNotifs);
        }
      }
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

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => {
      try {
        const localHashes: string[] = JSON.parse(localStorage.getItem('read_notif_hashes') || '[]');
        const nextHashes = Array.from(
          new Set([
            ...localHashes,
            ...prev.map((n) => (String(n.title || '') + String(n.msg || '')).substring(0, 50)),
          ])
        );
        localStorage.setItem('read_notif_hashes', JSON.stringify(nextHashes));
      } catch {}
      return prev.map((n) => ({ ...n, isRead: true }));
    });
    if (user?.email) {
      serverCall('markNotificationsRead', { email: user.email }).catch(() => {});
    }
  }, [user?.email]);

  // Keep refs updated for Realtime callbacks
  const userRef = useRef<any>(null);
  const activeModalRef = useRef<string | null>(null);
  const modalDataRef = useRef<any>(null);
  const recentToastHashesRef = useRef<Map<string, number>>(new Map());
  const deviceSyncedForEmailRef = useRef<string | null>(null);
  const realtimeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    activeModalRef.current = activeModal;
  }, [activeModal]);
  useEffect(() => {
    modalDataRef.current = modalData;
  }, [modalData]);

  const fireDedupedNotificationToast = useCallback(
    (title: string, msg: string) => {
      const key = `${title}::${msg}`.slice(0, 80);
      const now = Date.now();
      const prevTs = recentToastHashesRef.current.get(key);
      if (prevTs && now - prevTs < 5000) return; // Deduplicate identical foreground FCM + Supabase Realtime triggers
      recentToastHashesRef.current.set(key, now);

      const shortMsg = msg.length > 65 ? msg.substring(0, 65) + '...' : msg;
      showToast(shortMsg, 'info', title);
    },
    [showToast]
  );

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

    const cachedPayload = MemoryStore.getPayload();
    if (cachedPayload) {
      setPayload(cachedPayload);
      setNotifications(hydrateNotificationsFromPayload(cachedPayload));
      setLoading(false);
    }

    refreshData(Boolean(cachedPayload));
  }, [router, refreshData]);

  // 1. Device Session Sync, Silent FCM Token Refresh & Foreground Push Listener
  useEffect(() => {
    if (!user?.email) return;
    if (deviceSyncedForEmailRef.current === user.email) return;
    deviceSyncedForEmailRef.current = user.email;

    let unsubscribeForeground: (() => void) | null = null;
    const syncKey = `etk_dev_synced_${user.email}`;
    const alreadySyncedThisTab =
      typeof window !== 'undefined' && sessionStorage.getItem(syncKey) === '1';

    if (!alreadySyncedThisTab) {
      syncDeviceSession(user.email).then((synced) => {
        if (synced?.success && typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(syncKey, '1');
          } catch {}
        }
        if (synced?.preferences) {
          try {
            localStorage.setItem(
              'tk_notif_prefs',
              JSON.stringify({
                push: Boolean(synced.preferences.push),
                wa: Boolean(synced.preferences.whatsapp),
                sms: Boolean(synced.preferences.sms),
                email: Boolean(synced.preferences.email),
              })
            );
          } catch {}
        }

        const browserGranted = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
        if (synced?.preferences?.push || browserGranted) {
          requestAndRegisterPush(user.email, {
            isSilent: true,
            forceEnablePref: browserGranted && !synced?.preferences?.push,
          });
        }
      });
    }

    subscribeForegroundPush(({ title, body }) => {
      fireDedupedNotificationToast(title, body);
      setNotifications((prev) => [
        {
          title,
          msg: body,
          time: new Date().toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
          isRead: false,
        },
        ...prev,
      ]);
    }).then((unsub) => {
      unsubscribeForeground = unsub;
    });

    return () => {
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, [user?.email, fireDedupedNotificationToast]);

  // 2. Adaptive Background Sync Engine (Backend Gateway Polling + Focus Sync)
  useEffect(() => {
    if (!user?.id) return;

    const triggerDebouncedSync = () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      realtimeDebounceRef.current = setTimeout(() => {
        refreshData(true);
      }, 400);
    };

    const syncInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      refreshData(true);
    }, 12000);

    const onVisibilityOrFocus = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        triggerDebouncedSync();
      }
    };

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    return () => {
      clearInterval(syncInterval);
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
  }, [user?.id, refreshData]);

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
        notifications,
        markAllNotificationsRead,
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
