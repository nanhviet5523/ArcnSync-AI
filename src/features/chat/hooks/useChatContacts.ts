import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '@/services/authService';
import type { ChatContactItem } from '@/types/chat';
import { canChat, chatApi } from '../chatApi';
import { useChatInvalidation } from './useChatInvalidation';
import { usePagedList } from './usePagedList';
import type { PagedList } from './usePagedList';

const SEARCH_DELAY_MS = 300;
const contactKey = (c: ChatContactItem) => c.user.id;

export interface ChatContacts extends PagedList<ChatContactItem> {
  /** False for admins and signed-out visitors: nothing is requested and nothing should render. */
  enabled: boolean;
}

/** Chat contacts (GET /chat-contacts), page by page. `search` is the raw input: debounced, trimmed and sent as `q`. */
export function useChatContacts(search = '', limit = 20): ChatContacts {
  const enabled = canChat(getCurrentUser()?.role);
  const [q, setQ] = useState(search.trim());

  useEffect(() => {
    const id = setTimeout(() => setQ(search.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback((page: number, signal: AbortSignal) => chatApi.contacts({ page, limit, q }, { signal }), [limit, q]);
  const list = usePagedList(enabled, load, contactKey);
  useChatInvalidation('chat-contacts', list.reload);
  return { enabled, ...list };
}
