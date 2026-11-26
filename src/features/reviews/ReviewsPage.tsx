import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, DataTable, PageHeader, Select, StatCard } from '@/components/ui';
import type { Column } from '@/components/ui';
import { errorText, formatDate, t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { Stars } from './ReviewCard';
import { reviewApi } from './reviewApi';
import type { ProjectReview, ReviewSummary } from './reviewApi';

type ListRole = 'admin' | 'staff' | 'designer';

/** Post-project reviews in the viewer's scope (/reviews): admin all, staff their projects, designers projects they led. */
export function ReviewsPage() {
  const navigate = useNavigate();
  const role = (getCurrentUser()?.role ?? 'admin') as ListRole;
  const [rating, setRating] = useState(0);
  const [rows, setRows] = useState<ProjectReview[] | null>(null);
  const [matched, setMatched] = useState(0);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError(''); setRows(null);
    try {
      const r = await reviewApi.list({ rating: rating || undefined });
      setRows(r.items); setSummary(r.summary); setMatched(r.total);
    } catch (e) { setError(errorText(e)); }
  }, [rating]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const projectPath = (r: ProjectReview) => (role === 'designer' ? `/designer/projects/${r.projectId}` : `/staff/projects/${r.projectId}`);
  const columns: Column<ProjectReview>[] = [
    { key: 'project', header: t('reviews.col.project'), cell: (r) => <><p className="font-medium text-ink">{r.project?.title}</p><p className="text-xs text-slate-500">{r.project?.code}</p></> },
    { key: 'rating', header: t('reviews.col.rating'), cell: (r) => <Stars value={r.overallRating} />, sort: (r) => r.overallRating },
    { key: 'homeowner', header: t('reviews.col.homeowner'), cell: (r) => r.customer?.fullName ?? '—', hideOnMobile: true },
    { key: 'designer', header: t('reviews.col.designer'), cell: (r) => r.designer?.fullName ?? '—', hideOnMobile: true },
    { key: 'comment', header: t('reviews.col.comment'), cell: (r) => <p className="line-clamp-2 max-w-md text-slate-700">{r.comment ?? '—'}</p>, hideOnMobile: true },
    { key: 'date', header: t('reviews.col.date'), cell: (r) => formatDate(r.createdAt), sort: (r) => r.createdAt },
  ];

  const total = summary?.count ?? 0;
  return (
    <AppShell wide>
      <PageHeader title={t('reviews.title')} description={t(`reviews.description.${role}`)} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('reviews.average')} loading={!summary} value={summary?.averageOverall ? <span className="inline-flex items-center gap-2">{summary.averageOverall}<Stars value={Number(summary.averageOverall)} /></span> : '—'} hint={t('reviews.count', { n: total })} />
        <StatCard label={t('reviews.design')} loading={!summary} value={summary?.averageDesign ?? '—'} />
        <StatCard label={t('reviews.communication')} loading={!summary} value={summary?.averageCommunication ?? '—'} />
        <StatCard label={t('reviews.recommends')} loading={!summary} value={summary?.recommendPercent ? `${summary.recommendPercent}%` : '—'} />
      </div>
      {summary && total > 0 && (
        <div className="mb-5 flex flex-wrap gap-2" aria-label={t('reviews.col.rating')}>
          {(['5', '4', '3', '2', '1'] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-slate-700">
              <Stars value={Number(k)} size="h-3 w-3" /> <span className="tabular-nums">{summary.distribution[k]}</span>
            </span>
          ))}
        </div>
      )}
      <div className="mb-3 flex justify-end">
        <Select aria-label={t('reviews.col.rating')} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-44">
          <option value={0}>{t('reviews.allRatings')}</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{t('reviews.stars', { n })}</option>)}
        </Select>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} error={error} onRetry={load} empty={t('reviews.empty')}
        onRowClick={(r) => navigate(projectPath(r))} initialSort={{ key: 'date', dir: 'desc' }} />
      {rows && matched > rows.length && <p className="mt-2 text-xs text-slate-500">{t('common.showingOf', { shown: rows.length, total: matched })}</p>}
    </AppShell>
  );
}

export default ReviewsPage;
