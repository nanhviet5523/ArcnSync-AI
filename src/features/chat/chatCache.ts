// No '@/' runtime imports here: chatCache.test.ts loads this file with plain `node --test`.
import type { ConversationItem } from '../../types/chat.ts';
import { onSignOut } from '../../services/signOut.ts';

/** Lists that can be told to refetch (the repo has no React Query: usePagedList hooks subscribe here). */
export type ChatListKey = 'chat-contacts' | 'conversations';

const conversations = new Map<string, ConversationItem>();
const listeners: Record<ChatListKey, Set<() => void>> = { 'chat-contacts': new Set(), conversations: new Set() };

/**
 * A small in-memory chat cache shared by the chat hooks.
 * - Conversation details by id (['conversation', id]): filled from POST /conversations, so the thread can render at
 *   once without GET /conversations/:id.
 * - Invalidation of the paginated lists: `invalidate('conversations')` makes every mounted list reload.
 */
export const chatCache = {
  setConversation(conversation: ConversationItem): void {
    conversations.set(conversation.id, conversation);
  },
  getConversation(id: string | undefined): ConversationItem | undefined {
    return id ? conversations.get(id) : undefined;
  },
  invalidate(...keys: ChatListKey[]): void {
    for (const key of keys) for (const reload of [...listeners[key]]) reload();
  },
  /** Returns the unsubscribe function. */
  subscribe(key: ChatListKey, reload: () => void): () => void {
    listeners[key].add(reload);
    return () => { listeners[key].delete(reload); };
  },
  /** Drop everything (sign-out, tests). Subscribers stay. */
  clear(): void {
    conversations.clear();
  },
};

// Another account signing in on this tab must never see the previous user's conversations.
onSignOut(() => chatCache.clear());
