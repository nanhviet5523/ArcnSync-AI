import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Clock3, CreditCard, FileText, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Logo } from '@/components/common';
import { projectApi } from '@/features/projects/projectApi';
import type { Project } from '@/features/projects/projectApi';
import { getProjectContract } from '@/features/projects/services/contractsApi';
import type { ContractResponse, PaymentMilestoneResponse } from '@/features/projects/services/contractsApi';
import { ApiError } from '@/services/authService';
import { paymentService } from '@/services/paymentService';
import type { PaymentTransaction } from '@/services/paymentService';

const formatVnd = (amount: string | number) => `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 })} VND`;
const isPayable = (milestone: PaymentMilestoneResponse) => milestone.status === 'INVOICED' || milestone.status === 'OVERDUE';
const milestoneStatusLabel: Record<PaymentMilestoneResponse['status'], string> = {
  PENDING: 'Not yet due', INVOICED: 'Invoiced', PAID: 'Paid', OVERDUE: 'Overdue', CANCELLED: 'Cancelled',
};
const transactionStatusLabel: Record<PaymentTransaction['status'], string> = {
  PENDING: 'Pending', SUCCESS: 'Paid', FAILED: 'Failed',
};
const statusClass: Record<PaymentMilestoneResponse['status'], string> = {
  PENDING: 'bg-slate-100 text-slate-600', INVOICED: 'bg-blue-50 text-blue-700', PAID: 'bg-emerald-50 text-emerald-700', OVERDUE: 'bg-rose-50 text-rose-700', CANCELLED: 'bg-slate-100 text-slate-500',
};

export function HomeownerPayments() {
  const [params] = useSearchParams();
  const transactionId = params.get('transactionId') ?? params.get('paymentTransactionId') ?? params.get('transaction_id') ?? '';
  const projectId = params.get('projectId') ?? (transactionId ? window.sessionStorage.getItem('archsync-payos-project-id') : null) ?? '';
  const requestedMilestoneId = params.get('milestoneId') ?? window.sessionStorage.getItem('archsync-payos-milestone-id') ?? '';

  const [project, setProject] = useState<Project | null>(null);
  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [contextLoading, setContextLoading] = useState(Boolean(projectId));
  const [contextError, setContextError] = useState('');
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [transactionLoading, setTransactionLoading] = useState(Boolean(transactionId));
  const [transactionError, setTransactionError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [creatingPayment, setCreatingPayment] = useState(false);
  const paymentInFlight = useRef(false);

  const loadContext = useCallback(async () => {
    if (!projectId) { setContextLoading(false); return; }
    setContextLoading(true);
    setContextError('');
    try {
      const [projectData, contractData] = await Promise.all([projectApi.get(projectId), getProjectContract(projectId)]);
      setProject(projectData);
      setContract(contractData);
    } catch (error) {
      setContextError(error instanceof ApiError ? error.message : 'Could not load the project and contract from the server.');
      setProject(null);
      setContract(null);
    } finally { setContextLoading(false); }
  }, [projectId]);

  const verifyTransaction = useCallback(async () => {
    if (!transactionId) return;
    setTransactionLoading(true);
    setTransactionError('');
    try {
      const actual = await paymentService.getTransaction(transactionId);
      setTransaction(actual);
      if (actual.status !== 'PENDING') {
        window.sessionStorage.removeItem('archsync-payos-transaction-id');
        window.sessionStorage.removeItem('archsync-payos-milestone-id');
      }
    } catch (error) {
      setTransactionError(error instanceof Error ? error.message : 'Could not verify the transaction status.');
    } finally { setTransactionLoading(false); }
  }, [transactionId]);

  useEffect(() => { void loadContext(); }, [loadContext]);
  useEffect(() => { void verifyTransaction(); }, [verifyTransaction]);

  const milestones = contract?.milestones ?? [];
  const payableMilestones = milestones.filter(isPayable);
  const selectedMilestone = payableMilestones.find((item) => item.id === requestedMilestoneId) ?? payableMilestones[0] ?? null;
  const transactionMilestone = milestones.find((item) => item.id === transaction?.milestoneId) ?? null;

  const startPayment = async (milestone: PaymentMilestoneResponse | null) => {
    if (paymentInFlight.current) return;
    if (!milestone || !projectId) {
      setPaymentError('There is no invoiced milestone available for payment.');
      return;
    }
    paymentInFlight.current = true;
    setCreatingPayment(true);
    setPaymentError('');
    try {
      const response = await paymentService.createMilestonePayment(milestone.id);
      window.sessionStorage.setItem('archsync-payos-project-id', projectId);
      window.sessionStorage.setItem('archsync-payos-milestone-id', milestone.id);
      window.sessionStorage.setItem('archsync-payos-transaction-id', response.transaction.id);
      if (!response.checkoutUrl) throw new Error('The server did not return a PayOS checkout URL.');
      window.location.assign(response.checkoutUrl);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';
      setPaymentError(code === 'PAYMENT_GATEWAY_NOT_CONFIGURED'
        ? 'PayOS is not configured in the backend environment. Set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY, then restart the backend.'
        : code === 'PAYMENT_GATEWAY_ERROR'
          ? 'The backend could not create a PayOS checkout link. Check the backend logs and PayOS configuration.'
          : error instanceof Error ? error.message : 'Could not create the PayOS payment link.');
    } finally { paymentInFlight.current = false; setCreatingPayment(false); }
  };

  const transactionStatus = transaction?.status;
  const resultTitle = transactionStatus === 'SUCCESS' ? 'Payment successful'
    : transactionStatus === 'FAILED' ? 'Payment failed'
      : transactionStatus === 'PENDING' ? 'Payment is being confirmed' : 'Checking payment';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
          <Logo size={34} to="/homeowner/projects" />
          <Link to="/homeowner/projects" className="text-sm font-semibold text-blue-700 hover:text-blue-900">My projects</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-7 lg:px-8 lg:py-10">
        {transactionId ? (
          <>
            <Link to={projectId ? `/homeowner/payments?projectId=${encodeURIComponent(projectId)}` : '/homeowner/projects'} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft size={16} /> Back to payment schedule</Link>
            <section className="mx-auto mt-7 max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-8 text-center sm:px-10">
                <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${transactionStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : transactionStatus === 'FAILED' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                  {transactionStatus === 'SUCCESS' ? <CheckCircle2 size={32} /> : transactionStatus === 'FAILED' ? <XCircle size={32} /> : <Clock3 size={32} />}
                </span>
                <p className="mt-5 text-sm font-semibold text-slate-500">PayOS payment result</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{resultTitle}</h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">{transactionLoading ? 'Retrieving transaction status…' : transactionError || (transaction ? `Status confirmed by the server: ${transactionStatusLabel[transaction.status]}.` : 'Could not retrieve transaction data.')}</p>
              </div>
              {transaction && <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-blue-700"><Building2 size={19} /></span><div><p className="text-sm font-bold">{project?.title ?? 'Project details'}</p><p className="mt-0.5 text-xs text-slate-500">{contract?.contractNo ?? 'Contract'}</p></div></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${transactionStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-800' : transactionStatus === 'FAILED' ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'}`}>{transactionStatusLabel[transaction.status]}</span></div>
                <dl className="mt-5 divide-y divide-slate-100 text-sm">
                  <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Amount</dt><dd className="font-bold tabular-nums">{formatVnd(transaction.amount)}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Milestone</dt><dd className="text-right font-medium">{transactionMilestone?.name ?? transaction.milestoneId}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Transaction ID</dt><dd className="break-all text-right font-mono text-xs font-semibold">{transaction.id}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">PayOS order code</dt><dd className="font-mono text-xs font-semibold">{transaction.gatewayTxnRef ?? '—'}</dd></div>
                  {transaction.completedAt && <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Completed at</dt><dd className="font-medium">{new Date(transaction.completedAt).toLocaleString('en-GB')}</dd></div>}
                </dl>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {transaction.status === 'PENDING' && <button type="button" disabled={transactionLoading} onClick={() => void verifyTransaction()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><RefreshCw size={16} /> Check status again</button>}
                  <Link to={projectId ? `/homeowner/projects/${encodeURIComponent(projectId)}` : '/homeowner/projects'} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">View project <ArrowRight size={16} /></Link>
                </div>
              </div>}
            </section>
          </>
        ) : (
          <>
            <Link to={projectId ? `/homeowner/projects/${encodeURIComponent(projectId)}` : '/homeowner/projects'} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft size={16} /> Back to project</Link>
            <div className="mt-5"><p className="text-sm font-semibold text-blue-700">Contract · Payment schedule</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Project payments</h1><p className="mt-2 text-sm leading-6 text-slate-600">Project, contract, and payment milestone details are loaded directly from the API.</p></div>

            {contextLoading ? <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading project and contract…</div>
              : contextError ? <div role="alert" className="mt-7 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{contextError}</div>
                : !projectId ? <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Open this page from a specific project to load its contract and payment schedule.</div>
                  : !contract || !project ? <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 text-center"><FileText className="mx-auto text-slate-300" size={34} /><h2 className="mt-3 font-bold">No contract available for this project</h2><p className="mt-1 text-sm text-slate-500">The contract will appear here after it is sent to the homeowner.</p></div>
                    : <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
                      <div className="space-y-5">
                        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                          <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><FileText size={21} /></span><div><h2 className="text-lg font-bold">{contract.contractNo}</h2><p className="mt-0.5 text-sm text-slate-500">{contract.status} · {contract.esignStatus}</p></div></div>
                          <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Project</dt><dd className="mt-1 text-sm font-semibold">{project.title}</dd></div><div><dt className="text-xs text-slate-500">Home</dt><dd className="mt-1 text-sm font-semibold">{project.apartment ? `${project.apartment.buildingName} · ${project.apartment.address}` : 'Not assigned'}</dd></div><div><dt className="text-xs text-slate-500">Total contract fee</dt><dd className="mt-1 text-sm font-semibold">{formatVnd(contract.totalDesignFee)}</dd></div><div><dt className="text-xs text-slate-500">Signed date</dt><dd className="mt-1 text-sm font-semibold">{contract.signedDate ? new Date(`${contract.signedDate}T00:00:00`).toLocaleDateString('en-GB') : 'Not signed'}</dd></div></dl>
                        </section>
                        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Payment milestones</h2><p className="mt-1 text-sm text-slate-500">Based on the contract payment schedule.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{payableMilestones.length} payable</span></div>
                          <div className="mt-5 space-y-3">{milestones.map((milestone) => <div key={milestone.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${selectedMilestone?.id === milestone.id ? 'border-blue-200 bg-blue-50/60' : 'border-slate-100 bg-slate-50'}`}>
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${selectedMilestone?.id === milestone.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}>{milestone.seqNo}</span>
                            <div className="min-w-0 flex-1"><p className="text-sm font-bold">{milestone.name}</p><p className="mt-0.5 text-xs text-slate-500">{milestone.stageType} · {milestone.dueTrigger}{milestone.dueDate ? ` · Due ${milestone.dueDate}` : ''}</p></div>
                            <div className="text-left sm:text-right"><b className="text-sm tabular-nums">{formatVnd(milestone.amount)}</b><span className={`mt-1 block rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[milestone.status]}`}>{milestoneStatusLabel[milestone.status]}</span></div>
                            {isPayable(milestone) && <button type="button" disabled={creatingPayment} onClick={() => void startPayment(milestone)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{creatingPayment ? 'Creating payment link…' : 'Pay now'}</button>}
                          </div>)}</div>
                        </section>
                      </div>
                      <aside className="sticky top-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="text-lg font-bold">Payment summary</h2>
                        {selectedMilestone ? <><div className="mt-5 flex justify-between gap-3 text-sm"><span className="text-slate-500">Milestone</span><span className="font-semibold">{selectedMilestone.name}</span></div><div className="mt-3 flex items-end justify-between gap-3 border-b border-slate-100 pb-5"><span className="text-sm text-slate-500">Amount due</span><strong className="text-2xl tabular-nums">{formatVnd(selectedMilestone.amount)}</strong></div><button type="button" disabled={creatingPayment} onClick={() => void startPayment(selectedMilestone)} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"><CreditCard size={17} /> {creatingPayment ? 'Creating PayOS link…' : 'Pay now'} <ArrowRight size={16} /></button></>
                          : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No invoiced or overdue milestones are available for payment.</p>}
                        {paymentError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{paymentError}</p>}
                        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400"><ShieldCheck size={14} /> Payment links are provided by PayOS</p>
                      </aside>
                    </div>}
          </>
        )}
      </main>
    </div>
  );
}

export default HomeownerPayments;
