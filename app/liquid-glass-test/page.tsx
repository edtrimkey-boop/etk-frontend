'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Glass, glassValue, type GlassOptics } from '@/lib/liquid-glass';
import { GlassSwitch } from '@/components/liquid-glass-demo/GlassSwitch';
import { GlassSlider } from '@/components/liquid-glass-demo/GlassSlider';
import { GlassNotification } from '@/components/liquid-glass-demo/GlassNotification';

export default function LiquidGlassTestPage() {
  // Interactive Switch & Slider states
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoDraft, setAutoDraft] = useState(false);
  const [sliderVal, setSliderVal] = useState(64);

  // Live Optics Tuner
  const [strength, setStrength] = useState(0.18);
  const [depth, setDepth] = useState(0.55);
  const [curvature, setCurvature] = useState(0.45);
  const [dispersion, setDispersion] = useState(0.45);
  const [bend, setBend] = useState(0.65);
  const [frost, setFrost] = useState(2);
  const [sheen, setSheen] = useState(0.85);

  const customOptics: Partial<GlassOptics> = useMemo(
    () => ({
      strength,
      depth,
      curvature,
      dispersion,
      bend,
      frost,
      sheen,
    }),
    [strength, depth, curvature, dispersion, bend, frost, sheen]
  );

  // Zero-rerender 60fps mouse-tracking motion values for the Hero Lens
  const stageRef = useRef<HTMLDivElement>(null);
  const lensX = useMemo(() => glassValue(0.5), []);
  const lensY = useMemo(() => glassValue(0.5), []);

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = Math.max(0.08, Math.min(0.92, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0.15, Math.min(0.85, (e.clientY - rect.top) / rect.height));
    lensX.set(nx);
    lensY.set(ny);
  };

  const resetOptics = () => {
    setStrength(0.18);
    setDepth(0.55);
    setCurvature(0.45);
    setDispersion(0.45);
    setBend(0.65);
    setFrost(2);
    setSheen(0.85);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 15% 15%, rgba(16, 185, 129, 0.22), transparent 40%), radial-gradient(circle at 85% 20%, rgba(38, 195, 234, 0.22), transparent 42%), radial-gradient(circle at 50% 85%, rgba(139, 92, 246, 0.20), transparent 45%), #05080F',
        color: '#fff',
        padding: '32px 20px 80px',
        fontFamily: "'Montserrat', 'Overpass', sans-serif",
      }}
    >
      <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '36px' }}>
        {/* Top Navigation Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: '#10B981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                padding: '5px 12px',
                borderRadius: '999px',
                marginBottom: '10px',
              }}
            >
              <span>✦</span> samasante/liquid-glass Sandbox
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
              Apple Liquid Glass — Live Optical Refraction Lab
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: '6px 0 0' }}>
              Real signed-distance field (SDF) displacement + 3-pass RGB chromatic dispersion refracting the live DOM.
            </p>
          </div>

          <Link
            href="/dashboard"
            style={{
              textDecoration: 'none',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              padding: '10px 18px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* SECTION 1: LIVE MOUSE-TRACKING REFRACTION STAGE */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#10B981', letterSpacing: '1px', textTransform: 'uppercase' }}>
              1. Interactive Live-DOM Lens (Move Cursor / Touch Across Canvas)
            </h2>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              60fps GPU-free SVG Displacement • Text Remains Selectable
            </span>
          </div>

          <div
            ref={stageRef}
            onPointerMove={handleStagePointerMove}
            style={{
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              cursor: 'crosshair',
              touchAction: 'none',
            }}
          >
            <Glass
              size={[220, 130]}
              radius={36}
              center={{ x: lensX, y: lensY }}
              optics={customOptics}
              filterResolution={2}
            >
              {/* Vivid Live DOM content underneath the moving glass lens */}
              <div
                style={{
                  position: 'relative',
                  minHeight: '360px',
                  padding: '48px 40px',
                  background:
                    'linear-gradient(135deg, #06131c 0%, #0a2a28 32%, #0d1f3c 68%, #1d1035 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '24px',
                }}
              >
                {/* Colorful geometric light orbs & stripes so refraction is unmistakable */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage:
                      'radial-gradient(circle at 20% 35%, rgba(16,185,129,0.55) 0%, transparent 32%), radial-gradient(circle at 78% 30%, rgba(38,195,234,0.55) 0%, transparent 30%), radial-gradient(circle at 52% 85%, rgba(245,158,11,0.45) 0%, transparent 34%), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 48px)',
                    pointerEvents: 'none',
                  }}
                />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '3px', color: '#10B981', marginBottom: '10px' }}>
                      ED-TRIM KEY ACADEMIC ENGINE
                    </div>
                    <div style={{ fontSize: '46px', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-1.5px', color: '#fff' }}>
                      Liquid Glass
                      <br />
                      <span style={{ color: '#26C3EA' }}>Optical Physics</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'PAPERS QUEUED', val: '142', color: '#10B981' },
                      { label: 'ACTIVE CLASSES', val: '16', color: '#26C3EA' },
                      { label: 'TURNAROUND', val: '18m', color: '#F59E0B' },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        style={{
                          background: 'rgba(5,8,15,0.55)',
                          border: `1px solid ${stat.color}`,
                          borderRadius: '14px',
                          padding: '14px 18px',
                          minWidth: '120px',
                        }}
                      >
                        <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.65)', letterSpacing: '1px' }}>
                          {stat.label}
                        </div>
                        <div style={{ fontSize: '26px', fontWeight: 900, color: stat.color, marginTop: '4px' }}>
                          {stat.val}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.12)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  <span>Sweep your mouse over the letters, gridlines, and emerald badges to see real chromatic rim bending.</span>
                  <span style={{ fontFamily: 'monospace', color: '#10B981', fontWeight: 800 }}>PPR-2026-0042 • LIVE</span>
                </div>
              </div>
            </Glass>
          </div>
        </section>

        {/* SECTION 2: BUTTONS & CONTROLS SIDE-BY-SIDE OVER VIVID BACKDROP */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Left Card: Real <Glass> Material Buttons vs Old CSS Buttons */}
          <div
            style={{
              position: 'relative',
              borderRadius: '22px',
              padding: '28px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.12)',
              background:
                'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.42), transparent 45%), radial-gradient(circle at 80% 80%, rgba(38,195,234,0.38), transparent 45%), repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 12px, transparent 12px, transparent 28px), #0a101d',
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 800, color: '#fff', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              2. Real &lt;Glass&gt; Material Buttons
            </h3>
            <p style={{ margin: '0 0 22px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
              In Chrome / Edge, these buttons bend the striped aurora background live through the glass edge.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '26px' }}>
              <Glass
                optics={customOptics}
                style={{
                  background: 'rgba(16, 185, 129, 0.35)',
                  borderRadius: 999,
                  padding: '12px 24px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '13px',
                  color: '#fff',
                  userSelect: 'none',
                }}
              >
                ✦ Submit Question Paper
              </Glass>

              <Glass
                optics={customOptics}
                style={{
                  background: 'rgba(245, 158, 11, 0.35)',
                  borderRadius: 999,
                  padding: '12px 24px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '13px',
                  color: '#fff',
                  userSelect: 'none',
                }}
              >
                Request Document
              </Glass>

              <Glass
                optics={customOptics}
                style={{
                  background: 'rgba(255, 255, 255, 0.14)',
                  borderRadius: 16,
                  padding: '12px 22px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '13px',
                  color: '#fff',
                  userSelect: 'none',
                }}
              >
                Clear Glass Pill
              </Glass>

              <Glass
                optics={customOptics}
                style={{
                  background: 'rgba(239, 68, 68, 0.35)',
                  borderRadius: 16,
                  padding: '12px 22px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '13px',
                  color: '#fff',
                  userSelect: 'none',
                }}
              >
                Delete / Reset
              </Glass>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: '12px', textTransform: 'uppercase' }}>
                Compare with your current CSS `.liquid-glass` buttons:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button type="button" className="liquid-glass btn-primary">
                  Current Submit Paper
                </button>
                <button type="button" className="liquid-glass btn-warning">
                  Current Request Doc
                </button>
              </div>
            </div>
          </div>

          {/* Right Card: Apple macOS/iOS Refractive Switch & Slider */}
          <div
            style={{
              borderRadius: '22px',
              padding: '28px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '22px',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 800, color: '#fff', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                3. macOS / iOS 26 Refractive Controls
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
                Press, hold, and drag the switch thumbs or slider handle — watch them morph into real liquid lenses with squash-and-stretch physics.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800 }}>Real-Time Push Alerts</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>Instant job updates & chat pings</div>
                  </div>
                  <GlassSwitch checked={pushEnabled} onCheckedChange={setPushEnabled} ariaLabel="Push Alerts" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800 }}>Zero-Latency Sound Engine</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>Web Audio API acoustic cues</div>
                  </div>
                  <GlassSwitch checked={soundEnabled} onCheckedChange={setSoundEnabled} ariaLabel="Sound Engine" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800 }}>Auto-Save Paper Drafts</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>Preserve form inputs locally</div>
                  </div>
                  <GlassSwitch checked={autoDraft} onCheckedChange={setAutoDraft} ariaLabel="Auto Draft" />
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', fontWeight: 800 }}>
                <span>Liquid Glass Slider (Drag Thumb)</span>
                <span style={{ color: '#10B981', fontFamily: 'monospace' }}>{Math.round(sliderVal)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GlassSlider value={sliderVal} onValueChange={setSliderVal} width={300} />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: FLOATING NOTIFICATION CARD + LIVE OPTICS TUNER */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Floating Liquid Glass Notification */}
          <div
            style={{
              borderRadius: '22px',
              padding: '28px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(15, 23, 42, 0.72)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 800, color: '#fff', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                4. Cross-Browser Floating Glass Notification
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
                Uses `refract` mode so the wallpaper bends authentically across Chrome, Safari, and Firefox.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
              <GlassNotification
                title="Ed-Trim Key Pipeline"
                time="just now"
                avatar="EK"
                body="Paper PPR-2026-0042 (Class 10 Mathematics) has been formatted & verified. Ready for print!"
                wallpaper="radial-gradient(circle at 20% 30%, #10B981 0%, transparent 50%), radial-gradient(circle at 80% 70%, #26C3EA 0%, transparent 55%), radial-gradient(circle at 50% 20%, #8B5CF6 0%, transparent 50%), #07111e"
              />
            </div>
          </div>

          {/* Real-time Optics Tuner */}
          <div
            style={{
              borderRadius: '22px',
              padding: '28px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(15, 23, 42, 0.72)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#10B981', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                5. Real-Time Optics Tuner
              </h3>
              <button
                type="button"
                onClick={resetOptics}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                }}
              >
                Reset Defaults
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
              {[
                { label: 'Refraction Strength', val: strength, set: setStrength, min: 0.02, max: 0.45, step: 0.01 },
                { label: 'Optical Depth', val: depth, set: setDepth, min: 0.1, max: 1, step: 0.02 },
                { label: 'Dome Curvature', val: curvature, set: setCurvature, min: 0, max: 1, step: 0.02 },
                { label: 'RGB Dispersion', val: dispersion, set: setDispersion, min: 0, max: 1.5, step: 0.05 },
                { label: 'Liquid Rim Bend', val: bend, set: setBend, min: 0, max: 1, step: 0.02 },
                { label: 'Specular Sheen', val: sheen, set: setSheen, min: 0, max: 1.5, step: 0.05 },
                { label: 'Frosted Blur (px)', val: frost, set: setFrost, min: 0, max: 12, step: 0.5 },
              ].map((ctrl) => (
                <div key={ctrl.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.75)' }}>{ctrl.label}</span>
                    <span style={{ color: '#26C3EA', fontFamily: 'monospace' }}>{ctrl.val.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={ctrl.val}
                    onChange={(e) => ctrl.set(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#10B981', cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
