import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  Undo2,
  Upload,
} from 'lucide-react';
import { t } from '@/i18n';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { ApiError, getCurrentUser, logout } from '@/services/authService';
import type { UserRole } from '@/types/role';
import { Button, Modal } from '@/components/ui';
import { ContractPaymentHistory } from '@/features/payments/ContractPaymentHistory';
import {
  CONTRACT_FILE_MAX_BYTES,
  getContractFileBlob,
  formatVnd,
  getProjectContract,
  isUuid,
  saveBlobAs,
  requestSignatureOtp,
  sendSigningRequest,
  submitContractSignature,
  uploadContractFile,
  withdrawSigningRequest,
  type ContractResponse,
  type ContractStatus,
  type EsignStatus,
  type MilestoneStatus,
} from './services/contractsApi';

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_BADGE: Record<ContractStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-700',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

const ESIGN_LABEL: Record<EsignStatus, string> = {
  NOT_SENT: 'Not sent for signature',
  AWAITING_CUSTOMER: 'Awaiting customer signature',
  SIGNED: 'Signed',
};

const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  PENDING: 'Not yet due',
  INVOICED: 'Invoiced',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

const MILESTONE_STATUS_BADGE: Record<MilestoneStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  INVOICED: 'bg-amber-50 text-amber-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

/** Seconds before the customer may ask for another OTP (backend OTP_RESEND_TOO_SOON window). */
const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** 125 → "2:05". */
function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const AMOUNT_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Format a backend amount from error details (string or number) for the mismatch toast. */
function formatAmount(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? AMOUNT_FORMATTER.format(n) : String(value ?? '?');
}

/** Shared page chrome for every branch below (loading / empty / error / loaded). */
const Shell: React.FC<{ role?: UserRole; backTo?: string; children: React.ReactNode }> = ({ role, backTo, children }) => (
  <div className="min-h-screen bg-sand-50/60 font-sans flex flex-col justify-between">
    <Header role={role} />
    <main className="w-full max-w-[1100px] mx-auto px-6 lg:px-12 py-10 flex-1">
      {backTo && <Link to={backTo} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-text hover:text-dark"><ArrowLeft size={16} /> Back to project</Link>}
      {children}
    </main>
    <Footer />
  </div>
);

export const ContractDetail: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectId = params.get('projectId') ?? '';
  const role = getCurrentUser()?.role;
  const isStaff = role === 'staff';
  /** "Khách hàng" theo tài liệu BE = role homeowner trong hệ thống này. */
  const isCustomer = role === 'homeowner';
  const backToProject = projectId
    ? `${role === 'staff' || role === 'admin' ? '/staff/projects' : role === 'designer' ? '/designer/projects' : '/homeowner/projects'}/${encodeURIComponent(projectId)}`
    : role === 'staff' || role === 'admin' ? '/staff/projects' : role === 'designer' ? '/designer/projects' : '/homeowner/projects';
  /** Arrived straight from "Create contract draft": upload the PDF, then go back to the project. */
  const uploadThenBack = isStaff && params.get('next') === 'upload' && projectId !== '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contract, setContract] = useState<ContractResponse | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // OTP ký hợp đồng (customer).
  /** Epoch ms when the latest OTP stops being valid; null = no OTP requested yet. */
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  /** Epoch ms until which "Resend" stays locked. */
  const [otpCooldownUntil, setOtpCooldownUntil] = useState(0);
  const [otpValue, setOtpValue] = useState('');
  const [otpRequesting, setOtpRequesting] = useState(false);
  const otpInFlight = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  /**
   * The server refused a new OTP as too soon (429) while this page knew of none: a code was sent moments ago (before a
   * reload, or from another tab) and is still valid, so the code box is shown without a known expiry.
   */
  const [otpEarlier, setOtpEarlier] = useState(false);

  // Remember the OTP timers for this contract across reloads in this tab, so a reload doesn't hide the code box.
  const otpKey = (contractId: string) => `contract-otp:${contractId}`;
  const saveOtpTimers = (contractId: string, timers: { expiresAt: number; cooldownUntil: number } | null) => {
    try {
      if (timers) sessionStorage.setItem(otpKey(contractId), JSON.stringify(timers));
      else sessionStorage.removeItem(otpKey(contractId));
    } catch { /* storage blocked: the timers just don't survive a reload */ }
  };
  const awaitingCustomerId = contract?.esignStatus === 'AWAITING_CUSTOMER' && isCustomer ? contract.id : null;
  useEffect(() => {
    if (!awaitingCustomerId) return;
    let saved: { expiresAt?: unknown; cooldownUntil?: unknown } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(otpKey(awaitingCustomerId)) ?? 'null');
    } catch { /* unreadable: start without timers */ }
    const start = Date.now();
    if (!saved || typeof saved.expiresAt !== 'number' || saved.expiresAt <= start) return;
    const { expiresAt, cooldownUntil } = saved;
    Promise.resolve().then(() => {
      setNow(start);
      setOtpExpiresAt(expiresAt);
      if (typeof cooldownUntil === 'number') setOtpCooldownUntil(cooldownUntil);
    });
  }, [awaitingCustomerId]);

  // Tick once a second only while a countdown is running.
  const timersRunning = otpCooldownUntil > now || (otpExpiresAt !== null && otpExpiresAt > now);
  useEffect(() => {
    if (!timersRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timersRunning]);

  // Contract PDF upload (Staff, DRAFT + NOT_SENT).
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Send signing request (Staff, DRAFT + NOT_SENT + PDF uploaded).
  const [confirmSigning, setConfirmSigning] = useState(false);
  const [sendingSigning, setSendingSigning] = useState(false);
  /** Synchronous guard: state updates are async, so a fast double click could fire two POSTs. */
  const signingInFlight = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadContract = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getProjectContract(projectId);
      // Customers only see a contract once it has been sent for signing.
      setContract(isCustomer && result?.esignStatus === 'NOT_SENT' ? null : result);
    } catch (err) {
      setContract(null);
      const code = err instanceof ApiError ? err.code : '';
      setLoadError(
        code === 'PROJECT_NOT_FOUND' ? t('contractPage.projectNotFound')
          : code === 'INSUFFICIENT_ROLE' ? t('contractPage.noPermission')
            : code === 'BAD_REQUEST' ? t('contractPage.invalidProjectId')
              : err instanceof ApiError ? err.message : t('contractPage.loadFailed'),
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, isCustomer]);

  /** Refresh milestone statuses after a payment re-check, without the full-page loading state. */
  const refreshContractQuietly = useCallback(() => {
    getProjectContract(projectId)
      .then((result) => setContract(isCustomer && result?.esignStatus === 'NOT_SENT' ? null : result))
      .catch(() => { /* keep what is on screen; the transaction section shows its own state */ });
  }, [projectId, isCustomer]);

  useEffect(() => {
    if (!isUuid(projectId)) {
      setLoading(false);
      setLoadError(t('contractPage.invalidProjectId'));
      return;
    }
    void loadContract();
  }, [projectId, loadContract]);

  /** File fetches report failures as a red toast (the error text is already localized). */
  const runFileAction = async (action: () => Promise<void>) => {
    setActionError(null);
    setActionMessage(null);
    setActionBusy(true);
    try {
      await action();
    } catch (err) {
      setToast({ type: 'error', message: err instanceof ApiError ? err.message : t('contractPage.fileLoadFailed') });
    } finally {
      setActionBusy(false);
    }
  };

  const handleDownload = (contractId: string) => runFileAction(async () => {
    const blob = await getContractFileBlob(contractId);
    saveBlobAs(blob, `${contract?.contractNo ?? contractId}.pdf`); // the save dialog is the feedback
  });

  // PDF viewer: the blob URL lives only while the modal is open and is revoked on close/unmount.
  const [pdfViewer, setPdfViewer] = useState<{ url: string; fileName: string; blob: Blob; version: string } | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const closePdfViewer = useCallback(() => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    pdfUrlRef.current = null;
    setPdfViewer(null);
  }, []);
  useEffect(() => () => { if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current); }, []);
  // The served file depends on signing state and uploads: close a stale viewer when either changes.
  const fileVersion = `${contract?.esignStatus ?? ''}|${contract?.unsignedFile?.hash ?? ''}`;
  const viewerOpen = pdfViewer !== null && pdfViewer.version === fileVersion;
  useEffect(() => {
    if (pdfViewer && pdfViewer.version !== fileVersion && pdfUrlRef.current) { URL.revokeObjectURL(pdfUrlRef.current); pdfUrlRef.current = null; }
  }, [pdfViewer, fileVersion]);

  const handleView = (contractId: string) => runFileAction(async () => {
    const blob = await getContractFileBlob(contractId);
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    pdfUrlRef.current = url;
    setPdfViewer({ url, fileName: `${contract?.contractNo ?? contractId}.pdf`, blob, version: fileVersion });
  });

  const handleSendSigningRequest = async (contractId: string) => {
    if (signingInFlight.current) return;
    signingInFlight.current = true;
    setSendingSigning(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const updated = await sendSigningRequest(contractId);
      if (uploadThenBack) {
        navigate(backToProject, { replace: true, state: { toast: { tone: 'success', message: t('contractSigning.successBack') } } });
        return;
      }
      setContract(updated);
      setConfirmSigning(false);
      setToast({ type: 'success', message: t('contractSigning.success') });
      await loadContract();
    } catch (err) {
      setConfirmSigning(false);
      const apiErr = err instanceof ApiError ? err : null;
      const code = apiErr?.code ?? '';
      const fail = (message: string) => setToast({ type: 'error', message });
      if (code === 'INVALID_ESIGN_STATUS_TRANSITION') {
        // Usually a double submit or a stale page: the request is already out, so just sync the UI.
        setToast({ type: 'success', message: t('contractSigning.alreadySent') });
        await loadContract();
      } else if (code === 'NOT_PROJECT_STAFF') fail(t('contractSigning.notProjectStaff'));
      else if (code === 'CONTRACT_NOT_FOUND') fail(t('contractSigning.notFound'));
      else if (code === 'CONTRACT_FILE_MISSING') fail(t('contractSigning.fileMissing'));
      else if (code === 'INVALID_MILESTONES') {
        const message = apiErr?.messages[0] ?? apiErr?.message ?? t('errors.unknownNoCode');
        setActionError(message);
        fail(message);
      } else if (code === 'MILESTONE_TOTAL_MISMATCH') {
        const details = apiErr?.details ?? {};
        fail(t('contractSigning.totalMismatch', {
          milestonesTotal: formatAmount(details.milestonesTotal),
          totalDesignFee: formatAmount(details.totalDesignFee),
        }));
      } else if (code === 'CONTRACT_NOT_DRAFT') {
        fail(t('contractSigning.notDraft'));
        await loadContract();
      } else fail(apiErr?.message ?? t('errors.unknownNoCode'));
    } finally {
      signingInFlight.current = false;
      setSendingSigning(false);
    }
  };

  const [confirmRecall, setConfirmRecall] = useState(false);
  const [recalling, setRecalling] = useState(false);
  /** Synchronous guard against a double click firing two DELETEs. */
  const recallInFlight = useRef(false);

  const handleWithdrawSigning = async (contractId: string) => {
    if (recallInFlight.current) return;
    recallInFlight.current = true;
    setRecalling(true);
    try {
      await withdrawSigningRequest(contractId);
      setConfirmRecall(false);
      setToast({ type: 'success', message: t('contractPage.recallSuccess') });
      await loadContract();
    } catch (err) {
      setConfirmRecall(false);
      const apiErr = err instanceof ApiError ? err : null;
      const code = apiErr?.code ?? '';
      if (code === 'INVALID_ESIGN_STATUS_TRANSITION' && apiErr?.details.from === 'NOT_SENT') {
        // Already recalled (e.g. a retry): just sync the UI.
        await loadContract();
      } else {
        const message =
          code === 'INVALID_ESIGN_STATUS_TRANSITION' ? t('contractPage.recallNotPending')
            : code === 'CONTRACT_NOT_DRAFT' ? t('contractPage.recallNotDraft')
              : code === 'CONTRACT_NOT_FOUND' ? t('contractPage.recallNotFound')
                : code === 'INSUFFICIENT_ROLE' || code === 'NOT_PROJECT_STAFF' ? t('contractPage.recallNotStaff')
                  : apiErr?.message ?? t('errors.unknownNoCode');
        setToast({ type: 'error', message });
        if (code === 'INVALID_ESIGN_STATUS_TRANSITION' || code === 'CONTRACT_NOT_DRAFT') await loadContract();
      }
    } finally {
      recallInFlight.current = false;
      setRecalling(false);
    }
  };

  const handleUpload = async (contractId: string, file: File) => {
    setFileError('');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) { setFileError(t('contractFile.onlyPdf')); return; }
    if (file.size > CONTRACT_FILE_MAX_BYTES) { setFileError(t('contractFile.tooLarge')); return; }

    setUploading(true);
    try {
      const updated = await uploadContractFile(contractId, file);
      setContract(updated);
      setToast({ type: 'success', message: t('contractFile.success') });
      await loadContract();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      if (code === 'VALIDATION_ERROR') setFileError(t('contractFile.invalidSelection'));
      else if (code === 'INVALID_PDF_FILE') {
        const message = (err as ApiError).messages[0] ?? t('contractFile.invalidPdf');
        setFileError(message);
        setToast({ type: 'error', message });
      } else if (code === 'NOT_PROJECT_STAFF') setToast({ type: 'error', message: t('contractFile.notProjectStaff') });
      else if (code === 'CONTRACT_NOT_FOUND') setToast({ type: 'error', message: t('contractFile.notFound') });
      else if (code === 'CONTRACT_NOT_EDITABLE') {
        setToast({ type: 'error', message: t('contractFile.notEditable') });
        await loadContract();
      } else setToast({ type: 'error', message: err instanceof ApiError ? err.message : t('errors.unknownNoCode') });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const startCooldown = (seconds: number) => {
    const start = Date.now();
    setNow(start);
    setOtpCooldownUntil(start + seconds * 1000);
  };

  const handleSendOtp = async (contractId: string) => {
    if (otpInFlight.current) return;
    otpInFlight.current = true;
    setOtpRequesting(true);
    setActionError(null);
    setActionMessage(null);
    const fail = (message: string) => setToast({ type: 'error', message });
    try {
      const { expiresInMinutes } = await requestSignatureOtp(contractId);
      const start = Date.now();
      setNow(start);
      setOtpExpiresAt(start + expiresInMinutes * 60_000);
      setOtpCooldownUntil(start + OTP_RESEND_COOLDOWN_SECONDS * 1000);
      saveOtpTimers(contractId, { expiresAt: start + expiresInMinutes * 60_000, cooldownUntil: start + OTP_RESEND_COOLDOWN_SECONDS * 1000 });
      setOtpEarlier(false);
      setOtpValue('');
      setToast({ type: 'success', message: t('contractPage.otpSent') });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const code = apiErr?.code ?? '';
      const status = apiErr?.status ?? 0;
      if (code === 'OTP_RESEND_TOO_SOON' || status === 429) {
        const retry = Number(apiErr?.details.retryAfterSeconds);
        startCooldown(Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : OTP_RESEND_COOLDOWN_SECONDS);
        // a code went out moments ago and is still valid: let the customer enter it
        if (otpExpiresAt === null) setOtpEarlier(true);
        setToast({ type: 'warning', message: t(otpExpiresAt === null ? 'contractPage.otpUseEarlier' : 'contractPage.otpTooSoon') });
      } else if (code === 'CONTRACT_NOT_AWAITING_SIGNATURE' && status === 422) {
        fail(t('contractPage.otpNotAwaiting'));
        setOtpExpiresAt(null);
        setOtpEarlier(false);
        saveOtpTimers(contractId, null);
        await loadContract();
      } else if (code === 'CONTRACT_NOT_AWAITING_SIGNATURE') fail(t('signatureOtp.notAwaitingState'));
      else if (code === 'USER_NOT_FOUND') {
        fail(t('signatureOtp.userNotFound'));
        window.setTimeout(() => { void logout().finally(() => window.location.replace('/login')); }, 2000);
      } else if (code === 'CONTRACT_NOT_FOUND' || status === 404) fail(t('contractPage.otpNotFound'));
      else if (code === 'INSUFFICIENT_ROLE' || status === 403) fail(t('contractPage.otpNotCustomer'));
      else if (status >= 500) {
        fail(t('contractPage.otpEmailFailed'));
        startCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      } else fail(apiErr?.message || t('errors.unknownNoCode'));
    } finally {
      otpInFlight.current = false;
      setOtpRequesting(false);
    }
  };

  const signInFlight = useRef(false);

  const handleSign = async (contractId: string) => {
    const otp = otpValue.trim();
    if (signInFlight.current || !/^\d{6}$/.test(otp)) return;
    signInFlight.current = true;
    setActionError(null);
    setActionMessage(null);
    setActionBusy(true);
    try {
      // The OTP stays a string so a leading zero is never lost.
      const updated = await submitContractSignature(contractId, { otp });
      setContract(updated);
      setOtpExpiresAt(null);
      setOtpEarlier(false);
      saveOtpTimers(contractId, null);
      setOtpValue('');
      setToast({ type: 'success', message: t('contractPage.signSuccess') });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const code = apiErr?.code ?? '';
      const fail = (message: string) => setToast({ type: 'error', message });
      if (code === 'OTP_INVALID') {
        const left = Number(apiErr?.details.remainingAttempts);
        fail(apiErr?.details.remainingAttempts !== undefined && Number.isFinite(left)
          ? t('contractPage.otpInvalidWithAttempts', { count: left })
          : t('contractPage.otpInvalid'));
      } else if (code === 'OTP_TOO_MANY_ATTEMPTS') fail(t('contractPage.otpTooManyAttempts'));
      else if (code === 'OTP_EXPIRED') fail(t('contractPage.otpExpired'));
      else if (code === 'CONTRACT_FILE_TAMPERED') fail(t('contractPage.fileTampered'));
      else if (code === 'CONTRACT_ALREADY_SIGNED') {
        setToast({ type: 'warning', message: t('contractPage.alreadySigned') });
        await loadContract();
      } else fail(apiErr?.message || t('errors.unknownNoCode'));
    } finally {
      signInFlight.current = false;
      setActionBusy(false);
    }
  };

  // ---------------------------------------------------------------------
  // Loading / error states (not yet known whether a contract exists)
  // ---------------------------------------------------------------------

  if (loading) {
    return (
      <Shell role={role} backTo={backToProject}>
        <div className="flex items-center justify-center gap-2 py-20 text-sm font-semibold text-slate-500">
          <Loader2 size={18} className="animate-spin" /> Loading contract details…
        </div>
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell role={role} backTo={backToProject}>
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
          <div>
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void loadContract()}
              className="mt-2 text-xs font-bold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------------------------------------------------------------------
  // Dự án chưa có hợp đồng (404 CONTRACT_NOT_FOUND -> null)
  // ---------------------------------------------------------------------

  if (!contract) {
    if (isStaff) {
      // Staff create the contract from the project page (modal), so there is one creation form only.
      return (
        <Shell role={role} backTo={backToProject}>
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-surface py-20 text-center">
            <FileText size={32} className="text-slate-300" />
            <p className="text-sm font-bold text-slate-700">{t('contractPage.noContractTitle')}</p>
            <p className="max-w-sm text-xs text-slate-500">{t('contractPage.noContractStaff')}</p>
          </div>
        </Shell>
      );
    }

    return (
      <Shell role={role} backTo={backToProject}>
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-surface py-20 text-center">
          <FileText size={32} className="text-slate-300" />
          <p className="text-sm font-bold text-slate-700">{t('contractPage.notAvailableTitle')}</p>
          <p className="max-w-sm text-xs text-slate-500">{t('contractPage.notAvailableHint')}</p>
        </div>
      </Shell>
    );
  }

  // ---------------------------------------------------------------------
  // Đã có hợp đồng — UI theo (status, esignStatus, role)
  // ---------------------------------------------------------------------

  const { status, esignStatus } = contract;
  const showMilestones = status === 'ACTIVE' && esignStatus === 'SIGNED';
  // Payments only exist once the contract is active; a completed contract keeps its history.
  const showTransactions = role !== 'designer' && (showMilestones || status === 'COMPLETED');
  const canDownloadSignedFile = esignStatus === 'SIGNED' || contract.signedFile !== null;
  const cooldownLeft = Math.max(0, Math.ceil((otpCooldownUntil - now) / 1000));
  const otpSecondsLeft = otpExpiresAt === null ? null : Math.max(0, Math.ceil((otpExpiresAt - now) / 1000));
  const otpExpired = otpSecondsLeft === 0;
  const otpButtonLabel = otpRequesting
    ? t('signatureOtp.sending')
    : cooldownLeft > 0 ? t('signatureOtp.resendIn', { seconds: cooldownLeft }) : null;

  const canSendSigning = status === 'DRAFT' && esignStatus === 'NOT_SENT' && contract.unsignedFile !== null;

  return (
    <Shell role={role} backTo={backToProject}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">Contract {contract.contractNo}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Total design fee: <span className="font-semibold text-ink">{formatVnd(contract.totalDesignFee)}</span>
          </p>
          <p className="mt-0.5 text-sm text-slate-500" title={t('newContract.maxRevisionsTooltip')}>
            {t('contractPage.maxRevisions', { n: contract.maxRevisionsPerStage })}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{ESIGN_LABEL[esignStatus]}</span>
        </div>
      </div>

      {pdfViewer && viewerOpen && (
        <Modal
          size="lg"
          title={pdfViewer.fileName}
          onClose={closePdfViewer}
          footer={(
            <>
              <Button variant="secondary" onClick={closePdfViewer}>{t('common.close')}</Button>
              <Button variant="primary" onClick={() => saveBlobAs(pdfViewer.blob, pdfViewer.fileName)}>{t('contractFile.downloadPdf')}</Button>
            </>
          )}
        >
          <iframe src={pdfViewer.url} title={pdfViewer.fileName} className="h-[70vh] w-full rounded-lg border border-line" />
        </Modal>
      )}

      {confirmSigning && (
        <Modal
          title={t('contractSigning.confirmTitle')}
          onClose={() => { if (!sendingSigning) setConfirmSigning(false); }}
          footer={(
            <>
              <Button variant="secondary" disabled={sendingSigning} onClick={() => setConfirmSigning(false)}>
                {t('contractSigning.cancel')}
              </Button>
              <Button variant="primary" loading={sendingSigning} onClick={() => void handleSendSigningRequest(contract.id)}>
                {sendingSigning ? t('contractSigning.sending') : t('contractSigning.confirm')}
              </Button>
            </>
          )}
        >
          <p className="text-sm text-slate-600">{t('contractSigning.confirmBody')}</p>
        </Modal>
      )}

      {confirmRecall && (
        <Modal
          title={t('contractPage.recallConfirmTitle')}
          onClose={() => { if (!recalling) setConfirmRecall(false); }}
          footer={(
            <>
              <Button variant="secondary" disabled={recalling} onClick={() => setConfirmRecall(false)}>
                {t('contractPage.recallCancel')}
              </Button>
              <Button variant="primary" loading={recalling} onClick={() => void handleWithdrawSigning(contract.id)}>
                {recalling ? t('contractPage.recalling') : t('contractPage.recallConfirm')}
              </Button>
            </>
          )}
        >
          <p className="text-sm text-slate-600">{t('contractPage.recallConfirmBody')}</p>
        </Modal>
      )}

      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`fixed right-4 top-20 z-[80] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
              : toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      {actionMessage && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}
      {actionError && (
        <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {contract.note && (
        <div className="mb-6 rounded-xl border border-line bg-surface p-4 text-sm text-slate-600">
          <span className="font-bold text-ink">Note: </span>{contract.note}
        </div>
      )}

      {uploadThenBack && status === 'DRAFT' && esignStatus === 'NOT_SENT' && (
        <div role="status" className="mb-6 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          {contract.unsignedFile
            ? <span><span className="font-semibold">{t('contractPage.pdfReadyTitle')}</span> {t('contractPage.pdfReadyNext')}</span>
            : <span><span className="font-semibold">{t('contractPage.draftCreatedTitle')}</span> {t('contractPage.draftCreatedNext')}</span>}
        </div>
      )}

      {/* ---- DRAFT + NOT_SENT: Staff soạn hợp đồng, chưa gửi khách ký ---- */}
      {status === 'DRAFT' && esignStatus === 'NOT_SENT' && isStaff && (
        <section className="mb-6 rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`/staff-edit-contract?contractId=${encodeURIComponent(contract.id)}`)}
              className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-sand-50"
            >
              Edit contract
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-sand-50 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? t('contractFile.uploading') : contract.unsignedFile ? t('contractFile.replace') : t('contractFile.upload')}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(contract.id, file);
              }}
            />
            {/* Wrapper carries the tooltip: disabled buttons don't fire hover events in every browser. */}
            <span title={contract.unsignedFile ? undefined : t('contractSigning.needFile')} className="inline-flex">
              <button
                type="button"
                disabled={!canSendSigning || actionBusy || uploading || sendingSigning}
                onClick={() => setConfirmSigning(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-hover disabled:opacity-50"
              >
                {sendingSigning ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {sendingSigning ? t('contractSigning.sending') : t('contractSigning.send')}
              </button>
            </span>
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-xs font-bold text-ink">{t('contractFile.title')}</h3>
            {contract.unsignedFile ? (
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2"><FileText size={14} className="text-subtext" />{t('contractFile.current', { name: contract.unsignedFile.fileName })}</span>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleView(contract.id)}
                  className="text-xs font-semibold text-brand-text hover:underline"
                >
                  {t('contractFile.view')}
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t('contractFile.none')}</p>
            )}
            {fileError && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{fileError}</p>}
            <p className="mt-2 text-[11px] text-subtext">{t('contractFile.helper')}</p>
          </div>
        </section>
      )}

      {/* ---- DRAFT + AWAITING_CUSTOMER ---- */}
      {status === 'DRAFT' && esignStatus === 'AWAITING_CUSTOMER' && isStaff && (
        <section className="mb-6 rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">Actions</h2>
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => setConfirmRecall(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-sand-50 disabled:opacity-50"
          >
            <Undo2 size={14} /> {t('contractPage.recallButton')}
          </button>
        </section>
      )}

      {status === 'DRAFT' && esignStatus === 'AWAITING_CUSTOMER' && isCustomer && (
        <section className="mb-6 rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">Sign contract</h2>

          {contract.unsignedFile && (
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void handleView(contract.id)}
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-sand-50 disabled:opacity-50"
            >
              <FileText size={14} /> View contract PDF ({contract.unsignedFile.fileName})
            </button>
          )}

          {otpExpiresAt === null && !otpEarlier ? (
            <>
              <button
                type="button"
                disabled={actionBusy || otpRequesting || cooldownLeft > 0}
                onClick={() => void handleSendOtp(contract.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-hover disabled:opacity-50"
              >
                {otpRequesting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {otpButtonLabel ?? t('signatureOtp.request')}
              </button>
              {contract.unsignedFile && <p className="mt-2 text-[11px] text-subtext">{t('signatureOtp.previewFirst')}</p>}
            </>
          ) : (
            <>
            <p className="mb-1 text-[11px] text-slate-500">{t(otpExpiresAt === null ? 'signatureOtp.earlierNotice' : 'signatureOtp.sentNotice')}</p>
            <p className="mb-3 text-[11px] text-slate-500">{t('signatureOtp.attemptsNotice')}</p>
            {otpExpired && <p role="alert" className="mb-3 text-xs font-semibold text-red-700">{t('signatureOtp.expired')}</p>}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-slate-500">
                  {otpSecondsLeft === null ? t('signatureOtp.codeLabel') : t('signatureOtp.validFor', { time: formatCountdown(otpSecondsLeft) })}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  disabled={otpExpired}
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="w-32 rounded-xl border border-control bg-sand-100 px-3 py-2 text-sm font-semibold tracking-widest text-ink focus:outline-none focus:ring-2 focus-visible:ring-brand"
                />
              </div>
              <button
                type="button"
                disabled={actionBusy || otpExpired || otpValue.trim().length !== 6}
                onClick={() => void handleSign(contract.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShieldCheck size={14} /> Confirm signature
              </button>
              <button
                type="button"
                disabled={actionBusy || otpRequesting || cooldownLeft > 0}
                onClick={() => void handleSendOtp(contract.id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
              >
                {otpRequesting && <Loader2 size={12} className="animate-spin" />}
                {otpButtonLabel ?? t('signatureOtp.resend')}
              </button>
            </div>
            </>
          )}
        </section>
      )}

      {/* ---- ACTIVE + SIGNED: cả hai bên tải file đã ký + bảng milestones ---- */}
      {canDownloadSignedFile && (status === 'ACTIVE' || status === 'COMPLETED') && (
        <section className="mb-6 rounded-2xl border border-line bg-surface p-6">
          <button
            type="button"
            disabled={actionBusy || !(contract.unsignedFile || contract.signedFile)}
            title={contract.unsignedFile || contract.signedFile ? undefined : t('contractPage.noPdfYet')}
            onClick={() => void handleDownload(contract.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-sand-50 disabled:opacity-50"
          >
            <Download size={14} /> Download signed contract PDF
          </button>
        </section>
      )}

      {showMilestones && (
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">Payment milestones</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wide text-subtext">
                  <th className="px-3 py-2">Milestone</th>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contract.milestones.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-3 font-semibold text-ink">{m.name}</td>
                    <td className="px-3 py-3 text-slate-600">{m.stageType}</td>
                    <td className="px-3 py-3 font-semibold text-ink">{formatVnd(m.amount)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${MILESTONE_STATUS_BADGE[m.status]}`}>
                        {MILESTONE_STATUS_LABEL[m.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {isCustomer && (m.status === 'INVOICED' || m.status === 'OVERDUE') && (
                        <button
                          type="button"
                          onClick={() => navigate(`/homeowner/payments?projectId=${encodeURIComponent(projectId)}&milestoneId=${encodeURIComponent(m.id)}`)}
                          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-hover"
                        >
                          Pay now
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </section>
      )}

      {/* GET /contracts/:id/payment-transactions: CUSTOMER/STAFF/ADMIN only; designer gets no section and no request */}
      {showTransactions && (
        <ContractPaymentHistory key={contract.id} contractId={contract.id} onChanged={refreshContractQuietly} />
      )}
    </Shell>
  );
};

export default ContractDetail;
