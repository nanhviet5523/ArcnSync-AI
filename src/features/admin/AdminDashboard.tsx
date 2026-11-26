import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, FolderKanban, RefreshCw, Users, Wallet, AlertTriangle } from 'lucide-react';
import { AppShell, Button, Card, DetailList, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, StatusChip, roleLabel } from '@/components/ui';
import { errorText, formatDateTime, formatMoney, formatNumber, t } from '@/i18n';
import { Stars } from '@/features/reviews/ReviewCard';
import { dashboardApi } from './dashboardApi';
import type { BackendRole, DashboardStats } from './dashboardApi';

const STAGES = ['DRAFT', 'CONTRACT_PENDING', 'REQUIREMENT_ANALYSIS', 'IN_DESIGN', 'PRODUCT_SELECTION', 'QUOTING', 'COMPLETED', 'CANCELLED'] as const;
const ROLES: BackendRole[] = ['CUSTOMER', 'DESIGNER', 'STAFF', 'SUPPLIER', 'ADMIN'];
const INQUIRY_STATES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'] as const;

const monthLabel = (ym: string) => new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${ym}-01T00:00:00Z`));
/** Compact VND for chart labels: 12.5M ₫. */
const compactMoney = (v: number) => `${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)} ₫`;

/** Admin landing page (/admin-dashboard) on live numbers from GET /admin/dashboard. */
export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setError(''); setLoading(true);
    try { setStats(await dashboardApi.stats()); } catch (e) { setError(errorText(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const s = stats;
  return (
    <AppShell wide>
      <PageHeader
        title={t('adminDashboard.title')}
        description={<>{t('adminDashboard.description')}{s && <span className="block text-xs text-slate-500">{t('adminDashboard.updated', { date: formatDateTime(s.generatedAt) })}</span>}</>}
        secondary={<>
          <Button onClick={load} loading={loading}><RefreshCw aria-hidden className="h-4 w-4" />{t('adminDashboard.refresh')}</Button>
          <Button onClick={() => s && exportCsv(s)} disabled={!s}><Download aria-hidden className="h-4 w-4" />{t('adminDashboard.exportCsv')}</Button>
        </>}
      />
      {error && <div className="mb-5"><ErrorState message={error} onRetry={load} /></div>}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label={t('adminDashboard.users')} loading={!s} value={s ? formatNumber(s.users.total) : ''} hint={s ? t('adminDashboard.usersHint', { n: s.users.newLast30Days }) : undefined} />
        <StatCard icon={<FolderKanban className="h-5 w-5" />} iconTone="violet" label={t('adminDashboard.activeProjects')} loading={!s} value={s ? formatNumber(s.projects.active) : ''}
          hint={s ? t('adminDashboard.activeProjectsHint', { created: s.projects.createdLast30Days, completed: s.projects.completedLast30Days }) : undefined} />
        <StatCard icon={<Wallet className="h-5 w-5" />} iconTone="green" label={t('adminDashboard.collected')} loading={!s} value={s ? formatMoney(s.revenue.collected) : ''}
          hint={s ? t('adminDashboard.collectedHint', { amount: formatMoney(s.revenue.collectedLast30Days) }) : undefined} />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} iconTone="orange" label={t('adminDashboard.outstanding')} loading={!s} value={s ? formatMoney(s.revenue.outstanding) : ''}
          hint={s ? t('adminDashboard.outstandingHint', { n: s.revenue.overdueMilestones }) : undefined} />
      </div>

      <div className="mb-5 grid items-start gap-5 lg:grid-cols-3">
        <Card title={t('adminDashboard.revenueTitle')} className="lg:col-span-2">
          {s ? <RevenueChart months={s.revenue.monthly} /> : <Skeleton className="h-56 w-full" />}
        </Card>
        <Card title={t('adminDashboard.projectsTitle')} actions={<Link to="/staff/projects" className="text-[13px] font-medium text-brand hover:underline">{t('adminDashboard.viewAll')}</Link>}>
          {s ? <StageBars byStatus={s.projects.byStatus} /> : <Skeleton className="h-56 w-full" />}
        </Card>
      </div>

      <div className="mb-5 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card title={t('adminDashboard.quotationsTitle')}>
          {s ? (
            <DetailList items={[
              { label: t('adminDashboard.awaiting'), value: <span className="tabular-nums">{s.quotations.awaitingCustomer}</span> },
              { label: t('adminDashboard.approved'), value: <span className="tabular-nums">{s.quotations.approved}</span> },
              { label: t('adminDashboard.rejected'), value: <span className="tabular-nums">{s.quotations.rejected}</span> },
              { label: t('adminDashboard.approvedValue'), value: <span className="tabular-nums">{formatMoney(s.quotations.approvedValue)}</span> },
              { label: t('adminDashboard.approvalRate'), value: s.quotations.approvalRatePercent ? `${s.quotations.approvalRatePercent}%` : '—' },
              { label: t('adminDashboard.contracts'), value: <span className="tabular-nums">{t('adminDashboard.contractsValue', { n: s.revenue.activeContracts, amount: formatMoney(s.revenue.activeContractValue) })}</span> },
            ]} />
          ) : <Skeleton className="h-40 w-full" />}
        </Card>
        <Card title={t('adminDashboard.reviewsTitle')} actions={<Link to="/reviews" className="text-[13px] font-medium text-brand hover:underline">{t('adminDashboard.viewAll')}</Link>}>
          {s ? (s.reviews.count ? (
            <div>
              <p className="flex items-center gap-2 text-3xl font-bold tabular-nums text-ink">{s.reviews.averageOverall}<Stars value={Number(s.reviews.averageOverall)} size="h-5 w-5" /></p>
              <p className="mt-1 text-sm text-slate-600">{t('reviews.count', { n: s.reviews.count })}</p>
              {s.reviews.recommendPercent && <p className="mt-1 text-sm text-slate-600">{t('reviews.recommendShare', { p: s.reviews.recommendPercent })}</p>}
            </div>
          ) : <EmptyState compact title={t('reviews.empty')} />) : <Skeleton className="h-40 w-full" />}
        </Card>
        <Card title={t('adminDashboard.inquiriesTitle')} description={s ? t('adminDashboard.inquiriesHint', { n: s.inquiries.last30Days }) : undefined}
          actions={<Link to="/staff/inquiries" className="text-[13px] font-medium text-brand hover:underline">{t('adminDashboard.viewAll')}</Link>}>
          {s ? (
            <ul className="grid grid-cols-2 gap-2">
              {INQUIRY_STATES.map((k) => (
                <li key={k} className="rounded-lg border border-line px-3 py-2">
                  <StatusChip kind="inquiry" value={k} size="sm" />
                  <p className="mt-1 text-xl font-bold tabular-nums text-ink">{s.inquiries.byStatus[k]}</p>
                </li>
              ))}
            </ul>
          ) : <Skeleton className="h-40 w-full" />}
        </Card>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <Card title={t('adminDashboard.rolesTitle')} actions={<Link to="/admin-users" className="text-[13px] font-medium text-brand hover:underline">{t('adminDashboard.viewAll')}</Link>}>
          {s ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {ROLES.map((r) => (
                <li key={r} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span className="text-slate-700">{roleLabel(r)}</span><span className="font-semibold tabular-nums text-ink">{formatNumber(s.users.byRole[r] ?? 0)}</span>
                </li>
              ))}
            </ul>
          ) : <Skeleton className="h-40 w-full" />}
        </Card>
        <Card title={t('adminDashboard.recentProjects')} className="lg:col-span-2" bodyClassName="p-0">
          {!s ? <div className="p-5"><Skeleton className="h-40 w-full" /></div> : s.recentProjects.length === 0 ? <div className="p-5"><EmptyState compact title={t('adminDashboard.none')} /></div> : (
            <ul className="divide-y divide-slate-100">
              {s.recentProjects.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => navigate(`/staff/projects/${p.id}`)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-sand-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                      <p className="truncate text-xs text-slate-500">{p.code} · {p.customerName} · {p.staffName}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-slate-500 sm:inline">{formatDateTime(p.updatedAt)}</span>
                      <StatusChip kind="project" value={p.status} size="sm" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {s && s.recentInquiries.length > 0 && (
        <Card title={t('adminDashboard.recentInquiries')} className="mt-5" bodyClassName="p-0">
          <ul className="divide-y divide-slate-100">
            {s.recentInquiries.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0 truncate"><span className="font-medium text-ink">{i.fullName}</span> <span className="text-slate-500">· {t(`inquiries.topic.${i.topic}`)}</span></span>
                <span className="flex shrink-0 items-center gap-3"><span className="hidden text-xs text-slate-500 sm:inline">{formatDateTime(i.createdAt)}</span><StatusChip kind="inquiry" value={i.status} size="sm" /></span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}

/** Single-series monthly bars: one hue, value on hover/focus, a hidden table for screen readers. */
function RevenueChart({ months }: { months: DashboardStats['revenue']['monthly'] }) {
  const values = months.map((m) => Number(m.amount));
  const max = Math.max(...values, 0);
  if (max <= 0) return <EmptyState compact title={t('adminDashboard.revenueEmpty')} />;
  return (
    <div>
      <div aria-hidden className="relative flex h-56 items-end gap-3 border-b border-line pt-6">
        {months.map((m, i) => {
          const v = values[i];
          return (
            <div key={m.month} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center outline-none" title={`${monthLabel(m.month)}: ${formatMoney(v)}`}>
              <div className="w-full max-w-12 rounded-t bg-brand transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80" style={{ height: `${Math.max(v > 0 ? 2 : 0, (v / max) * 100)}%` }} />
              <span className="pointer-events-none absolute -top-1 left-1/2 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-dark px-2 py-1 text-xs font-medium text-[#FBF8EF] shadow group-hover:block group-focus-visible:block">
                {formatMoney(v)}
              </span>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="mt-2 flex gap-3 text-center text-xs text-slate-500">
        {months.map((m, i) => (
          <div key={m.month} className="flex-1"><p>{monthLabel(m.month)}</p><p className="tabular-nums text-slate-700">{values[i] ? compactMoney(values[i]) : '—'}</p></div>
        ))}
      </div>
      <table className="sr-only">
        <caption>{t('adminDashboard.revenueTitle')}</caption>
        <tbody>{months.map((m) => <tr key={m.month}><th scope="row">{monthLabel(m.month)}</th><td>{formatMoney(m.amount)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/** Projects per stage: the stage chip carries the name, one neutral-hue bar the count. */
function StageBars({ byStatus }: { byStatus: DashboardStats['projects']['byStatus'] }) {
  const max = Math.max(...STAGES.map((k) => byStatus[k] ?? 0), 1);
  return (
    <ul className="space-y-2.5">
      {STAGES.map((k) => {
        const n = byStatus[k] ?? 0;
        return (
          <li key={k} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3">
            <StatusChip kind="project" value={k} size="sm" />
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${(n / max) * 100}%` }} /></div>
            <span className="text-right text-sm font-semibold tabular-nums text-ink">{n}</span>
          </li>
        );
      })}
    </ul>
  );
}

function exportCsv(s: DashboardStats) {
  const cell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));
  const rows: (string | number)[][] = [
    ['Generated at', s.generatedAt],
    [],
    ['Accounts', s.users.total], ['New accounts (30 days)', s.users.newLast30Days],
    ...ROLES.map((r) => [`Accounts: ${r}`, s.users.byRole[r] ?? 0]),
    [],
    ['Projects', s.projects.total], ['Active projects', s.projects.active],
    ...STAGES.map((k) => [`Projects: ${k}`, s.projects.byStatus[k] ?? 0]),
    [],
    ['Collected (VND)', s.revenue.collected], ['Collected, 30 days (VND)', s.revenue.collectedLast30Days],
    ['Outstanding (VND)', s.revenue.outstanding], ['Overdue payments', s.revenue.overdueMilestones],
    ['Active contracts', s.revenue.activeContracts], ['Active contract value (VND)', s.revenue.activeContractValue],
    ...s.revenue.monthly.map((m) => [`Collected ${m.month} (VND)`, m.amount]),
    [],
    ['Quotations awaiting homeowner', s.quotations.awaitingCustomer], ['Quotations approved', s.quotations.approved],
    ['Quotations with changes requested', s.quotations.rejected], ['Approved quotation value (VND)', s.quotations.approvedValue],
    ['Approval rate (%)', s.quotations.approvalRatePercent ?? ''],
    [],
    ['Reviews', s.reviews.count], ['Average rating', s.reviews.averageOverall ?? ''], ['Would recommend (%)', s.reviews.recommendPercent ?? ''],
    [],
    ...INQUIRY_STATES.map((k) => [`Inquiries: ${k}`, s.inquiries.byStatus[k]]), ['Inquiries, 30 days', s.inquiries.last30Days],
  ];
  const blob = new Blob(['﻿', rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `archsync-dashboard-${s.generatedAt.slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default AdminDashboard;
