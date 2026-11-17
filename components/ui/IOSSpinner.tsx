// components/ui/IOSSpinner.tsx
'use client';

import React from 'react';

interface IOSSpinnerProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export default function IOSSpinner({ size = 20, color = 'currentColor', style }: IOSSpinnerProps) {
  return (
    <div
      className="ios-spinner"
      style={{
        width: size,
        height: size,
        color,
        ...style,
      }}
    >
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}
