// components/ui/Skeleton.tsx
'use client';

import React from 'react';

export function SkeletonBlock({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  style,
  className = '',
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`tk-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.09) 50%, rgba(255, 255, 255, 0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'tkShimmer 1.8s infinite ease-in-out',
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ height = '120px' }: { height?: string }) {
  return (
    <div
      className="panel"
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(15, 23, 42, 0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBlock width="45%" height="14px" />
        <SkeletonBlock width="28px" height="28px" borderRadius="50%" />
      </div>
      <div>
        <SkeletonBlock width="60%" height="28px" style={{ marginBottom: '8px' }} />
        <SkeletonBlock width="35%" height="11px" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="tk-table-wrapper" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <table className="tk-sleek-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, c) => (
              <th key={c}>
                <SkeletonBlock width="70%" height="12px" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <SkeletonBlock
                    width={c === 0 ? '80%' : c === cols - 1 ? '50%' : '65%'}
                    height="16px"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
