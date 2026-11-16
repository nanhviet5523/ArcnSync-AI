import { apiRequest, downloadFile } from '@/services/authService';
import { formatMoney } from '@/i18n';
import type { ProjectStatus } from '@/features/projects/projectApi';

export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
export type BudgetStatus = 'BELOW' | 'WITHIN' | 'WITHIN_TOLERANCE' | 'OVER';

export interface QuotationItem {
  id: string;
  lineNo: number;
  categoryId: string | null;
  categoryName: string;
  productId: string;
  productName: string;
  sku: string;
  supplierName: string | null;
  unit: string;
  /** Money and quantities are strings ("12500000.00"); convert only to display or to estimate. */
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  /** Design items using this product: their product options feed "Try options". */
  elementIds: string[];
}

export interface QuotationGroup {
  categoryId: string | null;
  categoryName: string;
  lineCount: number;
  quantity: string;
  subtotal: string;
  sharePercent: string;
}

export interface QuotationBudget {
  min: string;
  max: string;
  tolerancePercent: string;
  ceiling: string;
  status: BudgetStatus;
  differenceFromMax: string;
}

export interface RequestedChange {
  itemId: string;
  currentProductName: string;
  productId: string;
  productName: string;
  unitPrice: string;
}

export interface QuotationSummary {
  id: string;
  projectId: string;
  revisionNo: number;
  status: QuotationStatus;
  subtotal: string;
  discountAmount: string;
  total: string;
  validUntil: string | null;
  itemCount: number;
  sentAt: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface Quotation extends QuotationSummary {
  project: { id: string; code: string; title: string; status: ProjectStatus };
  designVersion: { id: string; label: string };
  note: string | null;
  rejectionReason: string | null;
  requestedChanges: RequestedChange[];
  createdBy: { id: string; fullName: string } | null;
  respondedBy: { id: string; fullName: string } | null;
  updatedAt: string;
  items: QuotationItem[];
  groups: QuotationGroup[];
  budget: QuotationBudget;
}

/** One alternative product of a design item (GET /design-elements/:id/product-options). */
export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  price: string;
  supplierName: string | null;
  thumbnailUrl: string | null;
  /** FITS / TOO_LONG / TOO_DEEP / TOO_TALL / UNKNOWN, against the item's space in the drawing. */
  fit: string;
}

export interface Replacement { itemId: string; productId: string }

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

/* eslint-disable @typescript-eslint/no-explicit-any */
const option = (o: any): ProductOption => ({
  id: o.id, name: o.name, sku: o.sku, price: o.price,
  supplierName: o.supplier?.companyName ?? null, thumbnailUrl: o.thumbnailUrl ?? null, fit: o.fit,
});

export const quotationApi = {
  list: async (projectId: string) => (await apiRequest<{ items: QuotationSummary[] }>(`/projects/${projectId}/quotations`)).items,
  /** Latest quotation the viewer may see; 404 QUOTATION_NOT_FOUND when there is none. */
  current: (projectId: string) => apiRequest<Quotation>(`/projects/${projectId}/quotation`),
  get: (id: string) => apiRequest<Quotation>(`/quotations/${id}`),
  create: (projectId: string, body: { discountAmount?: string; note?: string; validUntil?: string; applyRequestedChanges?: boolean }) =>
    apiRequest<Quotation>(`/projects/${projectId}/quotations`, json('POST', body)),
  update: (id: string, body: { discountAmount?: string; note?: string | null; validUntil?: string | null; replacements?: Replacement[] }) =>
    apiRequest<Quotation>(`/quotations/${id}`, json('PATCH', body)),
  send: (id: string) => apiRequest<Quotation>(`/quotations/${id}/sending`, json('POST')),
  withdraw: (id: string) => apiRequest<Quotation>(`/quotations/${id}/sending`, json('DELETE')),
  approve: (id: string) => apiRequest<Quotation>(`/quotations/${id}/approval`, json('POST')),
  reject: (id: string, reason: string, changes: Replacement[]) =>
    apiRequest<Quotation>(`/quotations/${id}/rejection`, json('POST', { reason, changes })),
  exportCsv: (q: Pick<Quotation, 'id' | 'revisionNo' | 'project'>) =>
    downloadFile(`/quotations/${q.id}/export.csv`, `quotation-${q.project.code}-r${q.revisionNo}.csv`),
  /** Products of the same category as the design item, cheapest first. */
  options: async (elementId: string) =>
    (await apiRequest<{ items: any[] }>(`/design-elements/${elementId}/product-options?limit=100`)).items.map(option),
};

/** Estimate with swapped products: each swapped line uses the option price × the line quantity. */
export function estimateWith(q: Pick<Quotation, 'items' | 'discountAmount'>, tried: Record<string, ProductOption>) {
  let subtotal = 0;
  for (const item of q.items) {
    const pick = tried[item.id];
    subtotal += pick ? Number(pick.price) * Number(item.quantity) : Number(item.lineTotal);
  }
  return { subtotal, total: Math.max(0, subtotal - Number(q.discountAmount)) };
}

/** Today in Vietnam as YYYY-MM-DD (the backend checks validUntil the same way). */
export const todayVn = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

/**
 * Money typed by a person → backend string, or null when it can't be read. Accepts "500000", "500,000", "500.000",
 * "500 000 ₫" (dots in groups of three are thousands separators, as Vietnamese users write them) and "1500.5".
 */
export function parseMoneyInput(raw: string): string | null {
  let s = raw.replace(/[\s₫đ,]/gi, '');
  if (s === '') return '0';
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replaceAll('.', '');
  return /^\d{1,13}(\.\d{1,2})?$/.test(s) ? s : null;
}

/** "+1,200,000 ₫" / "−300,000 ₫" for a price difference. */
export const signedMoney = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatMoney(Math.abs(v))}`;

/** Budget status for an estimated total, same rule as the backend (Quotation.budgetCheck). */
export function budgetStatusOf(total: number, b: Pick<QuotationBudget, 'min' | 'max' | 'ceiling'>): BudgetStatus {
  if (total < Number(b.min)) return 'BELOW';
  if (total <= Number(b.max)) return 'WITHIN';
  if (total <= Number(b.ceiling)) return 'WITHIN_TOLERANCE';
  return 'OVER';
}
