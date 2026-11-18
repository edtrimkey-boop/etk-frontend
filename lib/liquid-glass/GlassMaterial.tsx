'use client';
import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type GlassOptics,
  DEFAULT_LENS_PARAMS,
  DISPERSION_SPREAD,
  LensMapGenerator,
  createLensMapGenerator,
  matrixForAxisScale,
} from "./displacement";
import { GlassValue, isGlassMotionValue, readGlassValue } from "./signal";
import { MASTER_GLASS_OPTICS } from "./glass-config";

/**
 * Material mode — the friendly default for `<Glass>children</Glass>`.
 *
 * You style the wrapper however you like (a translucent `background` = the tint,
 * a `border-radius`, padding, a size — via `className` / `style` / Tailwind) and
 * this turns that box into glass: it frosts and refracts the LIVE page behind it,
 * the translucent colour reads as a tint over the refraction, a soft bright edge
 * rims it, and the children render crisp on top.
 *
 * The mechanism is one CSS property: `backdrop-filter`. It filters whatever is
 * painted BEHIND the element (never the element's own content), so:
 *   • `blur()` + `saturate()` frost the backdrop — cross-browser.
 *   • ` url(#…)` runs an SVG displacement filter on the backdrop — the liquid
 *     refraction — which ships in Blink (Chrome/Edge) only. Safari and Firefox
 *     get the frost + tint + edge; the bend needs a copyable backdrop (an in-place
 *     `<Glass>` over its own content, or `refract`), so material mode is honest about it.
 *
 * Because the colour you set is the glass tint, it must be TRANSLUCENT — a solid
 * `background` is opaque and hides the refraction (not glass). We dev-warn when
 * the computed background is fully opaque.
 */

/**
 * Does this engine support `backdrop-filter: url(#…)` (a custom SVG filter on the
 * backdrop)? Blink (Chrome/Edge/Opera) does; WebKit (Safari) and Gecko (Firefox)
 * support `backdrop-filter: blur()` but NOT `url()`. `@supports`/probe-element
 * tests are unreliable here (engines parse the `url()` syntax without rendering
 * it), so sniff the engine — the same approach `useIsWebKit` uses.
 *
 * We bias toward a false NEGATIVE: if we're unsure, we leave `url()` OFF. A
 * wrongly-disabled Blink just loses the bend (still frosts); a wrongly-ENABLED
 * Safari would get `url()` in the value, which is invalid there and drops the
 * WHOLE `backdrop-filter` — no frost at all. So only enable when confident.
 *
 * SSR-safe: `false` on the server + first client render (so hydration matches),
 * then settles on mount.
 */
const useGlassEngine = () => {
  const [engine, setEngine] = useState<"ssr" | "blink" | "other">("ssr");
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent;
    const vendor = navigator.vendor || "";
    // Real Blink (Chrome/Edge/Brave/Opera on Desktop & Android — INCLUDING DevTools mobile emulation!)
    // supports live `backdrop-filter: url(#svg-filter)`.
    // Real WebKit (macOS Safari AND all iOS/iPadOS browsers) has `vendor === "Apple Computer, Inc."`
    // and only supports CSS `backdrop-filter: blur() saturate()` (NOT `url()`).
    const hasUAData =
      (navigator as Navigator & { userAgentData?: unknown }).userAgentData !=
      null;
    const isAppleWebKit = /Apple/i.test(vendor);
    const isBlink =
      !isAppleWebKit &&
      (hasUAData ||
        vendor === "Google Inc." ||
        (/\b(?:Chrome|Chromium|Edg)\//.test(ua) &&
          !/\b(?:CriOS|EdgiOS|FxiOS|OPiOS)\b/.test(ua) &&
          !/iPhone|iPad|iPod/.test(ua)));
    setEngine(isBlink ? "blink" : "other");
  }, []);
  return engine;
};

// Always selects the REAL live `.content-area` (direct child of `.main-wrapper`),
// NEVER an inert clone nested inside a glass pill mirror.
function getRealContentArea(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(".main-wrapper > .content-area") as HTMLElement | null;
}

// Creates a lightweight, inert visual clone of `.content-area` for real Safari `filter: url()` refraction.
// Strips all IDs, scripts, iframes, videos, canvases, and internal glass layers so there are
// zero duplicate DOM IDs, zero side effects, zero replay animations, and zero recursive clones.
function createSanitizedContentClone(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("data-lg-clone", "true");
  clone.style.pointerEvents = "none";
  clone.style.userSelect = "none";
  clone.style.setProperty("-webkit-user-select", "none");
  clone.style.width = "100%";
  clone.style.boxSizing = "border-box";

  const stripNodes = clone.querySelectorAll(
    "script, iframe, video, audio, canvas, svg[data-lg-layer], [data-lg-safari-mirror]",
  );
  stripNodes.forEach((n) => n.remove());

  const all = clone.querySelectorAll("*");
  all.forEach((node) => {
    if (node.hasAttribute("id")) node.removeAttribute("id");
    if (node.hasAttribute("name")) node.removeAttribute("name");
    if (node.hasAttribute("for")) node.removeAttribute("for");
    if (node instanceof HTMLElement) {
      node.tabIndex = -1;
    }
  });
  return clone;
}

/**
 * Single source of truth re-exported from `./glass-config.ts` so every glass surface
 * across the entire app shares and syncs the exact same settings.
 */
export const MATERIAL_OPTICS: Partial<GlassOptics> = MASTER_GLASS_OPTICS;

/**
 * The displacement + dispersion + specular primitive chain.
 * Shared identically between Blink (`backdrop-filter: url(#...)`) and Safari/iOS/Firefox
 * (`filter: url(#...)` on a `contain: strict` pill-sized live mirror, obeying all WebKit rules
 * from samasante/liquid-glass: 0,0 origin, symmetric RGB dispersion, rawMap specular,
 * in-filter blur + saturate before displacement, and zero transform on the filtered node).
 */
const MaterialFilterContents: React.FC<{
  /** Displacement scale in px (unified across all pill sizes). */
  dispScale: number;
  dispersion: number;
  /** B-channel specular gain (sheen + glow); 0 → skip the specular pass. */
  specular: number;
  hasSpecular: boolean;
  /** Per-axis map rescale around 0.5 (anisotropic lenses); null → none. */
  mapMatrix: string | null;
  width: number;
  height: number;
  mapUrl: string;
  feImageRef: React.Ref<SVGFEImageElement>;
  /** True on Safari/iOS/Firefox `filter: url()` mirror mode */
  isSafariFilter?: boolean;
  frost?: number;
  saturate?: number;
  mapOffset?: number;
}> = ({
  dispScale,
  dispersion,
  specular,
  hasSpecular,
  mapMatrix,
  width,
  height,
  mapUrl,
  feImageRef,
  isSafariFilter = false,
  frost = 0,
  saturate = 1,
  mapOffset = 0,
}) => {
  const mapInput = mapMatrix ? "scaledMap" : "map";
  const useInFilterBlur = isSafariFilter && frost > 0;
  const useInFilterSat = isSafariFilter && saturate !== 1;
  const blurInput = "SourceGraphic";
  const satInput = useInFilterBlur ? "blurredSrc" : blurInput;
  const sourceInput = useInFilterSat ? "satSrc" : satInput;

  // Symmetric dispersion in Safari keeps the refracted field aligned with zero drift
  // (per samasante/liquid-glass Glass.tsx); Blink keeps its exact existing formula.
  const scaleR = isSafariFilter
    ? dispScale * (1 + DISPERSION_SPREAD * 0.5 * dispersion)
    : dispScale * (1 + DISPERSION_SPREAD * dispersion);
  const scaleG = isSafariFilter
    ? dispScale
    : dispScale * (1 + DISPERSION_SPREAD * 0.5 * dispersion);
  const scaleB = isSafariFilter
    ? dispScale * (1 - DISPERSION_SPREAD * 0.5 * dispersion)
    : dispScale;

  return (
    <>
      <feFlood floodColor="rgb(128,128,128)" floodOpacity="1" result="mapBg" />
      <feImage
        ref={feImageRef}
        href={mapUrl || undefined}
        x={mapOffset}
        y={mapOffset}
        width={width}
        height={height}
        preserveAspectRatio="none"
        result="rawMap"
      />
      <feComposite in="rawMap" in2="mapBg" operator="over" result="map" />
      {mapMatrix && (
        <feColorMatrix
          in="map"
          type="matrix"
          values={mapMatrix}
          result="scaledMap"
        />
      )}
      {useInFilterBlur && (
        <feGaussianBlur
          in={blurInput}
          stdDeviation={frost}
          result="blurredSrc"
        />
      )}
      {useInFilterSat && (
        <feColorMatrix
          in={satInput}
          type="saturate"
          values={String(saturate)}
          result="satSrc"
        />
      )}
      {dispersion > 0 ? (
        <>
          <feDisplacementMap
            in={sourceInput}
            in2={mapInput}
            scale={scaleR}
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="refractR"
          />
          <feDisplacementMap
            in={sourceInput}
            in2={mapInput}
            scale={scaleG}
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="refractG"
          />
          <feDisplacementMap
            in={sourceInput}
            in2={mapInput}
            scale={scaleB}
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="refractB"
          />
          <feComposite
            in="refractR"
            in2="refractG"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
            result="refractRG"
          />
          <feComposite
            in="refractRG"
            in2="refractB"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
            result="lensOut"
          />
        </>
      ) : (
        <feDisplacementMap
          in={sourceInput}
          in2={mapInput}
          scale={dispScale}
          xChannelSelector="R"
          yChannelSelector="G"
          result="lensOut"
        />
      )}
      {hasSpecular && (
        <>
          <feColorMatrix
            in={isSafariFilter ? "rawMap" : "map"}
            type="matrix"
            values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 1 0 ${-128 / 255}`}
            result="sheenMask"
          />
          <feComposite
            in="sheenMask"
            in2="lensOut"
            operator="arithmetic"
            k1="0"
            k2={specular}
            k3="1"
            k4="0"
          />
        </>
      )}
    </>
  );
};

export interface GlassMaterialProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  children?: React.ReactNode;
  optics?: Partial<GlassOptics>;
  /** Corner radius in px. Omit → inherit the wrapper's computed border-radius. */
  radius?: GlassValue;
  /** Explicit box size in px (usually you size it with CSS/className instead). */
  width?: GlassValue;
  height?: GlassValue;
}

const num = (v: GlassValue | undefined): number | undefined =>
  v == null ? undefined : isGlassMotionValue(v) ? readGlassValue(v) : v;

// Shared global displacement map cache + shared canvas generators so multiple
// identical <Glass> pills/buttons reuse the exact same pre-generated SDF map in 0ms.
const SHARED_GENERATORS = new Map<number, LensMapGenerator>();
const MAP_CACHE = new Map<string, string>();
const MAX_MAP_CACHE = 64;

function getSharedGenerator(mapSize: number): LensMapGenerator {
  let gen = SHARED_GENERATORS.get(mapSize);
  if (!gen) {
    gen = createLensMapGenerator(mapSize);
    SHARED_GENERATORS.set(mapSize, gen);
  }
  return gen;
}

function getCachedMap(key: string, mapSize: number, params: Parameters<LensMapGenerator["generate"]>[0]): string {
  const hit = MAP_CACHE.get(key);
  if (hit) return hit;
  const url = getSharedGenerator(mapSize).generate(params);
  if (MAP_CACHE.size >= MAX_MAP_CACHE) {
    const oldest = MAP_CACHE.keys().next().value;
    if (oldest !== undefined) MAP_CACHE.delete(oldest);
  }
  MAP_CACHE.set(key, url);
  return url;
}

export const GlassMaterial: React.FC<GlassMaterialProps> = ({
  children,
  optics,
  radius,
  width,
  height,
  className,
  style,
  ...rest
}) => {
  const engine = useGlassEngine();
  const supportsUrl = engine === "blink";
  const isNonBlink = engine === "other";
  const merged = useMemo(
    () => ({ ...DEFAULT_LENS_PARAMS, ...MATERIAL_OPTICS, ...optics }),
    [optics],
  );
  const baseId = useId().replace(/:/g, "");

  const wrapRef = useRef<HTMLDivElement>(null);
  const safariRefractRef = useRef<HTMLDivElement>(null);
  const safariMirrorInnerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<SVGFilterElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const mapUrlRef = useRef<string>("");
  const versionRef = useRef(0);
  const [useSafariMirror, setUseSafariMirror] = useState(false);

  // Measured box + the radius to round the lens map / edge to. Precedence:
  // explicit `radius` prop → the wrapper's own border-radius (className/style) →
  // the wrapped child's radius (so `<Glass><button/></Glass>` rounds the glass to
  // a rounded button). `appliedR` is the radius we set on the WRAPPER itself, set
  // only when it comes from the prop or the child (the user gave the box none) —
  // so the backdrop-filter + edge round to the same shape without clobbering a
  // radius the user set in their className/style. `adoptedRef` latches the child
  // adoption so the radius we inject doesn't read back as the wrapper's "own"
  // radius next measure (which would flip-flop it back to square).
  const [box, setBox] = useState({
    w: 0,
    h: 0,
    r: 0,
    appliedR: undefined as number | undefined,
  });
  // Whether we must inject `position: relative` to make the wrapper a containing
  // block for the inset:0 edge/filter layers. Default false so the FIRST render
  // injects no position and the measure effect (pre-paint) can read the element's
  // REAL computed position — a className like `absolute`/`fixed` would otherwise be
  // masked by our own inline relative and silently lost.
  const [needsRelative, setNeedsRelative] = useState(false);
  const sized = box.w > 0 && box.h > 0;
  const explicitR = num(radius);
  const explicitW = num(width);
  const explicitH = num(height);
  const styleHasRadius = style?.borderRadius != null;
  const adoptedRef = useRef(false);

  useLayoutEffect(() => {
    adoptedRef.current = false;
  }, [explicitR, styleHasRadius, className]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const hasCS = typeof getComputedStyle !== "undefined";
      const cs = hasCS ? getComputedStyle(el) : null;
      const own = cs ? parseFloat(cs.borderTopLeftRadius) || 0 : 0;
      // Force `relative` only when the element is otherwise STATIC; if a className /
      // CSS already positions it (absolute / fixed / sticky), leave it alone. We
      // treat a computed `relative` as "keep current" — it's either our own injected
      // relative or the user's, both correct — so re-measures never flip-flop it.
      if (cs) {
        const pos = cs.position;
        setNeedsRelative((prev) =>
          pos === "static" ? true : pos === "relative" ? prev : false,
        );
      }
      let r: number;
      let appliedR: number | undefined;
      if (explicitR != null) {
        r = explicitR;
        appliedR = explicitR;
      } else if (styleHasRadius || (own > 0 && !adoptedRef.current)) {
        // The user rounds the wrapper themselves (style/className) — read it for
        // the map, but leave the radius to their CSS (don't inject one).
        r = own;
        appliedR = undefined;
      } else {
        // No radius on the wrapper → adopt the wrapped child's, and latch it so
        // the injected value doesn't masquerade as the wrapper's own next pass.
        // Skip our own injected layers (brightness/edge/svg) so we read the first
        // real content child, not an internal node.
        let child: Element | null = el.firstElementChild;
        while (child && child.hasAttribute("data-lg-layer")) {
          child = child.nextElementSibling;
        }
        const childR =
          child && hasCS
            ? parseFloat(getComputedStyle(child).borderTopLeftRadius) || 0
            : 0;
        r = childR;
        appliedR = childR;
        adoptedRef.current = true;
      }
      const rw = Math.round(rect.width);
      const rh = Math.round(rect.height);
      const rr = Math.round(r);
      setBox((prev) =>
        prev.w === rw &&
        prev.h === rh &&
        prev.r === rr &&
        prev.appliedR === appliedR
          ? prev
          : { w: rw, h: rh, r: rr, appliedR },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [explicitR, styleHasRadius, className]);

  // Stale-proofing key: regenerate the displacement map when the box size, the
  // radius, or any map-shaping optic changes.
  const shapeKey = JSON.stringify([
    box.w,
    box.h,
    box.r,
    merged.mapSize,
    merged.clipToShape,
    merged.softEdge,
    merged.depth,
    merged.curvature,
    merged.splay,
    merged.bend,
    merged.bendWidth,
    merged.sheen,
    merged.sheenWidth,
    merged.sheenFalloff,
    merged.sheenAngle,
    merged.glow,
    merged.glowSpread,
    merged.glowFalloff,
  ]);

  // Refraction reach in px (max displacement + feather), shared by the map and
  // the filter-region margin so the displacement near the box edge samples real
  // page just outside the box (no black/contorted rim). Mirrors GlassDOM's `m`.
  const sx = merged.scaleX ?? merged.strength;
  const sy = merged.scaleY ?? merged.strength;
  const maxScale = Math.max(sx, sy);
  // Unified optical thickness norm so EVERY glass pill across the entire app
  // (45px Bell/Logo, 60px FAB, Profile Pill, wide Title Pill, Mobile Bottom Dock,
  // and buttons) refracts with the EXACT same balanced liquid-glass physics —
  // never over-scrambling wide docks and never weakening small circles.
  const thickness = sized ? Math.min(box.w, box.h) : 0;
  const norm = sized ? Math.max(52, Math.min(thickness * 1.45, 88)) * 1.65 : 0;
  const dispScale = maxScale * norm;
  const margin = sized
    ? Math.ceil(dispScale * (merged.dispersion > 0 ? 1.2 : 1) * 0.5 + 28)
    : 0;

  const mapScaleX = maxScale > 0 ? sx / maxScale : 1;
  const mapScaleY = maxScale > 0 ? sy / maxScale : 1;
  const mapMatrix =
    mapScaleX === 1 && mapScaleY === 1
      ? null
      : matrixForAxisScale(mapScaleX, mapScaleY);

  const hasSpecular = merged.glow > 0 || merged.sheen > 0;

  // Dynamic bleed ring for Safari mirror mode so rim refraction + RGB dispersion
  // always samples real content outside the pill with zero edge clipping.
  const safariBleed = sized
    ? Math.min(44, Math.max(20, Math.ceil(dispScale * 0.65 + 14)))
    : 24;

  // Detect whether this <Glass> floats over `.main-wrapper > .content-area` on Safari/iOS/Firefox.
  useEffect(() => {
    if (!isNonBlink) {
      setUseSafariMirror(false);
      return;
    }
    const el = wrapRef.current;
    if (!el || typeof document === "undefined") return;
    const isInsideContent = !!el.closest(".content-area");
    const hasContentArea = !!getRealContentArea();
    setUseSafariMirror(!isInsideContent && hasContentArea);
  }, [isNonBlink]);

  // Generate the displacement map + bump the filter id + apply the live filter.
  useLayoutEffect(() => {
    if (!sized) return;
    if (!supportsUrl && !useSafariMirror) {
      applyBackdropFilter();
      return;
    }
    const url = getCachedMap(shapeKey, merged.mapSize, {
      lensHalfWidth: box.w / 2,
      lensHalfHeight: box.h / 2,
      borderRadius: box.r,
      depth: merged.depth,
      clipToShape: merged.clipToShape,
      softEdge: merged.softEdge,
      sheenAngle: merged.sheenAngle,
      glow: merged.glow,
      glowSpread: merged.glowSpread,
      glowFalloff: merged.glowFalloff,
      sheen: merged.sheen,
      sheenWidth: merged.sheenWidth,
      sheenFalloff: merged.sheenFalloff,
      curvature: merged.curvature,
      splay: merged.splay,
      bend: merged.bend,
      bendWidth: merged.bendWidth,
    });
    mapUrlRef.current = url;
    feImageRef.current?.setAttribute("href", url);
    applyBackdropFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sized, shapeKey, supportsUrl, useSafariMirror]);

  // Compose + apply real SVG refraction filter across BOTH Chromium and Safari/iOS:
  // • Blink (Chrome/Edge): `backdrop-filter: blur() saturate() url(#lg-mat-...)`.
  // • Safari/iOS/Firefox (floating pills): pure `filter: url(#lg-mat-...)` on `safariRefractRef`
  //   (`contain: strict` bounds WebKit's SourceGraphic strictly to pill+bleed — well under iOS's
  //   4096px filter ceiling! In-filter blur + saturate + symmetric RGB dispersion + rawMap specular).
  // • Safari/iOS/Firefox (inline buttons inside `.content-area`): crystal-clear `blur(frost) saturate(sat)`.
  const applyBackdropFilter = useMemo(
    () => () => {
      const el = wrapRef.current;
      const filterEl = filterRef.current;
      if (!el) return;
      const rawFrost = Math.max(0, merged.frost);
      const sat = merged.saturate ?? 1;

      if (supportsUrl) {
        const fns = [
          rawFrost > 0 ? `blur(${rawFrost}px)` : "",
          sat !== 1 ? `saturate(${sat})` : "",
        ]
          .filter(Boolean)
          .join(" ");
        let value = fns || "none";
        if (filterEl && mapUrlRef.current) {
          versionRef.current += 1;
          filterEl.id = `lg-mat-${baseId}-v${versionRef.current}`;
          value = `${fns ? fns + " " : ""}url(#${filterEl.id})`;
        }
        el.style.backdropFilter = value;
        el.style.setProperty("-webkit-backdrop-filter", value);
        return;
      }

      if (useSafariMirror) {
        el.style.backdropFilter = "none";
        el.style.setProperty("-webkit-backdrop-filter", "none");
        const refractEl = safariRefractRef.current;
        if (refractEl && filterEl && mapUrlRef.current) {
          versionRef.current += 1;
          filterEl.id = `lg-mat-${baseId}-v${versionRef.current}`;
          const fVal = `url(#${filterEl.id})`;
          refractEl.style.filter = fVal;
          refractEl.style.setProperty("-webkit-filter", fVal);
        }
        return;
      }

      // Inline pills inside `.content-area` on Safari/iOS: exact MASTER_GLASS_OPTICS clear glass
      const fns = [
        rawFrost > 0 ? `blur(${rawFrost}px)` : "",
        sat !== 1 ? `saturate(${sat})` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const value = fns || "none";
      el.style.backdropFilter = value;
      el.style.setProperty("-webkit-backdrop-filter", value);
    },
    [merged.frost, merged.saturate, supportsUrl, useSafariMirror, baseId],
  );

  // Safari Live Backdrop Mirror: clones the REAL `.main-wrapper > .content-area` (never another clone!)
  // into a `contain: strict` pill-sized viewport so real iPhone Safari refracts live scrolled content
  // with zero 4096px ceiling drops and smooth 60fps scroll tracking.
  useEffect(() => {
    if (!useSafariMirror || !sized || typeof document === "undefined") return;
    const wrapEl = wrapRef.current;
    const mirrorHost = safariMirrorInnerRef.current;
    const contentEl = getRealContentArea();
    const scrollEl = document.querySelector(".main-wrapper") as HTMLElement | null;
    if (!wrapEl || !mirrorHost || !contentEl) return;

    let disposed = false;
    let rafId = 0;
    let settleUntil = 0;
    let mutTimer: ReturnType<typeof setTimeout> | null = null;
    let lastDx = NaN;
    let lastDy = NaN;
    let lastW = NaN;

    const syncPosition = (forceBump: boolean) => {
      if (disposed || !wrapRef.current || !safariMirrorInnerRef.current) return;
      const pillRect = wrapRef.current.getBoundingClientRect();
      const contentRect = contentEl.getBoundingClientRect();
      const dx = Math.round((contentRect.left - pillRect.left + safariBleed) * 2) / 2;
      const dy = Math.round((contentRect.top - pillRect.top + safariBleed) * 2) / 2;
      const cw = Math.round(contentRect.width);

      const moved = dx !== lastDx || dy !== lastDy || cw !== lastW;
      if (!moved && !forceBump) return;
      lastDx = dx;
      lastDy = dy;
      lastW = cw;

      const host = safariMirrorInnerRef.current;
      host.style.left = `${dx}px`;
      host.style.top = `${dy}px`;
      host.style.width = `${cw}px`;

      const refractEl = safariRefractRef.current;
      const filterEl = filterRef.current;
      if (refractEl && filterEl && mapUrlRef.current) {
        versionRef.current += 1;
        filterEl.id = `lg-mat-${baseId}-v${versionRef.current}`;
        const fVal = `url(#${filterEl.id})`;
        refractEl.style.filter = fVal;
        refractEl.style.setProperty("-webkit-filter", fVal);
      }
    };

    const tick = () => {
      rafId = 0;
      if (disposed) return;
      syncPosition(false);
      if (performance.now() < settleUntil) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const schedulePositionSync = () => {
      settleUntil = performance.now() + 260;
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const rebuildClone = () => {
      if (disposed || !safariMirrorInnerRef.current) return;
      const sanitized = createSanitizedContentClone(contentEl);
      safariMirrorInnerRef.current.replaceChildren(sanitized);
      syncPosition(true);
    };

    rebuildClone();

    // Re-sync after web fonts settle so refracted text metrics align to 0px
    if (typeof document.fonts !== "undefined") {
      document.fonts.ready.then(() => {
        if (!disposed) syncPosition(true);
      });
    }

    const mo = new MutationObserver(() => {
      if (mutTimer) clearTimeout(mutTimer);
      mutTimer = setTimeout(rebuildClone, 120);
    });
    mo.observe(contentEl, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    const ro = new ResizeObserver(schedulePositionSync);
    ro.observe(contentEl);
    ro.observe(wrapEl);

    document.addEventListener("scroll", schedulePositionSync, { passive: true, capture: true });
    scrollEl?.addEventListener("scroll", schedulePositionSync, { passive: true });
    window.addEventListener("scroll", schedulePositionSync, { passive: true });
    window.addEventListener("touchmove", schedulePositionSync, { passive: true });
    window.addEventListener("touchend", schedulePositionSync, { passive: true });
    window.addEventListener("wheel", schedulePositionSync, { passive: true });
    window.addEventListener("resize", schedulePositionSync, { passive: true });

    return () => {
      disposed = true;
      mo.disconnect();
      ro.disconnect();
      if (mutTimer) clearTimeout(mutTimer);
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("scroll", schedulePositionSync, true);
      scrollEl?.removeEventListener("scroll", schedulePositionSync);
      window.removeEventListener("scroll", schedulePositionSync);
      window.removeEventListener("touchmove", schedulePositionSync);
      window.removeEventListener("touchend", schedulePositionSync);
      window.removeEventListener("wheel", schedulePositionSync);
      window.removeEventListener("resize", schedulePositionSync);
      if (safariMirrorInnerRef.current) {
        safariMirrorInnerRef.current.replaceChildren();
      }
    };
  }, [useSafariMirror, sized, safariBleed, baseId]);

  // Re-apply (which BUMPS the filter id) when anything that shapes the filter
  // changes without re-running the map regen: the frost/saturate/url-support
  // (via applyBackdropFilter's identity) and the displacement/specular optics that
  // feed the filter primitives but aren't in shapeKey (dispersion / strength /
  // scaleX / scaleY / specular). Blink caches backdrop-filter output by filter id,
  // so without the bump those optic changes would mutate the SVG attrs but the
  // page would keep showing the old refraction — same rule the copy engine follows.
  useEffect(() => {
    if (sized) applyBackdropFilter();
  }, [
    sized,
    applyBackdropFilter,
    merged.dispersion,
    merged.strength,
    merged.scaleX,
    merged.scaleY,
    merged.specular,
  ]);

  // Dev-warn once if the wrapper's background is fully opaque — it hides the
  // refraction, so the glass can't read as glass (the colour needs alpha). Resolve
  // the opacity by painting the computed colour into a 1×1 canvas and reading the
  // alpha byte, so it works for any CSS colour syntax (rgb / oklch / color(...) /
  // Tailwind v4 palettes), not just rgb(a).
  const warnedRef = useRef(false);
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" ||
      warnedRef.current ||
      !sized ||
      typeof getComputedStyle === "undefined" ||
      typeof document === "undefined"
    )
      return;
    const el = wrapRef.current;
    if (!el) return;
    const bg = getComputedStyle(el).backgroundColor;
    let opaque = false;
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1, 1);
        // Fully opaque (alpha 255) hides the backdrop. A transparent/absent
        // background resolves to alpha 0 → not flagged.
        opaque = ctx.getImageData(0, 0, 1, 1).data[3] === 255;
      }
    } catch {
      opaque = false;
    }
    if (opaque && typeof console !== "undefined") {
      console.warn(
        "[liquid-glass] <Glass>: the wrapper's background is fully opaque, so it hides the refraction (no glass shows through). Give it an alpha (e.g. `bg-red-400/40` / `rgba(...,0.4)`). (An opaque `background-image` — a solid gradient or photo — hides it the same way.)",
      );
      warnedRef.current = true;
    }
  }, [sized]);

  // Rim highlight is handled consistently across Chrome, Edge, and Safari by
  // .apple-glass-shell::after (single razor-thin 1px Apple specular rim) +
  // the SVG filter's B-channel specular lift. Zero milky/double inner border.
  const edgeShadow = "none";

  // The wrapper must be a positioned containing block (the edge + filter layers are
  // inset:0 absolute). An explicit positioned inline `style.position` wins; a
  // className that positions it (absolute / fixed / sticky) is honoured via the
  // measured `needsRelative` (we then inject nothing); a static element gets
  // `relative`. We never inject an inline position that would clobber a Tailwind
  // `absolute` / `fixed` — the bug this `needsRelative` measurement avoids.
  const userPos = style?.position;
  const userPositioned =
    userPos != null &&
    userPos !== "static" &&
    userPos !== "unset" &&
    userPos !== "initial";
  const position: React.CSSProperties["position"] | undefined = userPositioned
    ? userPos
    : needsRelative
      ? "relative"
      : undefined;

  // Optional brightness veil (white >0 / black <0) — a cross-browser layer over
  // the refraction, under the children. Default 0 = nothing rendered.
  const brightnessLayer =
    merged.brightness !== 0 ? (
      <div
        aria-hidden
        data-lg-layer=""
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: "inherit",
          background: merged.brightness > 0 ? "#fff" : "#000",
          opacity: Math.min(1, Math.abs(merged.brightness)),
          zIndex: 1,
        }}
      />
    ) : null;

  const rawFrostVal = Math.max(0, merged.frost);
  const rawSatVal = merged.saturate ?? 1;
  const safariClearFilter =
    [
      rawFrostVal > 0 ? `blur(${rawFrostVal}px)` : "",
      rawSatVal !== 1 ? `saturate(${rawSatVal})` : "",
    ]
      .filter(Boolean)
      .join(" ") || "none";

  const wrapperBg = useSafariMirror ? "transparent" : style?.background;
  const filterW = useSafariMirror ? box.w + safariBleed * 2 : box.w + 2 * margin;
  const filterH = useSafariMirror ? box.h + safariBleed * 2 : box.h + 2 * margin;

  return (
    <div
      ref={wrapRef}
      data-liquid-glass={
        supportsUrl
          ? "material"
          : useSafariMirror
            ? "safari-refract"
            : "safari-clear"
      }
      className={className}
      style={{
        display: "inline-block",
        ...style,
        ...(wrapperBg !== undefined ? { background: wrapperBg } : null),
        ...(isNonBlink
          ? {
              overflow: "hidden",
              ...(!useSafariMirror
                ? {
                    backdropFilter: safariClearFilter,
                    WebkitBackdropFilter: safariClearFilter,
                  }
                : null),
            }
          : null),
        ...(position != null ? { position } : null),
        ...(explicitW != null ? { width: explicitW } : null),
        ...(explicitH != null ? { height: explicitH } : null),
        ...(box.appliedR != null ? { borderRadius: box.appliedR } : null),
      }}
      {...rest}
    >
      {/* Real Safari Live Optical Refraction Layer (samasante/liquid-glass WebKit rules:
          zero transform on filtered node, contain: strict bounds SourceGraphic strictly to
          pill+bleed under iOS's 4096px filter ceiling, 0,0 filter origin!) */}
      {useSafariMirror && (
        <>
          <div
            ref={safariRefractRef}
            aria-hidden
            data-lg-layer=""
            data-lg-safari-mirror=""
            style={{
              position: "absolute",
              top: -safariBleed,
              left: -safariBleed,
              width: sized ? box.w + safariBleed * 2 : "100%",
              height: sized ? box.h + safariBleed * 2 : "100%",
              overflow: "hidden",
              contain: "strict",
              pointerEvents: "none",
              zIndex: 0,
              background: "var(--bg, #0B111E)",
              willChange: "filter",
            }}
          >
            <div
              ref={safariMirrorInnerRef}
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          </div>
          {style?.background && (
            <div
              aria-hidden
              data-lg-layer=""
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                pointerEvents: "none",
                zIndex: 1,
                background: style.background,
              }}
            />
          )}
        </>
      )}
      {brightnessLayer}
      {children}
      {/* Soft bright edge — its own inset layer, rounded to the wrapper. */}
      <div
        aria-hidden
        data-lg-layer=""
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: "inherit",
          boxShadow: edgeShadow,
          zIndex: 1,
        }}
      />
      {/* The displacement filter (Blink backdrop-filter OR Safari live-mirror filter). */}
      <svg
        aria-hidden
        data-lg-layer=""
        viewBox={useSafariMirror && sized ? `0 0 ${filterW} ${filterH}` : undefined}
        width={useSafariMirror && sized ? filterW : 0}
        height={useSafariMirror && sized ? filterH : 0}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: useSafariMirror && sized ? filterW : 0,
          height: useSafariMirror && sized ? filterH : 0,
          pointerEvents: "none",
          display: "block",
        }}
      >
        <defs>
          <filter
            ref={filterRef}
            id={`lg-mat-${baseId}-v0`}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
            x={useSafariMirror ? 0 : -margin}
            y={useSafariMirror ? 0 : -margin}
            width={filterW}
            height={filterH}
          >
            {sized && (
              <MaterialFilterContents
                dispScale={dispScale}
                dispersion={merged.dispersion}
                specular={merged.specular}
                hasSpecular={hasSpecular}
                mapMatrix={mapMatrix}
                width={box.w}
                height={box.h}
                mapUrl={mapUrlRef.current || ""}
                feImageRef={feImageRef}
                isSafariFilter={useSafariMirror}
                frost={rawFrostVal}
                saturate={rawSatVal}
                mapOffset={useSafariMirror ? safariBleed : 0}
              />
            )}
          </filter>
        </defs>
      </svg>
    </div>
  );
};
