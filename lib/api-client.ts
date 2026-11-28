/**
 * Centralized API Client targeting backend-ed.trimkey.in
 * Features:
 * - In-flight request deduplication (concurrent identical reads share 1 HTTP request)
 * - Stale-While-Revalidate RAM + sessionStorage read cache (0ms page loads & tab switches)
 * - Automatic cache invalidation on mutations
 * - Persistent dashboard payload snapshot per authenticated session
 */

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || '/api/gateway';

const READ_ACTIONS = new Set([
  'getDashboardPayload',
  'getStudentsList',
  'getTeachersList',
  'getInstituteSettings',
  'getPricingMaster',
  'getBillingSnapshot',
  'getBroadcastHistory',
  'getOperatorEarnings',
  'getAdmissionBootstrap',
  'getPendingProfileRequests',
  'getAttendanceInitialData',
  'getStudentsByClass',
  'getJobTimeline',
  'me',
]);

const MUTATION_KEEP_CACHE = new Set(['markNotificationsRead', 'syncDeviceSession', 'registerDeviceToken']);

export interface ServerCallResponse<T = any> {
  success?: boolean;
  message?: string;
  authFailed?: boolean;
  data?: T;
  [key: string]: any;
}

interface CacheEntry<T = any> {
  data: ServerCallResponse<T>;
  ts: number;
}

const memReadCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<ServerCallResponse<any>>>();
let memPayloadCache: { tokenTail: string; payload: any } | null = null;

function getTokenTail(token: string): string {
  return token ? token.slice(-12) : 'anon';
}

function stablePayloadKey(payloadData: Record<string, any>): string {
  const keys = Object.keys(payloadData)
    .filter((k) => payloadData[k] !== undefined && k !== 'token')
    .sort();
  if (keys.length === 0) return '';
  return keys.map((k) => `${k}=${JSON.stringify(payloadData[k])}`).join('&');
}

function buildCacheKey(action: string, payloadData: Record<string, any> = {}): string {
  const tail = getTokenTail(MemoryStore.getToken());
  const pKey = stablePayloadKey(payloadData);
  return `etk_rc_${tail}_${action}${pKey ? `_${pKey}` : ''}`;
}

function readCachedEntry<T = any>(key: string): CacheEntry<T> | null {
  const mem = memReadCache.get(key);
  if (mem) return mem as CacheEntry<T>;
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed && typeof parsed.ts === 'number' && parsed.data) {
      memReadCache.set(key, parsed);
      return parsed;
    }
  } catch {}
  return null;
}

function writeCachedEntry(key: string, data: ServerCallResponse<any>): void {
  const entry: CacheEntry = { data, ts: Date.now() };
  memReadCache.set(key, entry);
  if (memReadCache.size > 120) {
    const oldest = memReadCache.keys().next().value;
    if (oldest) memReadCache.delete(oldest);
  }
  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify(entry);
      if (serialized.length < 450_000) {
        sessionStorage.setItem(key, serialized);
      }
    } catch {}
  }
}

export function invalidateServerCache(actions?: string[]): void {
  if (!actions || actions.length === 0) {
    memReadCache.clear();
    memPayloadCache = null;
    if (typeof window !== 'undefined') {
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith('etk_rc_')) sessionStorage.removeItem(k);
        }
      } catch {}
    }
    return;
  }

  for (const key of Array.from(memReadCache.keys())) {
    if (actions.some((a) => key.includes(`_${a}`))) {
      memReadCache.delete(key);
    }
  }
  if (typeof window !== 'undefined') {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('etk_rc_') && actions.some((a) => k.includes(`_${a}`))) {
          sessionStorage.removeItem(k);
        }
      }
    } catch {}
  }
}

export class MemoryStore {
  private static tokenKey = 'etk_token';
  private static userKey = 'etk_user';

  static getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(this.tokenKey) || '';
  }

  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  static getUser(): any {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(this.userKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static setUser(user: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
  }

  static getPayload(): any {
    if (typeof window === 'undefined') return null;
    const tail = getTokenTail(this.getToken());
    if (memPayloadCache && memPayloadCache.tokenTail === tail) {
      return memPayloadCache.payload;
    }
    try {
      const raw = localStorage.getItem(`etk_payload_${tail}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      memPayloadCache = { tokenTail: tail, payload: parsed };
      return parsed;
    } catch {
      return null;
    }
  }

  static setPayload(payload: any): void {
    if (typeof window === 'undefined' || !payload) return;
    const tail = getTokenTail(this.getToken());
    memPayloadCache = { tokenTail: tail, payload };
    try {
      const serialized = JSON.stringify(payload);
      if (serialized.length < 1_500_000) {
        localStorage.setItem(`etk_payload_${tail}`, serialized);
      }
    } catch {}
  }

  static clear(): void {
    memReadCache.clear();
    inflightRequests.clear();
    memPayloadCache = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('etk_payload_')) localStorage.removeItem(k);
        }
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && (k.startsWith('etk_rc_') || k.startsWith('etk_dev_synced_'))) {
            sessionStorage.removeItem(k);
          }
        }
      } catch {}
    }
  }
}

export function getCachedServerCall<T = any>(
  action: string,
  payloadData: Record<string, any> = {},
  maxAgeMs = 15 * 60_000
): ServerCallResponse<T> | null {
  const key = buildCacheKey(action, payloadData);
  const entry = readCachedEntry<T>(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > maxAgeMs) return null;
  return entry.data;
}

export async function serverCall<T = any>(
  action: string,
  payloadData: Record<string, any> = {}
): Promise<ServerCallResponse<T>> {
  const isRead = READ_ACTIONS.has(action);
  const cacheKey = isRead ? buildCacheKey(action, payloadData) : '';

  if (isRead && inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)!;
  }

  const requestBody = {
    action,
    token: MemoryStore.getToken(),
    ...payloadData,
  };

  const execPromise = (async (): Promise<ServerCallResponse<T>> => {
    try {
      const response = await fetch(API_GATEWAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const rawText = await response.text();
      if (response.status === 413) {
        throw new Error('Upload payload too large (413). Please reduce PDF/image size and retry.');
      }

      let data: ServerCallResponse<T>;
      try {
        data = JSON.parse(rawText) as ServerCallResponse<T>;
      } catch {
        const snippet = rawText.trim().slice(0, 120);
        throw new Error(
          snippet
            ? `Backend returned invalid response (${response.status}): ${snippet}`
            : `Backend returned empty non-JSON response (${response.status}).`
        );
      }

      if (data.authFailed) {
        if (typeof window !== 'undefined') {
          MemoryStore.clear();
          window.location.href = '/login?expired=true';
        }
        return data;
      }

      if (isRead && data && data.success !== false) {
        writeCachedEntry(cacheKey, data);
      } else if (!isRead && !MUTATION_KEEP_CACHE.has(action) && data?.success !== false) {
        invalidateServerCache();
      }

      return data;
    } catch (error: any) {
      console.error('API Error:', error);
      throw new Error(error.message || 'Network error connecting to Backend Server.');
    } finally {
      if (isRead) inflightRequests.delete(cacheKey);
    }
  })();

  if (isRead) {
    inflightRequests.set(cacheKey, execPromise);
  }

  return execPromise;
}

export async function serverCallCached<T = any>(
  action: string,
  payloadData: Record<string, any> = {},
  options: { ttlMs?: number; force?: boolean } = {}
): Promise<ServerCallResponse<T>> {
  const { ttlMs = 15_000, force = false } = options;
  if (!force) {
    const fresh = getCachedServerCall<T>(action, payloadData, ttlMs);
    if (fresh) return fresh;
  }
  return serverCall<T>(action, payloadData);
}
