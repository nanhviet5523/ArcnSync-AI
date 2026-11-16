import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Logo } from '@/components/common';
import { paymentService } from '@/services/paymentService';
import type { PaymentTransaction } from '@/services/paymentService';

const formatVnd = (value: number) => `₫${value.toLocaleString('vi-VN')}`;
const CONTRACT_TOTAL = 68_000_000;
const DUE_NOW = 20_400_000;

type PaymentState = 'success' | 'pending' | 'cancelled' | 'failed';

export function HomeownerPayments() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const milestoneId = params.get('milestoneId') ?? '';
  const returnStatus = (params.get('status') ?? '').toUpperCase();
  const cancelledReturn = params.get('cancel') === 'true' || params.get('cancel') === '1';
  const hasPayosReturn = params.has('status') || params.has('cancel') || params.has('code') || params.has('orderCode');
  const transactionId = params.get('transactionId') ?? params.get('paymentTransactionId') ?? params.get('transaction_id')
    ?? (hasPayosReturn ? window.sessionStorage.getItem('archsync-payos-transaction-id') : null) ?? params.get('id') ?? '';
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [transactionError, setTransactionError] = useState('');
  const [checkingTransaction, setCheckingTransaction] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const fetchedTransaction = transaction?.status?.toUpperCase();
  // Trust the transaction lookup, not a browser-provided success query parameter.
  const effectiveStatus = transactionId ? (fetchedTransaction ?? '') : (cancelledReturn ? 'CANCELLED' : '');
  const result: PaymentState | null = ['PAID', 'SUCCESS', 'COMPLETED'].includes(effectiveStatus) ? 'success'
    : ['PENDING', 'PROCESSING', 'IN_PROGRESS'].includes(effectiveStatus) ? 'pending'
      : ['CANCELLED', 'CANCELED', 'CANCEL'].includes(effectiveStatus) ? 'cancelled'
        : ['FAILED', 'ERROR', 'EXPIRED'].includes(effectiveStatus) ? 'failed' : null;
  const isResult = Boolean(transactionId || cancelledReturn || returnStatus);

  useEffect(() => {
    if (!transactionId) return;
    let active = true;
    setCheckingTransaction(true);
    setTransactionError('');
    void paymentService.getTransaction(transactionId)
      .then((data) => {
        if (!active) return;
        setTransaction(data);
        if (data.status && !['PENDING', 'PROCESSING', 'IN_PROGRESS'].includes(data.status.toUpperCase())) {
          window.sessionStorage.removeItem('archsync-payos-transaction-id');
        }
      })
      .catch((error: unknown) => { if (active) setTransactionError(error instanceof Error ? error.message : 'Could not verify payment status.'); })
      .finally(() => { if (active) setCheckingTransaction(false); });
    return () => { active = false; };
  }, [transactionId]);
  const status = useMemo(() => {
    if (result === 'cancelled') return {
      title: 'Payment was cancelled',
      message: 'No payment was made. You can return to the payment details and try again.',
      Icon: XCircle,
      iconClass: 'bg-amber-50 text-amber-600',
      badge: 'Cancelled',
      badgeClass: 'bg-amber-50 text-amber-800',
    };
    if (result === 'failed') return {
      title: 'Payment could not be completed',
      message: 'The payment was not confirmed in this preview. Review the details and try again.',
      Icon: XCircle,
      iconClass: 'bg-rose-50 text-rose-600',
      badge: 'Not completed',
      badgeClass: 'bg-rose-50 text-rose-800',
    };
    if (result === 'pending') return {
      title: 'We’re confirming your payment',
      message: 'PayOS returned you to ArchSync. The transaction is still pending while payment confirmation is reconciled.',
      Icon: Clock3,
      iconClass: 'bg-blue-50 text-blue-600',
      badge: 'Processing',
      badgeClass: 'bg-blue-50 text-blue-800',
    };
    if (result === 'success') return {
      title: 'Payment successful',
      message: 'The payment transaction has been confirmed.',
      Icon: CheckCircle2,
      iconClass: 'bg-emerald-50 text-emerald-600',
      badge: 'Paid',
      badgeClass: 'bg-emerald-50 text-emerald-800',
    };
    return {
      title: 'Checking payment status',
      message: 'We are verifying the transaction with the payment service.',
      Icon: Clock3,
      iconClass: 'bg-blue-50 text-blue-600',
      badge: 'Checking',
      badgeClass: 'bg-blue-50 text-blue-800',
    };
  }, [result]);

  const startPayment = async () => {
    if (!milestoneId) {
      setPaymentError('A real payment milestone ID is required. Open this page from an issued invoice to continue.');
      return;
    }
    setCreatingPayment(true);
    setPaymentError('');
    try {
      const response = await paymentService.createMilestonePayment(milestoneId);
      const nested = response.paymentLink && typeof response.paymentLink === 'object' ? response.paymentLink as Record<string, unknown> : {};
      const transaction = response.transaction && typeof response.transaction === 'object' ? response.transaction as Record<string, unknown> : {};
      const returnedTransactionId = [response.transactionId, response.transaction_id, response.id, nested.transactionId, nested.id, transaction.id]
        .find((value): value is string | number => typeof value === 'string' || typeof value === 'number');
      if (returnedTransactionId !== undefined) window.sessionStorage.setItem('archsync-payos-transaction-id', String(returnedTransactionId));
      const checkoutUrl = [response.checkoutUrl, response.checkout_url, response.paymentUrl, response.payment_url, response.paymentLinkUrl, response.payment_link_url, response.url, nested.checkoutUrl, nested.checkout_url, nested.paymentUrl, nested.payment_url]
        .find((value): value is string => typeof value === 'string' && value.length > 0);
      if (!checkoutUrl) throw new Error('The payment API did not return a PayOS checkout URL.');
      window.location.assign(checkoutUrl);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Unable to create a PayOS payment link. Please try again.');
    } finally {
      setCreatingPayment(false);
    }
  };
  const returnToPayment = () => navigate(milestoneId ? `/homeowner/payments?milestoneId=${encodeURIComponent(milestoneId)}` : '/homeowner/payments');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div role="note" className="bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-900">{transactionId ? 'Payment status loaded from API' : milestoneId ? 'Sample contract summary · Payment API enabled' : 'Sample data · payment milestone ID required to pay'}</div>
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
          <Logo size={34} to="/" />
          <span className="hidden text-xs text-slate-500 sm:block">OA Apartment · Bình Thạnh</span>
          <Link to="/homeowner/projects" className="text-sm font-semibold text-blue-700 hover:text-blue-900">My projects</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-7 lg:px-8 lg:py-10">
        {isResult ? (
          <>
            <Link to="/homeowner/payments" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"><ArrowLeft size={16} /> Payment details</Link>
            <section className="mx-auto mt-7 max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-8 text-center sm:px-10">
                <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${status.iconClass}`}><status.Icon size={32} /></span>
                <p className="mt-5 text-sm font-semibold text-slate-500">PayOS payment result</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{status.title}</h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">{checkingTransaction ? 'Checking this transaction with the server…' : transactionError || (!transactionId && !cancelledReturn ? 'The return link did not include a transaction ID, so the server cannot verify this payment.' : status.message)}</p>
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-blue-700"><Building2 size={19} /></span><div><p className="text-sm font-bold">OA Apartment · Design service</p><p className="mt-0.5 text-xs text-slate-500">Contract C-2026-014</p></div></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${status.badgeClass}`}>{status.badge}</span></div>
                <dl className="mt-5 divide-y divide-slate-100 text-sm">
                  <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Amount</dt><dd className="font-bold tabular-nums">{formatVnd(transaction?.amount ?? DUE_NOW)}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Payment for</dt><dd className="text-right font-medium">Contract signed · 30%</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Transaction ID</dt><dd className="font-mono text-xs font-semibold">{transaction?.id ?? transactionId}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">PayOS order code</dt><dd className="font-mono text-xs font-semibold">{transaction?.orderCode ?? params.get('orderCode') ?? '—'}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Payment method</dt><dd className="font-medium">{transaction?.paymentMethod ?? 'PayOS · Bank transfer'}</dd></div>
                  {result === 'success' && (transaction?.paidAt || params.get('paidAt')) && <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Completed at</dt><dd className="font-medium">{transaction?.paidAt ?? params.get('paidAt')}</dd></div>}
                </dl>
                <div role="note" className="mt-4 flex gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ShieldCheck size={16} className="mt-0.5 shrink-0" /><p>{transactionError || (result === 'pending' ? 'The API still reports this transaction as pending. You can check it again after PayOS reconciliation.' : 'Transaction status is verified through the payment API. Payment webhooks are handled by the server.')}</p></div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {result !== 'success' && <button type="button" onClick={returnToPayment} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"><RefreshCw size={16} /> Try payment again</button>}
                  <Link to="/homeowner/projects" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Back to my project <ArrowRight size={16} /></Link>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <Link to="/homeowner/projects" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"><ArrowLeft size={16} /> Back to my projects</Link>
            <div className="mt-5">
              <p className="text-sm font-semibold text-blue-700">Contract · Payment schedule</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Review and pay</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Review the contract installment and continue to the PayOS checkout preview.</p>
            </div>

            <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
              <div className="space-y-5">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><FileText size={21} /></span><div><h2 className="text-lg font-bold">Design service contract</h2><p className="mt-0.5 text-sm text-slate-500">C-2026-014 · Standard package</p></div></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Signed</span></div>
                  <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Project</dt><dd className="mt-1 text-sm font-semibold">OA Apartment · Bình Thạnh</dd></div><div><dt className="text-xs text-slate-500">Contract total</dt><dd className="mt-1 text-sm font-semibold">{formatVnd(CONTRACT_TOTAL)}</dd></div></dl>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Payment milestones</h2><p className="mt-1 text-sm text-slate-500">Installments follow the signed contract.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">1 of 3 due</span></div>
                <div className="mt-5 space-y-3">
                    <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 sm:flex-row sm:items-center"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">1</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">Contract signed</p><p className="mt-0.5 text-xs text-slate-500">30% of contract · Invoice issued · Due now</p></div><div className="text-left sm:text-right"><b className="text-sm tabular-nums">{formatVnd(DUE_NOW)}</b><span className="mt-1 block text-xs font-semibold text-blue-700">Unpaid · Payable</span></div></div>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-slate-500">2</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-700">Concept approved</p><p className="mt-0.5 text-xs text-slate-500">40% of contract · Due after concept approval</p></div><div className="text-right"><b className="text-sm text-slate-500">{formatVnd(27_200_000)}</b><span className="mt-1 block text-xs text-slate-400">Locked</span></div></div>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-slate-500">3</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-700">Final handover</p><p className="mt-0.5 text-xs text-slate-500">30% of contract · Due at project handover</p></div><div className="text-right"><b className="text-sm text-slate-500">{formatVnd(20_400_000)}</b><span className="mt-1 block text-xs text-slate-400">Locked</span></div></div>
                  </div>
                </section>
              </div>

              <aside className="sticky top-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold">Payment summary</h2>
                <div className="mt-5 flex justify-between gap-3 text-sm"><span className="text-slate-500">Contract signed installment</span><span className="font-semibold">30%</span></div>
                <div className="mt-3 flex items-end justify-between gap-3 border-b border-slate-100 pb-5"><span className="text-sm text-slate-500">Amount due</span><strong className="text-2xl tabular-nums">{formatVnd(DUE_NOW)}</strong></div>
                <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-emerald-600" /><p>PayOS creates a secure checkout link for an invoice that is issued or overdue.</p></div>
                {!milestoneId && <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">This project preview does not include the payment milestone ID required by the API. Open this page with an issued invoice’s milestone ID to start PayOS checkout.</p>}
                {paymentError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-700">{paymentError}</p>}
                <button type="button" disabled={creatingPayment} onClick={() => void startPayment()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"><CreditCard size={17} /> {creatingPayment ? 'Creating PayOS payment…' : 'Pay now'} <ArrowRight size={16} /></button>
                <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400"><BadgeCheck size={14} /> PayOS secure checkout</p>
              </aside>
            </div>
            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><Clock3 size={16} className="mt-0.5 shrink-0" /><p>The contract and installment amounts shown here are sample data (VND 68,000,000; 30% / 40% / 30%). Payment API requests use the real milestone ID passed to this page.</p></div>
          </>
        )}
      </main>
    </div>
  );
}

export default HomeownerPayments;
