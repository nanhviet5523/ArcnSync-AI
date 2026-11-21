import { apiRequest, downloadFile } from '@/services/authService';
import { formatMoney } from '@/i18n';

/**
 * Quotation / BOM API (backend module `quotations`). The backend creates a DRAFT itself when the homeowner approves the
 * products of a RENDER_3D version; staff in charge (or admin) sets the expiry and sends it; the homeowner accepts it or
 * asks for changes. ACCEPTED, CHANGES_REQUESTED and EXPIRED are final: the next approval creates revision n + 1.
 */
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'CHANGES_REQUESTED' | 'EXPIRED';
/** Computed on the frontend from the budget snapshot; WITHIN and WITHIN_TOLERANCE are the backend's `withinBudget = true`. */
export type BudgetStatus = 'BELOW' | 'WITHIN' | 'WITHIN_TOLERANCE' | 'OVER';

/** Keys of `costBreakdown`, in display order. */
export const COST_GROUPS = ['FURNITURE', 'FINISHING', 'LIGHTING', 'DECOR', 'OTHER', 'DESIGN_FEE'] as const;
export type CostGroup = (typeof COST_GROUPS)[number];
/** Cost group of a product line (every group except the design fee). */
export type CostCategory = Exclude<CostGroup, 'DESIGN_FEE'>;

export interface QuotationItem {
  id: string;
  productSelectionId: string;
  productId: string;
  supplierId: string;
  supplierName: string | null;
  productName: string;
  costCategory: CostCategory;
  /** PIECE / SET / M2 / M / LITER / KG */
  unit: string;
  /** Money and quantities are strings ("12500000.00"); convert only to display or to estimate. */
  quantity: string;
  /** Price when the product was selected. */
  unitPrice: string;
  lineTotal: string;
}

/** Project budget when the quotation was created. `limit` = max × (1 + tolerancePercent / 100). */
export interface QuotationBudget {
  min: string;
  max: string;
  tolerancePercent: string;
  limit: string;
}

export interface QuotationSummary {
  id: string;
  /** Q-<project code>-<revisionNo> */
  quotationNo: string;
  revisionNo: number;
  designVersionId: string;
  status: QuotationStatus;
  productsSubtotal: string;
  designFee: string;
  totalAmount: string;
  /** totalAmount ≤ budget.limit */
  withinBudget: boolean;
  /** YYYY-MM-DD */
  validUntil: string | null;
  createdAt: string;
  acceptedAt: string | null;
}

export interface Quotation extends QuotationSummary {
  projectId: string;
  costBreakdown: Record<CostGroup, string>;
  budget: QuotationBudget;
  items: QuotationItem[];
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

export type QuotationFileFormat = 'csv' | 'pdf';

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

/* eslint-disable @typescript-eslint/no-explicit-any */
const option = (o: any): ProductOption => ({
  id: o.id, name: o.name, sku: o.sku, price: o.price,
  supplierName: o.supplier?.companyName ?? null, thumbnailUrl: o.thumbnailUrl ?? null, fit: o.fit,
});

export const quotationApi = {
  /** Newest revision first; the homeowner never gets DRAFTs. */
  list: (projectId: string) => apiRequest<QuotationSummary[]>(`/projects/${projectId}/quotations`),
  /** 404 QUOTATION_NOT_FOUND when the viewer may not see it (homeowner + DRAFT). */
  get: (id: string) => apiRequest<Quotation>(`/quotations/${id}`),
  /** Staff in charge / admin, DRAFT only. `null` clears it: sending then sets today + 14 days. */
  updateValidUntil: (id: string, validUntil: string | null) => apiRequest<Quotation>(`/quotations/${id}`, json('PATCH', { validUntil })),
  send: (id: string) => apiRequest<Quotation>(`/quotations/${id}/sending`, json('POST')),
  accept: (id: string) => apiRequest<Quotation>(`/quotations/${id}/acceptance`, json('POST')),
  /** SENT → CHANGES_REQUESTED; the approved 3D version reopens and the project goes back to PRODUCT_SELECTION. */
  requestChanges: (id: string, reason: string) => apiRequest<Quotation>(`/quotations/${id}/revision-requests`, json('POST', { reason })),
  /** BOM generated on download. */
  download: (q: Pick<Quotation, 'id' | 'revisionNo'>, projectCode: string, format: QuotationFileFormat) =>
    downloadFile(`/quotations/${q.id}/file?format=${format}`, `quotation-${projectCode}-r${q.revisionNo}.${format}`, { preferFallbackName: true }),
  /** Products of the same category as the design item, cheapest first. */
  options: async (elementId: string) =>
    (await apiRequest<{ items: any[] }>(`/design-elements/${elementId}/product-options?limit=100`)).items.map(option),
};

/** Estimate with swapped products: each swapped line uses the option price × the line quantity; the design fee stays. */
export function estimateWith(q: Pick<Quotation, 'items' | 'designFee'>, tried: Record<string, ProductOption>) {
  let productsSubtotal = 0;
  for (const item of q.items) {
    const pick = tried[item.id];
    productsSubtotal += pick ? Number(pick.price) * Number(item.quantity) : Number(item.lineTotal);
  }
  return { productsSubtotal, total: productsSubtotal + Number(q.designFee) };
}

/** Today in Vietnam as YYYY-MM-DD (the backend checks validUntil the same way). */
export const todayVn = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

/** "+1,200,000 ₫" / "−300,000 ₫" for a price difference. */
export const signedMoney = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatMoney(Math.abs(v))}`;

/** Budget status of a total against the snapshot; within the limit matches the backend's `withinBudget`. */
export function budgetStatusOf(total: number, b: Pick<QuotationBudget, 'min' | 'max' | 'limit'>): BudgetStatus {
  if (total < Number(b.min)) return 'BELOW';
  if (total <= Number(b.max)) return 'WITHIN';
  if (total <= Number(b.limit)) return 'WITHIN_TOLERANCE';
  return 'OVER';
}

/** Lists (summaries) only carry the flag. */
export const budgetStatusFromFlag = (withinBudget: boolean): BudgetStatus => (withinBudget ? 'WITHIN' : 'OVER');

/** Most the backend accepts for a change request's reason. */
export const REASON_MAX = 2000;

/**
 * The backend only takes a text reason, so the products tried on the page go into it as lines Lead can read:
 * "Sofa A → Sofa B (12,500,000 ₫)". Lines that don't fit in REASON_MAX are dropped.
 */
export function reasonWithTried(reason: string, header: string, lines: string[]): string {
  if (!lines.length) return reason.slice(0, REASON_MAX);
  let out = `${reason}\n\n${header}`;
  for (const line of lines) {
    const next = `${out}\n- ${line}`;
    if (next.length > REASON_MAX) break;
    out = next;
  }
  return out.slice(0, REASON_MAX);
}
