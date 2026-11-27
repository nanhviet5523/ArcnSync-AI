// No '@/' runtime imports here: recommendationLogic.test.ts loads this file with plain `node --test`.
import type { DesignElement, Product } from '../design-workspace/types';
import type { AiAcceptance, AiRecommendation, AiRecommendationCandidate, AiRecommendationItem, AiRecommendationRequest, ComboVariant } from './recommendationApi';

// --- errors ------------------------------------------------------------------

/**
 * What the page does besides showing the message:
 * reload = assignments or the project moved on, read the page again; latest = a newer version exists, open it;
 * includeChosen = offer "Suggest for chosen items too"; quota = lock the button; refresh = read the history again.
 */
export type RecErrorAction = 'none' | 'reload' | 'latest' | 'includeChosen' | 'quota' | 'refresh';

export interface RecError {
  /** Backend code, '' when there is none. */
  code: string;
  messageKey: string;
  params?: Record<string, string | number>;
  action: RecErrorAction;
  /** False for a code this table doesn't know: the caller logs it. */
  known: boolean;
  /** VERSION_NOT_CURRENT: the version to open, when the backend names it. */
  currentVersionId?: string;
}

/** Branch on the backend `code` ({ code, message, details }), never on the message. */
export const REC_ERRORS: Record<string, { key: string; action: RecErrorAction }> = {
  INVALID_RECOMMENDATION_SCOPE: { key: 'aiCombo.errors.INVALID_RECOMMENDATION_SCOPE', action: 'none' },
  ROOM_NOT_ASSIGNED: { key: 'aiCombo.errors.ROOM_NOT_ASSIGNED', action: 'reload' },
  ROOM_ASSIGNED_TO_MEMBER: { key: 'aiCombo.errors.ROOM_ASSIGNED_TO_MEMBER', action: 'reload' },
  VERSION_NOT_EDITABLE: { key: 'aiCombo.errors.VERSION_NOT_EDITABLE', action: 'reload' },
  PROJECT_NOT_IN_PRODUCT_SELECTION: { key: 'aiCombo.errors.PROJECT_NOT_IN_PRODUCT_SELECTION', action: 'reload' },
  VERSION_NOT_CURRENT: { key: 'aiCombo.errors.VERSION_NOT_CURRENT', action: 'latest' },
  NOTHING_TO_RECOMMEND: { key: 'aiCombo.errors.NOTHING_TO_RECOMMEND', action: 'includeChosen' },
  RECOMMENDATION_SCOPE_TOO_LARGE: { key: 'aiCombo.errors.RECOMMENDATION_SCOPE_TOO_LARGE', action: 'none' },
  NO_RECOMMENDABLE_PRODUCTS: { key: 'aiCombo.errors.NO_RECOMMENDABLE_PRODUCTS', action: 'none' },
  AI_QUOTA_EXCEEDED: { key: 'aiCombo.errors.AI_QUOTA_EXCEEDED', action: 'quota' },
  AI_PROVIDER_NOT_CONFIGURED: { key: 'aiCombo.errors.unavailable', action: 'none' },
  AI_PROMPT_NOT_CONFIGURED: { key: 'aiCombo.errors.unavailable', action: 'none' },
  AI_PROVIDER_ERROR: { key: 'aiCombo.errors.unavailable', action: 'none' },
  INVALID_CANDIDATE_INDEX: { key: 'aiCombo.errors.INVALID_CANDIDATE_INDEX', action: 'refresh' },
  AI_RECOMMENDATION_NOT_FOUND: { key: 'aiCombo.errors.AI_RECOMMENDATION_NOT_FOUND', action: 'refresh' },
  /** Lead's Save: a recommendationId the backend refused (see dropInvalidRecommendations). */
  INVALID_RECOMMENDATION: { key: 'aiCombo.errors.INVALID_RECOMMENDATION', action: 'none' },
};

export const REC_TOO_FAST_KEY = 'aiCombo.errors.tooFast';
export const REC_NETWORK_KEY = 'aiCombo.errors.network';
export const REC_GENERIC_KEY = 'aiCombo.errors.generic';
/** NOTHING_TO_RECOMMEND although chosen items were included: nothing in the scope is a kind the AI suggests for. */
export const NOTHING_RECOMMENDABLE_KEY = 'aiCombo.errors.NOTHING_RECOMMENDABLE';

// --- what the AI suggests for ----------------------------------------------------

/** The backend only suggests for these kinds of item, and only once the item has a category; others are skipped silently. */
export const RECOMMENDABLE_TYPES: ReadonlySet<string> = new Set(['FURNITURE', 'DECOR', 'LIGHTING']);
export const isRecommendable = (e: Pick<DesignElement, 'element_type' | 'category'>) => RECOMMENDABLE_TYPES.has(e.element_type) && e.category !== null;

/** Checklist row of the create dialog. */
export interface ComboItem { id: string; name: string; chosen: boolean }

/**
 * Ticked items that will really be sent: with includeChosen off, items that already have a product are greyed out
 * and left out (their tick is kept, so turning the checkbox on brings them back).
 */
export const sendableItemIds = (ticked: readonly string[], items: readonly ComboItem[], includeChosen: boolean) =>
  items.filter((i) => ticked.includes(i.id) && (includeChosen || !i.chosen)).map((i) => i.id);

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * `sent`: the body of the request that failed. NOTHING_TO_RECOMMEND after includeChosen: true means the scope has no
 * item the AI can suggest for at all, so "Include chosen items" would not help.
 */
export function classifyRecError(error: unknown, sent?: Pick<AiRecommendationRequest, 'includeChosen'>): RecError {
  const e = (typeof error === 'object' && error !== null ? error : {}) as { name?: unknown; code?: unknown; status?: unknown; details?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const status = typeof e.status === 'number' ? e.status : 0;
  const details = (typeof e.details === 'object' && e.details !== null ? e.details : {}) as Record<string, unknown>;
  // the throttle may answer without a code
  if (status === 429) return { code, messageKey: REC_TOO_FAST_KEY, action: 'none', known: true };
  if (code === 'NOTHING_TO_RECOMMEND' && sent?.includeChosen === true) {
    return { code, messageKey: NOTHING_RECOMMENDABLE_KEY, action: 'none', known: true };
  }
  const row = Object.hasOwn(REC_ERRORS, code) ? REC_ERRORS[code] : undefined;
  if (row) {
    const out: RecError = { code, messageKey: row.key, action: row.action, known: true };
    if (code === 'RECOMMENDATION_SCOPE_TOO_LARGE') out.params = { slots: Number(details.slots ?? 0), max: Number(details.max ?? 20) };
    if (code === 'NO_RECOMMENDABLE_PRODUCTS') out.params = { n: asArray(details.unfilledElementIds).length };
    if (code === 'VERSION_NOT_CURRENT' && typeof details.currentVersionId === 'string') out.currentVersionId = details.currentVersionId;
    return out;
  }
  // the request never reached the server
  if (e.name === 'ApiError' && !code && !status) return { code, messageKey: REC_NETWORK_KEY, action: 'none', known: true };
  return { code, messageKey: REC_GENERIC_KEY, action: 'none', known: false };
}

// --- create form ---------------------------------------------------------------

export const NOTE_MAX = 500;
export const ELEMENTS_MAX = 50;

export interface ComboForm {
  scope: 'room' | 'items';
  roomId: string;
  elementIds: string[];
  includeChosen: boolean;
  note: string;
  /** As typed: "60000000", "60.000.000" or "60,000,000". Empty = the backend splits the project budget. */
  budget: string;
}

export type ComboFormError = 'room' | 'items' | 'tooManyItems' | 'note' | 'budget';

/** Whole VND as a digit string ("60000000"), '' for an empty field, null when it is not a positive amount. */
export function parseBudget(raw: string): string | null {
  const s = raw.replace(/[\s.,_]/g, '').replace(/₫|vnd|đ/gi, '');
  if (!s) return '';
  if (!/^\d+$/.test(s)) return null;
  const n = s.replace(/^0+/, '');
  return n ? n : null;
}

/**
 * Nothing to send yet: "A room" with no room picked, or "Some items" with nothing that will really be sent (pass the
 * ids from sendableItemIds). The create button stays disabled: the backend answers 400 to an empty elementIds.
 */
export const scopeEmpty = (f: Pick<ComboForm, 'scope' | 'roomId' | 'elementIds'>) =>
  f.scope === 'room' ? !f.roomId : !f.elementIds.length;

/** The request body, with exactly one of roomId / elementIds (the backend answers 400 INVALID_RECOMMENDATION_SCOPE otherwise). */
export function comboRequest(f: ComboForm): { body: AiRecommendationRequest } | { error: ComboFormError } {
  if (f.scope === 'room' && !f.roomId) return { error: 'room' };
  const ids = [...new Set(f.elementIds)];
  if (f.scope === 'items' && !ids.length) return { error: 'items' };
  if (f.scope === 'items' && ids.length > ELEMENTS_MAX) return { error: 'tooManyItems' };
  const note = f.note.trim();
  if (note.length > NOTE_MAX) return { error: 'note' };
  const budget = parseBudget(f.budget);
  if (budget === null) return { error: 'budget' };
  return {
    body: {
      ...(f.scope === 'room' ? { roomId: f.roomId } : { elementIds: ids }),
      ...(f.includeChosen ? { includeChosen: true } : {}),
      ...(note ? { note } : {}),
      ...(budget ? { budgetMax: budget } : {}),
    },
  };
}

// --- money (strings, never added up as numbers) ---------------------------------

const MONEY = /^(-?)0*(\d*?)(?:\.(\d*?)0*)?$/;
/** "60000000.00" and "60000000" are the same amount. */
const normalMoney = (v: string) => {
  const m = MONEY.exec(v.trim());
  if (!m) return v.trim();
  const int = m[2] || '0', frac = m[3] ?? '';
  const zero = int === '0' && !frac;
  return `${m[1] && !zero ? '-' : ''}${int}${frac ? `.${frac}` : ''}`;
};
export const sameMoney = (a: string, b: string) => normalMoney(a) === normalMoney(b);
export const isNegativeMoney = (v: string) => normalMoney(v).startsWith('-');

/** The total to show: the current one when known, and whether prices moved since the suggestion. */
export function candidateTotal(c: Pick<AiRecommendationCandidate, 'totalPrice' | 'currentTotalPrice'>) {
  if (c.currentTotalPrice === null) return { amount: c.totalPrice, changed: false, current: false };
  return { amount: c.currentTotalPrice, changed: !sameMoney(c.currentTotalPrice, c.totalPrice), current: true };
}

export const VARIANT_KEYS: Record<ComboVariant, string> = {
  BALANCED: 'aiCombo.variant.BALANCED',
  SAVING: 'aiCombo.variant.SAVING',
  PREMIUM: 'aiCombo.variant.PREMIUM',
};

// --- applying an option ------------------------------------------------------------

/** Items whose product in the editor came from an AI suggestion, by item id. Only the Lead's /edits carries it. */
export type AiSources = Record<string, { recommendationId: string; productId: string }>;

export const acceptedCandidate = (r: Pick<AiRecommendation, 'candidates' | 'acceptedCandidateIndex'>) =>
  r.acceptedCandidateIndex === null ? undefined : r.candidates.find((c) => c.index === r.acceptedCandidateIndex);

/** The editor's product for an item of the option, from the suggestion's product card. 3D reads the model by product id. */
export function productFromItem(item: AiRecommendationItem): Product | null {
  const p = item.product;
  if (!p || !item.available) return null;
  return {
    id: p.id, name: p.name, sku: '', block_code: '', supplier_name: p.supplierName ?? '',
    unit_price: item.currentPrice ?? p.price, thumbnail_url: p.thumbnailUrl ?? null, model_3d_url: null,
    width_mm: null, depth_mm: null, height_mm: null, specifications: null,
  };
}

/**
 * "View on 3D": the option's products laid over the drawing on this page only, nothing is saved. Each item of the
 * option replaces the model of every element it names; products no longer sold are left as they are.
 */
export function previewPatches(c: Pick<AiRecommendationCandidate, 'items'>): Record<string, { product: Product; choice: 'CHOSEN' }> {
  const out: Record<string, { product: Product; choice: 'CHOSEN' }> = {};
  for (const item of c.items) {
    const product = productFromItem(item);
    if (!product) continue;
    for (const id of item.elementIds) out[id] = { product, choice: 'CHOSEN' };
  }
  return out;
}

/** Shift+click on the drawing: adds or removes an item, never past ELEMENTS_MAX. */
export function togglePick(picks: readonly string[], id: string): string[] {
  if (picks.includes(id)) return picks.filter((x) => x !== id);
  return picks.length >= ELEMENTS_MAX ? [...picks] : [...picks, id];
}

/** Badge of the room's "AI combo" button: items the AI could suggest for that have no product yet. */
export const unchosenCount = (items: readonly Pick<DesignElement, 'element_type' | 'category' | 'product'>[]) =>
  items.filter((e) => isRecommendable(e) && !e.product).length;

export interface AppliedOption {
  /** Editor patches, as if the designer had picked each product. */
  patches: Record<string, { product: Product; choice: 'CHOSEN' }>;
  sources: AiSources;
  /** Items the viewer may not change any more (room moved to someone else) or that are not in this version. */
  skipped: string[];
}

/**
 * Turns the acceptance into editor changes. Products come from the accepted option; a pair the option does not
 * name (or with no product card) is skipped rather than guessed.
 */
export function applyAcceptance(a: Pick<AiAcceptance, 'recommendation' | 'selections'>, canEdit: (elementId: string) => boolean): AppliedOption {
  const r = a.recommendation;
  const chosen = acceptedCandidate(r);
  const items = chosen ? chosen.items : r.candidates.flatMap((c) => c.items);
  const out: AppliedOption = { patches: {}, sources: {}, skipped: [] };
  for (const s of a.selections) {
    const item = items.find((i) => i.productId === s.productId && i.elementIds.includes(s.elementId))
      ?? items.find((i) => i.productId === s.productId);
    const product = item && productFromItem(item);
    if (!product || !canEdit(s.elementId)) { out.skipped.push(s.elementId); continue; }
    out.patches[s.elementId] = { product, choice: 'CHOSEN' };
    out.sources[s.elementId] = { recommendationId: r.id, productId: s.productId };
  }
  return out;
}

/**
 * Adds recommendation_id to the Lead's edits whose product is still the one the AI suggested. A product changed by
 * hand afterwards no longer matches, so it goes without one.
 */
export function withRecommendations<E extends { element_id: string; product_id?: string }>(edits: readonly E[], sources: AiSources): (E & { recommendation_id?: string })[] {
  return edits.map((e) => {
    const s = sources[e.element_id];
    return s && e.product_id && s.productId === e.product_id ? { ...e, recommendation_id: s.recommendationId } : e;
  });
}

/** One refused pair in details.references of 400 INVALID_RECOMMENDATION. The list holds only the refused pairs. */
export interface InvalidRecommendationRef { recommendationId: string; elementId: string; productId: string }

const isRef = (x: unknown): x is InvalidRecommendationRef => {
  const r = x as Partial<Record<keyof InvalidRecommendationRef, unknown>> | null;
  return typeof r === 'object' && r !== null && typeof r.recommendationId === 'string' && typeof r.elementId === 'string' && typeof r.productId === 'string';
};

/**
 * 400 INVALID_RECOMMENDATION on the Lead's Save: forget the links of exactly the refused (item, product) pairs and keep
 * the others. Only when details.references is missing or unreadable does every link go, so the next Save goes through.
 */
export function dropInvalidRecommendations(sources: AiSources, details: unknown): AiSources {
  const refs = (details as { references?: unknown } | null)?.references;
  if (!Array.isArray(refs) || !refs.length || !refs.every(isRef)) return {};
  const refused = (id: string, s: AiSources[string]) =>
    refs.some((r) => r.elementId === id && r.productId === s.productId && r.recommendationId === s.recommendationId);
  return Object.fromEntries(Object.entries(sources).filter(([id, s]) => !refused(id, s)));
}
