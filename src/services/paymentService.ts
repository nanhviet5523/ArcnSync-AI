import { apiRequest } from '@/services/authService';

export interface PaymentLinkResponse {
  id?: string;
  transactionId?: string;
  checkoutUrl?: string;
  paymentUrl?: string;
  paymentLinkUrl?: string;
  url?: string;
  qrCode?: string;
  amount?: number;
  orderCode?: string | number;
  status?: string;
  [key: string]: unknown;
}

export interface PaymentTransaction {
  id?: string;
  status?: string;
  amount?: number;
  orderCode?: string | number;
  paidAt?: string;
  paymentMethod?: string;
  data?: PaymentTransaction;
  [key: string]: unknown;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function unwrap<T extends Record<string, unknown>>(value: unknown): T {
  const outer = record(value);
  const data = record(outer.data);
  return (Object.keys(data).length ? data : outer) as T;
}

export const paymentService = {
  /** Issue a PayOS checkout link for an invoiced or overdue milestone. */
  createMilestonePayment: async (milestoneId: string) => unwrap<PaymentLinkResponse>(
    await apiRequest<unknown>(`/payment-milestones/${encodeURIComponent(milestoneId)}/payments`, { method: 'POST' }),
  ),

  /** Verify a returned transaction; the backend reconciles PENDING with PayOS. */
  getTransaction: async (transactionId: string) => unwrap<PaymentTransaction>(
    await apiRequest<unknown>(`/payment-transactions/${encodeURIComponent(transactionId)}`),
  ),
};
