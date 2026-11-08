import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button, EmptyState, ErrorState, Input, Select, Skeleton } from '@/components/ui';
import { errorText, t } from '@/i18n';
import { catalogService } from '@/services/catalogService';
import type { CatalogProduct } from '@/services/catalogService';
import { formatVnd, productSize } from './logic';
import { Thumb } from './ItemPanel';
import type { DesignElement, Product } from './types';

interface Props {
  element: DesignElement & { category: NonNullable<DesignElement['category']> };
  editable: boolean;
  onPick: (p: Product) => void;
  onClose: () => void;
}

const PAGE = 24;

const toProduct = (p: CatalogProduct): Product => ({
  id: p.id, name: p.name, sku: p.sku, block_code: p.blockCode, supplier_name: p.supplier?.companyName ?? '',
  unit_price: p.price, thumbnail_url: p.thumbnailUrl, model_3d_url: p.model3dUrl,
  width_mm: p.widthMm, depth_mm: p.depthMm, height_mm: p.heightMm, specifications: p.specifications,
});

/** Catalog grid inside the workspace. Category is fixed to the item's (no swapping across categories). */
export function CatalogDrawer({ element, editable, onPick, onClose }: Props) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Product[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => { const id = setTimeout(() => setQuery(q.trim()), 300); return () => clearTimeout(id); }, [q]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filterKey = `${query}|${min}|${max}|${supplierId}`;
  const [shownKey, setShownKey] = useState(filterKey);
  if (shownKey !== filterKey) { setShownKey(filterKey); setPage(1); setItems(null); }

  useEffect(() => {
    let alive = true;
    catalogService.listProducts({
      q: query || undefined, categoryId: element.category.id, status: 'ACTIVE', page, limit: PAGE,
      minPrice: min || undefined, maxPrice: max || undefined, supplierId: supplierId || undefined,
    }).then((r) => {
      if (!alive) return;
      setTotal(r.total);
      setSuppliers((s) => {
        const next = { ...s };
        for (const p of r.items) if (p.supplier?.id && p.supplier.companyName) next[p.supplier.id] = p.supplier.companyName;
        return next;
      });
      const got = r.items.map(toProduct);
      setItems((cur) => (page === 1 || !cur ? got : [...cur, ...got]));
    }, (e) => alive && setError(errorText(e)));
    return () => { alive = false; setError(''); };
  }, [element.category.id, query, min, max, supplierId, page, retry]);

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={t('ws.catalogTitle', { category: element.category.name })}
        className="relative flex h-full w-full max-w-[760px] flex-col bg-surface shadow-float">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-slate-900">{t('ws.catalogTitle', { category: element.category.name })}</h2>
            <p className="text-xs text-slate-500">{t('ws.catalogHint')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-line px-5 py-3 sm:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <label className="relative col-span-2 sm:col-span-1">
            <span className="sr-only">{t('ws.search')}</span>
            <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ws.searchProducts')} className="pl-8" />
          </label>
          <Input type="number" min={0} step={100000} value={min} onChange={(e) => setMin(e.target.value)} placeholder={t('ws.minPrice')} aria-label={t('ws.minPrice')} />
          <Input type="number" min={0} step={100000} value={max} onChange={(e) => setMax(e.target.value)} placeholder={t('ws.maxPrice')} aria-label={t('ws.maxPrice')} />
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} aria-label={t('ws.supplier')}>
            <option value="">{t('ws.allSuppliers')}</option>
            {Object.entries(suppliers).sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </Select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error ? <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} /> : !items ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 w-full" />)}</div>
          ) : !items.length ? <EmptyState title={t('ws.catalogEmpty')} /> : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((p) => {
                  const current = p.id === element.product?.id;
                  const size = productSize(p);
                  return (
                    <li key={p.id} className={`flex flex-col rounded-card border p-2.5 text-[13px] ${current ? 'border-brand ring-2 ring-brand/15' : 'border-line'}`}>
                      <Thumb path={p.thumbnail_url} className="aspect-[4/3] w-full" />
                      <p className="mt-2 line-clamp-2 font-medium leading-snug text-slate-900">{p.name}</p>
                      <p className="truncate text-xs text-slate-500">{p.supplier_name}</p>
                      {size && <p className="truncate text-xs tabular-nums text-slate-500">{size}</p>}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <span className="font-semibold tabular-nums text-slate-900">{formatVnd(p.unit_price)}</span>
                        {current ? <span className="text-xs font-medium text-brand">{t('items.inUse')}</span>
                          : editable && <Button size="sm" onClick={() => { onPick(p); onClose(); }}>{t('ws.swap')}</Button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {items.length < total && (
                <div className="mt-4 flex justify-center"><Button onClick={() => setPage((n) => n + 1)}>{t('ws.loadMore')}</Button></div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
