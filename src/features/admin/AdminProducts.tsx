import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, RefreshCw, Search } from 'lucide-react';
import { ApiError } from '@/services/authService';
import { catalogService, formatCatalogPrice, productStockLabel, type CatalogCategory, type CatalogPage, type CatalogProduct } from '@/services/catalogService';
import { AdminCard, AdminPageFrame } from './AdminPageFrame';

export const AdminProducts: React.FC = () => {
  const [result, setResult] = useState<CatalogPage<CatalogProduct>>({ items: [], page: 1, limit: 20, total: 0 });
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [query, setQuery] = useState(''); const [categoryId, setCategoryId] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');

  useEffect(() => { let active = true; catalogService.listAdminCategories({ limit: 100 }).then((data) => { if (active) setCategories(data.items); }).catch(() => { /* Product browsing remains available if category filters fail. */ }); return () => { active = false; }; }, []);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    catalogService.listProducts({ q: query.trim() || undefined, categoryId: categoryId || undefined, status: status ? status as 'ACTIVE' | 'INACTIVE' : undefined, page, limit: 20 })
      .then((data) => { if (active) setResult(data); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? `${cause.message} (HTTP ${cause.status || 'network'}).` : 'Could not load products.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, categoryId, status, page, retryKey]);

  const changeFilter = (setter: (value: string) => void) => (value: string) => { setPage(1); setter(value); };
  const pageCount = Math.max(1, Math.ceil(result.total / result.limit));
  return <AdminPageFrame title="Product catalog" description="Browse product records returned by the catalog API. This Admin view is read-only; the current API does not provide Admin product update endpoints.">
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}<button onClick={() => setRetryKey((current) => current + 1)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2"><RefreshCw size={14}/> Retry</button></div>}
    <AdminCard title={`Products · ${result.total}`}>
      <div className="mb-5 flex flex-col gap-3 md:flex-row"><label className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Search products" value={query} onChange={(event)=>changeFilter(setQuery)(event.target.value)} placeholder="Search name or SKU" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"/></label><select aria-label="Filter category" value={categoryId} onChange={(event)=>changeFilter(setCategoryId)(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All categories</option>{categories.map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}</select><select aria-label="Filter status" value={status} onChange={(event)=>changeFilter(setStatus)(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
      {loading ? <p className="py-14 text-center text-sm text-slate-500">Loading products from API…</p> : error ? null : result.items.length === 0 ? <div className="py-14 text-center"><ImageIcon className="mx-auto text-slate-300" size={36}/><p className="mt-3 font-semibold text-slate-800">No products returned.</p><p className="mt-1 text-sm text-slate-500">The request succeeded, but no products match the selected filters.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Product','SKU','Category','Supplier','Price','Availability','Status'].map((heading)=><th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{result.items.map((product)=><tr key={product.id} className="hover:bg-slate-50"><td className="px-4 py-3"><span className="flex items-center gap-3">{product.thumbnailUrl?<img src={product.thumbnailUrl} alt="" className="h-11 w-11 rounded-lg object-cover" onError={(event)=>{event.currentTarget.style.display='none';}}/>:<span className="grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-slate-400"><ImageIcon size={18}/></span>}<span><b className="block text-slate-800">{product.name}</b><span className="text-xs text-slate-500">{product.brand || '—'}</span></span></span></td><td className="px-4 py-3 text-slate-600">{product.sku}</td><td className="px-4 py-3 text-slate-600">{product.category.name}</td><td className="px-4 py-3 text-slate-600">{product.supplier.companyName}</td><td className="px-4 py-3">VND {formatCatalogPrice(product.price)}</td><td className="px-4 py-3">{productStockLabel(product.stockStatus)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.status==='ACTIVE'?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{product.status}</span></td></tr>)}</tbody></table></div>}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">{result.total === 0 ? '0 results' : `Page ${result.page} of ${pageCount} · ${result.total} total`}</span><div className="flex gap-2"><button disabled={page<=1||loading} onClick={()=>setPage((current)=>Math.max(1,current-1))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page>=pageCount||loading} onClick={()=>setPage((current)=>current+1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button></div></div>
    </AdminCard>
  </AdminPageFrame>;
};
export default AdminProducts;
