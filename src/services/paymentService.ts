import { apiRequest } from '@/services/authService';

export type PaymentTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type PaymentGateway = 'PAYOS' | 'VNPAY' | 'BANK_TRANSFER';

export interface PaymentTransaction {
  id: string;
  milestoneId: string;
  type: 'PAYMENT' | 'REFUND';
  /** VND as a decimal string, e.g. "20400000.00". */
  amount: string;
  gateway: PaymentGateway;
  gatewayTxnRef: string | null;
  status: PaymentTransactionStatus;
  note: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface PaymentLinkResponse {
  transaction: PaymentTransaction;
  checkoutUrl: string;
  qrCode: string;
  expiresAt: string;
}

export const paymentService = {
  /** Customer creates a PayOS link for an invoiced/overdue contract milestone. */
  createMilestonePayment(milestoneId: string): Promise<PaymentLinkResponse> {
    return apiRequest<PaymentLinkResponse>(
      `/payment-milestones/${encodeURIComponent(milestoneId)}/payments`,
      { method: 'POST' },
    );
  },

  /** Reads status; BE reconciles PENDING with PayOS when possible. */
  getTransaction(transactionId: string): Promise<PaymentTransaction> {
    return apiRequest<PaymentTransaction>(`/payment-transactions/${encodeURIComponent(transactionId)}`);
  },
};
