import { useCallback } from 'react';
import { getCurrentUser } from '@/services/authService';
import type { ConversationItem, GetConversationsQuery } from '@/types/chat';
import { canChat, chatApi } from '../chatApi';
import { useChatInvalidation } from './useChatInvalidation';
import { usePagedList } from './usePagedList';
import type { PagedList } from './usePagedList';

const conversationKey = (c: ConversationItem) => c.id;

export interface Conversations extends PagedList<ConversationItem> {
  /** False for admins and signed-out visitors: nothing is requested. */
  enabled: boolean;
}

/**
 * The viewer's conversations (GET /conversations), in the backend's order (latest message first).
 * `query.page` is where the list starts (default 1); "load more" fetches the following pages.
 */
export function useConversations(query: GetConversationsQuery = {}): Conversations {
  const enabled = canChat(getCurrentUser()?.role);
  const { limit = 20, page = 1 } = query;
  const load = useCallback((p: number, signal: AbortSignal) => chatApi.getConversations({ page: p, limit }, { signal }), [limit]);
  const list = usePagedList(enabled, load, conversationKey, page);
  useChatInvalidation('conversations', list.reload);
  return { enabled, ...list };
}
