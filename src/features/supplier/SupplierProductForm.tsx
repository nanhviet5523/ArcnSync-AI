import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, downloadFile, fetchBlobUrl } from '@/services/authService';
import { t } from '@/i18n';
import { catalogService, type CatalogCategory, type CatalogProduct, type ProductPayload, type ProductUnit, type StockStatus } from '@/services/catalogService';
import { SupplierButton, SupplierCard, SupplierPageFrame } from './SupplierPageFrame';

type FormState = { categoryId: string; sku: string; name: string; description: string; brand: string; material: string; colorName: string; colorCode: string; widthMm: string; depthMm: string; heightMm: string; unit: ProductUnit; price: string; stockStatus: StockStatus; status: 'ACTIVE' | 'INACTIVE' };
const blank: FormState = { categoryId: '', sku: '', name: '', description: '', brand: '', material: '', colorName: '', colorCode: '', widthMm: '', depthMm: '', heightMm: '', unit: 'PIECE', price: '', stockStatus: 'IN_STOCK', status: 'ACTIVE' };
const fromProduct = (product: CatalogProduct): FormState => ({ categoryId: product.category.id, sku: product.sku, name: product.name, description: product.description ?? '', brand: product.brand ?? '', material: product.material ?? '', colorName: product.colorName ?? '', colorCode: product.colorCode ?? '', widthMm: product.widthMm == null ? '' : String(product.widthMm), depthMm: product.depthMm == null ? '' : String(product.depthMm), heightMm: product.heightMm == null ? '' : String(product.heightMm), unit: product.unit, price: product.price, stockStatus: product.stockStatus, status: product.status });
const optionalNumber = (value: string) => value.trim() ? Number(value) : undefined;

export const SupplierProductForm: React.FC = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(productId);
  const [form, setForm] = useState<FormState>(blank);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [saved, setSaved] = useState<CatalogProduct | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [downloadingModel, setDownloadingModel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    Promise.all([catalogService.listCategories(), productId ? catalogService.getProduct(productId) : Promise.resolve(null)])
      .then(([categoryList, product]) => {
        if (!active) return;
        setCategories(categoryList);
        if (product) {
          setForm(fromProduct(product));
          setSaved(product);
          if (product.thumbnailUrl) fetchBlobUrl(product.thumbnailUrl).then((url) => active && setPreview(url), () => undefined);
        } else if (categoryList[0]) setForm((current) => ({ ...current, categoryId: categoryList[0].id }));
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? `${cause.message} (HTTP ${cause.status || 'network'}).` : t('supplier.form.loadFailed')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId]);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setSaving(true);
    const payload: ProductPayload = {
      categoryId: form.categoryId, sku: form.sku.trim(), name: form.name.trim(), description: form.description || undefined,
      brand: form.brand || undefined, material: form.material || undefined, colorName: form.colorName || undefined, colorCode: form.colorCode || undefined,
      widthMm: optionalNumber(form.widthMm), depthMm: optionalNumber(form.depthMm), heightMm: optionalNumber(form.heightMm), unit: form.unit,
      price: form.price, stockStatus: form.stockStatus, status: form.status,
    };
    try {
      const product = productId ? await catalogService.updateProduct(productId, payload) : await catalogService.createProduct(payload);
      setSaved(product);
      if (!productId) navigate(`/supplier-products/${product.id}/edit`, { replace: true });
      if (thumbFile) await catalogService.uploadProductFile(product.id, 'thumbnail', thumbFile);
      if (modelFile) await catalogService.uploadProductFile(product.id, 'model-3d', modelFile);
      navigate('/supplier-catalog');
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(Object.keys(cause.fieldErrors).length ? t('supplier.form.createError', { status: cause.status }) : `${cause.message} (HTTP ${cause.status || 'network'}).`);
        setFieldErrors(cause.fieldErrors);
      } else setError(t('supplier.form.saveFailed'));
    } finally { setSaving(false); }
  };

  const downloadModel = async () => {
    if (!saved?.model3dUrl) return;
    setDownloadingModel(true);
    setError('');
    try { await downloadFile(saved.model3dUrl, `${saved.sku || 'product'}.glb`); }
    catch (cause) { setError(cause instanceof ApiError ? `${cause.message} (HTTP ${cause.status || 'network'}).` : t('supplier.modelError')); }
    finally { setDownloadingModel(false); }
  };

  const field = (key: keyof FormState, type = 'text', required = false, placeholder = '') => <label key={key} className="block text-sm font-medium text-ink">{t(`supplier.form.field.${key}`)}{required && <span aria-hidden="true" className="ml-1 text-rose-600">*</span>}<input required={required} type={type} min={type === 'number' ? 1 : undefined} step={key === 'price' ? '0.01' : type === 'number' ? '1' : undefined} value={form[key]} placeholder={placeholder || t(`supplier.form.placeholder.${key}`)} aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `${key}-error` : undefined} onChange={(event) => update(key, event.target.value)} className={`mt-1.5 block w-full rounded-xl border bg-surface px-3 py-2.5 font-normal text-ink outline-none placeholder:text-subtext focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand-soft ${fieldErrors[key] ? 'border-rose-400' : 'border-control'}`} />{fieldErrors[key] && <span id={`${key}-error`} className="mt-1 block text-xs font-normal text-rose-600">{fieldErrors[key]}</span>}</label>;

  if (loading) return <SupplierPageFrame title={editing ? t('supplier.form.editTitle') : t('supplier.form.addTitle')} description={t('supplier.form.loading')} />;
  return <SupplierPageFrame title={editing ? t('supplier.form.editTitle') : t('supplier.form.addTitle')} description={t('supplier.form.description')} action={<SupplierButton secondary onClick={() => navigate('/supplier-catalog')}><ArrowLeft size={16} /> {t('supplier.form.back')}</SupplierButton>}>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}{Object.keys(fieldErrors).length > 0 && <ul className="mt-2 list-disc pl-5">{Object.entries(fieldErrors).map(([key, message]) => <li key={key}><strong>{t(`supplier.form.field.${key}`)}:</strong> {message}</li>)}</ul>}</p>}
    <form onSubmit={save} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,.85fr)]">
      <div className="space-y-5">
        <SupplierCard title={t('supplier.form.basic')}><div className="grid gap-4 md:grid-cols-2">
          {field('name', 'text', true)}{field('sku', 'text', true)}
          <label className="block text-sm font-medium text-ink">{t('supplier.form.field.categoryId')}<span aria-hidden="true" className="ml-1 text-rose-600">*</span><select required value={form.categoryId} aria-invalid={Boolean(fieldErrors.categoryId)} onChange={(event) => update('categoryId', event.target.value)} className={`mt-1.5 block w-full rounded-xl border bg-surface px-3 py-2.5 ${fieldErrors.categoryId ? 'border-rose-400' : 'border-control'}`}><option value="">{t('supplier.form.selectCategory')}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{fieldErrors.categoryId && <span className="mt-1 block text-xs font-normal text-rose-600">{fieldErrors.categoryId}</span>}</label>
          {field('brand')}{field('material')}{field('colorName')}{field('colorCode')}
        </div><label className="mt-4 block text-sm font-medium text-ink">{t('supplier.form.field.description')}<textarea value={form.description} placeholder={t('supplier.form.placeholder.description')} onChange={(event) => update('description', event.target.value)} maxLength={5000} rows={3} aria-invalid={Boolean(fieldErrors.description)} className={`mt-1.5 block w-full rounded-xl border bg-surface px-3 py-2.5 font-normal placeholder:text-subtext ${fieldErrors.description ? 'border-rose-400' : 'border-control'}`} />{fieldErrors.description && <span className="mt-1 block text-xs font-normal text-rose-600">{fieldErrors.description}</span>}</label></SupplierCard>

        <SupplierCard title={t('supplier.form.details')}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field('widthMm', 'number')}{field('depthMm', 'number')}{field('heightMm', 'number')}{field('price', 'number', true)}
          <label className="block text-sm font-medium text-ink">{t('supplier.form.field.unit')}<select value={form.unit} onChange={(event) => update('unit', event.target.value)} className="mt-1.5 block w-full rounded-xl border border-control bg-surface px-3 py-2.5">{(['PIECE', 'SET', 'M2', 'M', 'LITER', 'KG'] as const).map((unit) => <option key={unit} value={unit}>{t(`supplier.form.unitValues.${unit}`)}</option>)}</select></label>
          <label className="block text-sm font-medium text-ink">{t('supplier.form.field.stockStatus')}<select value={form.stockStatus} onChange={(event) => update('stockStatus', event.target.value)} className="mt-1.5 block w-full rounded-xl border border-control bg-surface px-3 py-2.5">{(['IN_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER'] as const).map((value) => <option key={value} value={value}>{t(`supplier.stock.${value === 'IN_STOCK' ? 'inStock' : value === 'OUT_OF_STOCK' ? 'outOfStock' : 'preOrder'}`)}</option>)}</select></label>
        </div></SupplierCard>

        <SupplierCard title={t('supplier.mediaTitle')}><p className="mb-4 text-sm text-slate-500">{t('supplier.mediaHint')}</p>
          <label className="block text-sm font-medium text-ink">{t('supplier.image')}{saved?.thumbnailUrl && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{t('supplier.uploaded')}</span>}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; setThumbFile(file); if (file) setPreview(URL.createObjectURL(file)); }} className="mt-1.5 block w-full text-sm" /></label>
          <label className="mt-4 block text-sm font-medium text-ink">{t('supplier.model')}{saved?.model3dUrl && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{t('supplier.uploaded')}</span>}<input type="file" accept=".glb,model/gltf-binary" onChange={(event) => setModelFile(event.target.files?.[0] ?? null)} className="mt-1.5 block w-full text-sm" /></label>
          {saved?.model3dUrl && <div className="mt-3 rounded-lg bg-sand-50 p-3"><p className="text-xs text-slate-600">{t('supplier.detail.modelAvailable')}</p><SupplierButton type="button" secondary disabled={downloadingModel} onClick={() => void downloadModel()} className="mt-2">{downloadingModel ? t('supplier.detail.downloading') : t('supplier.detail.downloadModel')}</SupplierButton></div>}
        </SupplierCard>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-24">
        <SupplierCard title={t('supplier.form.preview')}>
          {preview ? <img src={preview} alt={form.name || t('supplier.form.field.name')} className="h-40 w-full rounded-xl bg-sand-50 object-cover" /> : <div className="grid h-40 place-items-center rounded-xl bg-sand-50 text-sm text-subtext">{t('supplier.noImage')}</div>}
          <b className="mt-4 block text-lg text-ink">{form.name || t('supplier.form.field.name')}</b><p className="mt-1 text-sm text-slate-500">{form.sku || t('supplier.form.field.sku')} · {categories.find((item) => item.id === form.categoryId)?.name ?? t('supplier.form.field.categoryId')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('supplier.blockCode')}: <span className="font-mono text-ink">{saved?.blockCode ?? t('supplier.blockAuto')}</span></p><b className="mt-3 block">{form.price ? `VND ${Number(form.price).toLocaleString('en-US')}` : t('supplier.form.field.price')}</b>
        </SupplierCard>
        <SupplierCard title={t('supplier.form.publishing')}><label className="block text-sm font-medium">{t('supplier.form.field.status')}<select value={form.status} onChange={(event) => update('status', event.target.value)} className="mt-1.5 block w-full rounded-xl border border-control bg-surface px-3 py-2.5"><option value="ACTIVE">{t('supplier.status.active')}</option><option value="INACTIVE">{t('supplier.status.inactive')}</option></select></label>{categories.length === 0 && <p className="mt-3 text-xs text-amber-700">{t('supplier.noCategories')}</p>}</SupplierCard>
      </aside>

      <div className="sticky bottom-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-float backdrop-blur xl:col-span-2">
        <p className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><Check size={15} className="text-emerald-700" />{t('supplier.form.requiredHint')}</p>
        <div className="ml-auto flex gap-2"><SupplierButton type="button" secondary onClick={() => navigate('/supplier-catalog')}>{t('supplier.form.cancel')}</SupplierButton><SupplierButton type="submit" disabled={saving || categories.length === 0}><Save size={15} />{saving ? t('supplier.form.saving') : editing ? t('supplier.form.saveChanges') : t('supplier.form.create')}</SupplierButton></div>
      </div>
    </form>
  </SupplierPageFrame>;
};

export default SupplierProductForm;
