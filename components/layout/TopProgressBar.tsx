// components/layout/TopProgressBar.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';

export default function TopProgressBar() {
  const { loading } = useDashboard();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;

    if (loading) {
      setVisible(true);
      setProgress(25);
      timer1 = setTimeout(() => {
        setProgress(70);
      }, 200);
      timer2 = setTimeout(() => {
        setProgress(88);
      }, 500);
    } else {
      setProgress(100);
      timer1 = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [loading]);

  if (!visible && progress === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '2.5px',
        zIndex: 1000001,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #00fba6, #26c3ea, #00fba6)',
          backgroundSize: '200% 100%',
          boxShadow: '0 0 12px rgba(0, 251, 166, 0.8), 0 0 4px rgba(38, 195, 234, 0.6)',
          transition: progress === 100 ? 'width 0.2s ease-out, opacity 0.3s ease 0.1s' : 'width 0.4s cubic-bezier(0.1, 0.5, 0.1, 1)',
          opacity: visible ? 1 : 0,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  );
}
