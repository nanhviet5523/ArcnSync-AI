import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { t } from '@/i18n';
import { Button } from './Button';
import { EmptyState, ErrorState, Skeleton } from './Feedback';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** value used for sorting; omit to make the column unsortable */
  sort?: (row: T) => string | number;
  className?: string;
  /** hide on the stacked mobile card */
  hideOnMobile?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[] | null;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  empty: ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  /** rows on the current page, e.g. to load extra data for them */
  onPageRows?: (rows: T[]) => void;
}

export function DataTable<T>({ columns, rows, rowKey, loading, error, onRetry, empty, onRowClick, pageSize = 10, initialSort, onPageRows }: Props<T>) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const get = col.sort;
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b);
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort!.dir === 'asc' ? r : -r;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize);
  const visibleKey = visible.map(rowKey).join('|');
  const report = useRef({ onPageRows, visible });
  useEffect(() => { report.current = { onPageRows, visible }; });
  useEffect(() => { report.current.onPageRows?.(report.current.visible); }, [visibleKey]);

  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading || !rows) {
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }
  if (!rows.length) return typeof empty === 'string' ? <EmptyState title={empty} /> : <>{empty}</>;

  const toggle = (key: string) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  const clickable = onRowClick ? 'cursor-pointer' : '';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* table from 640px */}
      <table className="hidden w-full text-left text-sm sm:table">
        <thead className="border-b border-slate-200 bg-slate-50/70 text-[13px] text-slate-500">
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th key={c.key} scope="col" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={`px-4 py-2.5 font-medium ${c.className ?? ''}`}>
                  {c.sort ? (
                    <button type="button" onClick={() => toggle(c.key)} aria-label={t('common.sortBy', { col: c.header })} className="inline-flex items-center gap-1 hover:text-slate-900">
                      {c.header}
                      <span aria-hidden className={active ? 'text-slate-900' : 'text-slate-300'}>{active && sort!.dir === 'desc' ? '↓' : '↑'}</span>
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visible.map((row) => (
            <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={`transition-colors hover:bg-slate-50 ${clickable}`}>
              {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>{c.cell(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      {/* stacked cards below 640px */}
      <ul className="divide-y divide-slate-100 sm:hidden">
        {visible.map((row) => (
          <li key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={`space-y-1.5 px-4 py-3 ${clickable}`}>
            {columns.filter((c) => !c.hideOnMobile).map((c, i) => (
              <div key={c.key} className={i === 0 ? '' : 'flex items-center justify-between gap-3 text-[13px]'}>
                {i > 0 && <span className="text-slate-500">{c.header}</span>}
                <div className={i === 0 ? '' : 'min-w-0 text-right'}>{c.cell(row)}</div>
              </div>
            ))}
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[13px] text-slate-500">
          <span>{t('common.page', { page: current + 1, pages })}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" aria-label={t('common.prev')} disabled={current === 0} onClick={() => setPage(current - 1)}>‹</Button>
            <Button size="sm" variant="ghost" aria-label={t('common.next')} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>›</Button>
          </div>
        </div>
      )}
    </div>
  );
}
