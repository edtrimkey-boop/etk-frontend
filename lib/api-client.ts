/**
 * Centralized API Client targeting backend-ed.trimkey.in
 * Connects directly to the Vercel Serverless Gateway.
 */

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || '/api/gateway';

export interface ServerCallResponse<T = any> {
  success?: boolean;
  message?: string;
  authFailed?: boolean;
  data?: T;
  [key: string]: any;
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

  static clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
  }
}

export async function serverCall<T = any>(
  action: string,
  payloadData: Record<string, any> = {}
): Promise<ServerCallResponse<T>> {
  const requestBody = {
    action,
    token: MemoryStore.getToken(),
    ...payloadData,
  };

  try {
    const response = await fetch(API_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data: ServerCallResponse<T> = await response.json();

    // Global security interceptor
    if (data.authFailed) {
      if (typeof window !== 'undefined') {
        MemoryStore.clear();
        window.location.href = '/login?expired=true';
      }
      return data;
    }

    return data;
  } catch (error: any) {
    console.error('API Error:', error);
    throw new Error(error.message || 'Network error connecting to Backend Server.');
  }
}
