import type { Pt } from './types';

/** SVG viewBox in plan units (x right, y down = -DXF y). null = fit the whole floor. */
export interface ViewBox { x: number; y: number; w: number; h: number }

/** Warm grey behind the 2D/3D drawing. */
export const STAGE_BG = '#ecebe7';

/** viewBox that frames DXF points with a margin (metres). */
export function frame(pts: Pt[], margin = 0.6): ViewBox {
  if (!pts.length) return { x: 0, y: -10, w: 10, h: 10 };
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => -p[1]);
  const x = Math.min(...xs) - margin, y = Math.min(...ys) - margin;
  return { x, y, w: Math.max(...xs) - x + margin, h: Math.max(...ys) - y + margin };
}

/** Zoom relative to "fit": the drawing never gets smaller than half the frame, or larger than 8×. */
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 8;
/** One press of Zoom + / Zoom −. Factors multiply the visible area's size: below 1 zooms in. */
export const ZOOM_IN = 1 / 1.25;
export const ZOOM_OUT = 1.25;

export const zoomLevel = (v: ViewBox, fit: ViewBox) => Math.min(fit.w / v.w, fit.h / v.h);

const clampAbs = (n: number, max: number) => Math.max(-max, Math.min(max, n));

/**
 * Size factor for one wheel event, shared by 2D and 3D. A touchpad pinch arrives as wheel + ctrlKey with small deltas;
 * a mouse notch is about 100px and gives ×1.1. Deltas are capped so a single event cannot jump.
 */
export function wheelFactor({ deltaY, deltaMode = 0, ctrlKey = false }: { deltaY: number; deltaMode?: number; ctrlKey?: boolean }) {
  const px = deltaMode === 1 ? deltaY * 33 : deltaMode === 2 ? deltaY * 800 : deltaY;
  return ctrlKey ? Math.exp(clampAbs(px, 50) * 0.002) : 1.1 ** (clampAbs(px, 100) / 100);
}

/** Zoom around a plan point, stopping at the limits. A view already past a limit may only move back towards it. */
export function zoomViewAt(v: ViewBox, fit: ViewBox, factor: number, anchor: { x: number; y: number }): ViewBox {
  const level = zoomLevel(v, fit);
  const k = Math.min(Math.max(1, level / MIN_ZOOM), Math.max(Math.min(1, level / MAX_ZOOM), factor));
  return { x: anchor.x - (anchor.x - v.x) * k, y: anchor.y - (anchor.y - v.y) * k, w: v.w * k, h: v.h * k };
}

export interface PinGroup<T> { pins: T[]; x: number; y: number }

/** Pins closer than minDist become one group. The selected pin and the one being written always stay on their own. */
export function clusterPins<T extends { x: number; y: number; num: number | null; active: boolean }>(pins: T[], minDist: number): PinGroup<T>[] {
  const groups: PinGroup<T>[] = [];
  const open = new Set<PinGroup<T>>();
  for (const p of pins) {
    const alone = p.active || p.num === null;
    const host = alone ? undefined : [...open].find((g) => Math.hypot(g.x - p.x, g.y - p.y) < minDist);
    if (host) {
      host.pins.push(p);
      host.x = host.pins.reduce((s, q) => s + q.x, 0) / host.pins.length;
      host.y = host.pins.reduce((s, q) => s + q.y, 0) / host.pins.length;
    } else {
      const g = { pins: [p], x: p.x, y: p.y };
      groups.push(g);
      if (!alone) open.add(g);
    }
  }
  return groups;
}

/** Ceiling sits on top of the walls; a floor-to-floor height above them would leave a gap. */
export const ceilingHeight = (wallHeightM: number, floorHeightMm: number) =>
  (floorHeightMm > 0 ? Math.min(wallHeightM, floorHeightMm / 1000) : wallHeightM);
