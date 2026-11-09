import { t } from '../../i18n/index.ts';
import { elementName, formatVnd, latestVersion } from './logic.ts';
import type { DiffKind } from './logic';
import { itemPrice, sumMoney } from './rooms.ts';
import type { ComparedElement, DesignElement, DraftSelection, Overrides, Product, RoomDraft, RoomDraftInput, VersionComparison, VersionSummary } from './types';

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
    const count = changeCount(edits);
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
export interface MergeSummary { rooms: MergeRow[]; own: { count: number; delta: string } | null; total: string; lines: ChangeLine[] }

/** What Merge & save would change: per room, the Lead's own changes, and the total. One designer per room, so these never overlap. */
export function mergeSummary(elements: readonly DesignElement[], ready: readonly RoomDraft[], own: Patches): MergeSummary {
  const perRoom = ready.map((d) => ({ d, lines: changeLines(elements, draftPatches([d])) }));
  const mine = changeLines(elements, own);
  const lines = [...perRoom.flatMap((r) => r.lines), ...mine];
  return {
    rooms: perRoom.map(({ d, lines: l }) => ({ key: d.id, room: d.room_name, count: l.length, delta: totalDelta(l) })),
    own: mine.length ? { count: mine.length, delta: totalDelta(mine) } : null,
    total: totalDelta(lines),
    lines,
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
export function mergeComparison(elements: readonly DesignElement[], lines: readonly ChangeLine[], floorId: string): VersionComparison {
  const ids = new Set(lines.map((l) => l.elementId));
  const ref = (e: DesignElement): ComparedElement => ({ id: e.id, floor_id: e.floor_id, dxf_handle: e.dxf_handle, name: e.name });
  return {
    from: { id: '', label: '' }, to: { id: '', label: '' }, added: [], removed: [], moved: [], replaced: [],
    overrides_changed: elements.filter((e) => e.floor_id === floorId && ids.has(e.id)).map((e) => ({ from: ref(e), to: ref(e) })),
    walls_changed: false, openings_changed: false, totals: null,
  };
}

/** Rooms whose draft has item changes but is not marked ready. */
export const unreadyDraftRooms = (drafts: readonly RoomDraft[]) => drafts.filter((d) => d.status === 'DRAFT' && changeCount(d) > 0).map((d) => d.room_name);

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
