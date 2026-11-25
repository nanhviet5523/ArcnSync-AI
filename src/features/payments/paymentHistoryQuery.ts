// No '@/' imports: unit-tested with node --test.

export type PaymentTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type PaymentTransactionType = 'PAYMENT' | 'REFUND';
export type PaymentGatewayName = 'VNPAY' | 'PAYOS' | 'BANK_TRANSFER';
export type MilestoneStageType = 'DEPOSIT' | 'LAYOUT_2D' | 'RENDER_3D' | 'FINAL_PACKAGE';

export const PAYMENT_TRANSACTION_STATUSES: readonly PaymentTransactionStatus[] = ['PENDING', 'SUCCESS', 'FAILED'];

/** One row of GET /payment-transactions. Backend sorts by createdAt desc; do not re-sort. */
export interface PaymentTransactionHistoryItem {
  id: string;
  milestoneId: string;
  type: PaymentTransactionType;
  /** VND as a decimal string, e.g. "2000000.00". Convert with Number() only for display. */
  amount: string;
  gateway: PaymentGatewayName;
  /** PayOS orderCode. */
  gatewayTxnRef: string | null;
  status: PaymentTransactionStatus;
  note: string | null;
  createdAt: string;
  /** null while PENDING / FAILED. */
  completedAt: string | null;
  milestone: { id: string; seqNo: number; name: string; stageType: MilestoneStageType };
  contract: { id: string; contractNo: string } | null;
  project: { id: string; code: string; title: string } | null;
  payer: { id: string; fullName: string } | null;
}

export interface PaymentTransactionHistoryPage {
  items: PaymentTransactionHistoryItem[];
  page: number;
  limit: number;
  /** Number of records, not pages. */
  total: number;
}

export interface PaymentHistoryQuery {
  page?: number;
  limit?: number;
  status?: PaymentTransactionStatus | '' | null;
  projectId?: string | null;
}

export const PAYMENT_HISTORY_DEFAULT_LIMIT = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Query string for GET /payment-transactions. The backend uses forbidNonWhitelisted, so only
 * page/limit/status/projectId are ever sent, and empty / "ALL" / invalid values drop the key entirely.
 */
export function buildPaymentHistoryQuery(q: PaymentHistoryQuery = {}): string {
  const p = new URLSearchParams();
  if (Number.isInteger(q.page) && (q.page as number) >= 1) p.set('page', String(q.page));
  if (Number.isInteger(q.limit) && (q.limit as number) >= 1 && (q.limit as number) <= 100) p.set('limit', String(q.limit));
  if (q.status && PAYMENT_TRANSACTION_STATUSES.includes(q.status)) p.set('status', q.status);
  const projectId = q.projectId?.trim();
  if (projectId && UUID.test(projectId)) p.set('projectId', projectId);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** GET /contracts/:id/payment-transactions: all milestones of one contract, newest first, no paging. */
export interface ContractPaymentTransactions {
  items: PaymentTransactionHistoryItem[];
}

/**
 * Path for GET /contracts/:id/payment-transactions. Only `status` may be sent (page/limit → 400);
 * "All" drops the key. Returns null while there is no valid contract UUID, so nothing is called
 * with "undefined" or a contractNo.
 */
export function contractPaymentTransactionsPath(contractId: string | null | undefined, status?: PaymentTransactionStatus | '' | null): string | null {
  const id = contractId?.trim();
  if (!id || !UUID.test(id)) return null;
  const query = status && PAYMENT_TRANSACTION_STATUSES.includes(status) ? `?status=${status}` : '';
  return `/contracts/${encodeURIComponent(id)}/payment-transactions${query}`;
}

export const totalPages =(total: number, limit: number) => (total > 0 && limit > 0 ? Math.ceil(total / limit) : 0);

/** Page to jump to when the current one is past the end (e.g. after a filter change); null when it is fine. */
export function clampedPage(page: number, total: number, limit: number): number | null {
  const pages = totalPages(total, limit);
  return total > 0 && page > pages ? pages : null;
}
