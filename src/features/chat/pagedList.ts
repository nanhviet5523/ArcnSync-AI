// No '@/' runtime imports here: pagedList.test.ts loads this file with plain `node --test`.

/** The fetch a paged list last ran: start over from the first page, or append the next one. */
export type PagedOp = 'reload' | 'more';

/**
 * `prev` followed by the items of `next` whose key is not there yet (the copy already shown wins).
 * Offset paging over a list that moves (lastMessageAt DESC) can hand back an item from the previous page.
 */
export function appendUnique<T>(prev: readonly T[], next: readonly T[], getKey: (item: T) => string): T[] {
  const seen = new Set(prev.map(getKey));
  const out = [...prev];
  for (const item of next) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Page to ask for when retrying `op`: a failed reload goes back to the first page, a failed "more" to page + 1. */
export const retryPage = (op: PagedOp, firstPage: number, page: number): number => (op === 'reload' ? firstPage : page + 1);

/**
 * `item` first, any older copy of it removed; the others keep their order. Inserted at the top when it was not loaded.
 * Used when a conversation gets a new message (sent here now, realtime later).
 */
export function moveToTop<T extends { id: string }>(items: readonly T[], item: T): T[] {
  return [item, ...items.filter((x) => x.id !== item.id)];
}

/** Replace the item with the same id in place; unchanged when it is not there. */
export function replaceItem<T extends { id: string }>(items: readonly T[], item: T): T[] {
  return items.map((x) => (x.id === item.id ? item : x));
}

/** A loaded list and the backend's total, changed together so they never disagree. */
export interface ListSnapshot<T> {
  items: T[];
  total: number;
}

/**
 * Apply a local change (moveToTop, replaceItem...) and raise `total` by the number of items that were not there
 * before. Moved or replaced items do not count; removing items does not lower it.
 */
export function applyLocalUpdate<T>(list: ListSnapshot<T>, fn: (items: T[]) => T[], getKey: (item: T) => string): ListSnapshot<T> {
  const items = fn(list.items);
  const before = new Set(list.items.map(getKey));
  const added = new Set(items.map(getKey).filter((key) => !before.has(key))).size;
  return { items, total: list.total + added };
}
