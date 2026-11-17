import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers, UserX, CheckCircle2, FileSignature, Search, Download, Plus, X, AlertCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { ApiError } from '@/services/authService';
import {
  createProject,
  getProjects,
  type ApartmentHasActiveProjectDetails,
  type CreateProjectPayload,
  type MyProjectRole,
  type ProjectListItem,
  type ProjectStatus,
} from '@/features/projects/projectApi';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: 'Draft',
  CONTRACT_PENDING: 'Contract pending',
  REQUIREMENT_ANALYSIS: 'Requirements',
  IN_DESIGN: 'In design',
  PRODUCT_SELECTION: 'Products',
  QUOTING: 'Quoting',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_BADGE: Record<ProjectStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  CONTRACT_PENDING: 'bg-amber-50 text-amber-700',
  REQUIREMENT_ANALYSIS: 'bg-sky-50 text-sky-600',
  IN_DESIGN: 'bg-blue-50 text-blue-600',
  PRODUCT_SELECTION: 'bg-indigo-50 text-indigo-600',
  QUOTING: 'bg-purple-50 text-purple-600',
  COMPLETED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-rose-50 text-rose-600',
};

const ROLE_BADGE: Record<MyProjectRole, string> = {
  LEAD: 'bg-blue-600 text-white',
  MEMBER: 'bg-slate-100 text-slate-600',
};

const STATUS_TABS: (ProjectStatus | '')[] = [
  '', 'DRAFT', 'CONTRACT_PENDING', 'REQUIREMENT_ANALYSIS', 'IN_DESIGN',
  'PRODUCT_SELECTION', 'QUOTING', 'COMPLETED', 'CANCELLED',
];

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 400;
const TABLE_COLUMNS = 8;

const EMPTY_PROJECT_FORM = {
  apartmentId: '',
  title: '',
  description: '',
  householdSize: '',
  budgetMin: '',
  budgetMax: '',
  budgetTolerancePercent: '',
};

interface ProjectPageState {
  key: string;
  projects: ProjectListItem[];
  total: number;
}

export const StaffProjects: React.FC = () => {
  const navigate = useNavigate();

  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<ProjectPageState | null>(null);
  // Tổng toàn hệ thống: chỉ cập nhật từ response không có filter status/q, để card không đổi khi lọc.
  const [overallTotal, setOverallTotal] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(EMPTY_PROJECT_FORM);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
    action?: { label: string; onClick: () => void };
  } | null>(null);

  // `loading` is derived (result belongs to an older request) so the fetch effect never sets state synchronously.
  const requestKey = JSON.stringify({ status, q, page, reloadKey });
  const loading = result?.key !== requestKey;
  const projects = result?.projects ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [qInput]);

  useEffect(() => {
    let cancelled = false;
    getProjects({ status: status || undefined, q: q || undefined, page, limit: PAGE_LIMIT })
      .then((res) => {
        if (cancelled) return;
        setResult({ key: requestKey, projects: res.items, total: res.total });
        if (!status && !q) setOverallTotal(res.total);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({ key: requestKey, projects: [], total: 0 });
        setToast({
          type: 'error',
          message: err instanceof ApiError ? err.message : 'Không tải được danh sách dự án.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, status, q, page]);

  useEffect(() => {
    if (!toast || toast.action) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const resetForm = () => {
    setForm(EMPTY_PROJECT_FORM);
    setFormError('');
  };

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    const apartmentId = form.apartmentId.trim();
    const title = form.title.trim();
    const budgetMin = form.budgetMin.trim();
    const budgetMax = form.budgetMax.trim();

    if (!apartmentId || !title || !budgetMin || !budgetMax) {
      setFormError('Vui lòng điền Mã căn hộ, Tên dự án, Ngân sách tối thiểu và tối đa.');
      return;
    }
    if (Number(budgetMax) < Number(budgetMin)) {
      setFormError('Ngân sách tối đa phải lớn hơn hoặc bằng ngân sách tối thiểu.');
      return;
    }

    const payload: CreateProjectPayload = {
      apartmentId,
      title,
      budgetMin,
      budgetMax,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.householdSize.trim() ? { householdSize: Number(form.householdSize) } : {}),
      ...(form.budgetTolerancePercent.trim()
        ? { budgetTolerancePercent: Number(form.budgetTolerancePercent) }
        : {}),
    };

    setCreating(true);
    try {
      const project = await createProject(payload);
      setShowCreateModal(false);
      resetForm();
      setOverallTotal((n) => (n === null ? n : n + 1));
      setReloadKey((key) => key + 1);
      setToast({ type: 'success', message: `Tạo dự án thành công (${project.code}).` });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === 'APARTMENT_HAS_ACTIVE_PROJECT') {
        const details = err.details as unknown as ApartmentHasActiveProjectDetails | undefined;
        setToast({
          type: 'error',
          message: 'Căn hộ đã có dự án đang hoạt động.',
          action: details?.projectId
            ? {
                label: 'Xem dự án hiện tại',
                onClick: () =>
                  navigate(`/staff-project-detail?projectId=${encodeURIComponent(details.projectId)}`),
              }
            : undefined,
        });
      } else if (err instanceof ApiError && err.status === 422 && err.code === 'USER_NOT_ACTIVE') {
        setToast({ type: 'error', message: 'Tài khoản không ở trạng thái hoạt động.' });
      } else {
        setToast({
          type: 'error',
          message: err instanceof ApiError ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.',
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const stats = [
    {
      title: 'TOTAL PROJECTS',
      value: overallTotal === null ? '…' : String(overallTotal),
      icon: <Layers className="w-5 h-5 text-blue-600" />,
      bgColor: 'bg-blue-50',
    },
    {
      title: 'CONTRACT PENDING',
      value: String(projects.filter((p) => p.status === 'CONTRACT_PENDING').length),
      icon: <FileSignature className="w-5 h-5 text-amber-600" />,
      bgColor: 'bg-amber-50',
    },
    {
      title: 'NO DESIGNER YET',
      value: String(projects.filter((p) => !p.designer).length),
      icon: <UserX className="w-5 h-5 text-rose-600" />,
      bgColor: 'bg-rose-50',
    },
    {
      title: 'COMPLETED',
      value: String(projects.filter((p) => p.status === 'COMPLETED').length),
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      bgColor: 'bg-emerald-50',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header role="staff" />

      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`fixed right-4 top-4 z-[80] flex max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex-1">
            <p>{toast.message}</p>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                }}
                className="mt-2 inline-flex items-center rounded-lg bg-white/70 px-2.5 py-1 text-xs font-bold text-red-700 underline hover:bg-white"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button type="button" onClick={() => setToast(null)} aria-label="Đóng" className="text-current/60 hover:text-current">
            <X size={14} />
          </button>
        </div>
      )}

      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Projects
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {total} projects · status, designer and room assignments
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus size={14} />
              <span>New project</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-2">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center flex-shrink-0`}
              >
                {stat.icon}
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 tracking-wider">
                  {stat.title}
                </span>
                <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">
                  {stat.title !== 'TOTAL PROJECTS' && loading ? '…' : stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mb-8 text-[11px] text-slate-400">
          Total là tổng toàn hệ thống (không đổi khi lọc); các số còn lại tính trên trang đang xem.
        </p>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              {STATUS_TABS.map((tab) => {
                const isSelected = status === tab;
                return (
                  <button
                    key={tab || 'ALL'}
                    type="button"
                    onClick={() => {
                      setStatus(tab);
                      setPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {tab ? STATUS_LABEL[tab] : 'All'}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-64 flex-shrink-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by code or title..."
                value={qInput}
                maxLength={100}
                onChange={(e) => setQInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-4 rounded-l-xl">CODE</th>
                  <th className="py-3 px-4">PROJECT</th>
                  <th className="py-3 px-4">HOMEOWNER</th>
                  <th className="py-3 px-4">DESIGNER</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">MY ROLE</th>
                  <th className="py-3 px-4">MY ROOMS</th>
                  <th className="py-3 px-4 rounded-r-xl">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  Array.from({ length: 5 }, (_, row) => (
                    <tr key={row}>
                      {Array.from({ length: TABLE_COLUMNS }, (__, col) => (
                        <td key={col} className="py-4 px-4">
                          <div className="h-3.5 w-full max-w-[110px] animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLUMNS} className="py-12 px-4 text-center text-sm text-slate-400">
                      Không tìm thấy dự án nào
                    </td>
                  </tr>
                ) : (
                  projects.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">{item.code}</td>
                      <td className="py-4 px-4">
                        <span className="block font-bold text-slate-900">{item.title}</span>
                        <span className="block mt-0.5 text-[11px] text-slate-400">
                          {item.apartment.buildingName}
                          {item.apartment.tower ? ` · ${item.apartment.tower}` : ''} · {item.apartment.unitNo}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-medium">{item.customer.fullName}</td>
                      <td className="py-4 px-4 font-medium">
                        {item.designer ? (
                          <span className="text-slate-700">{item.designer.fullName}</span>
                        ) : (
                          <span className="text-slate-400">Chưa phân công</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${STATUS_BADGE[item.status]}`}>
                          {STATUS_LABEL[item.status]}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {item.myProjectRole ? (
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${ROLE_BADGE[item.myProjectRole]}`}>
                            {item.myProjectRole}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {item.myRooms?.length ? item.myRooms.map((room) => room.name).join(', ') : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/staff-project-detail?projectId=${encodeURIComponent(item.id)}`)}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-lg transition cursor-pointer"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400">
              Page {page} / {totalPages} · {total} projects
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={loading || page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">Tạo dự án mới</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Đóng"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateProject(e)} className="space-y-4">
              {formError && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-slate-500">Mã căn hộ (apartmentId, UUID)</label>
                <input
                  type="text"
                  value={form.apartmentId}
                  onChange={(e) => setForm((f) => ({ ...f, apartmentId: e.target.value }))}
                  placeholder="123e4567-e89b-12d3-a456-426614174000"
                  disabled={creating}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-slate-500">Tên dự án</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Thiết kế căn hộ The Sun Avenue"
                  disabled={creating}
                  maxLength={255}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-slate-500">Ngân sách tối thiểu (VND)</label>
                  <input
                    type="number" min="1" inputMode="numeric"
                    value={form.budgetMin}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
                    placeholder="150000000"
                    disabled={creating}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-slate-500">Ngân sách tối đa (VND)</label>
                  <input
                    type="number" min="1" inputMode="numeric"
                    value={form.budgetMax}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))}
                    placeholder="250000000"
                    disabled={creating}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-slate-500">Số người ở (tuỳ chọn)</label>
                  <input
                    type="number" min="1" max="50"
                    value={form.householdSize}
                    onChange={(e) => setForm((f) => ({ ...f, householdSize: e.target.value }))}
                    disabled={creating}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-slate-500">Dung sai ngân sách % (tuỳ chọn, 0–10)</label>
                  <input
                    type="number" min="0" max="10"
                    value={form.budgetTolerancePercent}
                    onChange={(e) => setForm((f) => ({ ...f, budgetTolerancePercent: e.target.value }))}
                    placeholder="10"
                    disabled={creating}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-slate-500">Mô tả (tuỳ chọn)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  maxLength={5000}
                  disabled={creating}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {creating ? 'Đang tạo…' : 'Tạo dự án'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default StaffProjects;
