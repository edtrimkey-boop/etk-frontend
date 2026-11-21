// components/ui/OpticalGlass.tsx
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Glass,
  MASTER_GLASS_OPTICS,
  MASTER_GLASS_BG,
  type GlassOptics,
} from '@/lib/liquid-glass';
import { useOptionalDashboard } from '@/lib/dashboard-context';

// Single source of truth: directly inherits MASTER_GLASS_OPTICS from lib/liquid-glass/glass-config.ts
export const ETK_OPTICAL_DEFAULTS: Partial<GlassOptics> = MASTER_GLASS_OPTICS;

type Variant = 'primary' | 'warning' | 'danger' | 'success' | 'purple' | 'secondary' | 'outline' | 'surface';
type GlassMode = 'optical' | 'frosted';

const SOLID_VARIANTS = new Set<Variant>(['primary', 'success', 'warning', 'danger', 'purple']);

// Exact original Ed-Trim Key colors from index.html / globals.css:
// Solid vivid fills for primary/success/warning/danger/purple; shared MASTER_GLASS_BG for translucent glass.
const VARIANT_BG: Record<Variant, string> = {
  primary: 'var(--brand, #26C3EA)',
  success: 'var(--success, #2ECC71)',
  warning: 'var(--accent, #F59E0B)',
  danger: 'var(--danger, #EF4444)',
  purple: 'var(--purple, #8B5CF6)',
  secondary: MASTER_GLASS_BG,
  outline: MASTER_GLASS_BG,
  surface: MASTER_GLASS_BG,
};

const VARIANT_COLOR: Record<Variant, string> = {
  primary: '#05080F',
  success: '#05080F',
  warning: '#05080F',
  danger: '#ffffff',
  purple: '#ffffff',
  secondary: '#f1f5f9',
  outline: '#26C3EA',
  surface: '#f1f5f9',
};

const VARIANT_SHADOW: Record<Variant, string> = {
  primary: '0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
  success: '0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
  warning: '0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
  danger: '0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
  purple: '0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
  secondary: '0 6px 20px -6px rgba(0, 0, 0, 0.35)',
  outline: '0 4px 16px -6px rgba(0, 0, 0, 0.3)',
  surface: '0 8px 24px -6px rgba(0, 0, 0, 0.42)',
};

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'liquid-glass btn-primary',
  success: 'liquid-glass btn-success',
  warning: 'liquid-glass btn-warning',
  danger: 'liquid-glass btn-danger',
  purple: 'liquid-glass btn-purple',
  secondary: 'liquid-glass btn-secondary',
  outline: 'liquid-glass btn-outline',
  surface: 'liquid-glass',
};

const FROSTED_BLUR = Math.max(MASTER_GLASS_OPTICS.frost ?? 1, 14);
const FROSTED_STYLE: React.CSSProperties = {
  backdropFilter: `blur(${FROSTED_BLUR}px) saturate(${MASTER_GLASS_OPTICS.saturate ?? 1.8})`,
  WebkitBackdropFilter: `blur(${FROSTED_BLUR}px) saturate(${MASTER_GLASS_OPTICS.saturate ?? 1.8})`,
  border: 'none',
  boxShadow: 'none',
};

// Removes legacy CSS-glass skin classes so layout/responsive classes (nav-pill-box, fab-dock,
// glass-title-pill, user-profile-container, desktop-only, open, active, etc.) stay intact on mobile & desktop.
function stripLegacyGlassClass(className?: string): string {
  if (!className) return '';
  return className
    .split(/\s+/)
    .filter((token) => token && token !== 'liquid-glass' && token !== 'glass-surface')
    .join(' ');
}

// Splits outer spacing/layout styles (margins, flex, width, height, pointerEvents) from inner Glass visual styles
// so the outer .apple-glass-shell rim ALWAYS hugs the exact <Glass> shape with zero offset ring.
function splitShellStyles(style?: React.CSSProperties): {
  outer: React.CSSProperties;
  inner: React.CSSProperties;
} {
  if (!style) return { outer: {}, inner: {} };
  const outer: React.CSSProperties = {};
  const inner: React.CSSProperties = { ...style };

  const outerOnlyKeys = [
    'margin',
    'marginTop',
    'marginBottom',
    'marginLeft',
    'marginRight',
    'flex',
    'flexShrink',
    'alignSelf',
    'pointerEvents',
  ] as const;
  for (const key of outerOnlyKeys) {
    if (style[key] !== undefined) {
      (outer as any)[key] = style[key];
      delete (inner as any)[key];
    }
  }
  if (style.width !== undefined) {
    outer.width = style.width;
    inner.width = '100%';
  }
  if (style.height !== undefined) {
    outer.height = style.height;
    inner.height = '100%';
  }
  if (style.flex !== undefined && style.width === undefined) {
    inner.width = '100%';
  }
  return { outer, inner };
}

interface OpticalButtonProps {
  children: React.ReactNode;
  variant?: Variant;
  mode?: GlassMode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  radius?: number;
  optics?: Partial<GlassOptics>;
}

export function OpticalButton({
  children,
  variant = 'primary',
  mode = 'optical',
  onClick,
  disabled = false,
  type = 'button',
  id,
  className = '',
  style,
  radius = 999,
  optics,
}: OpticalButtonProps) {
  const dash = useOptionalDashboard();
  const opticalGlassEnabled = dash ? dash.opticalGlassEnabled : true;
  const stableOptics = useMemo(
    () => (optics ? { ...ETK_OPTICAL_DEFAULTS, ...optics } : ETK_OPTICAL_DEFAULTS),
    [optics]
  );

  if (!opticalGlassEnabled) {
    return (
      <button
        id={id}
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${VARIANT_CLASS[variant]} ${className}`.trim()}
        style={style}
      >
        {children}
      </button>
    );
  }

  // Solid color buttons (primary, success, warning, danger, purple) keep exact solid HTML colors
  // paired with the Apple 1px specular rim and smooth expand-and-spring tactile feel.
  if (SOLID_VARIANTS.has(variant) || mode === 'frosted') {
    const isSolid = SOLID_VARIANTS.has(variant);
    return (
      <button
        id={id}
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`apple-glass-shell apple-glass-interactive ${className}`.trim()}
        style={{
          ...(isSolid ? {} : FROSTED_STYLE),
          background: VARIANT_BG[variant],
          boxShadow: VARIANT_SHADOW[variant],
          border: 'none',
          borderRadius: radius,
          padding: '11px 22px',
          color: VARIANT_COLOR[variant],
          fontWeight: 800,
          fontSize: '12.5px',
          letterSpacing: '0.35px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
          ...style,
        }}
      >
        {children}
      </button>
    );
  }

  const { outer, inner } = splitShellStyles(style);
  const safeClass = stripLegacyGlassClass(className);

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`apple-glass-shell apple-glass-interactive ${safeClass}`.trim()}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        borderRadius: radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        display: 'inline-flex',
        fontFamily: 'inherit',
        boxShadow: VARIANT_SHADOW[variant],
        ...outer,
      }}
    >
      <Glass
        optics={stableOptics}
        style={{
          background: VARIANT_BG[variant],
          borderRadius: radius,
          padding: '11px 20px',
          color: VARIANT_COLOR[variant],
          fontWeight: 800,
          fontSize: '12.5px',
          letterSpacing: '0.35px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          ...inner,
        }}
      >
        {children}
      </Glass>
    </button>
  );
}

interface OpticalLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  mode?: GlassMode;
  className?: string;
  style?: React.CSSProperties;
  radius?: number;
}

export function OpticalLink({
  href,
  children,
  variant = 'secondary',
  mode = 'optical',
  className = '',
  style,
  radius = 999,
}: OpticalLinkProps) {
  const dash = useOptionalDashboard();
  const opticalGlassEnabled = dash ? dash.opticalGlassEnabled : true;

  if (!opticalGlassEnabled) {
    return (
      <Link
        href={href}
        className={`${VARIANT_CLASS[variant]} ${className}`.trim()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', ...style }}
      >
        {children}
      </Link>
    );
  }

  if (SOLID_VARIANTS.has(variant) || mode === 'frosted') {
    const isSolid = SOLID_VARIANTS.has(variant);
    return (
      <Link
        href={href}
        className={`apple-glass-shell apple-glass-interactive ${className}`.trim()}
        style={{
          ...(isSolid ? {} : FROSTED_STYLE),
          background: VARIANT_BG[variant],
          boxShadow: VARIANT_SHADOW[variant],
          border: 'none',
          borderRadius: radius,
          padding: '11px 22px',
          color: VARIANT_COLOR[variant],
          fontWeight: 800,
          fontSize: '12.5px',
          letterSpacing: '0.35px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        {children}
      </Link>
    );
  }

  const { outer, inner } = splitShellStyles(style);
  const safeClass = stripLegacyGlassClass(className);

  return (
    <Link
      href={href}
      className={`apple-glass-shell apple-glass-interactive ${safeClass}`.trim()}
      style={{
        textDecoration: 'none',
        display: 'inline-flex',
        borderRadius: radius,
        boxShadow: VARIANT_SHADOW[variant],
        ...outer,
      }}
    >
      <Glass
        optics={ETK_OPTICAL_DEFAULTS}
        style={{
          background: VARIANT_BG[variant],
          borderRadius: radius,
          padding: '11px 20px',
          color: VARIANT_COLOR[variant],
          fontWeight: 800,
          fontSize: '12.5px',
          letterSpacing: '0.35px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          ...inner,
        }}
      >
        {children}
      </Glass>
    </Link>
  );
}

interface OpticalSurfaceProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  glassBg?: string;
  radius?: number;
  mode?: GlassMode;
  interactive?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  optics?: Partial<GlassOptics>;
}

export function OpticalSurface({
  children,
  className = '',
  id,
  style,
  glassBg = MASTER_GLASS_BG,
  radius = 999,
  mode = 'optical',
  interactive = true,
  onClick,
  optics,
}: OpticalSurfaceProps) {
  const dash = useOptionalDashboard();
  const opticalGlassEnabled = dash ? dash.opticalGlassEnabled : true;
  const stableOptics = useMemo(
    () => (optics ? { ...ETK_OPTICAL_DEFAULTS, ...optics } : ETK_OPTICAL_DEFAULTS),
    [optics]
  );

  if (!opticalGlassEnabled) {
    return (
      <div id={id} className={className} style={style} onClick={onClick}>
        {children}
      </div>
    );
  }

  const safeClass = stripLegacyGlassClass(className);

  if (mode === 'frosted') {
    return (
      <div
        id={id}
        onClick={onClick}
        className={`apple-glass-shell ${interactive ? 'apple-glass-interactive' : ''} ${safeClass}`.trim()}
        style={{
          ...FROSTED_STYLE,
          background: glassBg,
          boxShadow: VARIANT_SHADOW.surface,
          borderRadius: radius,
          display: 'inline-flex',
          alignItems: 'center',
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  const { outer, inner } = splitShellStyles(style);

  return (
    <div
      id={id}
      onClick={onClick}
      className={`apple-glass-shell apple-glass-optical-wrap ${interactive ? 'apple-glass-interactive' : ''} ${safeClass}`.trim()}
      style={{
        display: 'inline-flex',
        borderRadius: radius,
        boxShadow: VARIANT_SHADOW.surface,
        ...outer,
      }}
    >
      <Glass
        optics={stableOptics}
        className="apple-glass-inner"
        style={{
          background: glassBg,
          borderRadius: radius,
          width: '100%',
          height: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          ...inner,
        }}
      >
        {children}
      </Glass>
    </div>
  );
}
