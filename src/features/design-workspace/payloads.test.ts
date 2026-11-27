import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecommendations } from '../ai/recommendationLogic.ts';
import { editsBody, roomDraftBody } from './payloads.ts';
import { memberDraftRows } from './roomDrafts.ts';
import type { DesignElement, Product } from './types';

const sources = { e1: { recommendationId: 'rec1', productId: 'pA' } };

test('Lead /edits: an AI selection carries recommendationId, a hand-picked one does not', () => {
  const body = editsBody({
    title: 'AI combo', revision_type: 'MINOR',
    edits: withRecommendations([{ element_id: 'e1', product_id: 'pA' }, { element_id: 'e2', product_id: 'pB' }, { element_id: 'e3', overrides: { on: false } }], sources),
  });
  assert.deepEqual(body, {
    title: 'AI combo', revisionType: 'MINOR',
    selections: [{ elementId: 'e1', productId: 'pA', recommendationId: 'rec1' }, { elementId: 'e2', productId: 'pB' }],
    overrides: [{ elementId: 'e3', overrides: { on: false } }],
  });
});

test('Lead /edits: optional lists only when they have something', () => {
  const body = editsBody({ title: 't', revision_type: 'MAJOR', edits: [], choose_all_remaining: true, addressed_comment_ids: [], room_draft_ids: ['d1'] });
  assert.deepEqual(body, { title: 't', revisionType: 'MAJOR', selections: [], overrides: [], chooseAllRemaining: true, roomDraftIds: ['d1'] });
});

test('Member room draft: only elementId and productId per selection, never recommendationId', () => {
  // even if something upstream slipped a recommendation id into the input, the body is whitelisted
  const input = { selections: [{ element_id: 'e1', product_id: 'pA', recommendation_id: 'rec1' }], overrides: [], addressed_comment_ids: ['c1'] };
  const body = roomDraftBody(input);
  assert.deepEqual(body, { selections: [{ elementId: 'e1', productId: 'pA' }], overrides: [], addressedCommentIds: ['c1'] });
  assert.deepEqual(Object.keys(body.selections[0]).sort(), ['elementId', 'productId']);
});

test('Member flow: an applied AI combo reaches the room draft body without recommendationId', () => {
  const el = (id: string): DesignElement => ({
    id, floor_id: 'f1', room_id: 'r1', dxf_handle: id, block_name: 'SOFA', name: 'Sofa', element_type: 'FURNITURE', category: null, default_model_url: null,
    position: { x: 0, y: 0, rotation_deg: 0 }, width_mm: 1, depth_mm: 1, height_mm: 1, overrides: null, choice: 'NOT_CHOSEN', product: null, line_total: null,
  });
  const product: Product = { id: 'pA', name: 'A', sku: '', block_code: '', supplier_name: '', unit_price: '1', thumbnail_url: null, model_3d_url: null, width_mm: null, depth_mm: null, height_mm: null, specifications: null };
  const [row] = memberDraftRows({ elements: [el('e1')], drafts: [], local: { e1: { product, choice: 'CHOSEN' } }, ticks: {}, roomNames: { r1: 'Living' } });
  assert.deepEqual(roomDraftBody(row.input).selections, [{ elementId: 'e1', productId: 'pA' }]);
});
