import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/services/authService';
import {
  createProjectContract,
  isUuid,
  type CreateContractPayload,
  type DueTrigger,
  type PaymentMilestoneInput,
  type StageType,
} from '@/features/projects/services/contractsApi';

const STAGE_TYPES: { value: StageType; label: string }[] = [
  { value: 'DEPOSIT', label: 'Đặt cọc (DEPOSIT)' },
  { value: 'LAYOUT_2D', label: 'Mặt bằng 2D (LAYOUT_2D)' },
  { value: 'RENDER_3D', label: 'Phối cảnh 3D (RENDER_3D)' },
  { value: 'FINAL_PACKAGE', label: 'Hồ sơ hoàn thiện (FINAL_PACKAGE)' },
];

const DUE_TRIGGERS: { value: DueTrigger; label: string }[] = [
  { value: 'ON_CONTRACT_ACTIVE', label: 'Khi hợp đồng kích hoạt (ON_CONTRACT_ACTIVE)' },
  { value: 'ON_STAGE_APPROVED', label: 'Khi duyệt giai đoạn (ON_STAGE_APPROVED)' },
];

/** The trigger the backend expects for a given stage (DEPOSIT is paid on activation). */
function defaultTrigger(stageType: StageType): DueTrigger {
  return stageType === 'DEPOSIT' ? 'ON_CONTRACT_ACTIVE' : 'ON_STAGE_APPROVED';
}

interface MilestoneRow {
  name: string;
  stageType: StageType;
  amount: string;
  dueTrigger: DueTrigger;
}

const EMPTY_MILESTONE: MilestoneRow = {
  name: '',
  stageType: 'DEPOSIT',
  amount: '',
  dueTrigger: 'ON_CONTRACT_ACTIVE',
};

/** Parse a VND string into a number for display/comparison; NaN when invalid. */
function toNumber(value: string): number {
  const trimmed = value.trim();
  return /^\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : NaN;
}

const vnd = new Intl.NumberFormat('vi-VN');

export const CreateContract: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [projectId, setProjectId] = useState(params.get('projectId') ?? '');
  const [totalDesignFee, setTotalDesignFee] = useState('');
  const [maxRevisionsPerStage, setMaxRevisionsPerStage] = useState('3');
  const [reviewWindowDays, setReviewWindowDays] = useState('7');
  const [note, setNote] = useState('');
  const [milestones, setMilestones] = useState<MilestoneRow[]>([
    { ...EMPTY_MILESTONE, name: 'Đặt cọc thiết kế' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateMilestone = (index: number, patch: Partial<MilestoneRow>) => {
    setMilestones((rows) => rows.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, ...patch };
      // Keep dueTrigger aligned with the stage unless the user picked it explicitly.
      if (patch.stageType && patch.dueTrigger === undefined) {
        next.dueTrigger = defaultTrigger(patch.stageType);
      }
      return next;
    }));
  };

  const addMilestone = () => setMilestones((rows) => {
    const stageType: StageType = rows.length === 0 ? 'DEPOSIT' : 'LAYOUT_2D';
    return [...rows, { ...EMPTY_MILESTONE, stageType, dueTrigger: defaultTrigger(stageType) }];
  });

  const removeMilestone = (index: number) =>
    setMilestones((rows) => rows.filter((_, i) => i !== index));

  const milestonesTotal = useMemo(
    () => milestones.reduce((sum, row) => {
      const amount = toNumber(row.amount);
      return Number.isNaN(amount) ? sum : sum + amount;
    }, 0),
    [milestones],
  );

  const feeNumber = toNumber(totalDesignFee);
  const feeValid = !Number.isNaN(feeNumber) && feeNumber > 0;
  const totalsMatch = feeValid && milestonesTotal === feeNumber;
  const projectIdValid = isUuid(projectId);

  const buildPayload = (): CreateContractPayload => ({
    totalDesignFee: totalDesignFee.trim(),
    maxRevisionsPerStage: Number(maxRevisionsPerStage),
    reviewWindowDays: Number(reviewWindowDays),
    ...(note.trim() ? { note: note.trim() } : {}),
    milestones: milestones.map((row, index): PaymentMilestoneInput => ({
      seqNo: index + 1,
      name: row.name.trim(),
      stageType: row.stageType,
      amount: row.amount.trim(),
      dueTrigger: row.dueTrigger,
    })),
  });

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const contract = await createProjectContract(projectId.trim(), buildPayload());
      setSuccess(`Đã tạo hợp đồng ${contract.contractNo}. Dự án chuyển sang trạng thái CONTRACT_PENDING.`);
      // Return to the project detail view after a brief confirmation.
      window.setTimeout(() => navigate(`/staff-project-detail?projectId=${encodeURIComponent(projectId.trim())}`), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const labelClass = 'block text-[11px] font-bold text-slate-500 mb-1.5';
  const inputClass = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600';

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header role="staff" />

      <main className="w-full max-w-[1100px] mx-auto px-6 lg:px-12 py-10 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tạo hợp đồng</h1>
          <p className="text-sm text-slate-500 mt-1">
            Nhập điều khoản và lịch thanh toán, tổng các đợt phải bằng đúng phí thiết kế.
          </p>
        </div>

        {/* Success / error banners */}
        {success && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Terms */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Thông tin hợp đồng</h2>

            <div className="mb-4">
              <label className={labelClass}>Mã dự án (UUID)</label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="vd: 123e4567-e89b-12d3-a456-426614174000"
                className={`${inputClass} ${projectId && !projectIdValid ? 'border-red-300 focus:ring-red-500' : ''}`}
              />
              {projectId && !projectIdValid && (
                <p className="mt-1 text-[11px] font-semibold text-red-600">Mã dự án phải là chuỗi UUID chuẩn.</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Tổng phí thiết kế (VND)</label>
                <input
                  type="number" min="1" inputMode="numeric"
                  value={totalDesignFee}
                  onChange={(e) => setTotalDesignFee(e.target.value)}
                  placeholder="50000000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Số lần sửa tối đa / giai đoạn (0–20)</label>
                <input
                  type="number" min="0" max="20"
                  value={maxRevisionsPerStage}
                  onChange={(e) => setMaxRevisionsPerStage(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Số ngày xem xét (1–60)</label>
                <input
                  type="number" min="1" max="60"
                  value={reviewWindowDays}
                  onChange={(e) => setReviewWindowDays(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>Ghi chú (tuỳ chọn)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={5000}
                placeholder="Điều khoản bổ sung, phạm vi công việc…"
                className={`${inputClass} resize-y`}
              />
            </div>
          </section>

          {/* Milestones */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Đợt thanh toán</h2>
              <button
                type="button"
                onClick={addMilestone}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={14} /> Thêm đợt thanh toán
              </button>
            </div>

            <div className="space-y-3">
              {milestones.map((row, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3 md:grid-cols-[2.4rem_1fr_1fr_1fr_1fr_2rem] md:items-end">
                  <div className="text-xs font-bold text-slate-400 md:pb-2.5">#{index + 1}</div>
                  <div>
                    <label className={labelClass}>Tên đợt</label>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateMilestone(index, { name: e.target.value })}
                      placeholder="Đặt cọc thiết kế"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Giai đoạn</label>
                    <select
                      value={row.stageType}
                      onChange={(e) => updateMilestone(index, { stageType: e.target.value as StageType })}
                      className={inputClass}
                    >
                      {STAGE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Số tiền (VND)</label>
                    <input
                      type="number" min="1" inputMode="numeric"
                      value={row.amount}
                      onChange={(e) => updateMilestone(index, { amount: e.target.value })}
                      placeholder="15000000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Điều kiện đến hạn</label>
                    <select
                      value={row.dueTrigger}
                      onChange={(e) => updateMilestone(index, { dueTrigger: e.target.value as DueTrigger })}
                      className={inputClass}
                    >
                      {DUE_TRIGGERS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMilestone(index)}
                    disabled={milestones.length === 1}
                    aria-label="Xoá đợt"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {/* Live total vs fee */}
            <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Tổng các đợt thanh toán</span>
                <span className="font-bold text-slate-900">VND {vnd.format(milestonesTotal)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-500">Tổng phí thiết kế</span>
                <span className="font-bold text-slate-900">{feeValid ? `VND ${vnd.format(feeNumber)}` : '—'}</span>
              </div>
              {feeValid && !totalsMatch && (
                <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-red-600">
                  <AlertCircle size={13} />
                  Tổng các đợt ({vnd.format(milestonesTotal)}) chưa bằng phí thiết kế ({vnd.format(feeNumber)}).
                </p>
              )}
              {totalsMatch && (
                <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 size={13} /> Tổng các đợt khớp với phí thiết kế.
                </p>
              )}
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={submitting || !projectIdValid || !totalsMatch}
              onClick={() => void handleSubmit()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={14} />
              {submitting ? 'Đang tạo…' : 'Tạo hợp đồng'}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateContract;
