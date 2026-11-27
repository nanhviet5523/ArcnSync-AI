import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../../i18n/en.ts';
import type { AiAcceptance, AiRecommendation, AiRecommendationItem } from './recommendationApi.ts';
import {
  NOTHING_RECOMMENDABLE_KEY, REC_ERRORS, REC_GENERIC_KEY, REC_NETWORK_KEY, REC_TOO_FAST_KEY, VARIANT_KEYS,
  applyAcceptance, candidateTotal, classifyRecError, comboRequest, dropInvalidRecommendations, isNegativeMoney, isRecommendable, parseBudget, previewPatches, sameMoney, scopeEmpty, sendableItemIds, togglePick, unchosenCount, withRecommendations, ELEMENTS_MAX,
} from './recommendationLogic.ts';
import type { ComboForm, InvalidRecommendationRef } from './recommendationLogic.ts';

const apiError = (code: string, status: number, details?: unknown) =>
  Object.assign(new Error('Thông điệp tiếng Việt'), { name: 'ApiError', code, status, details });
const lookup = (key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);

// --- error codes -------------------------------------------------------------------

test('every recommendation error key has English copy', () => {
  for (const key of [...Object.values(REC_ERRORS).map((r) => r.key), ...Object.values(VARIANT_KEYS), REC_TOO_FAST_KEY, REC_NETWORK_KEY, REC_GENERIC_KEY]) {
    const v = lookup(key);
    assert.ok(typeof v === 'string' || (typeof v === 'object' && v !== null && 'other' in v), key);
  }
});

test('400 INVALID_RECOMMENDATION_SCOPE: a form error, nothing else happens', () => {
  assert.deepEqual(classifyRecError(apiError('INVALID_RECOMMENDATION_SCOPE', 400)), {
    code: 'INVALID_RECOMMENDATION_SCOPE', messageKey: 'aiCombo.errors.INVALID_RECOMMENDATION_SCOPE', action: 'none', known: true,
  });
});

test('403 ROOM_NOT_ASSIGNED / ROOM_ASSIGNED_TO_MEMBER: own message, reload the assignments', () => {
  for (const code of ['ROOM_NOT_ASSIGNED', 'ROOM_ASSIGNED_TO_MEMBER']) {
    const c = classifyRecError(apiError(code, 403, { roomIds: ['r1'], elementIds: [] }));
    assert.equal(c.action, 'reload', code);
    assert.equal(c.messageKey, `aiCombo.errors.${code}`);
  }
  assert.match(lookup('aiCombo.errors.ROOM_ASSIGNED_TO_MEMBER') as string, /yourself/);
});

test('422 version / project state: VERSION_NOT_CURRENT offers the latest version, the others reload', () => {
  const stale = classifyRecError(apiError('VERSION_NOT_CURRENT', 422, { currentVersionId: 'v9' }));
  assert.equal(stale.action, 'latest');
  assert.equal(stale.currentVersionId, 'v9');
  assert.equal(classifyRecError(apiError('VERSION_NOT_CURRENT', 422)).currentVersionId, undefined);
  assert.equal(classifyRecError(apiError('VERSION_NOT_EDITABLE', 422)).action, 'reload');
  assert.equal(classifyRecError(apiError('PROJECT_NOT_IN_PRODUCT_SELECTION', 422)).action, 'reload');
});

test('422 NOTHING_TO_RECOMMEND offers "include chosen items"', () => {
  assert.equal(classifyRecError(apiError('NOTHING_TO_RECOMMEND', 422)).action, 'includeChosen');
});

test('422 RECOMMENDATION_SCOPE_TOO_LARGE and NO_RECOMMENDABLE_PRODUCTS carry their counts', () => {
  assert.deepEqual(classifyRecError(apiError('RECOMMENDATION_SCOPE_TOO_LARGE', 422, { slots: 24, max: 20 })).params, { slots: 24, max: 20 });
  assert.deepEqual(classifyRecError(apiError('NO_RECOMMENDABLE_PRODUCTS', 422, { unfilledElementIds: ['a', 'b'] })).params, { n: 2 });
  assert.deepEqual(classifyRecError(apiError('NO_RECOMMENDABLE_PRODUCTS', 422)).params, { n: 0 });
});

test('422 AI_QUOTA_EXCEEDED locks the button', () => {
  assert.equal(classifyRecError(apiError('AI_QUOTA_EXCEEDED', 422)).action, 'quota');
});

test('503 AI codes: one "not available" sentence', () => {
  for (const code of ['AI_PROVIDER_NOT_CONFIGURED', 'AI_PROMPT_NOT_CONFIGURED', 'AI_PROVIDER_ERROR']) {
    assert.deepEqual(classifyRecError(apiError(code, 503)), { code, messageKey: 'aiCombo.errors.unavailable', action: 'none', known: true });
  }
});

test('acceptance and history errors read the suggestion again', () => {
  assert.equal(classifyRecError(apiError('INVALID_CANDIDATE_INDEX', 400)).action, 'refresh');
  assert.equal(classifyRecError(apiError('AI_RECOMMENDATION_NOT_FOUND', 404)).action, 'refresh');
});

test('429, network, unknown code: no HTTP status or backend text shown', () => {
  assert.equal(classifyRecError(apiError('', 429)).messageKey, REC_TOO_FAST_KEY);
  assert.equal(classifyRecError(apiError('THROTTLED', 429)).messageKey, REC_TOO_FAST_KEY);
  assert.equal(classifyRecError(apiError('', 0)).messageKey, REC_NETWORK_KEY);
  assert.deepEqual(classifyRecError(apiError('SOMETHING_NEW', 500)), { code: 'SOMETHING_NEW', messageKey: REC_GENERIC_KEY, action: 'none', known: false });
  assert.equal(classifyRecError(null).messageKey, REC_GENERIC_KEY);
});

// --- create form -------------------------------------------------------------------

const form = (p: Partial<ComboForm>): ComboForm => ({ scope: 'room', roomId: 'r1', elementIds: [], includeChosen: false, note: '', budget: '', ...p });

test('form: exactly one of roomId / elementIds, empty optional fields left out', () => {
  assert.deepEqual(comboRequest(form({ elementIds: ['e1'] })), { body: { roomId: 'r1' } });
  assert.deepEqual(comboRequest(form({ scope: 'items', elementIds: ['e1', 'e2', 'e1'] })), { body: { elementIds: ['e1', 'e2'] } });
  assert.deepEqual(comboRequest(form({ includeChosen: true, note: '  Tông gỗ sáng  ', budget: '60.000.000' })), {
    body: { roomId: 'r1', includeChosen: true, note: 'Tông gỗ sáng', budgetMax: '60000000' },
  });
});

test('form: missing scope, too many items, long note, bad budget', () => {
  assert.deepEqual(comboRequest(form({ roomId: '' })), { error: 'room' });
  assert.deepEqual(comboRequest(form({ scope: 'items' })), { error: 'items' });
  assert.deepEqual(comboRequest(form({ scope: 'items', elementIds: Array.from({ length: 51 }, (_, i) => `e${i}`) })), { error: 'tooManyItems' });
  assert.deepEqual(comboRequest(form({ note: 'x'.repeat(501) })), { error: 'note' });
  for (const budget of ['0', '-5', 'abc', '12.5k']) assert.deepEqual(comboRequest(form({ budget })), { error: 'budget' }, budget);
});

test('budget: VND as a digit string, separators dropped', () => {
  assert.equal(parseBudget(''), '');
  assert.equal(parseBudget('60,000,000'), '60000000');
  assert.equal(parseBudget('60 000 000 ₫'), '60000000');
  assert.equal(parseBudget('000'), null);
});

// --- money -------------------------------------------------------------------------

test('money strings compare by amount, not by text', () => {
  assert.ok(sameMoney('60000000.00', '60000000'));
  assert.ok(!sameMoney('60000000.00', '60000001.00'));
  assert.ok(isNegativeMoney('-1500000.00'));
  assert.ok(!isNegativeMoney('-0.00'));
  assert.ok(!isNegativeMoney('0'));
});

test('option total: current price first, flags a change, falls back when a product is gone', () => {
  assert.deepEqual(candidateTotal({ totalPrice: '100.00', currentTotalPrice: '100' }), { amount: '100', changed: false, current: true });
  assert.deepEqual(candidateTotal({ totalPrice: '100.00', currentTotalPrice: '120.00' }), { amount: '120.00', changed: true, current: true });
  assert.deepEqual(candidateTotal({ totalPrice: '100.00', currentTotalPrice: null }), { amount: '100.00', changed: false, current: false });
});

// --- applying and saving ----------------------------------------------------------

const item = (productId: string, elementIds: string[], available = true): AiRecommendationItem => ({
  productId, productName: `P ${productId}`, available, priceAtRecommend: '1000.00', currentPrice: available ? '1200.00' : null, quantity: elementIds.length, elementIds,
  product: available ? { id: productId, name: `P ${productId}`, price: '1200.00', unit: 'cái', categoryName: null, supplierName: 'NCC', styleNames: [], thumbnailUrl: null } : null,
});

const rec = (accepted: number | null): AiRecommendation => ({
  id: 'rec1', projectId: 'p', designVersionId: 'v', type: 'PRODUCT_COMBO', generationId: 'g', roomId: 'r1', note: null, includeChosen: false,
  designElementIds: ['e1', 'e2', 'e3'], unfilledElementIds: [], budget: { scopeBudget: '5000.00', source: 'PROJECT', projectRemaining: '9000.00' },
  candidates: [
    { index: 0, label: 'BALANCED', items: [item('pA', ['e1', 'e2']), item('pB', ['e3'])], totalPrice: '3000.00', currentTotalPrice: '3600.00', score: 0.9, withinBudget: true, reason: 'x' },
    { index: 1, label: 'SAVING', items: [item('pC', ['e1'])], totalPrice: '1000.00', currentTotalPrice: '1200.00', score: 0.7, withinBudget: true, reason: 'y' },
  ],
  acceptedCandidateIndex: accepted, createdAt: '2026-11-27T00:00:00.000Z',
});

const acceptance = (selections: AiAcceptance['selections']): AiAcceptance => ({ recommendation: rec(0), selections, unavailableProductIds: [] });

test('apply: each selection becomes an editor patch and an AI link, products from the accepted option', () => {
  const r = applyAcceptance(acceptance([{ elementId: 'e1', productId: 'pA' }, { elementId: 'e2', productId: 'pA' }, { elementId: 'e3', productId: 'pB' }]), () => true);
  assert.deepEqual(Object.keys(r.patches), ['e1', 'e2', 'e3']);
  assert.equal(r.patches.e1.product.id, 'pA');
  assert.equal(r.patches.e1.product.unit_price, '1200.00');
  assert.equal(r.patches.e1.choice, 'CHOSEN');
  assert.deepEqual(r.sources.e3, { recommendationId: 'rec1', productId: 'pB' });
  assert.deepEqual(r.skipped, []);
});

test('apply: items the viewer can no longer change, or products with no card, are skipped', () => {
  const r = applyAcceptance(acceptance([{ elementId: 'e1', productId: 'pA' }, { elementId: 'e3', productId: 'pB' }, { elementId: 'e9', productId: 'pZ' }]), (id) => id !== 'e3');
  assert.deepEqual(Object.keys(r.patches), ['e1']);
  assert.deepEqual(r.skipped, ['e3', 'e9']);
});

test('Lead edits: recommendationId only where the product is still the AI one', () => {
  const sources = { e1: { recommendationId: 'rec1', productId: 'pA' }, e2: { recommendationId: 'rec1', productId: 'pA' } };
  const edits = [
    { element_id: 'e1', product_id: 'pA' },
    { element_id: 'e2', product_id: 'pManual' }, // changed by hand after applying
    { element_id: 'e4', product_id: 'pX' }, // picked by hand
    { element_id: 'e1b', overrides: { on: true } },
  ];
  assert.deepEqual(withRecommendations(edits, sources), [
    { element_id: 'e1', product_id: 'pA', recommendation_id: 'rec1' },
    { element_id: 'e2', product_id: 'pManual' },
    { element_id: 'e4', product_id: 'pX' },
    { element_id: 'e1b', overrides: { on: true } },
  ]);
});

const linked = {
  e1: { recommendationId: 'rec1', productId: 'pA' },
  e2: { recommendationId: 'rec1', productId: 'pA' },
  e3: { recommendationId: 'rec2', productId: 'pB' },
};

test('400 INVALID_RECOMMENDATION: drop exactly the refused (item, product) pairs, keep the other links', () => {
  const refs: InvalidRecommendationRef[] = [
    { recommendationId: 'rec1', elementId: 'e1', productId: 'pA' },
    { recommendationId: 'rec2', elementId: 'e3', productId: 'pB' },
  ];
  assert.deepEqual(dropInvalidRecommendations(linked, { references: refs }), { e2: linked.e2 });
});

test('400 INVALID_RECOMMENDATION: a reference to another product of the item leaves its link alone', () => {
  const refs: InvalidRecommendationRef[] = [{ recommendationId: 'rec1', elementId: 'e1', productId: 'pOld' }];
  assert.deepEqual(dropInvalidRecommendations(linked, { references: refs }), linked);
});

test('400 INVALID_RECOMMENDATION: missing or unreadable details drop every link', () => {
  assert.deepEqual(dropInvalidRecommendations(linked, null), {});
  assert.deepEqual(dropInvalidRecommendations(linked, {}), {});
  assert.deepEqual(dropInvalidRecommendations(linked, { references: 'e1' }), {});
  assert.deepEqual(dropInvalidRecommendations(linked, { references: [] }), {});
  assert.deepEqual(dropInvalidRecommendations(linked, { references: [{ elementId: 'e1' }] }), {});
});

// --- what can get suggestions ---------------------------------------------------------

test('NOTHING_TO_RECOMMEND: offer "include chosen" only when the request left chosen items out', () => {
  for (const sent of [undefined, {}, { includeChosen: false }]) {
    assert.equal(classifyRecError(apiError('NOTHING_TO_RECOMMEND', 422), sent).action, 'includeChosen', JSON.stringify(sent));
  }
  const all = classifyRecError(apiError('NOTHING_TO_RECOMMEND', 422), { includeChosen: true });
  assert.deepEqual(all, { code: 'NOTHING_TO_RECOMMEND', messageKey: NOTHING_RECOMMENDABLE_KEY, action: 'none', known: true });
  assert.equal(typeof lookup(NOTHING_RECOMMENDABLE_KEY), 'string');
});

test('recommendable: furniture, decor and lighting with a category only', () => {
  const cat = { id: 'c', code: 'SOFA', name: 'Sofa' };
  assert.ok(isRecommendable({ element_type: 'FURNITURE', category: cat }));
  assert.ok(isRecommendable({ element_type: 'DECOR', category: cat }));
  assert.ok(isRecommendable({ element_type: 'LIGHTING', category: cat }));
  assert.ok(!isRecommendable({ element_type: 'FURNITURE', category: null }));
  for (const type of ['APPLIANCE', 'FINISH_MATERIAL', 'OTHER'] as const) assert.ok(!isRecommendable({ element_type: type, category: cat }), type);
});

test('checklist: with "include chosen" off, items that have a product are not sent but stay ticked', () => {
  const items = [{ id: 'e1', name: 'Sofa', chosen: true }, { id: 'e2', name: 'Lamp', chosen: false }, { id: 'e3', name: 'Rug', chosen: false }];
  assert.deepEqual(sendableItemIds(['e1', 'e2'], items, false), ['e2']);
  assert.deepEqual(sendableItemIds(['e1', 'e2'], items, true), ['e1', 'e2']);
  // a tick on an item no longer in the list is not sent
  assert.deepEqual(sendableItemIds(['e9', 'e3'], items, false), ['e3']);
});

test('create button: disabled while nothing would be sent (backend 400s an empty elementIds)', () => {
  const items = [{ id: 'e1', name: 'Sofa', chosen: true }, { id: 'e2', name: 'Lamp', chosen: false }];
  // every ticked item is greyed out → 0 selected → disabled
  const allGreyed = sendableItemIds(['e1'], items, false);
  assert.deepEqual(allGreyed, []);
  assert.equal(scopeEmpty({ scope: 'items', roomId: 'r1', elementIds: allGreyed }), true);
  // turning "include chosen" on brings the tick back
  assert.equal(scopeEmpty({ scope: 'items', roomId: '', elementIds: sendableItemIds(['e1'], items, true) }), false);
  // "A room" with no room picked (e.g. every room disabled)
  assert.equal(scopeEmpty({ scope: 'room', roomId: '', elementIds: ['e2'] }), true);
  assert.equal(scopeEmpty({ scope: 'room', roomId: 'r1', elementIds: [] }), false);
});

// --- preview, picks, room badge ---------------------------------------------------

test('view on 3D: every element of an item gets its product, discontinued products are left out', () => {
  const p = previewPatches({ items: [item('pA', ['e1', 'e2']), item('pX', ['e3'], false)] });
  assert.deepEqual(Object.keys(p).sort(), ['e1', 'e2']);
  assert.equal(p.e1.product.id, 'pA');
  assert.equal(p.e1.product.unit_price, '1200.00');
  assert.equal(p.e2.choice, 'CHOSEN');
});

test('shift+click picks: toggles, and stops at the backend limit', () => {
  assert.deepEqual(togglePick(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(togglePick(['a', 'b'], 'a'), ['b']);
  const full = Array.from({ length: ELEMENTS_MAX }, (_, i) => `e${i}`);
  assert.equal(togglePick(full, 'extra').length, ELEMENTS_MAX);
  assert.equal(togglePick(full, 'e0').length, ELEMENTS_MAX - 1);
});

test('room badge: recommendable items with no product', () => {
  const p = { id: 'x' } as never;
  assert.equal(unchosenCount([
    { element_type: 'FURNITURE', category: 'SOFA', product: null },
    { element_type: 'LIGHTING', category: 'LAMP', product: p },
    { element_type: 'DECOR', category: null, product: null },
    { element_type: 'DOOR', category: 'DOOR', product: null },
  ] as never), 1);
});
