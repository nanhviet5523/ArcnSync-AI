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
