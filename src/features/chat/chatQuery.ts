// No '@/' runtime imports here: chatQuery.test.ts loads this file with plain `node --test`.
import type { GetChatContactsQuery, GetConversationsQuery, GetMessagesQuery } from '../../types/chat.ts';
import { isUuid } from './chatIds.ts';

/** Backend limits (PaginationQueryDto, ChatContactsQueryDto). */
export const CHAT_MAX_LIMIT = 100;
const MAX_Q_LENGTH = 100;

/**
 * The chat endpoints reject unknown query params (forbidNonWhitelisted → 400 VALIDATION_ERROR), so these builders copy
 * only the allowed keys, whatever else the object carries. Out-of-range numbers are dropped or clamped and a blank q is
 * left out, so the request always validates.
 */
function pageParams(query: { page?: number; limit?: number }): URLSearchParams {
  const params = new URLSearchParams();
  const page = Math.trunc(Number(query.page));
  if (page >= 1) params.set('page', String(page));
  const limit = Math.trunc(Number(query.limit));
  if (limit >= 1) params.set('limit', String(Math.min(limit, CHAT_MAX_LIMIT)));
  return params;
}

const toSearch = (params: URLSearchParams) => (params.size ? `?${params}` : '');

/** GET /chat-contacts: page, limit, q. */
export function chatContactsSearch(query: GetChatContactsQuery = {}): string {
  const params = pageParams(query);
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, MAX_Q_LENGTH) : '';
  if (q) params.set('q', q);
  return toSearch(params);
}

/** GET /conversations: page and limit only. */
export const conversationsSearch = (query: GetConversationsQuery = {}): string => toSearch(pageParams(query));

/** GET /conversations/:id/messages: `before` only when it is a UUID (else 400), `limit` clamped to 1..100. */
export function messagesSearch(query: GetMessagesQuery = {}): string {
  const params = new URLSearchParams();
  if (isUuid(query.before)) params.set('before', query.before);
  if (query.limit !== undefined) {
    const limit = Math.trunc(Number(query.limit));
    if (Number.isFinite(limit)) params.set('limit', String(Math.min(Math.max(limit, 1), CHAT_MAX_LIMIT)));
  }
  return toSearch(params);
}
