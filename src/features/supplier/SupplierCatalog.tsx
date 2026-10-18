import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Search, RefreshCw, Eye, EyeOff, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/services/authService';
import { catalogService, formatCatalogPrice, productStockLabel, type CatalogCategory, type CatalogProduct } from '@/services/catalogService';
import { SupplierBadge, SupplierButton, SupplierCard, SupplierPageFrame } from './SupplierPageFrame';

export const SupplierCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [categoryForm, setCategoryForm] = useState(false);
  const [categoryCode, setCategoryCode] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | null>(null);
  const [categoryParentId, setCategoryParentId] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [productPage, ownCategories] = await Promise.all([
        catalogService.listProducts({ q: query || undefined, limit: 20 }),
        catalogService.listOwnCategories(),
      ]);
      setProducts(productPage.items);
      setCategories(ownCategories);
    } catch (cause) {
      setError(cause instanceof ApiError ? `${cause.message} (HTTP ${cause.status || 'network'}).` : 'Could not load your catalog.');
    } finally { setLoading(false); }
  }, [query]);

  useEffect(() => { void load(); }, [load]);

  const toggleCategory = async (category: CatalogCategory) => {
    setError('');
    try { await catalogService.updateCategory(category.id, { isActive: !category.isActive }); await load(); }
    catch (cause) { setError(cause instanceof ApiError ? `${cause.message} (HTTP ${cause.status}).` : 'Could not update the category.'); }
  };

  const addCategory = async (event: React.FormEvent) => {
    event.preventDefault(); setSavingCategory(true); setError('');
    try {
      await catalogService.createCategory({ code: categoryCode.trim().toUpperCase(), name: categoryName.trim(), parentId: categoryParentId || undefined });
      setCategoryCode(''); setCategoryName(''); setCategoryParentId(''); setCategoryForm(false); await load();
    } catch (cause) { setError(cause instanceof ApiError ? `${cause.message} (HTTP ${cause.status}).` : 'Could not create the category.'); }
    finally { setSavingCategory(false); }
  };

  const openCategoryEditor = async (category: CatalogCategory) => {
    setError('');
    try { const detail = await catalogService.getOwnCategory(category.id); setEditingCategory(detail); setCategoryName(detail.name); setCategoryParentId(detail.parentId ?? ''); }
    catch (cause) { setError(cause instanceof ApiError ? `${cause.message} (HTTP ${cause.status}).` : 'Could not load category details.'); }
  };
  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editingCategory) return; setSavingCategory(true); setError('');
    try { await catalogService.updateCategory(editingCategory.id, { name: categoryName.trim(), parentId: categoryParentId || null }); setEditingCategory(null); await load(); }
    catch (cause) { setError(cause instanceof ApiError ? `${cause.message} (HTTP ${cause.status}).` : 'Could not update the category.'); }
    finally { setSavingCategory(false); }
  };

  const filteredProducts = products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase()));
  return <SupplierPageFrame title="Product catalog" description="Products and categories are loaded from your supplier catalog." action={<SupplierButton onClick={() => navigate('/supplier-products/new')}><Plus size={16}/> Add product</SupplierButton>}>
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}<SupplierButton secondary onClick={() => void load()}><RefreshCw size={15}/> Retry</SupplierButton></div>}
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <SupplierCard title={`Products · ${products.length}`}>
        <label className="relative mb-4 block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or SKU" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"/></label>
        {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading catalog…</p> : filteredProducts.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No products returned by the catalog API.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr>{['Product','SKU','Category','Price','Availability','Status',''].map((heading)=><th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredProducts.map((product)=><tr key={product.id} className="hover:bg-slate-50"><td className="px-3 py-3 font-semibold text-slate-800">{product.name}</td><td className="px-3 py-3 text-slate-500">{product.sku}</td><td className="px-3 py-3 text-slate-600">{product.category?.name ?? '—'}</td><td className="px-3 py-3">VND {formatCatalogPrice(product.price)}</td><td className="px-3 py-3">{productStockLabel(product.stockStatus)}</td><td className="px-3 py-3"><SupplierBadge tone={product.status === 'ACTIVE' ? 'green' : 'gray'}>{product.status}</SupplierBadge></td><td className="px-3 py-3"><button aria-label={`Edit ${product.name}`} onClick={() => navigate(`/supplier-products/${product.id}/edit`)} className="text-blue-700"><Pencil size={16}/></button></td></tr>)}</tbody></table></div>}
      </SupplierCard>
      <SupplierCard title={`Your categories · ${categories.length}`}>
        <SupplierButton secondary className="mb-4" onClick={() => setCategoryForm(!categoryForm)}><Plus size={15}/> Add category</SupplierButton>
        {categoryForm && <form onSubmit={addCategory} className="mb-4 space-y-2 rounded-xl bg-slate-50 p-3"><label className="block text-xs font-semibold">Code<input required maxLength={50} value={categoryCode} onChange={(event) => setCategoryCode(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"/></label><label className="block text-xs font-semibold">Name<input required maxLength={150} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"/></label><label className="block text-xs font-semibold">Parent category<select value={categoryParentId} onChange={(event)=>setCategoryParentId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"><option value="">Root category</option>{categories.filter((item)=>item.isActive).map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><SupplierButton type="submit" disabled={savingCategory}>{savingCategory ? 'Saving…' : 'Save category'}</SupplierButton></form>}
        <div className="divide-y divide-slate-100">{categories.map((category) => <div key={category.id} className="py-3"><div className="flex items-center justify-between gap-2"><div><b className="block text-sm text-slate-800">{category.name}</b><span className="text-xs text-slate-500">{category.code} · {category.isActive ? 'Active' : 'Hidden'}</span></div><div className="flex items-center gap-3"><button onClick={() => void openCategoryEditor(category)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700"><Pencil size={13}/> Edit</button><button onClick={() => void toggleCategory(category)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">{category.isActive ? <><EyeOff size={14}/> Hide</> : <><Eye size={14}/> Activate</>}</button></div></div>
          {editingCategory?.id === category.id && <form onSubmit={saveCategory} className="mt-3 space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3"><b className="text-sm">Edit {editingCategory.code}</b><label className="block text-xs font-semibold">Name<input required maxLength={150} value={categoryName} onChange={(event)=>setCategoryName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"/></label><label className="block text-xs font-semibold">Parent category<select value={categoryParentId} onChange={(event)=>setCategoryParentId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"><option value="">Root category</option>{categories.filter((item)=>item.id!==editingCategory.id).map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="flex gap-2"><SupplierButton type="submit" disabled={savingCategory}>{savingCategory?'Saving…':'Save category'}</SupplierButton><SupplierButton type="button" secondary onClick={()=>setEditingCategory(null)}>Cancel</SupplierButton></div></form>}
        </div>)}</div>
      </SupplierCard>
    </div>
  </SupplierPageFrame>;
};
export default SupplierCatalog;
