import type { GlassOptics } from "./displacement";

/**
 * =========================================================================
 * MASTER LIQUID GLASS SETTINGS — SINGLE SOURCE OF TRUTH FOR ED-TRIM KEY
 * =========================================================================
 * Change ANY number here and EVERY liquid glass component across the entire
 * app stays 100% synced automatically:
 *   • TopBar (Menu button, Title pill, Notification bell, Profile pill)
 *   • MobileNav (Bottom Tab Pill & Floating + FAB)
 *   • Sara AI Floating Button
 *   • Secondary / Outline Glass Buttons & Links
 *   • GlassSwitch, GlassSlider, GlassNotification, and /liquid-glass-test
 */
export const MASTER_GLASS_OPTICS: Partial<GlassOptics> = {
  // ── Refraction ─────────────────────────────────────────
  strength: 0.200,        // Strength
  depth: 0.300,           // Depth
  curvature: 0.600,       // Curvature
  dispersion: 0.700,      // Dispersion

  // ── Edge ───────────────────────────────────────────────
  bend: 0.600,            // Bend
  bendWidth: 0.100,       // Width
  sheen: 0.32,            // Intensity
  sheenWidth: 3,          // Thickness
  sheenFalloff: 1.5,      // Edge Falloff
  specular: 1.6,          // Specular
  sheenAngle: 45,         // Angle

  // ── Background ─────────────────────────────────────────
  glow: 0.100,            // Glow
  glowSpread: 1.0,        // Glow Spread
  glowFalloff: 1.5,       // Glow Falloff
  frost: 1,               // Frost
  brightness: 0.050,      // Brightness
  saturate: 2,            // Saturation
};

/** Shared translucent tint for all glass pills, docks, circles, and glass buttons */
export const MASTER_GLASS_BG = "rgba(255, 255, 255, 0.065)";

/** Backwards-compatible alias pointing directly to MASTER_GLASS_OPTICS */
export const MATERIAL_OPTICS: Partial<GlassOptics> = MASTER_GLASS_OPTICS;
