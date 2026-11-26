import { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Button, Card, ErrorState, Skeleton, Textarea } from '@/components/ui';
import { errorText, formatDate, formatDateTime, t } from '@/i18n';
import { isNotFound, reviewApi } from './reviewApi';
import type { ProjectReview, ReviewInput } from './reviewApi';

/** Read-only stars, e.g. ★★★★☆ for 4. */
export function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={t('reviews.stars', { n: value })} role="img">
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} aria-hidden className={`${size} ${i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}
    </span>
  );
}

/** 1–5 star picker as a radio group (arrow keys work natively). */
function StarInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <fieldset className="flex flex-wrap items-center justify-between gap-2">
      <legend className="float-left text-[13px] font-medium text-slate-700">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className="cursor-pointer rounded focus-within:outline-2 focus-within:outline-brand" title={t('reviews.stars', { n: i })}>
            <input type="radio" name={label} value={i} checked={value === i} onChange={() => onChange(i)} className="sr-only" aria-label={t('reviews.stars', { n: i })} />
            <Star aria-hidden className={`h-6 w-6 transition-colors ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300'}`} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const EMPTY: ReviewInput = { overallRating: 0, designRating: 0, communicationRating: 0, wouldRecommend: true, comment: '' };

/**
 * Review of a completed project. The homeowner writes it (and edits it for 7 days); staff, admin and designers read it.
 * Renders nothing before the project is complete.
 */
export function ReviewCard({ projectId, completed, homeowner }: { projectId: string; completed: boolean; homeowner: boolean }) {
  const [review, setReview] = useState<ProjectReview | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ReviewInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  // read once per mount: the 7-day edit window is checked again by the backend anyway
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    setError('');
    try { setReview(await reviewApi.get(projectId)); } catch (e) { if (isNotFound(e)) setReview(null); else setError(errorText(e)); }
  }, [projectId]);
  useEffect(() => { if (completed) Promise.resolve().then(load); }, [completed, load]);

  if (!completed) return null;
  const title = t(homeowner ? 'reviews.cardTitle' : 'reviews.cardTitleOther');
  if (error) return <Card title={title}><ErrorState message={error} onRetry={load} /></Card>;
  if (review === undefined) return <Card title={title}><Skeleton className="h-24 w-full" /></Card>;

  const canEdit = homeowner && !!review && new Date(review.editableUntil).getTime() > now;
  const showForm = homeowner && (!review || editing);
  const ready = form.overallRating > 0 && form.designRating > 0 && form.communicationRating > 0;

  const save = async () => {
    setBusy(true); setSaveError('');
    try {
      const input = { ...form, comment: form.comment?.trim() || null };
      setReview(review ? await reviewApi.update(projectId, input) : await reviewApi.create(projectId, input));
      setEditing(false);
    } catch (e) { setSaveError(errorText(e)); } finally { setBusy(false); }
  };

  if (showForm) {
    return (
      <Card title={title} description={!review ? t('reviews.prompt') : undefined}>
        <div className="space-y-3">
          <StarInput label={t('reviews.overall')} value={form.overallRating} onChange={(v) => setForm({ ...form, overallRating: v })} />
          <StarInput label={t('reviews.design')} value={form.designRating} onChange={(v) => setForm({ ...form, designRating: v })} />
          <StarInput label={t('reviews.communication')} value={form.communicationRating} onChange={(v) => setForm({ ...form, communicationRating: v })} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-brand" checked={form.wouldRecommend} onChange={(e) => setForm({ ...form, wouldRecommend: e.target.checked })} />
            {t('reviews.recommend')}
          </label>
          <div>
            <label htmlFor="review-comment" className="mb-1.5 block text-[13px] font-medium text-slate-700">{t('reviews.comment')}</label>
            <Textarea id="review-comment" rows={3} maxLength={2000} placeholder={t('reviews.commentPlaceholder')} value={form.comment ?? ''} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          </div>
          {!ready && <p className="text-xs text-slate-500">{t('reviews.rateHint')}</p>}
          {saveError && <ErrorState message={saveError} />}
          <div className="flex justify-end gap-2">
            {review && <Button onClick={() => { setEditing(false); setSaveError(''); }}>{t('common.cancel')}</Button>}
            <Button variant="primary" loading={busy} disabled={!ready} onClick={save}>{t(review ? 'reviews.update' : 'reviews.submit')}</Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!review) return <Card title={title}><p className="text-sm text-slate-500">{t('reviews.none')}</p></Card>;

  return (
    <Card title={title}
      description={formatDateTime(review.updatedAt)}
      actions={canEdit ? <Button size="sm" onClick={() => {
        setForm({ overallRating: review.overallRating, designRating: review.designRating, communicationRating: review.communicationRating, wouldRecommend: review.wouldRecommend, comment: review.comment ?? '' });
        setEditing(true);
      }}>{t('reviews.edit')}</Button> : undefined}>
      <div className="space-y-2 text-sm">
        {[['reviews.overall', review.overallRating], ['reviews.design', review.designRating], ['reviews.communication', review.communicationRating]].map(([k, v]) => (
          <div key={k as string} className="flex items-center justify-between gap-3">
            <span className="text-slate-600">{t(k as string)}</span>
            <Stars value={v as number} />
          </div>
        ))}
        <p className={`text-[13px] font-medium ${review.wouldRecommend ? 'text-emerald-700' : 'text-slate-500'}`}>{t(review.wouldRecommend ? 'reviews.recommends' : 'reviews.notRecommends')}</p>
        {review.comment && <p className="whitespace-pre-line border-t border-line pt-2 text-slate-700">{review.comment}</p>}
        {homeowner && <p className="text-xs text-slate-500">{canEdit ? t('reviews.editableUntil', { date: formatDate(review.editableUntil) }) : t('reviews.thanks')}</p>}
      </div>
    </Card>
  );
}
