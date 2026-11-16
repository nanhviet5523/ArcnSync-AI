import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Search, RefreshCw, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { errorText, formatMoney, t } from '@/i18n';
import { catalogService, productStockLabel, type CatalogProduct } from '@/services/catalogService';
import { SupplierBadge, SupplierButton, SupplierCard, SupplierPageFrame } from './SupplierPageFrame';

export const SupplierCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setProducts((await catalogService.listProducts({ q: query || undefined, limit: 100 })).items);
    } catch (cause) {
      setError(errorText(cause));
    } finally { setLoading(false); }
  }, [query]);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  return <SupplierPageFrame title={t('supplier.title')} description={t('supplier.description')} action={<SupplierButton onClick={() => navigate('/supplier-products/new')}><Plus size={16}/> {t('supplier.add')}</SupplierButton>}>
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}<SupplierButton secondary onClick={() => void load()}><RefreshCw size={15}/> {t('common.retry')}</SupplierButton></div>}
    <SupplierCard title={`${t('supplier.title')} (${products.length})`}>
      <label className="relative mb-4 block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('supplier.searchPlaceholder')} aria-label={t('supplier.searchPlaceholder')} className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"/></label>
      {loading ? <p className="py-12 text-center text-sm text-slate-500">{t('supplier.loading')}</p>
        : products.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">{t('supplier.empty')} <button className="font-semibold text-blue-700" onClick={() => navigate('/supplier-products/new')}>{t('supplier.addFirst')}</button></div>
        : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr>{[t('supplier.col.product'), t('supplier.col.sku'), t('supplier.col.block'), t('supplier.col.category'), t('supplier.col.price'), t('supplier.col.stock'), t('supplier.col.status'), ''].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{products.map((product) => <tr key={product.id} className="hover:bg-slate-50">
            <td className="px-3 py-3 font-semibold text-slate-800">{product.name}</td>
            <td className="px-3 py-3 text-slate-500">{product.sku}</td>
            <td className="px-3 py-3 font-mono text-xs text-slate-700">{product.blockCode}</td>
            <td className="px-3 py-3 text-slate-600">{product.category?.name ?? '—'}</td>
            <td className="px-3 py-3 tabular-nums">{formatMoney(product.price)}</td>
            <td className="px-3 py-3">{productStockLabel(product.stockStatus)}</td>
            <td className="px-3 py-3"><SupplierBadge tone={product.status === 'ACTIVE' ? 'green' : 'gray'}>{product.status}</SupplierBadge></td>
            <td className="px-3 py-3"><button aria-label={t('supplier.edit', { name: product.name })} onClick={() => navigate(`/supplier-products/${product.id}/edit`)} className="text-blue-700"><Pencil size={16}/></button></td>
          </tr>)}</tbody></table></div>}
    </SupplierCard>
  </SupplierPageFrame>;
};
export default SupplierCatalog;
