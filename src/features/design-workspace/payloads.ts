// No '@/' runtime imports here: payloads.test.ts loads this file with plain `node --test`.
import type { ElementEdit, RevisionType, RoomDraftInput } from './types';

export interface SaveEditsInput {
  title: string;
  revision_type: RevisionType;
  edits: ElementEdit[];
  choose_all_remaining?: boolean;
  addressed_comment_ids?: string[];
  room_draft_ids?: string[];
}

/** Lead: POST /design-versions/:id/edits. A selection from an AI suggestion carries its recommendationId. */
export function editsBody({ title, revision_type, edits, choose_all_remaining, addressed_comment_ids, room_draft_ids }: SaveEditsInput) {
  const selections = edits.filter((e) => e.product_id).map((e) => ({
    elementId: e.element_id, productId: e.product_id!, ...(e.recommendation_id ? { recommendationId: e.recommendation_id } : {}),
  }));
  const overrides = edits.filter((e) => e.overrides).map((e) => ({ elementId: e.element_id, overrides: e.overrides! }));
  return {
    title, revisionType: revision_type, selections, overrides,
    ...(choose_all_remaining ? { chooseAllRemaining: true } : {}),
    ...(addressed_comment_ids?.length ? { addressedCommentIds: addressed_comment_ids } : {}),
    ...(room_draft_ids?.length ? { roomDraftIds: room_draft_ids } : {}),
  };
}

/**
 * Member (and the Lead's taken-over drafts): PUT /design-versions/:id/room-drafts/:roomId.
 * The backend whitelists each selection strictly: only elementId and productId, never recommendationId (else 400).
 */
export function roomDraftBody(input: RoomDraftInput) {
  return {
    selections: input.selections.map((s) => ({ elementId: s.element_id, productId: s.product_id })),
    overrides: input.overrides.map((o) => ({ elementId: o.element_id, overrides: o.overrides })),
    addressedCommentIds: input.addressed_comment_ids,
  };
}
