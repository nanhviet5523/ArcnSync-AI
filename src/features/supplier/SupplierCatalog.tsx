import React, { useCallback, useEffect, useState } from 'react';
import { Box, ChevronLeft, ChevronRight, Plus, Search, RefreshCw, Pencil, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { errorText, formatMoney, t } from '@/i18n';
import { catalogService, productStockLabel, type CatalogCategory, type CatalogProduct, type ProductStatus, type StockStatus } from '@/services/catalogService';
import { SupplierBadge, SupplierButton, SupplierCard, SupplierPageFrame } from './SupplierPageFrame';

const PAGE_SIZE = 20;

export const SupplierCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const query = params.get('q') ?? '';
  const categoryId = params.get('categoryId') ?? '';
  const status = (params.get('status') ?? '') as ProductStatus | '';
  const stockStatus = (params.get('stockStatus') ?? '') as StockStatus | '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const setFilters = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await catalogService.listProducts({ q: query || undefined, categoryId: categoryId || undefined, status: status || undefined, stockStatus: stockStatus || undefined, page, limit: PAGE_SIZE });
      setProducts(result.items);
      setTotal(result.total);
    } catch (cause) {
      setProducts([]);
      setTotal(0);
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }, [categoryId, page, query, status, stockStatus]);

  useEffect(() => { Promise.resolve().then(load); }, [load]);
  useEffect(() => { catalogService.listCategories().then(setCategories).catch(() => setCategories([])); }, []);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!query || !!categoryId || !!status || !!stockStatus;
  const stockTone = (value: StockStatus) => value === 'IN_STOCK' ? 'green' : value === 'PRE_ORDER' ? 'amber' : 'red';

  return <SupplierPageFrame title={t('supplier.title')} description={t('supplier.description')} action={<SupplierButton onClick={() => navigate('/supplier-products/new')}><Plus size={16} /> {t('supplier.add')}</SupplierButton>}>
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}<SupplierButton secondary onClick={() => void load()}><RefreshCw size={15} /> {t('common.retry')}</SupplierButton></div>}
    <SupplierCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-base font-bold text-ink">{t('supplier.catalogHeading')}</h2><p className="mt-1 text-xs text-slate-500">{loading ? t('supplier.loading') : t('supplier.resultCount', { shown: products.length, total })}</p></div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="relative sm:col-span-2 xl:col-span-1"><span className="sr-only">{t('supplier.searchPlaceholder')}</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext" /><input value={query} onChange={(event) => setFilters({ q: event.target.value })} placeholder={t('supplier.searchPlaceholder')} aria-label={t('supplier.searchPlaceholder')} className="w-full rounded-xl border border-line py-2.5 pl-9 pr-3 text-sm" /></label>
        <select aria-label={t('supplier.filterCategory')} value={categoryId} onChange={(event) => setFilters({ categoryId: event.target.value })} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"><option value="">{t('supplier.allCategories')}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select aria-label={t('supplier.filterStatus')} value={status} onChange={(event) => setFilters({ status: event.target.value })} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"><option value="">{t('supplier.allStatuses')}</option><option value="ACTIVE">{t('supplier.status.active')}</option><option value="INACTIVE">{t('supplier.status.inactive')}</option></select>
        <select aria-label={t('supplier.filterStock')} value={stockStatus} onChange={(event) => setFilters({ stockStatus: event.target.value })} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"><option value="">{t('supplier.allStockStatuses')}</option><option value="IN_STOCK">{t('supplier.stock.inStock')}</option><option value="OUT_OF_STOCK">{t('supplier.stock.outOfStock')}</option><option value="PRE_ORDER">{t('supplier.stock.preOrder')}</option></select>
      </div>
      {hasFilters && <button type="button" onClick={() => setParams({}, { replace: true })} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:underline"><X size={14} />{t('supplier.clearFilters')}</button>}

      {loading ? <div aria-busy="true" className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-sand-50" />)}</div>
        : products.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">{error ? t('supplier.previewUnavailable') : hasFilters ? t('supplier.noMatches') : t('supplier.empty')} {!error && !hasFilters && <button className="font-semibold text-brand-text" onClick={() => navigate('/supplier-products/new')}>{t('supplier.addFirst')}</button>}</div>
        : <>
          <div className="hidden overflow-hidden rounded-xl border border-line md:block">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup><col className="w-[30%]" /><col className="w-[15%]" /><col className="w-[16%]" /><col className="w-[15%]" /><col className="w-[12%]" /><col className="w-[12%]" /></colgroup>
              <thead className="bg-sand-50 text-xs uppercase text-subtext"><tr><th className="px-3 py-3">{t('supplier.col.product')}</th><th className="px-3 py-3">{t('supplier.col.sku')}</th><th className="px-3 py-3">{t('supplier.col.category')}</th><th className="px-3 py-3">{t('supplier.col.price')}</th><th className="px-3 py-3">{t('supplier.col.stock')}</th><th className="px-3 py-3">{t('supplier.col.status')}</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{products.map((product) => <tr key={product.id} className="hover:bg-sand-50">
                <td className="px-3 py-3"><button type="button" onClick={() => navigate(`/supplier-products/${product.id}`)} className="block max-w-full truncate text-left font-semibold text-ink hover:text-brand-text">{product.name}</button><span className="mt-1 block truncate font-mono text-[11px] text-slate-500">{product.blockCode}</span></td>
                <td className="px-3 py-3"><span className="block truncate text-slate-600">{product.sku}</span></td><td className="px-3 py-3"><span className="block truncate text-slate-600">{product.category?.name ?? '—'}</span></td>
                <td className="px-3 py-3 tabular-nums">{formatMoney(product.price)}</td><td className="px-3 py-3"><SupplierBadge tone={stockTone(product.stockStatus)}>{productStockLabel(product.stockStatus)}</SupplierBadge></td>
                <td className="px-3 py-3"><div className="flex items-center justify-between gap-2"><SupplierBadge tone={product.status === 'ACTIVE' ? 'green' : 'gray'}>{product.status === 'ACTIVE' ? t('supplier.status.active') : t('supplier.status.inactive')}</SupplierBadge><button type="button" aria-label={t('supplier.edit', { name: product.name })} onClick={() => navigate(`/supplier-products/${product.id}/edit`)} className="rounded-lg p-1.5 text-brand-text hover:bg-sand-100"><Pencil size={15} /></button></div></td>
              </tr>)}</tbody>
            </table>
          </div>
          <ul className="divide-y divide-line md:hidden">{products.map((product) => <li key={product.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">{product.thumbnailUrl ? <img src={product.thumbnailUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-sand-50 object-cover" /> : <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-sand-50 text-slate-400"><Box size={20} /></span>}
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><button type="button" onClick={() => navigate(`/supplier-products/${product.id}`)} className="line-clamp-2 text-left text-sm font-bold text-ink">{product.name}</button><button type="button" aria-label={t('supplier.edit', { name: product.name })} onClick={() => navigate(`/supplier-products/${product.id}/edit`)} className="shrink-0 rounded-lg p-1.5 text-brand-text hover:bg-sand-100"><Pencil size={15} /></button></div>
                <p className="mt-1 truncate font-mono text-xs text-slate-500">{product.sku} · {product.blockCode}</p><p className="mt-1 truncate text-xs text-slate-500">{product.category?.name ?? '—'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2"><b className="text-sm text-ink">{formatMoney(product.price)}</b><SupplierBadge tone={stockTone(product.stockStatus)}>{productStockLabel(product.stockStatus)}</SupplierBadge><SupplierBadge tone={product.status === 'ACTIVE' ? 'green' : 'gray'}>{product.status === 'ACTIVE' ? t('supplier.status.active') : t('supplier.status.inactive')}</SupplierBadge></div>
              </div>
            </div>
          </li>)}</ul>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-xs text-slate-500">{t('supplier.pageSummary', { page, pageCount })}</p>
            <div className="flex gap-2"><SupplierButton secondary disabled={page <= 1} onClick={() => setFilters({ page: String(page - 1) })}><ChevronLeft size={15} />{t('supplier.previous')}</SupplierButton><SupplierButton secondary disabled={page >= pageCount} onClick={() => setFilters({ page: String(page + 1) })}>{t('supplier.next')}<ChevronRight size={15} /></SupplierButton></div>
          </div>
        </>}
    </SupplierCard>
  </SupplierPageFrame>;
};

export default SupplierCatalog;
