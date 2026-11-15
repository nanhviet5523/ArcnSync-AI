import { apiRequest } from '@/services/authService';

export interface CatalogCategory {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  isActive: boolean;
  supplier?: { id?: string; companyName?: string };
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
}

export interface CategoryUpdatePayload {
  parentId?: string | null;
  name?: string;
  isActive?: boolean;
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
  listOwnCategories(isActive?: boolean) {
    return apiRequest<CatalogCategory[]>(`/product-categories${queryString({ isActive })}`);
  },
  getOwnCategory(id: string) {
    return apiRequest<CatalogCategory>(`/product-categories/${encodeURIComponent(id)}`);
  },
  createCategory(payload: CategoryCreatePayload) {
    return apiRequest<CatalogCategory>('/product-categories', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateCategory(id: string, payload: CategoryUpdatePayload) {
    return apiRequest<CatalogCategory>(`/product-categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  listAdminCategories(params: { supplierId?: string; isActive?: boolean; q?: string; page?: number; limit?: number } = {}) {
    return apiRequest<CatalogPage<CatalogCategory>>(`/admin/product-categories${queryString({ page: 1, limit: 100, ...params })}`);
  },
  getAdminCategory(id: string) {
    return apiRequest<CatalogCategory>(`/admin/product-categories/${encodeURIComponent(id)}`);
  },
};
