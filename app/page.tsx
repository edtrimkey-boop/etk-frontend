'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MemoryStore } from '@/lib/api-client';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = MemoryStore.getToken();
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="spinner-sm" />
    </div>
  );
}
