import { apiRequest } from '@/services/authService';

export type StockStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'PRE_ORDER';
export type ProductStatus = 'ACTIVE' | 'INACTIVE';
export type ProductUnit = 'PIECE' | 'SET' | 'M2' | 'M' | 'LITER' | 'KG';

export type CostCategory = 'FURNITURE' | 'FINISHING' | 'LIGHTING' | 'DECOR' | 'OTHER';

/** Danh mục dùng chung, chỉ Admin tạo/sửa. */
export interface CatalogCategory {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  isActive: boolean;
  defaultModelUrl: string | null;
  costCategory: CostCategory | null;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  /** Tên block trong DXF, do server sinh: <mã danh mục>-NNNN */
  blockCode: string;
  name: string;
  description: string | null;
  brand: string | null;
  material: string | null;
  colorName: string | null;
  colorCode: string | null;
  widthMm: number | null;
  depthMm: number | null;
  heightMm: number | null;
  unit: ProductUnit;
  price: string;
  stockStatus: StockStatus;
  thumbnailUrl: string | null;
  model3dUrl: string | null;
  specifications: Record<string, unknown> | null;
  status: ProductStatus;
  priceUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; code: string; name: string };
  supplier: { id?: string; companyName?: string };
  styles: { id: string; code: string; name: string }[];
}

export interface CatalogPage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface CategoryCreatePayload {
  parentId?: string;
  code: string;
  name: string;
  isActive?: boolean;
  defaultModelUrl?: string;
  costCategory?: CostCategory;
}

export interface CategoryUpdatePayload {
  parentId?: string | null;
  name?: string;
  isActive?: boolean;
  defaultModelUrl?: string | null;
  costCategory?: CostCategory | null;
}

export interface ProductPayload {
  categoryId?: string;
  sku?: string;
  name?: string;
  description?: string | null;
  brand?: string | null;
  material?: string | null;
  colorName?: string | null;
  colorCode?: string | null;
  widthMm?: number | null;
  depthMm?: number | null;
  heightMm?: number | null;
  unit?: ProductUnit;
  price?: string;
  stockStatus?: StockStatus;
  specifications?: Record<string, unknown> | null;
  styleIds?: string[];
  status?: ProductStatus;
}

const queryString = (values: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const result = query.toString();
  return result ? `?${result}` : '';
};

export const catalogService = {
  /** Danh mục đang hoạt động (Supplier, Designer, Staff, Admin). */
  listCategories() {
    return apiRequest<CatalogCategory[]>('/product-categories');
  },
  listAdminCategories(params: { isActive?: boolean; q?: string; page?: number; limit?: number } = {}) {
    return apiRequest<CatalogPage<CatalogCategory>>(`/admin/product-categories${queryString({ page: 1, limit: 100, ...params })}`);
  },
  getAdminCategory(id: string) {
    return apiRequest<CatalogCategory>(`/admin/product-categories/${encodeURIComponent(id)}`);
  },
  createAdminCategory(payload: CategoryCreatePayload) {
    return apiRequest<CatalogCategory>('/admin/product-categories', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateAdminCategory(id: string, payload: CategoryUpdatePayload) {
    return apiRequest<CatalogCategory>(`/admin/product-categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  listProducts(params: { q?: string; categoryId?: string; styleId?: string; supplierId?: string; minPrice?: string; maxPrice?: string; stockStatus?: StockStatus; status?: ProductStatus; page?: number; limit?: number } = {}) {
    return apiRequest<CatalogPage<CatalogProduct>>(`/products${queryString({ page: 1, limit: 100, ...params })}`);
  },
  getProduct(id: string) {
    return apiRequest<CatalogProduct>(`/products/${encodeURIComponent(id)}`);
  },
  createProduct(payload: ProductPayload) {
    return apiRequest<CatalogProduct>('/products', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateProduct(id: string, payload: ProductPayload) {
    return apiRequest<CatalogProduct>(`/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  /** Ảnh PNG/JPEG/WebP ≤ 5 MB hoặc model .glb ≤ 25 MB, field `file`. */
  uploadProductFile(id: string, kind: 'thumbnail' | 'model-3d', file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<CatalogProduct>(`/products/${encodeURIComponent(id)}/${kind}`, { method: 'PUT', body: form });
  },
};

export const formatCatalogPrice = (price: string) => Number(price).toLocaleString('en-US');
export const productStockLabel = (status: StockStatus) => ({ IN_STOCK: 'In stock', OUT_OF_STOCK: 'Out of stock', PRE_ORDER: 'Pre-order' })[status];
