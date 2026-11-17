'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { serverCall, MemoryStore } from '@/lib/api-client';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import IOSSpinner from '@/components/ui/IOSSpinner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await serverCall('login', { email, password });
      if (res.success && res.token) {
        MemoryStore.setToken(res.token);
        MemoryStore.setUser({
          email: res.email || email,
          name: res.name || 'User',
          role: res.role || 'Admin',
          institute: res.institute || '',
          code: res.code || '',
        });
        router.push('/dashboard');
      } else {
        setError(res.message || 'Invalid credentials or inactive account.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error connecting to Backend Server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="loginOverlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'var(--bg)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
      }}
    >
      <div className="loginBox">
        <div className="brandRow" style={{ marginBottom: '25px', justifyContent: 'center' }}>
          <img
            className="logo"
            style={{ width: '50px', height: '50px' }}
            src="https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/logo/new-ETK.png"
            alt="Ed-Trim Key"
          />
          <div className="brand" style={{ fontSize: '24px' }}>
            Ed-Trim Key
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '30px', fontWeight: 600 }}>
          Academic digital workflow system powered by Trim Key
        </p>

        <form onSubmit={handleLogin}>
          <input
            id="email"
            placeholder="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <div style={{ position: 'relative', width: '100%', marginBottom: '30px' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              style={{ width: '100%', paddingRight: '45px', marginBottom: 0 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '15px',
                top: '13px',
                cursor: 'pointer',
                color: 'var(--brand)',
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </span>
          </div>

          <OpticalButton
            type="submit"
            id="loginBtn"
            disabled={loading}
            variant="primary"
            style={{ width: '100%', fontSize: '15px', padding: '15px' }}
          >
            {loading ? <IOSSpinner size={18} color="#05080F" /> : 'Secure Login'}
          </OpticalButton>
        </form>

        <p id="loginErr" style={{ color: 'var(--danger)', fontWeight: 800, marginTop: '15px', minHeight: '18px', fontSize: '12px' }}>
          {error}
        </p>
      </div>
    </div>
  );
}
