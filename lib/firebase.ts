'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { serverCall } from '@/lib/api-client';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAd0HAZ6-hLPdnU3rMsghqWKBc0z6ca68w',
  authDomain: 'ed-trim-key.firebaseapp.com',
  projectId: 'ed-trim-key',
  storageBucket: 'ed-trim-key.firebasestorage.app',
  messagingSenderId: '1078045852332',
  appId: '1:1078045852332:web:95b0deb2bbe6a902069509',
};

const VAPID_KEY =
  'BLCZZHdR6pKwKXhFG1VXU3JAgLi3ZaBFjWTLV9KH3wayHeY-zMmVQr4DM-cXFrSDrO9-YNMxKW_0VbtwhMy0U6o';

let firebaseApp: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (firebaseApp) return firebaseApp;
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
  return firebaseApp;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    const app = getFirebaseApp();
    if (!app) return null;
    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  } catch (err) {
    console.warn('[FCM] Messaging init skipped:', err);
    return null;
  }
}

export function getDeviceFootprint() {
  if (typeof navigator === 'undefined') {
    return { os: 'Unknown', browser: 'Unknown Browser', deviceType: 'Desktop' };
  }
  const parser = navigator.userAgent || '';
  const osMatch = parser.match(/(Windows NT 10\.0|Windows NT 6\.2|Mac OS X|Linux|Android|iOS|iPhone|iPad)/i);
  const os = osMatch ? osMatch[0] : navigator.platform || 'Unknown';

  const browserMatch = parser.match(/(Chrome|Safari|Firefox|Edg|Edge|Opera)\/?\s*(\d+)/i) || [];
  const browser = browserMatch[1] ? `${browserMatch[1]} ${browserMatch[2] || ''}`.trim() : 'Unknown Browser';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(parser);
  const deviceType = isMobile ? 'Mobile' : 'Desktop';

  return { os, browser, deviceType };
}

export function getStoredSessionId(email?: string): string | null {
  if (typeof window === 'undefined' || !email) return null;
  try {
    return localStorage.getItem(`tk_session_${email}`);
  } catch {
    return null;
  }
}

export async function syncDeviceSession(email?: string): Promise<{
  success: boolean;
  sessionId?: string;
  preferences?: { push: boolean; whatsapp: boolean; sms: boolean; email: boolean };
}> {
  if (typeof window === 'undefined' || !email) return { success: false };

  const storageKey = `tk_session_${email}`;
  const localSessionId = getStoredSessionId(email);
  const { os, browser, deviceType } = getDeviceFootprint();

  let ipAddress = 'Unknown';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const ipRes = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timer);
    if (ipRes.ok) {
      const ipJson = await ipRes.json();
      if (ipJson?.ip) ipAddress = ipJson.ip;
    }
  } catch {
    // Non-blocking: proceed without external IP
  }

  try {
    const res = await serverCall('syncDeviceSession', {
      sessionId: localSessionId,
      deviceName: os,
      deviceType,
      browser,
      ipAddress,
    });

    if (res && res.success && res.sessionId) {
      try {
        localStorage.setItem(storageKey, res.sessionId);
      } catch {}
      return {
        success: true,
        sessionId: res.sessionId,
        preferences: res.preferences,
      };
    }
  } catch (err) {
    console.warn('[DeviceSync] Failed:', err);
  }
  return { success: false };
}

export async function updateServerDevicePreference(
  email: string | undefined,
  type: 'push' | 'whatsapp' | 'sms' | 'email',
  value: boolean
): Promise<boolean> {
  if (!email) return false;
  let sessionId = getStoredSessionId(email);
  if (!sessionId) {
    const synced = await syncDeviceSession(email);
    sessionId = synced.sessionId || null;
  }
  if (!sessionId) return false;

  try {
    const res = await serverCall('updatePreferences', {
      type,
      value,
      sessionId,
    });
    return Boolean(res?.success);
  } catch (err) {
    console.warn('[DevicePrefs] Update failed:', err);
    return false;
  }
}

export async function requestAndRegisterPush(
  email: string | undefined,
  options: { isSilent?: boolean; forceEnablePref?: boolean } = {}
): Promise<{ success: boolean; reason?: string; token?: string }> {
  const { isSilent = false, forceEnablePref = false } = options;

  if (typeof window === 'undefined') return { success: false, reason: 'No window' };

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return {
      success: false,
      reason: "Push not supported in this browser tab. On iPhone/iPad, tap Share → 'Add to Home Screen' and open from the Home Screen icon.",
    };
  }

  if (Notification.permission === 'denied') {
    return {
      success: false,
      reason: 'Notifications are blocked for this site. Please allow Notifications in your browser or device settings.',
    };
  }

  try {
    let permission: NotificationPermission = Notification.permission;
    // Strictly ask permission only on explicit user gesture (iOS crashes/ignores silent prompt)
    if (!isSilent && permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return { success: false, reason: 'Notification permission was not granted.' };
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return { success: false, reason: 'Firebase Cloud Messaging is not supported on this device/context.' };
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;

    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!currentToken) {
      return { success: false, reason: 'Connected to Firebase, but no device push token was returned.' };
    }

    let sessionId = getStoredSessionId(email);
    if (!sessionId && email) {
      const synced = await syncDeviceSession(email);
      sessionId = synced.sessionId || null;
    }

    if (!sessionId) {
      return { success: false, reason: 'Device session could not be established. Try refreshing the page.' };
    }

    const regRes = await serverCall('registerDeviceToken', {
      fcmToken: currentToken,
      sessionId,
    });

    if (!regRes?.success) {
      return { success: false, reason: regRes?.message || 'Failed to save push token to server.' };
    }

    if (!isSilent || forceEnablePref) {
      await updateServerDevicePreference(email, 'push', true);
    }

    return { success: true, token: currentToken };
  } catch (err: any) {
    console.error('[FCM] Push registration error:', err);
    return { success: false, reason: err?.message || 'Push registration failed.' };
  }
}

export async function subscribeForegroundPush(
  onPayload: (payload: { title: string; body: string }) => void
): Promise<() => void> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.title || 'Ed-Trim Key Alert';
    const body = payload.notification?.body || payload.data?.body || payload.data?.message || '';
    onPayload({ title, body });
  });
}
