import React, { useEffect, useState } from 'react';
import { ArrowLeft, Box, Pencil, Ruler } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/services/authService';
import { catalogService, formatCatalogPrice, productStockLabel, type CatalogProduct } from '@/services/catalogService';
import { SupplierBadge, SupplierButton, SupplierCard, SupplierPageFrame } from './SupplierPageFrame';

export const SupplierProductDetail: React.FC = () => {
  const { productId = '' } = useParams(); const navigate = useNavigate();
  const [product, setProduct] = useState<CatalogProduct | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; catalogService.getProduct(productId).then((item)=>{if(active)setProduct(item);}).catch((cause:unknown)=>{if(active)setError(cause instanceof ApiError?`${cause.message} (HTTP ${cause.status||'network'}).`:'Could not load the product.');}).finally(()=>{if(active)setLoading(false);}); return ()=>{active=false;}; },[productId]);
  if (loading) return <SupplierPageFrame title="Product details" description="Loading from catalog API…"/>;
  if (!product) return <SupplierPageFrame title="Product unavailable" description={error || 'This item is not visible to your account.'}><SupplierButton secondary onClick={()=>navigate('/supplier-catalog')}><ArrowLeft size={16}/> Back to catalog</SupplierButton></SupplierPageFrame>;
  return <SupplierPageFrame title={product.name} description={`${product.sku} · ${product.category.name}`} action={<SupplierButton onClick={()=>navigate(`/supplier-products/${product.id}/edit`)}><Pencil size={16}/> Edit product</SupplierButton>}>
    <button onClick={()=>navigate('/supplier-catalog')} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft size={16}/> Product catalog</button>
    <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_1fr]"><SupplierCard>{product.thumbnailUrl?<img src={product.thumbnailUrl} alt={product.name} className="max-h-[440px] w-full rounded-xl bg-slate-50 object-contain"/>:<div className="grid min-h-[300px] place-items-center rounded-xl bg-slate-50 text-slate-300"><Box size={60}/></div>}<div className="mt-4 flex gap-2"><SupplierBadge tone="blue">{product.category.name}</SupplierBadge><SupplierBadge tone={product.status==='ACTIVE'?'green':'gray'}>{product.status}</SupplierBadge><SupplierBadge tone={product.stockStatus==='IN_STOCK'?'green':product.stockStatus==='PRE_ORDER'?'amber':'red'}>{productStockLabel(product.stockStatus)}</SupplierBadge></div><p className="mt-4 leading-7 text-slate-600">{product.description || 'No description provided.'}</p></SupplierCard>
      <div className="space-y-5"><SupplierCard title="Price"><b className="text-2xl text-slate-900">VND {formatCatalogPrice(product.price)}</b><p className="mt-2 text-sm text-slate-500">{product.brand || 'Brand not provided'}</p></SupplierCard><SupplierCard title="Specifications"><div className="divide-y divide-slate-100">{[['SKU',product.sku],['Category',product.category.name],['Material',product.material||'—'],['Color',product.colorName||'—'],['Dimensions',`${product.widthMm??'—'} × ${product.depthMm??'—'} × ${product.heightMm??'—'} mm`],['Unit',product.unit],['3D model',product.model3dUrl||'Not provided']].map(([label,value])=><div key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0"><span className="flex items-center gap-2 text-sm text-slate-500">{label==='Dimensions'&&<Ruler size={15}/ >}{label}</span><b className="break-all text-right text-sm text-slate-700">{value}</b></div>)}</div></SupplierCard>{product.styles.length>0&&<SupplierCard title="Design styles"><div className="flex flex-wrap gap-2">{product.styles.map((style)=><SupplierBadge key={style.id} tone="blue">{style.name}</SupplierBadge>)}</div></SupplierCard>}</div>
    </div>
  </SupplierPageFrame>;
};
export default SupplierProductDetail;
