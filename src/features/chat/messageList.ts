// No '@/' runtime imports here: messageList.test.ts loads this file with plain `node --test`.

/**
 * The thread is kept in DISPLAY order: oldest → newest. The backend sends each page newest first
 * (createdAt DESC, then id DESC); that order is only reversed, never re-sorted by createdAt (two messages with the
 * same timestamp would swap).
 */
interface WithId { id: string }

/** Reversed copy, duplicates dropped (first one kept). */
function reversedUnique<T extends WithId>(items: readonly T[], skip: ReadonlySet<string>): T[] {
  const seen = new Set(skip);
  const out: T[] = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** First (latest) page → display order. */
export const firstPage = <T extends WithId>(items: readonly T[]): T[] => reversedUnique(items, new Set());

/**
 * Latest page arriving while messages were already added (sent, realtime) during the wait: the page, then those of
 * `current` it does not contain, in their present order. Nothing added meanwhile is lost; nothing shows twice.
 */
export function mergeFirstPage<T extends WithId>(current: readonly T[], pageItems: readonly T[]): T[] {
  const page = firstPage(pageItems);
  const inPage = new Set(page.map((m) => m.id));
  const extra = current.filter((m) => !inPage.has(m.id));
  return extra.length ? [...page, ...extra] : page;
}

/** An older page goes in FRONT. Messages already held win over a repeated copy. */
export function prependOlder<T extends WithId>(current: readonly T[], olderItems: readonly T[]): T[] {
  const older = reversedUnique(olderItems, new Set(current.map((m) => m.id)));
  return older.length ? [...older, ...current] : [...current];
}

/** A new message (realtime, just sent) goes at the END, unless it is already there. */
export function appendMessage<T extends WithId>(current: readonly T[], message: T): T[] {
  return current.some((m) => m.id === message.id) ? [...current] : [...current, message];
}

/** `before` for the next older page: the OLDEST message held, i.e. the first in display order. */
export const olderCursor = (messages: readonly WithId[]): string | undefined => messages[0]?.id;
