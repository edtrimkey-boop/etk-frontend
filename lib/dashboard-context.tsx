'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MemoryStore, serverCall } from '@/lib/api-client';
import { playSound } from '@/lib/sound';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/pricing';
import { supabase } from '@/lib/supabase';
import { syncDeviceSession, requestAndRegisterPush, subscribeForegroundPush } from '@/lib/firebase';

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
  const [user, setUser] = useState<any>(null);
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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
        
        // Auto-resolve Supabase Institute UUID if missing or short code
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!mergedUser.institute_id || !UUID_REGEX.test(mergedUser.institute_id)) {
          const instCode = mergedUser.code || mergedUser.instId;
          const instEmail = mergedUser.email;
          const headers = {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          };
          try {
            let resolvedId: string | null = null;
            if (instCode && instCode !== 'all') {
              const checkRes = await fetch(
                `${SUPABASE_URL}/rest/v1/institutes?institute_code=eq.${encodeURIComponent(instCode)}&select=id&limit=1`,
                { headers }
              );
              if (checkRes.ok) {
                const data = await checkRes.json();
                if (data?.[0]?.id) resolvedId = data[0].id;
              }
            }
            if (!resolvedId && instEmail) {
              const checkRes = await fetch(
                `${SUPABASE_URL}/rest/v1/institutes?admin_email=eq.${encodeURIComponent(instEmail)}&select=id&limit=1`,
                { headers }
              );
              if (checkRes.ok) {
                const data = await checkRes.json();
                if (data?.[0]?.id) resolvedId = data[0].id;
              }
            }
            if (resolvedId) {
              mergedUser.institute_id = resolvedId;
            }
          } catch (resErr) {
            console.warn('[Dashboard] Institute UUID resolution warning:', resErr);
          }
        }

        setUser(mergedUser);
        MemoryStore.setUser(mergedUser);
        if (mergedUser.logo) {
          try {
            localStorage.setItem('tk_saved_inst_logo', mergedUser.logo);
          } catch (e) {}
        }
      }

      setPayload(res);

      if (Array.isArray(res?.notifications)) {
        let localHashes: string[] = [];
        try {
          localHashes = JSON.parse(localStorage.getItem('read_notif_hashes') || '[]');
        } catch {}
        const hydrated: NotificationItem[] = res.notifications.map((n: any) => {
          const hash = (String(n.title || '') + String(n.msg || '')).substring(0, 50);
          return {
            title: n.title,
            msg: n.msg,
            time: n.time || 'Recent',
            isRead: Boolean(n.isRead) || localHashes.includes(hash),
            refId: n.refId,
          };
        });
        setNotifications(hydrated);
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

    refreshData(false);
  }, [router, refreshData]);

  // 1. Device Session Sync, Silent FCM Token Refresh & Foreground Push Listener
  useEffect(() => {
    if (!user?.email) return;
    if (deviceSyncedForEmailRef.current === user.email) return;
    deviceSyncedForEmailRef.current = user.email;

    let unsubscribeForeground: (() => void) | null = null;

    syncDeviceSession(user.email).then((synced) => {
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

  // 2. Master Supabase Realtime Engine (In-App Toasts, Bell Alerts, Live Job Queue)
  useEffect(() => {
    if (!user?.id) return;

    const sessionToken = MemoryStore.getToken();
    if (sessionToken) {
      try {
        supabase.realtime.setAuth(sessionToken);
      } catch {}
    }

    const channelName = `system-events-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (pgPayload) => {
        const notif: any = pgPayload.new;
        const curUser = userRef.current;
        if (!curUser || !notif) return;

        // Parse array or Postgres string arrays cleanly
        const parseArr = (val: any): string[] => {
          if (Array.isArray(val)) return val.map((x) => String(x).trim().toLowerCase());
          if (typeof val === 'string') {
            return val
              .replace(/[{}]/g, '')
              .split(',')
              .map((x) => x.trim().toLowerCase())
              .filter(Boolean);
          }
          return [];
        };

        const tUsers = parseArr(notif.target_users);
        const tRoles = parseArr(notif.target_roles);
        const myId = String(curUser.id || '').toLowerCase();
        const myRole = String(curUser.role || '').trim().toLowerCase();
        const myRoleAlt = myRole.replace(/\s+/g, '_');
        const myInstId = String(curUser.institute_id || curUser.instId || '').toLowerCase();

        const isTargetedUser = myId !== '' && tUsers.includes(myId);
        const isTargetedRole =
          myRole !== '' &&
          (tRoles.includes(myRole) || tRoles.includes(myRoleAlt) || tRoles.includes('all'));
        const isGlobalWorker = ['operator', 'system admin', 'super admin', 'super_admin'].includes(myRole);
        const isMyInstitute =
          !notif.institute_id || isGlobalWorker || String(notif.institute_id).toLowerCase() === myInstId;

        if ((isTargetedUser || isTargetedRole) && isMyInstitute) {
          const refId = notif.reference_id;
          const isViewingThisChat =
            activeModalRef.current === 'jobChat' &&
            Boolean(refId) &&
            String(modalDataRef.current?.jobId || '').toUpperCase() === String(refId).toUpperCase();

          if (isViewingThisChat) {
            try {
              const hash = (String(notif.title || '') + String(notif.message || '')).substring(0, 50);
              const localHashes: string[] = JSON.parse(localStorage.getItem('read_notif_hashes') || '[]');
              if (!localHashes.includes(hash)) {
                localHashes.push(hash);
                localStorage.setItem('read_notif_hashes', JSON.stringify(localHashes));
              }
            } catch {}
          } else {
            fireDedupedNotificationToast(notif.title || 'System Alert', notif.message || '');
          }

          const newNotif: NotificationItem = {
            id: notif.id,
            title: notif.title || 'System Alert',
            msg: notif.message || '',
            time: new Date(notif.created_at || Date.now()).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }),
            isRead: isViewingThisChat,
            refId,
          };

          setNotifications((prev) => {
            if (newNotif.id && prev.some((p) => p.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs_queue' }, () => {
        if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = setTimeout(() => {
          refreshData(true);
        }, 800);
      })
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshData, fireDedupedNotificationToast]);

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
