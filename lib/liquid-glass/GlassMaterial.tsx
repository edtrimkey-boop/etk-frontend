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
import { MASTER_GLASS_OPTICS, MASTER_GLASS_BG } from "./glass-config";

/**
 * =====================================================================
 * LIQUID GLASS MATERIAL ENGINE (CROSS-BROWSER HIGH-PERFORMANCE 60/120FPS)
 * =====================================================================
 * Single source of truth driven by MASTER_GLASS_OPTICS from ./glass-config.ts:
 *
 * • Blink (Chrome / Edge / Opera on Desktop & Android):
 *   Applies live GPU SVG displacement map refraction via `backdrop-filter: url(#...)`,
 *   creating dynamic optical distortion and 3-pass chromatic dispersion.
 *
 * • WebKit (Safari on macOS & iOS):
 *   Applies pure live hardware-accelerated `backdrop-filter: blur(frost) saturate(saturate)`
 *   directly to the live composited backdrop with zero DOM duplication, zero frozen
 *   snapshots, zero memory bloat, and zero scrolling lag (120fps ProMotion ready).
 *   Enriched with physical optical meniscus bevel, directional specular catchlights,
 *   subtle chromatic dispersion accents, and brightness veil matching MASTER_GLASS_OPTICS.
 */

const useSupportsBackdropUrl = () => {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent;
    const vendor = navigator.vendor || "";
    const isAppleWebKit = /Apple/i.test(vendor);
    const hasUAData =
      (navigator as Navigator & { userAgentData?: unknown }).userAgentData !=
      null;
    // Blink (Desktop Chrome, Edge, Brave, Opera, Chromium): supports `backdrop-filter: url(#svg-filter)`.
    // WebKit (Safari & all iOS/iPadOS browsers): rejects `url()` inside backdrop-filter.
    const isBlink =
      !isAppleWebKit &&
      (hasUAData ||
        vendor === "Google Inc." ||
        (/\b(?:Chrome|Chromium|Edg)\//.test(ua) &&
          !/\b(?:CriOS|EdgiOS|FxiOS|OPiOS)\b/.test(ua) &&
          !/iPhone|iPad|iPod/.test(ua)));
    setOk(isBlink);
  }, []);
  return ok;
};

/**
 * Single source of truth re-exported from `./glass-config.ts` so every glass surface
 * across the entire app shares and syncs the exact same settings.
 */
export const MATERIAL_OPTICS: Partial<GlassOptics> = MASTER_GLASS_OPTICS;

/**
 * The displacement + dispersion + specular primitive chain.
 * Used on Chromium/Edge (`backdrop-filter: url(#...)`) for true live GPU refraction.
 */
const MaterialFilterContents: React.FC<{
  dispScale: number;
  dispersion: number;
  specular: number;
  hasSpecular: boolean;
  mapMatrix: string | null;
  width: number;
  height: number;
  mapUrl: string;
  feImageRef: React.Ref<SVGFEImageElement>;
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
}) => {
  const mapInput = mapMatrix ? "scaledMap" : "map";

  const scaleR = dispScale * (1 + DISPERSION_SPREAD * dispersion);
  const scaleG = dispScale * (1 + DISPERSION_SPREAD * 0.5 * dispersion);
  const scaleB = dispScale;

  return (
    <>
      <feFlood floodColor="rgb(128,128,128)" floodOpacity="1" result="mapBg" />
      <feImage
        ref={feImageRef}
        href={mapUrl || undefined}
        x={0}
        y={0}
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
      {dispersion > 0 ? (
        <>
          <feDisplacementMap
            in="SourceGraphic"
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
            in="SourceGraphic"
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
            in="SourceGraphic"
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
          in="SourceGraphic"
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
            in="map"
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

export interface GlassMaterialProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?: React.ReactNode;
  optics?: Partial<GlassOptics>;
  radius?: GlassValue;
  width?: GlassValue;
  height?: GlassValue;
}

const num = (v: GlassValue | undefined): number | undefined =>
  v == null ? undefined : isGlassMotionValue(v) ? readGlassValue(v) : v;

// Shared global displacement map cache so multiple identical pills reuse pre-calculated maps in 0ms.
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

function getCachedMap(
  key: string,
  mapSize: number,
  params: Parameters<LensMapGenerator["generate"]>[0],
): string {
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
  const supportsUrl = useSupportsBackdropUrl();
  const merged = useMemo(
    () => ({ ...DEFAULT_LENS_PARAMS, ...MATERIAL_OPTICS, ...optics }),
    [optics],
  );
  const baseId = useId().replace(/:/g, "");

  const wrapRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<SVGFilterElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const mapUrlRef = useRef<string>("");
  const versionRef = useRef(0);

  const [box, setBox] = useState({
    w: 0,
    h: 0,
    r: 0,
    appliedR: undefined as number | undefined,
  });
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
        r = own;
        appliedR = undefined;
      } else {
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

  const sx = merged.scaleX ?? merged.strength;
  const sy = merged.scaleY ?? merged.strength;
  const maxScale = Math.max(sx, sy);

  // Optical thickness norm: keeps small 42px circles and wide 300px docks uniformly balanced.
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

  // Generate the displacement map when on Blink (Chrome/Edge)
  useLayoutEffect(() => {
    if (!sized || !supportsUrl) return;
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
  }, [sized, shapeKey, supportsUrl]);

  // Apply backdrop-filter:
  // • Blink (Chrome/Edge): blur + saturate + SVG feDisplacementMap live backdrop refraction.
  // • WebKit (Safari / iOS / Firefox): pure live hardware-accelerated blur + saturate.
  const applyBackdropFilter = useMemo(
    () => () => {
      const el = wrapRef.current;
      const filterEl = filterRef.current;
      if (!el) return;
      const rawFrost = Math.max(0, merged.frost);
      const sat = merged.saturate ?? 1;

      const fns = [
        rawFrost > 0 ? `blur(${rawFrost}px)` : "",
        sat !== 1 ? `saturate(${sat})` : "",
      ]
        .filter(Boolean)
        .join(" ");

      let value = fns || "none";
      if (supportsUrl && filterEl && mapUrlRef.current) {
        versionRef.current += 1;
        filterEl.id = `lg-mat-${baseId}-v${versionRef.current}`;
        value = `${fns ? fns + " " : ""}url(#${filterEl.id})`;
      }
      el.style.backdropFilter = value;
      el.style.setProperty("-webkit-backdrop-filter", value);
    },
    [merged.frost, merged.saturate, supportsUrl, baseId],
  );

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

  // Optical rim highlight + chromatic meniscus accents driven by MASTER_GLASS_OPTICS:
  // - Top-left specular catchlight (sheen & specular gain)
  // - Razor-sharp 1px boundary
  // - Cyan & red chromatic dispersion edges (dispersion: 0.700)
  // - Meniscus lip compression (bend: 0.600)
  // - Soft inner glow (glow: 0.100)
  const edgeShadow = useMemo(() => {
    const g = Math.max(0, Math.min(2.0, merged.specular));
    const sheen = Math.max(0, Math.min(2.0, merged.sheen));
    const glow = Math.max(0, Math.min(1.0, merged.glow));
    return [
      `inset 0 1px 1px 0 rgba(255,255,255,${(0.55 * g).toFixed(3)})`,
      `inset 0 0 0 1px rgba(255,255,255,${(0.14 * g).toFixed(3)})`,
      `inset 1px 0 2.5px 0 rgba(38,195,234,${(0.24 * sheen).toFixed(3)})`,
      `inset -1px 0 2.5px 0 rgba(239,68,68,${(0.18 * sheen).toFixed(3)})`,
      `inset 0 -1.5px 2px 0 rgba(0,0,0,0.32)`,
      glow > 0 ? `inset 0 0 8px 0 rgba(255,255,255,${(0.12 * glow).toFixed(3)})` : "",
    ]
      .filter(Boolean)
      .join(", ");
  }, [merged.specular, merged.sheen, merged.glow]);

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

  // The subtle liquid veil driven by MASTER_GLASS_OPTICS.brightness (0.050)
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

  return (
    <div
      ref={wrapRef}
      data-liquid-glass="material"
      className={className}
      style={{
        display: "inline-block",
        ...style,
        background: style?.background ?? MASTER_GLASS_BG,
        ...(position != null ? { position } : null),
        ...(explicitW != null ? { width: explicitW } : null),
        ...(explicitH != null ? { height: explicitH } : null),
        ...(box.appliedR != null ? { borderRadius: box.appliedR } : null),
      }}
      {...rest}
    >
      {brightnessLayer}
      {children}
      {/* Soft bright edge + chromatic meniscus rim */}
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
      {/* The displacement filter (Chromium / Blink backdrop-filter only) */}
      {supportsUrl && (
        <svg
          aria-hidden
          data-lg-layer=""
          width={0}
          height={0}
          style={{
            position: "absolute",
            width: 0,
            height: 0,
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
              x={-margin}
              y={-margin}
              width={box.w + 2 * margin}
              height={box.h + 2 * margin}
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
                />
              )}
            </filter>
          </defs>
        </svg>
      )}
    </div>
  );
};
