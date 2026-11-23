import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from '@/i18n';
import { appendUnique, applyLocalUpdate, retryPage } from '../pagedList';
import type { ListSnapshot, PagedOp } from '../pagedList';

interface Page<T> { items: T[]; page: number; limit: number; total: number }

export interface PagedList<T> {
  items: T[];
  total: number;
  /** First page on its way (also after `load` changes). */
  loading: boolean;
  /** Next page on its way. */
  loadingMore: boolean;
  error: string;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
  /** Run again the fetch that just failed: the first page after a failed reload, page + 1 after a failed "load more". */
  retry: () => void;
  /**
   * Change the loaded items in place (a sent message moves its conversation up) without refetching.
   * Items that were not loaded before raise `total` by as many.
   */
  updateItems: (fn: (items: T[]) => T[]) => void;
}

/**
 * A paginated list that grows with "load more". `load` must be memoised: a new `load` starts over from `firstPage`.
 * Starting over cancels the request still in flight, so an older answer never replaces a newer one.
 * Pages are merged by `getKey`, so an item the backend sends twice (offset paging over a moving list) shows once.
 * A failed reload keeps the items already shown. When `enabled` is false nothing is requested.
 */
export function usePagedList<T>(
  enabled: boolean,
  load: (page: number, signal: AbortSignal) => Promise<Page<T>>,
  getKey: (item: T) => string,
  firstPage = 1,
): PagedList<T> {
  // items and total change together (a local insert raises total), so they share one state.
  const [list, setList] = useState<ListSnapshot<T>>({ items: [], total: 0 });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [failedOp, setFailedOp] = useState<PagedOp>('reload');
  const inFlight = useRef<AbortController | null>(null);
  // Latest getKey without making it a dependency: an inline arrow must not restart the list on every render.
  const keyOf = useRef(getKey);
  useEffect(() => { keyOf.current = getKey; });

  const fetchPage = useCallback(async (next: number) => {
    if (!enabled) return;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const fresh = next === firstPage;
    if (fresh) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const res = await load(next, controller.signal);
      if (controller.signal.aborted) return;
      setList((prev) => ({ items: appendUnique(fresh ? [] : prev.items, res.items, keyOf.current), total: res.total }));
      setPage(res.page);
      setHasMore(res.page * res.limit < res.total);
    } catch (e) {
      if (controller.signal.aborted) return;
      setFailedOp(fresh ? 'reload' : 'more');
      setError(errorText(e));
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [enabled, load, firstPage]);

  useEffect(() => {
    Promise.resolve().then(() => fetchPage(firstPage));
    return () => inFlight.current?.abort();
  }, [fetchPage, firstPage]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore) void fetchPage(page + 1);
  }, [fetchPage, hasMore, loading, loadingMore, page]);
  const reload = useCallback(() => { void fetchPage(firstPage); }, [fetchPage, firstPage]);
  const retry = useCallback(() => {
    if (!loading && !loadingMore) void fetchPage(retryPage(failedOp, firstPage, page));
  }, [fetchPage, failedOp, firstPage, page, loading, loadingMore]);

  const updateItems = useCallback(
    (fn: (items: T[]) => T[]) => setList((prev) => applyLocalUpdate(prev, fn, keyOf.current)),
    [],
  );

  return { items: list.items, total: list.total, loading, loadingMore, error, hasMore, loadMore, reload, retry, updateItems };
}
