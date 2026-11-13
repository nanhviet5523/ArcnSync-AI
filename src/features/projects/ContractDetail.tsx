import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  Undo2,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { ApiError, getCurrentUser } from '@/services/authService';
import type { UserRole } from '@/types/role';
import { CreateContract } from '@/features/staff/CreateContract';
import {
  activateContract,
  downloadContractFile,
  formatVnd,
  getProjectContract,
  isUuid,
  requestContractSigning,
  saveBlobAs,
  sendContractSignatureOtp,
  signContract,
  withdrawContractSigning,
  type ContractResponse,
  type ContractStatus,
  type EsignStatus,
  type MilestoneStatus,
} from './services/contractsApi';

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: 'Bản nháp',
  ACTIVE: 'Đang hiệu lực',
  COMPLETED: 'Đã hoàn tất',
  CANCELLED: 'Đã huỷ',
};

const STATUS_BADGE: Record<ContractStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-700',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

const ESIGN_LABEL: Record<EsignStatus, string> = {
  NOT_SENT: 'Chưa gửi ký',
  AWAITING_CUSTOMER: 'Đang chờ khách hàng ký',
  SIGNED: 'Đã ký',
};

const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  PENDING: 'Chưa đến hạn',
  INVOICED: 'Đã xuất hoá đơn',
  PAID: 'Đã thanh toán',
  OVERDUE: 'Quá hạn',
  CANCELLED: 'Đã huỷ',
};

const MILESTONE_STATUS_BADGE: Record<MilestoneStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  INVOICED: 'bg-amber-50 text-amber-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

/** Shared page chrome for every branch below (loading / empty / error / loaded). */
const Shell: React.FC<{ role?: UserRole; children: React.ReactNode }> = ({ role, children }) => (
  <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
    <Header role={role} />
    <main className="w-full max-w-[1100px] mx-auto px-6 lg:px-12 py-10 flex-1">{children}</main>
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

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contract, setContract] = useState<ContractResponse | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // OTP ký hợp đồng (customer).
  const [otpExpiresIn, setOtpExpiresIn] = useState<number | null>(null);
  const [otpValue, setOtpValue] = useState('');

  const loadContract = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getProjectContract(projectId);
      setContract(result);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được thông tin hợp đồng.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isUuid(projectId)) {
      setLoading(false);
      setLoadError('Mã dự án không hợp lệ (phải là UUID chuẩn).');
      return;
    }
    void loadContract();
  }, [projectId, loadContract]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    setActionError(null);
    setActionMessage(null);
    setActionBusy(true);
    try {
      await action();
      setActionMessage(label);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDownload = (contractId: string) => runAction('Đang tải file…', async () => {
    const { blob, fileName } = await downloadContractFile(contractId);
    saveBlobAs(blob, fileName);
    setActionMessage(null); // save dialog is the feedback; no banner needed
  });

  const handleRequestSigning = (contractId: string) => runAction('Đã gửi yêu cầu ký tới khách hàng.', async () => {
    const updated = await requestContractSigning(contractId);
    setContract(updated);
  });

  const handleWithdrawSigning = (contractId: string) => runAction('Đã rút lại yêu cầu ký.', async () => {
    await withdrawContractSigning(contractId);
    await loadContract();
  });

  const handleActivate = (contractId: string) => runAction('Đã kích hoạt hợp đồng.', async () => {
    const updated = await activateContract(contractId);
    setContract(updated);
  });

  const handleSendOtp = (contractId: string) => runAction('Đã gửi mã OTP tới email của bạn.', async () => {
    const { expiresInMinutes } = await sendContractSignatureOtp(contractId);
    setOtpExpiresIn(expiresInMinutes);
  });

  const handleSign = (contractId: string) => runAction('Ký hợp đồng thành công.', async () => {
    const updated = await signContract(contractId, otpValue.trim());
    setContract(updated);
    setOtpExpiresIn(null);
    setOtpValue('');
  });

  // ---------------------------------------------------------------------
  // Loading / error states (not yet known whether a contract exists)
  // ---------------------------------------------------------------------

  if (loading) {
    return (
      <Shell role={role}>
        <div className="flex items-center justify-center gap-2 py-20 text-sm font-semibold text-slate-500">
          <Loader2 size={18} className="animate-spin" /> Đang tải thông tin hợp đồng…
        </div>
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell role={role}>
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
          <div>
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void loadContract()}
              className="mt-2 text-xs font-bold text-red-700 underline"
            >
              Thử lại
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
      // Staff: hiển thị thẳng form tạo hợp đồng (POST), projectId đã có sẵn trên URL.
      return <CreateContract />;
    }

    return (
      <Shell role={role}>
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <FileText size={32} className="text-slate-300" />
          <p className="text-sm font-bold text-slate-700">Dự án chưa có hợp đồng</p>
          <p className="max-w-sm text-xs text-slate-500">
            Nhân viên phụ trách sẽ soạn hợp đồng cho dự án này. Vui lòng quay lại sau.
          </p>
        </div>
      </Shell>
    );
  }

  // ---------------------------------------------------------------------
  // Đã có hợp đồng — UI theo (status, esignStatus, role)
  // ---------------------------------------------------------------------

  const { status, esignStatus } = contract;
  const showMilestones = status === 'ACTIVE' && esignStatus === 'SIGNED';
  const canDownloadSignedFile = esignStatus === 'SIGNED' || contract.signedFile !== null;
  const depositMilestone = contract.milestones.find((m) => m.stageType === 'DEPOSIT');

  return (
    <Shell role={role}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hợp đồng {contract.contractNo}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tổng phí thiết kế: <span className="font-semibold text-slate-800">{formatVnd(contract.totalDesignFee)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{ESIGN_LABEL[esignStatus]}</span>
        </div>
      </div>

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
        <div className="mb-6 rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
          <span className="font-bold text-slate-800">Ghi chú: </span>{contract.note}
        </div>
      )}

      {/* ---- DRAFT + NOT_SENT: Staff soạn hợp đồng, chưa gửi khách ký ---- */}
      {status === 'DRAFT' && esignStatus === 'NOT_SENT' && isStaff && (
        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Thao tác</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`/create-contract?projectId=${encodeURIComponent(projectId)}`)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Chỉnh sửa hợp đồng
            </button>
            <button
              type="button"
              disabled
              title="Tính năng upload PDF sẽ được bổ sung sau"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed"
            >
              Upload PDF
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void handleRequestSigning(contract.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={14} /> Gửi yêu cầu ký
            </button>
          </div>
        </section>
      )}

      {/* ---- DRAFT + AWAITING_CUSTOMER ---- */}
      {status === 'DRAFT' && esignStatus === 'AWAITING_CUSTOMER' && isStaff && (
        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Thao tác</h2>
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => void handleWithdrawSigning(contract.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Undo2 size={14} /> Rút lại yêu cầu ký
          </button>
        </section>
      )}

      {status === 'DRAFT' && esignStatus === 'AWAITING_CUSTOMER' && isCustomer && (
        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Ký hợp đồng</h2>

          {contract.unsignedFile && (
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void handleDownload(contract.id)}
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FileText size={14} /> Xem file PDF hợp đồng ({contract.unsignedFile.fileName})
            </button>
          )}

          {otpExpiresIn === null ? (
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void handleSendOtp(contract.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <ShieldCheck size={14} /> Ký hợp đồng (gửi mã OTP)
            </button>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-slate-500">
                  Mã OTP (hiệu lực {otpExpiresIn} phút)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                  placeholder="123456"
                  className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="button"
                disabled={actionBusy || otpValue.trim().length !== 6}
                onClick={() => void handleSign(contract.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShieldCheck size={14} /> Xác nhận ký
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void handleSendOtp(contract.id)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Gửi lại mã
              </button>
            </div>
          )}
        </section>
      )}

      {/* ---- Đã ký nhưng Staff chưa kích hoạt (ngoài 3 trạng thái liệt kê, suy ra từ quy trình BE) ---- */}
      {status === 'DRAFT' && esignStatus === 'SIGNED' && isStaff && (
        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Khách hàng đã ký</h2>
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => void handleActivate(contract.id)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckCircle2 size={14} /> Kích hoạt hợp đồng
          </button>
        </section>
      )}

      {/* ---- ACTIVE + SIGNED: cả hai bên tải file đã ký + bảng milestones ---- */}
      {canDownloadSignedFile && (status === 'ACTIVE' || status === 'COMPLETED') && (
        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-6">
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => void handleDownload(contract.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={14} /> Tải file PDF hợp đồng đã ký
          </button>
        </section>
      )}

      {showMilestones && (
        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Các đợt thanh toán</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2">Đợt</th>
                  <th className="px-3 py-2">Giai đoạn</th>
                  <th className="px-3 py-2">Số tiền</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contract.milestones.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-3 font-semibold text-slate-800">{m.name}</td>
                    <td className="px-3 py-3 text-slate-600">{m.stageType}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800">{formatVnd(m.amount)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${MILESTONE_STATUS_BADGE[m.status]}`}>
                        {MILESTONE_STATUS_LABEL[m.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {isCustomer && m.stageType === 'DEPOSIT' && m.status === 'INVOICED' && (
                        <button
                          type="button"
                          disabled
                          title="Tính năng thanh toán trực tuyến sẽ được bổ sung sau"
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white opacity-50 cursor-not-allowed"
                        >
                          Thanh toán đặt cọc
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {depositMilestone?.status === 'INVOICED' && isCustomer && (
            <p className="mt-3 text-[11px] text-slate-400">
              Nút thanh toán đặt cọc hiện chưa khả dụng — tính năng cổng thanh toán sẽ được bổ sung ở giai đoạn sau.
            </p>
          )}
        </section>
      )}
    </Shell>
  );
};

export default ContractDetail;
