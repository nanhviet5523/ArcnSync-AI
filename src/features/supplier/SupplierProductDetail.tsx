import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, Box, CheckCircle2, Pencil, Ruler } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, downloadFile } from '@/services/authService';
import { formatCatalogPrice, productStockLabel, catalogService, type CatalogProduct } from '@/services/catalogService';
import { t } from '@/i18n';
import { SupplierBadge, SupplierButton, SupplierCard, SupplierPageFrame } from './SupplierPageFrame';

export const SupplierProductDetail: React.FC = () => {
  const { productId = '' } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    catalogService.getProduct(productId).then((item) => { if (active) setProduct(item); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? `${cause.message} (HTTP ${cause.status || 'network'}).` : t('supplier.detail.unavailable')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId]);

  const downloadModel = async () => {
    if (!product?.model3dUrl) return;
    setDownloading(true);
    setError('');
    try { await downloadFile(product.model3dUrl, `${product.sku || 'product'}.glb`); }
    catch { setError(t('supplier.detail.downloadError')); }
    finally { setDownloading(false); }
  };

  if (loading) return <SupplierPageFrame title={t('supplier.detail.loading')} description={t('supplier.loading')} />;
  if (!product) return <SupplierPageFrame title={t('supplier.detail.unavailable')} description={error || t('supplier.detail.unavailableHint')}><SupplierButton secondary onClick={() => navigate('/supplier-catalog')}><ArrowLeft size={16} /> {t('supplier.detail.back')}</SupplierButton></SupplierPageFrame>;

  const stockTone = product.stockStatus === 'IN_STOCK' ? 'green' : product.stockStatus === 'PRE_ORDER' ? 'amber' : 'red';
  return <SupplierPageFrame title={product.name} description={`${product.sku} · ${product.category.name}`} action={<SupplierButton onClick={() => navigate(`/supplier-products/${product.id}/edit`)}><Pencil size={16} /> {t('supplier.editProduct')}</SupplierButton>}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => navigate('/supplier-catalog')} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-text"><ArrowLeft size={16} /> {t('supplier.detail.back')}</button><div className="flex flex-wrap gap-2"><SupplierBadge tone={product.status === 'ACTIVE' ? 'green' : 'gray'}>{product.status === 'ACTIVE' ? t('supplier.status.active') : t('supplier.status.inactive')}</SupplierBadge><SupplierBadge tone={stockTone}>{productStockLabel(product.stockStatus)}</SupplierBadge></div></div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
      <SupplierCard>
        {product.thumbnailUrl ? <img src={product.thumbnailUrl} alt={product.name} className="max-h-[440px] w-full rounded-xl bg-sand-50 object-contain" /> : <div className="grid min-h-[260px] place-items-center rounded-xl bg-sand-50 text-slate-300 sm:min-h-[340px]"><Box size={60} /></div>}
        <div className="mt-4 flex flex-wrap gap-2"><SupplierBadge tone="blue">{product.category.name}</SupplierBadge>{product.styles.map((style) => <SupplierBadge key={style.id} tone="blue">{style.name}</SupplierBadge>)}</div>
        <h2 className="mt-5 text-2xl font-bold text-ink">VND {formatCatalogPrice(product.price)}</h2>
        <p className="mt-1 text-sm text-slate-500">{product.brand || t('supplier.detail.brandMissing')}</p>
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">{product.description || t('supplier.detail.descriptionMissing')}</p>
      </SupplierCard>
      <div className="space-y-5">
        <SupplierCard title={t('supplier.detail.specifications')}>
          <dl className="divide-y divide-slate-100">{[
            [t('supplier.col.sku'), product.sku], [t('supplier.col.block'), product.blockCode], [t('supplier.col.category'), product.category.name],
            [t('supplier.form.field.material'), product.material || '—'], [t('supplier.form.field.colorName'), product.colorName || '—'],
            [t('supplier.detail.dimensions'), `${product.widthMm ?? '—'} × ${product.depthMm ?? '—'} × ${product.heightMm ?? '—'} mm`],
            [t('supplier.form.field.unit'), t(`supplier.form.unitValues.${product.unit}`)],
          ].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 py-3 first:pt-0"><dt className="flex items-center gap-2 text-sm text-slate-500">{label === t('supplier.detail.dimensions') && <Ruler size={15} />}{label}</dt><dd className="break-words text-right text-sm font-semibold text-slate-700">{value}</dd></div>)}</dl>
        </SupplierCard>
        <SupplierCard title={t('supplier.detail.model')}>
          <div className="flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle2 size={17} className={product.model3dUrl ? 'text-emerald-700' : 'text-slate-400'} />{product.model3dUrl ? t('supplier.detail.modelAvailable') : t('supplier.detail.modelMissing')}</span>{product.model3dUrl && <SupplierButton secondary disabled={downloading} onClick={() => void downloadModel()}><ArrowDownToLine size={15} />{downloading ? t('supplier.detail.downloading') : t('supplier.detail.downloadModel')}</SupplierButton>}</div>
        </SupplierCard>
      </div>
    </div>
  </SupplierPageFrame>;
};

export default SupplierProductDetail;
