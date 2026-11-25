// No '@/' runtime imports here: readMarker.test.ts loads this file with plain `node --test`.
import type { ChatMessageSummary, ConversationItem } from '../../types/chat.ts';

function toEpochMs(iso: string | null | undefined): number {
  if (!iso) return Number.NaN;
  return Date.parse(iso);
}

/** Monotonic max of two ISO timestamps (never moves a read marker backwards). */
export function latestIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  const ta = toEpochMs(a);
  const tb = toEpochMs(b);
  if (Number.isNaN(ta)) return b;
  if (Number.isNaN(tb)) return a;
  return tb >= ta ? b : a;
}

/**
 * Decide whether PUT /conversations/:id/read-marker should be sent for the open conversation.
 * Returns a deduplication key to remember once requested, or null when nothing unread needs marking.
 */
export function shouldMarkConversationRead(
  conversation: ConversationItem,
  latestMessage: ChatMessageSummary | undefined,
  meId: string | undefined,
  lastMarkedKey: string | undefined,
): string | null {
  if (!meId) return null;

  const hasUnreadCount = conversation.unreadCount > 0;
  const otherSentLatest =
    !!latestMessage &&
    latestMessage.senderId !== meId &&
    latestMessage.messageType !== 'SYSTEM';

  const latestAfterMyRead = (() => {
    if (!otherSentLatest || !latestMessage) return false;
    if (!conversation.myLastReadAt) return true;
    const msgMs = toEpochMs(latestMessage.createdAt);
    const readMs = toEpochMs(conversation.myLastReadAt);
    return !Number.isNaN(msgMs) && !Number.isNaN(readMs) && msgMs > readMs;
  })();

  if (!hasUnreadCount && !latestAfterMyRead) return null;

  const markerTarget = latestMessage?.id ?? conversation.lastMessage?.id ?? conversation.lastMessageAt ?? 'unread';
  const key = `${conversation.id}:${markerTarget}:${conversation.unreadCount > 0 ? 'u' : 'r'}`;
  return key === lastMarkedKey ? null : key;
}

/**
 * Apply a read marker update (from PUT /conversations/:id/read-marker or socket `conversation.read`)
 * to a ConversationItem without ever moving read timestamps backwards.
 */
export function applyReadMarker(
  conversation: ConversationItem,
  userId: string,
  lastReadAt: string,
  meId: string | undefined,
): ConversationItem {
  if (!meId) return conversation;
  if (userId === meId) {
    const nextMyRead = latestIso(conversation.myLastReadAt, lastReadAt);
    if (conversation.unreadCount === 0 && nextMyRead === conversation.myLastReadAt) {
      return conversation;
    }
    return {
      ...conversation,
      unreadCount: 0,
      myLastReadAt: nextMyRead,
    };
  }
  const nextOtherRead = latestIso(conversation.otherLastReadAt, lastReadAt);
  if (nextOtherRead === conversation.otherLastReadAt) {
    return conversation;
  }
  return {
    ...conversation,
    otherLastReadAt: nextOtherRead,
  };
}

/**
 * Find the ID of the LAST outgoing non-SYSTEM message that the other participant has read
 * (`createdAt <= otherLastReadAt`). Messages must be in display order (oldest → newest).
 */
export function findLastSeenMessageId(
  messages: readonly ChatMessageSummary[],
  meId: string | undefined,
  otherLastReadAt: string | null,
): string | null {
  if (!meId || !otherLastReadAt) return null;
  const readMs = toEpochMs(otherLastReadAt);
  if (Number.isNaN(readMs)) return null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.messageType === 'SYSTEM' || m.senderId !== meId) continue;
    const msgMs = toEpochMs(m.createdAt);
    if (!Number.isNaN(msgMs) && msgMs <= readMs) {
      return m.id;
    }
  }
  return null;
}

/**
 * Update a ConversationItem when a `message.created` event arrives in real time.
 * Keeps unreadCount accurate whether the conversation is open & visible or not.
 */
export function applyIncomingMessageToConversation(
  conversation: ConversationItem,
  message: ChatMessageSummary,
  meId: string | undefined,
  isOpenAndVisible: boolean,
): ConversationItem {
  const alreadyLatest = conversation.lastMessage?.id === message.id;
  const isMine = !!meId && message.senderId === meId;
  const isSystem = message.messageType === 'SYSTEM';

  let unreadCount = conversation.unreadCount;
  if (isMine || isOpenAndVisible) {
    unreadCount = 0;
  } else if (!isSystem && !alreadyLatest) {
    unreadCount = conversation.unreadCount + 1;
  }

  return {
    ...conversation,
    lastMessage: message,
    lastMessageAt: latestIso(conversation.lastMessageAt, message.createdAt) ?? message.createdAt,
    unreadCount,
    myLastReadAt: isMine
      ? latestIso(conversation.myLastReadAt, message.createdAt)
      : conversation.myLastReadAt,
  };
}
