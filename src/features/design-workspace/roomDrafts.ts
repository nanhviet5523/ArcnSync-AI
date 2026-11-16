import { t } from '../../i18n/index.ts';
import { elementName, formatVnd, latestVersion } from './logic.ts';
import type { DiffKind } from './logic';
import { itemPrice, sumMoney } from './rooms.ts';
import type { ComparedElement, DesignElement, DraftLayoutChange, DraftSelection, LayoutOp, Overrides, Product, RoomDraft, RoomDraftInput, VersionComparison, VersionSummary } from './types';

/** Changes laid over a version's items, by item id. */
export type Patches = Record<string, Partial<DesignElement>>;
type RoomEdits = Pick<RoomDraftInput, 'selections' | 'overrides'>;

/** A draft only names the product briefly. Missing parts read as "Product" with no price (see priceText). */
const productOf = ({ product_id, product: p }: Pick<DraftSelection, 'product_id' | 'product'>): Product => {
  const unavailable = !!p && !p.available;
  return {
    id: product_id, name: p?.name ?? t('drafts.productFallback'), sku: '', block_code: '', supplier_name: '',
    unit_price: p?.price ?? '', thumbnail_url: p?.available ? p.thumbnail_url : null, model_3d_url: null,
    width_mm: null, depth_mm: null, height_mm: null, specifications: null, unavailable,
  };
};

export function draftPatches(drafts: readonly RoomDraft[]): Patches {
  const out: Patches = {};
  for (const d of drafts) {
    for (const s of d.selections) out[s.element_id] = { ...out[s.element_id], product: productOf(s), choice: 'CHOSEN' };
    for (const o of d.overrides) out[o.element_id] = { ...out[o.element_id], overrides: o.overrides };
  }
  return out;
}

/** `top` wins, item by item and field by field. */
export function mergePatches(bottom: Patches, top: Patches): Patches {
  const out = { ...bottom };
  for (const [id, p] of Object.entries(top)) out[id] = { ...out[id], ...p };
  return out;
}

/** A swapped product drops the old line total, so prices follow the new product. */
export const withPatches = (elements: readonly DesignElement[], patches: Patches): DesignElement[] =>
  elements.map((e) => {
    const d = patches[e.id];
    return d ? { ...e, ...d, ...(d.product ? { line_total: null } : {}) } : e;
  });

const sameOverrides = (a: Overrides | null | undefined, b: Overrides | null | undefined) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});

/** What actually differs from the version for this room's items. A swap back to the original product is no change. */
export function roomEdits(items: readonly DesignElement[], patches: Patches): RoomEdits {
  const selections: RoomEdits['selections'] = [], overrides: RoomEdits['overrides'] = [];
  for (const e of items) {
    const p = patches[e.id];
    if (!p) continue;
    if (p.product && p.product.id !== e.product?.id) selections.push({ element_id: e.id, product_id: p.product.id });
    if (p.overrides && !sameOverrides(p.overrides, e.overrides)) overrides.push({ element_id: e.id, overrides: p.overrides });
  }
  return { selections, overrides };
}

export const changeCount = ({ selections, overrides }: Pick<RoomEdits, 'selections' | 'overrides'> | Pick<RoomDraft, 'selections' | 'overrides'>) =>
  new Set([...selections, ...overrides].map((x) => x.element_id)).size;

/** Items added, removed or moved by the draft's uploaded DXF. */
export const layoutCount = (d: Pick<RoomDraft, 'layout_changes'>) => d.layout_changes?.length ?? 0;
/** Everything a whole draft changes: product swaps and overrides, plus layout changes. */
export const draftChangeCount = (d: RoomDraft) => changeCount(d) + layoutCount(d);
export const hasLayoutChanges = (drafts: readonly RoomDraft[]) => drafts.some((d) => layoutCount(d) > 0);

/** The version's item a DELETE or MOVE points at (same floor, same DXF handle). */
export const layoutTarget = (elements: readonly DesignElement[], c: Pick<DraftLayoutChange, 'op' | 'floor_id' | 'handle'>) =>
  c.op !== 'ADD' && c.handle ? elements.find((e) => e.floor_id === c.floor_id && e.dxf_handle === c.handle) : undefined;

const ADDED_PREFIX = 'layout-add:';
/** Id of the stand-in item drawn for an ADD. It does not exist on the server: never select it or send it. */
export const addedItemId = (c: Pick<DraftLayoutChange, 'floor_id' | 'handle' | 'at'>) => `${ADDED_PREFIX}${c.floor_id}:${c.handle ?? `${c.at.x},${c.at.y}`}`;
export const isAddedItem = (id: string | null | undefined) => !!id?.startsWith(ADDED_PREFIX);

/** Where a moved item was, drawn faded under its new place. */
export interface LayoutGhost { id: string; element: DesignElement }

/**
 * The drafts' layout changes laid over the items, with the tint each one gets.
 * MOVE: the item at its new place, plus a ghost at the old one. ADD: a stand-in item, sized like another item of the same block.
 * DELETE: kept and tinted removed, or dropped when `dropRemoved` (the "after merge" side of Compare).
 */
export function applyLayout(elements: readonly DesignElement[], drafts: readonly RoomDraft[], { dropRemoved = false } = {}): { elements: DesignElement[]; highlight: Record<string, DiffKind>; ghosts: LayoutGhost[] } {
  const changes = drafts.flatMap((d) => (d.layout_changes ?? []).map((c) => ({ c, roomId: d.room_id })));
  if (!changes.length) return { elements: [...elements], highlight: {}, ghosts: [] };
  const highlight: Record<string, DiffKind> = {};
  const moved = new Map<string, DraftLayoutChange>(), removed = new Set<string>();
  const added: DesignElement[] = [], ghosts: LayoutGhost[] = [];
  for (const { c, roomId } of changes) {
    if (c.op === 'ADD') {
      const like = elements.find((e) => e.block_name === c.block_name);
      const id = addedItemId(c);
      added.push({
        id, floor_id: c.floor_id, room_id: roomId, dxf_handle: c.handle, block_name: c.block_name, name: like?.name ?? c.block_name,
        element_type: like?.element_type ?? 'FURNITURE', category: like?.category ?? null, default_model_url: like?.default_model_url ?? null,
        position: { x: c.at.x, y: c.at.y, rotation_deg: c.rotation }, width_mm: like?.width_mm ?? 500, depth_mm: like?.depth_mm ?? 500, height_mm: like?.height_mm ?? 500,
        overrides: null, choice: null, product: null, line_total: null,
      });
      highlight[id] = 'added';
      continue;
    }
    const target = layoutTarget(elements, c);
    if (!target) continue;
    if (c.op === 'DELETE') { removed.add(target.id); highlight[target.id] = 'removed'; continue; }
    moved.set(target.id, c);
    highlight[target.id] = 'moved';
    ghosts.push({ id: `ghost:${target.id}`, element: target });
  }
  const out = elements.flatMap((e) => {
    if (removed.has(e.id)) return dropRemoved ? [] : [e];
    const m = moved.get(e.id);
    return m ? [{ ...e, position: { x: m.at.x, y: m.at.y, rotation_deg: m.rotation } }] : [e];
  });
  if (dropRemoved) for (const id of removed) delete highlight[id];
  return { elements: [...out, ...added], highlight, ghosts };
}

/** One line per layout change, read like a product change line. `elements` are the version's own items. */
export function layoutLines(elements: readonly DesignElement[], drafts: readonly RoomDraft[]): ChangeLine[] {
  return drafts.flatMap((d) => (d.layout_changes ?? []).map((c): ChangeLine => {
    const base = layoutTarget(elements, c);
    return {
      elementId: c.op === 'ADD' || !base ? addedItemId(c) : base.id, floorId: c.floor_id,
      name: base ? elementName(base, 'designer') : c.block_name,
      position: c.op === 'DELETE' && base ? base.position : c.at,
      swap: null, overridesChanged: false, delta: null, layout: { op: c.op, handle: c.handle, roomId: d.room_id },
    };
  }));
}

/** One line of the Member's bottom bar. */
export interface MemberDraftRow {
  roomId: string;
  roomName: string;
  input: RoomDraftInput;
  count: number;
  /** Differs from what the server holds. */
  dirty: boolean;
  ready: boolean;
}

export function memberDraftRows({ elements, drafts, local, ticks, roomNames }: {
  /** The version's items, without any draft on them. */
  elements: readonly DesignElement[];
  drafts: readonly RoomDraft[];
  local: Patches;
  /** Comment ticks changed on this page, by room. */
  ticks: Record<string, string[]>;
  roomNames: Record<string, string>;
}): MemberDraftRow[] {
  const touched = new Set([...drafts.map((d) => d.room_id), ...Object.keys(ticks)]);
  for (const e of elements) if (local[e.id] && e.room_id) touched.add(e.room_id);
  const rows: MemberDraftRow[] = [];
  for (const roomId of touched) {
    const draft = drafts.find((d) => d.room_id === roomId);
    const items = elements.filter((e) => e.room_id === roomId);
    const saved = draftPatches(draft ? [draft] : []);
    const edits = roomEdits(items, mergePatches(saved, local));
    const before = roomEdits(items, saved);
    const savedTicks = draft?.addressed_comment_ids ?? [];
    const addressed = ticks[roomId] ?? savedTicks;
    const dirty = JSON.stringify(edits) !== JSON.stringify(before) || [...addressed].sort().join() !== [...savedTicks].sort().join();
    const count = changeCount(edits) + (draft ? layoutCount(draft) : 0);
    if (!count && !dirty && !addressed.length) continue;
    rows.push({ roomId, roomName: draft?.room_name ?? roomNames[roomId] ?? '', input: { ...edits, addressed_comment_ids: addressed }, count, dirty, ready: draft?.status === 'READY' });
  }
  return rows.sort((a, b) => a.roomName.localeCompare(b.roomName));
}

/**
 * A draft moves to each new version, so an older version has none of its own. When a Member is left on an older
 * version (a ?v= link or a reload), this is the version whose drafts still tell them what was dropped. Null otherwise.
 */
export const olderVersionDraftSource = (renderVersions: readonly Pick<VersionSummary, 'id' | 'version_no' | 'created_at'>[], shown: Pick<VersionSummary, 'id' | 'version_type'>) => {
  const newest = shown.version_type === 'RENDER_3D' ? latestVersion(renderVersions) : undefined;
  return newest && newest.id !== shown.id ? newest.id : null;
};

/** One item's change, as the Lead reads it before merging. */
export interface ChangeLine {
  elementId: string;
  floorId: string;
  name: string;
  position: { x: number; y: number };
  /** The swap, when the product changed. from is null when the item had no product yet. */
  swap: { from: Product | null; to: Product } | null;
  overridesChanged: boolean;
  /** New price minus old price; null when there is no swap or the new price is unknown. */
  delta: string | null;
  /** Set when the line comes from the draft's uploaded DXF (added, removed or moved item). */
  layout?: { op: LayoutOp; handle: string | null; roomId: string };
}

const negate = (v: string) => (v.startsWith('-') ? v.slice(1) : `-${v}`);

/** Changes that really differ from the version. `elements` are the version's own items, without any draft on them. */
export function changeLines(elements: readonly DesignElement[], patches: Patches): ChangeLine[] {
  return elements.flatMap((e) => {
    const p = patches[e.id];
    if (!p) return [];
    const edits = roomEdits([e], patches);
    if (!changeCount(edits)) return [];
    const to = edits.selections.length ? p.product ?? null : null;
    return [{
      elementId: e.id, floorId: e.floor_id, name: elementName(e, 'designer'), position: e.position,
      swap: to ? { from: e.product, to } : null,
      overridesChanged: edits.overrides.length > 0,
      delta: to?.unit_price ? sumMoney([to.unit_price, negate(itemPrice(e) ?? '0')]) : null,
    }];
  });
}

export const totalDelta = (lines: readonly Pick<ChangeLine, 'delta'>[]) => sumMoney(lines.map((l) => l.delta));

/** "+1,200,000 ₫", "−500,000 ₫", or "—" when the price is unknown. */
export const signedVnd = (v: string | null) => {
  if (!v) return '—';
  const n = Number(v);
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatVnd(Math.abs(n))}`;
};

export interface MergeRow { key: string; room: string; count: number; delta: string }
export interface MergeSummary { rooms: MergeRow[]; own: { count: number; delta: string } | null; total: string; lines: ChangeLine[]; hasLayout: boolean }

/** What Merge & save would change: per room, the Lead's own changes, and the total. One designer per room, so these never overlap. */
export function mergeSummary(elements: readonly DesignElement[], ready: readonly RoomDraft[], own: Patches): MergeSummary {
  const perRoom = ready.map((d) => ({ d, lines: [...changeLines(elements, draftPatches([d])), ...layoutLines(elements, [d])] }));
  const mine = changeLines(elements, own);
  const lines = [...perRoom.flatMap((r) => r.lines), ...mine];
  return {
    rooms: perRoom.map(({ d, lines: l }) => ({ key: d.id, room: d.room_name, count: l.length, delta: totalDelta(l) })),
    own: mine.length ? { count: mine.length, delta: totalDelta(mine) } : null,
    total: totalDelta(lines),
    lines,
    hasLayout: hasLayoutChanges(ready),
  };
}

/**
 * What the Lead's Save sends when they hold taken-over drafts. The backend refuses an item that is both in a merged draft
 * and in the direct edits, so changes made on top of a taken-over draft are folded into that draft first.
 */
export function foldOwnDrafts(elements: readonly DesignElement[], own: readonly RoomDraft[], local: Patches) {
  const direct = { ...local };
  const rooms = own.map((draft) => {
    const items = elements.filter((e) => e.room_id === draft.room_id);
    for (const e of items) delete direct[e.id];
    const saved = draftPatches([draft]);
    const edits = roomEdits(items, mergePatches(saved, local));
    return {
      draft,
      input: { ...edits, addressed_comment_ids: draft.addressed_comment_ids } satisfies RoomDraftInput,
      count: changeCount(edits),
      changed: JSON.stringify(edits) !== JSON.stringify(roomEdits(items, saved)),
    };
  });
  return { direct, rooms };
}

/** The shape ComparePanel reads, for a result that does not exist as a version yet. Every change counts as Changed. */
export function mergeComparison(lines: readonly ChangeLine[], floorId: string): VersionComparison {
  const here = lines.filter((l) => l.floorId === floorId);
  const ref = (l: ChangeLine): ComparedElement => ({ id: l.elementId, floor_id: l.floorId, dxf_handle: null, name: l.name });
  const op = (o: LayoutOp) => here.filter((l) => l.layout?.op === o).map(ref);
  const layoutIds = new Set(here.filter((l) => l.layout).map((l) => l.elementId));
  return {
    from: { id: '', label: '' }, to: { id: '', label: '' }, added: op('ADD'), removed: op('DELETE'),
    moved: op('MOVE').map((r) => ({ from: r, to: r, distance: 0, rotation_deg: 0 })), replaced: [],
    overrides_changed: here.filter((l) => !l.layout && !layoutIds.has(l.elementId)).map((l) => ({ from: ref(l), to: ref(l) })),
    walls_changed: false, openings_changed: false, totals: null,
  };
}

/** Rooms whose draft has item changes but is not marked ready. */
export const unreadyDraftRooms = (drafts: readonly RoomDraft[]) => drafts.filter((d) => d.status === 'DRAFT' && draftChangeCount(d) > 0).map((d) => d.room_name);

/** The viewer's unsaved changes that really differ from the version, in one room. */
export const localChangesInRoom = (elements: readonly DesignElement[], roomId: string, local: Patches) =>
  changeCount(roomEdits(elements.filter((e) => e.room_id === roomId), local));

/** Names of the rooms "Choose all remaining" left alone, in the backend's order. */
export const skippedRoomNames = (ids: readonly string[], floors: readonly { scene_json: { rooms: { room_id?: string | null; name: string }[] } }[]) => {
  const rooms = floors.flatMap((f) => f.scene_json.rooms);
  return ids.flatMap((id) => rooms.find((r) => r.room_id === id)?.name ?? []);
};

/** Comments the Members handled in their Ready drafts, still open: ticked in advance for the Lead. */
export const suggestedAddressed = (drafts: readonly RoomDraft[], openIds: readonly string[]) =>
  [...new Set(drafts.filter((d) => d.status === 'READY').flatMap((d) => d.addressed_comment_ids))].filter((id) => openIds.includes(id));

/** How the changed items are tinted while the Lead previews a draft. */
export function previewHighlight(draft: RoomDraft | null): Record<string, DiffKind> {
  const out: Record<string, DiffKind> = {};
  for (const o of draft?.overrides ?? []) out[o.element_id] = 'changed';
  for (const s of draft?.selections ?? []) out[s.element_id] = 'replaced';
  return out;
}

/**
 * Names for the "dropped" banner, one per item. The ids are from the old version, so items are found by floor and DXF handle.
 * A dropped override carries no product: if its item is gone too, there is no name left to show.
 */
export function droppedItemNames(drafts: readonly RoomDraft[], elements: readonly DesignElement[]): string[] {
  const seen = new Set<string>(), names: string[] = [];
  for (const x of drafts.flatMap((d) => d.dropped_changes)) {
    if (seen.has(x.element_id)) continue;
    seen.add(x.element_id);
    const now = x.dxf_handle ? elements.find((e) => e.floor_id === x.floor_id && e.dxf_handle === x.dxf_handle) : undefined;
    names.push(now ? elementName(now, 'designer') : x.product?.name ?? t('drafts.removedItem'));
  }
  return names;
}
