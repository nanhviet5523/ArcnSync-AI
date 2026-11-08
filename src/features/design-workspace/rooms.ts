import type { DesignElement, Pt, SceneJson } from './types';

/** One room of a floor, as the workspace shows it in the Floors → Rooms tree and the Room tab. */
export interface RoomInfo {
  /** Stable within a floor: name + label point (backend has no room id). */
  key: string;
  name: string;
  area: number;
  label: Pt;
  /** Room outline in DXF metres, or null when no outline was found (then the camera only centres on the label). */
  boundary: Pt[] | null;
}

export interface Box2 { minX: number; minY: number; maxX: number; maxY: number }

const areaOf = (l: Pt[]) => Math.abs(l.reduce((acc, a, i) => { const b = l[(i + 1) % l.length]; return acc + a[0] * b[1] - a[1] * b[0]; }, 0)) / 2;

export const pointInLoop = ([x, y]: Pt, loop: Pt[]) => {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [xi, yi] = loop[i], [xj, yj] = loop[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/**
 * Room outline. The backend does not send one yet, so this uses the smallest wall hole that contains
 * the room's label point. When the backend returns room outlines, replace only this function.
 */
export function getRoomBoundary(scene: Pick<SceneJson, 'walls'>, room: SceneJson['rooms'][number]): Pt[] | null {
  let best: Pt[] | null = null, bestArea = Infinity;
  for (const w of scene.walls) {
    for (const h of w.holes) {
      if (h.length < 3 || !pointInLoop(room.label, h)) continue;
      const a = areaOf(h);
      if (a < bestArea) { best = h; bestArea = a; }
    }
  }
  return best;
}

export const roomKey = (r: SceneJson['rooms'][number]) => `${r.name}@${r.label[0].toFixed(3)},${r.label[1].toFixed(3)}`;

export const floorRooms = (scene: Pick<SceneJson, 'walls' | 'rooms'>): RoomInfo[] =>
  scene.rooms.map((r) => ({ key: roomKey(r), name: r.name, area: r.area, label: r.label, boundary: getRoomBoundary(scene, r) }));

export const boxOf = (pts: Pt[]): Box2 => ({
  minX: Math.min(...pts.map((p) => p[0])), minY: Math.min(...pts.map((p) => p[1])),
  maxX: Math.max(...pts.map((p) => p[0])), maxY: Math.max(...pts.map((p) => p[1])),
});

/** Width × length of the room's bounding box in metres; null without an outline. */
export const roomSize = (r: RoomInfo) => {
  if (!r.boundary) return null;
  const b = boxOf(r.boundary);
  return { w: b.maxX - b.minX, d: b.maxY - b.minY };
};

/** The room a point falls in: the smallest outline that contains it. Rooms without an outline never match. */
export function roomAt(rooms: RoomInfo[], p: { x: number; y: number }): string | null {
  let best: RoomInfo | null = null, bestArea = Infinity;
  for (const r of rooms) {
    if (!r.boundary || !pointInLoop([p.x, p.y], r.boundary)) continue;
    const a = areaOf(r.boundary);
    if (a < bestArea) { best = r; bestArea = a; }
  }
  return best?.key ?? null;
}

export const elementRoom = (rooms: RoomInfo[], e: Pick<DesignElement, 'position'>) => roomAt(rooms, e.position);

/** Money strings from the backend ("12500000" or "12500000.50") summed exactly in cents, never as floats. */
export function sumMoney(values: (string | null | undefined)[]): string {
  let cents = 0n;
  for (const v of values) {
    if (!v) continue;
    const m = /^(-?)(\d+)(?:\.(\d{1,2})\d*)?$/.exec(v.trim());
    if (!m) continue;
    const c = BigInt(m[2]) * 100n + BigInt((m[3] ?? '').padEnd(2, '0') || '0');
    cents += m[1] ? -c : c;
  }
  const neg = cents < 0n, abs = neg ? -cents : cents;
  const frac = abs % 100n;
  return `${neg ? '-' : ''}${abs / 100n}${frac ? `.${frac.toString().padStart(2, '0')}` : ''}`;
}

/** Price of one item in the draft: line total from the backend, else the unit price of the chosen product. */
export const itemPrice = (e: Pick<DesignElement, 'line_total' | 'product'>) => e.line_total ?? e.product?.unit_price ?? null;
