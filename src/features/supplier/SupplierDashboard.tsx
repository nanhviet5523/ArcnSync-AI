import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Box, CheckCircle2, CircleAlert, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/services/authService';
import { formatCatalogPrice, productStockLabel, catalogService, type CatalogProduct } from '@/services/catalogService';
import { t } from '@/i18n';
import { StatCard } from '@/components/ui';
import { SupplierBadge, SupplierButton, SupplierCard, SupplierPageFrame } from './SupplierPageFrame';

type Summary = { total: number; active: number; outOfStock: number; preOrder: number };
const emptySummary: Summary = { total: 0, active: 0, outOfStock: 0, preOrder: 0 };

export const SupplierDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [all, active, outOfStock, preOrder, preview] = await Promise.all([
        catalogService.listProducts({ limit: 1 }),
        catalogService.listProducts({ status: 'ACTIVE', limit: 1 }),
        catalogService.listProducts({ stockStatus: 'OUT_OF_STOCK', limit: 1 }),
        catalogService.listProducts({ stockStatus: 'PRE_ORDER', limit: 1 }),
        catalogService.listProducts({ limit: 8 }),
      ]);
      setSummary({ total: all.total, active: active.total, outOfStock: outOfStock.total, preOrder: preOrder.total });
      setProducts(preview.items);
    } catch (cause) {
      setError(cause instanceof ApiError ? `${cause.message} (HTTP ${cause.status || 'network'}).` : t('supplier.dashboardLoadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = [
    { label: t('supplier.stats.total'), value: summary.total, icon: <Box size={20} />, tone: 'brand' as const },
    { label: t('supplier.stats.active'), value: summary.active, icon: <CheckCircle2 size={20} />, tone: 'green' as const },
    { label: t('supplier.stats.outOfStock'), value: summary.outOfStock, icon: <CircleAlert size={20} />, tone: 'red' as const },
    { label: t('supplier.stats.preOrder'), value: summary.preOrder, icon: <AlertTriangle size={20} />, tone: 'amber' as const },
  ];

  return <SupplierPageFrame title={t('supplier.dashboardTitle')} description={t('supplier.dashboardDescription')} action={<SupplierButton onClick={() => navigate('/supplier-products/new')}><Plus size={16} /> {t('supplier.add')}</SupplierButton>}>
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}<SupplierButton secondary onClick={() => void load()}><RefreshCw size={14} /> {t('common.retry')}</SupplierButton></div>}

    <section aria-label={t('supplier.inventorySummary')} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((item) => <StatCard key={item.label} label={item.label} value={error ? '—' : item.value} loading={loading} icon={item.icon} iconTone={item.tone} />)}
    </section>

    <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.8fr)]">
      <SupplierCard title={t('supplier.dashboardProducts')}>
        {loading && products.length === 0 ? <div aria-busy="true" className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-sand-50" />)}</div>
          : products.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{error ? t('supplier.previewUnavailable') : t('supplier.empty')} { !error && <button className="font-semibold text-brand-text" onClick={() => navigate('/supplier-products/new')}>{t('supplier.addFirst')}</button>}</p>
          : <ul className="divide-y divide-slate-100">{products.slice(0, 6).map((product) => <li key={product.id} className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0">
            {product.thumbnailUrl ? <img src={product.thumbnailUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-sand-50 object-cover" /> : <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-sand-50 text-slate-400"><Box size={20} /></span>}
            <span className="min-w-0 flex-1"><b className="block truncate text-sm text-ink">{product.name}</b><span className="mt-1 block truncate text-xs text-slate-500">{product.sku} · {product.category.name}</span></span>
            <span className="hidden shrink-0 text-right sm:block"><b className="block text-sm text-ink">VND {formatCatalogPrice(product.price)}</b><span className="mt-1 block"><SupplierBadge tone={product.stockStatus === 'IN_STOCK' ? 'green' : product.stockStatus === 'PRE_ORDER' ? 'amber' : 'red'}>{productStockLabel(product.stockStatus)}</SupplierBadge></span></span>
            <button type="button" aria-label={t('supplier.edit', { name: product.name })} onClick={() => navigate(`/supplier-products/${product.id}/edit`)} className="rounded-lg p-2 text-brand-text hover:bg-sand-50"><ArrowRight size={16} /></button>
          </li>)}</ul>}
        <SupplierButton secondary onClick={() => navigate('/supplier-catalog')} className="mt-4 w-full sm:w-auto">{t('supplier.manageCatalog')} <ArrowRight size={15} /></SupplierButton>
      </SupplierCard>

      <SupplierCard title={t('supplier.needsAttention')}>
        {loading ? <div aria-busy="true" className="space-y-3"><div className="h-12 animate-pulse rounded-xl bg-sand-50" /><div className="h-12 animate-pulse rounded-xl bg-sand-50" /></div>
          : error ? <p className="text-sm text-slate-600">{t('supplier.inventoryUnavailable')}</p> : <div className="space-y-3">
            <button type="button" onClick={() => navigate('/supplier-catalog?stockStatus=OUT_OF_STOCK')} className="flex w-full items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/70 p-3 text-left transition hover:bg-rose-50"><CircleAlert size={19} className="shrink-0 text-rose-700" /><span className="min-w-0 flex-1 text-sm font-medium text-ink">{t('supplier.stats.outOfStock')}</span><b className="text-lg tabular-nums text-rose-700">{summary.outOfStock}</b><ArrowRight size={15} className="text-slate-400" /></button>
            <button type="button" onClick={() => navigate('/supplier-catalog?stockStatus=PRE_ORDER')} className="flex w-full items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-left transition hover:bg-amber-50"><AlertTriangle size={19} className="shrink-0 text-amber-700" /><span className="min-w-0 flex-1 text-sm font-medium text-ink">{t('supplier.stats.preOrder')}</span><b className="text-lg tabular-nums text-amber-700">{summary.preOrder}</b><ArrowRight size={15} className="text-slate-400" /></button>
            {summary.outOfStock + summary.preOrder === 0 && <p className="text-sm text-slate-600">{t('supplier.inventoryHealthy')}</p>}
          </div>}
      </SupplierCard>
    </div>
  </SupplierPageFrame>;
};

export default SupplierDashboard;
