import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banner, Button, Card, DetailList, ErrorState, Modal, Notice, Skeleton, StatusChip } from '@/components/ui';
import type { NoticeTone } from '@/components/ui';
import { formatDateTime, t } from '@/i18n';
import type { Project } from '@/features/projects/projectApi';
import { isBooked, isMeasurable, siteSurveyApi, surveyErrorText } from './siteSurveyApi';
import type { SiteSurvey, SurveyPhoto } from './siteSurveyApi';
import { BookingModal, ReasonModal, ScheduleModal } from './SurveyDialogs';
import { isPast, slotLabel } from './surveyTime';
import { MeasurementModal } from './MeasurementModal';
import { SurveyResult } from './SurveyResult';

/**
 * Who is looking at the survey:
 * - homeowner: books, changes or cancels the booking, confirms or rejects the result
 * - lead: the project's Lead designer (projectRole LEAD): fixes the time, records the result and photos, submits, cancels
 * - member: another designer on the team: view only
 * - staff: Staff or Admin: view; cancels only when `canCancel` (the Staff in charge or an Admin)
 */
export type SurveyViewer = 'homeowner' | 'lead' | 'member' | 'staff';

type SurveyNotice = { tone: NoticeTone; text: string; status?: string };
/** Done messages that are not a plain success: a cancelled survey, a result sent back to the designer. */
const DONE_TONE: Partial<Record<string, NoticeTone>> = { cancelled: 'cancelled', rejected: 'returned' };
type Dialog = '' | 'book' | 'edit' | 'schedule' | 'cancel' | 'reject' | 'measure' | 'confirm';

const APARTMENTS_PAGE: Record<string, string> = { homeowner: '/homeowner-apartments', staff: '/staff-apartments', admin: '/admin-apartments' };

export function SiteSurveyCard({ project, viewer, canCancel = viewer !== 'member', apartmentsRole, onProjectChanged, className = '' }: {
  project: Project;
  viewer: SurveyViewer;
  canCancel?: boolean;
  /** Account role used to link to its Apartments page once the home exists; no link when it has none. */
  apartmentsRole?: string;
  /** The project changed server-side (a confirmed survey attaches the apartment): reload it. */
  onProjectChanged: () => void;
  className?: string;
}) {
  const [surveys, setSurveys] = useState<SiteSurvey[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<Dialog>('');
  const [busy, setBusy] = useState<'' | 'submit' | 'confirm'>('');
  // The result of the last action stays on the card, through a reload (F5), until the next action replaces it.
  // Kept per project in this browser; `status` is the survey's status it was written for, so it hides itself if the
  // survey has moved on since (e.g. the homeowner confirmed it).
  const noticeKey = `arcnsync.surveyNotice.${project.id}`;
  const [message, setMessageState] = useState<SurveyNotice | null>(() => {
    try {
      const raw = localStorage.getItem(noticeKey);
      return raw ? (JSON.parse(raw) as SurveyNotice) : null;
    } catch { return null; }
  });
  const setMessage = (next: SurveyNotice | null) => {
    setMessageState(next);
    try {
      if (next) localStorage.setItem(noticeKey, JSON.stringify(next));
      else localStorage.removeItem(noticeKey);
    } catch { /* storage blocked: the notice still shows until the page is left */ }
  };
  const [showResult, setShowResult] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try { setSurveys(await siteSurveyApi.listByProject(project.id)); }
    catch (e) { setLoadError(surveyErrorText(e)); }
    finally { setLoading(false); }
  }, [project.id]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);
  /** Quiet re-sync with the server (no loading state): the shown photos were out of date. */
  const refresh = async () => {
    try { setSurveys(await siteSurveyApi.listByProject(project.id)); }
    catch (e) { setMessage({ tone: 'error', text: surveyErrorText(e), status: surveys?.[0]?.status }); }
  };

  // newest first: the first one is the current survey (possibly cancelled)
  const survey = surveys?.[0] ?? null;
  const status = survey?.status;
  // who cancelled, when that person is on this project
  const cancelledBy = survey?.cancelledById
    ? [project.customer, project.staff, project.designer, ...(project.members ?? []).map((m) => ({ id: m.designerId, fullName: m.fullName }))]
      .find((p) => p?.id === survey.cancelledById)?.fullName
    : undefined;
  const audience = viewer === 'homeowner' ? 'homeowner' : viewer === 'lead' ? 'lead' : 'other';
  const say = (tone: NoticeTone, text: string, after: string | undefined = status) => setMessage({ tone, text, status: after });
  const replace = (next: SiteSurvey) => setSurveys((list) => (list?.some((s) => s.id === next.id) ? list.map((s) => (s.id === next.id ? next : s)) : [next, ...(list ?? [])]));
  const done = (next: SiteSurvey, key: string) => { replace(next); setDialog(''); say(DONE_TONE[key] ?? 'success', t(`siteSurvey.done.${key}`), next.status); };
  // from the latest state: uploads on two floors at once must not overwrite each other
  const setFloorPhotos = (floorId: string, photos: SurveyPhoto[]) => setSurveys((list) => list?.map((s) => (
    s.floors.some((f) => f.id === floorId) ? { ...s, floors: s.floors.map((f) => (f.id === floorId ? { ...f, photos } : f)) } : s
  )) ?? list);

  const run = async (kind: 'submit' | 'confirm', call: () => Promise<SiteSurvey>, key: string) => {
    if (busy) return;
    setBusy(kind);
    setMessage(null);
    try {
      done(await call(), key);
      if (kind === 'confirm') onProjectChanged();
    } catch (e) {
      setDialog('');
      say('error', surveyErrorText(e));
      // the survey may have moved on server-side
      void load();
    } finally { setBusy(''); }
  };

  const canBook = viewer === 'homeowner' && (!survey || status === 'CANCELLED') && !project.apartment && project.status === 'DRAFT';
  const lead = viewer === 'lead';
  const canMeasure = lead && !!status && isMeasurable(status);
  const photosEditable = canMeasure;
  const homeLink = status === 'CONFIRMED' && apartmentsRole ? APARTMENTS_PAGE[apartmentsRole] : undefined;
  // a confirmed result stays folded once the home exists; the Home card shows it
  const resultOpen = status === 'SUBMITTED' || status === 'REJECTED' || photosEditable || showResult;
  // the Lead works on the result from the visit on; everyone else sees it once it has been submitted
  // What the backend would refuse with 422 SURVEY_INCOMPLETE, worked out from data already loaded (the 422 is still handled)
  const submitBlockers = !survey ? [] : [
    ...(survey.floors.length === 0 ? [t('siteSurvey.submitBlocked.noResult')] : []),
    ...(survey.floors.some((f) => f.photos.length === 0)
      ? [t('siteSurvey.submitBlocked.missingPhotos', { floors: survey.floors.filter((f) => f.photos.length === 0).map((f) => f.name).join(', ') })] : []),
  ];
  const resultShown = !!survey && (lead
    ? status !== 'REQUESTED' && status !== 'CANCELLED'
    : (status === 'SUBMITTED' || status === 'CONFIRMED' || status === 'REJECTED') && survey.floors.length > 0);

  const actions = survey && <>
    {viewer === 'homeowner' && status && isBooked(status) && <Button size="sm" onClick={() => setDialog('edit')}>{t('siteSurvey.changeBooking')}</Button>}
    {lead && status === 'REQUESTED' && <Button size="sm" variant="primary" onClick={() => setDialog('schedule')}>{t('siteSurvey.pickTime')}</Button>}
    {lead && status === 'SCHEDULED' && <Button size="sm" onClick={() => setDialog('schedule')}>{t('siteSurvey.reschedule')}</Button>}
    {canMeasure && (
      <Button size="sm" variant={survey.floors.length ? 'secondary' : 'primary'} onClick={() => setDialog('measure')}>
        {t(survey.floors.length ? 'siteSurvey.editResults' : 'siteSurvey.record')}
      </Button>
    )}
    {canMeasure && (
      <Button size="sm" variant="primary" loading={busy === 'submit'} disabled={submitBlockers.length > 0}
        aria-describedby={submitBlockers.length ? 'survey-submit-blockers' : undefined}
        onClick={() => void run('submit', () => siteSurveyApi.submit(survey.id), 'submitted')}>{t('siteSurvey.submit')}</Button>
    )}
    {viewer === 'homeowner' && status === 'SUBMITTED' && <>
      <Button size="sm" onClick={() => setDialog('reject')}>{t('siteSurvey.reject')}</Button>
      <Button size="sm" variant="primary" onClick={() => setDialog('confirm')}>{t('siteSurvey.confirm')}</Button>
    </>}
    {status && isBooked(status) && canCancel && viewer !== 'member' && (
      <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => setDialog('cancel')}>{t('siteSurvey.cancel')}</Button>
    )}
    {homeLink && <Link to={homeLink} className="inline-flex h-8 items-center rounded-lg border border-line-strong px-2.5 text-[13px] font-medium text-ink hover:bg-sand-50">{t('siteSurvey.viewHome')}</Link>}
  </>;

  return (
    <Card className={className}
      title={<span className="flex items-center gap-2">{t('siteSurvey.title')}{status && <StatusChip kind="siteSurvey" value={status} size="sm" />}</span>}
      description={t(viewer === 'homeowner' ? 'siteSurvey.introHomeowner' : 'siteSurvey.introTeam')}
      actions={<Button size="sm" variant="ghost" loading={loading && surveys !== null} onClick={() => void load()}>{t('siteSurvey.refresh')}</Button>}>
      {message && (!status || !message.status || message.status === status)
        && !(message.tone === 'cancelled' && status === 'CANCELLED') && !(message.tone === 'returned' && status === 'REJECTED') && (
        // static: no timer, no close button; replaced by the next action
        <Notice tone={message.tone} className="mb-4">{message.text}</Notice>
      )}

      {surveys !== null && loadError && <div className="mb-4"><ErrorState message={loadError} onRetry={() => void load()} /></div>}
      {surveys === null ? (
        loadError ? <ErrorState message={`${t('siteSurvey.loadFailed')} ${loadError}`} onRetry={() => void load()} /> : <div className="space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>
      ) : !survey ? (
        <div className="space-y-3">
          {viewer === 'homeowner' && !project.designer
            ? <Banner tone="amber">{t('siteSurvey.waitingLead')}</Banner>
            : <p className="text-sm text-slate-600">{t(`siteSurvey.none.${audience}`)}</p>}
          {canBook && project.designer && <Button variant="primary" onClick={() => setDialog('book')}>{t('siteSurvey.book')}</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cancelled or sent back: one notice with the reason set apart, so it is clear why. From the survey itself,
              so everyone sees it, after a reload too. */}
          {status === 'CANCELLED' || status === 'REJECTED' ? (
            <Notice
              tone={status === 'CANCELLED' ? 'cancelled' : 'returned'}
              title={t(`siteSurvey.statusText.${survey.status}.${audience}`)}
            >
              {status === 'CANCELLED' && cancelledBy && <p className="text-[13px] text-ink-2">{t('siteSurvey.cancelledBy', { name: cancelledBy })}</p>}
              <div className="mt-2 rounded-lg border border-[var(--tone-line)] bg-white/75 px-3 py-2">
                {/* one line: REASON: "…" */}
                {/* label and reason the same size, a step below the notice title (12px vs 14px) */}
                <p className="text-xs italic leading-relaxed">
                  <span className="mr-1 font-bold uppercase tracking-wide text-[var(--tone)]">
                    {t(status === 'CANCELLED' ? 'siteSurvey.cancelReasonTitle' : 'siteSurvey.rejectionReason')}:
                  </span>
                  {(status === 'CANCELLED' ? survey.cancelReason : survey.rejectionReason)
                    ? <span className="whitespace-pre-line font-semibold text-ink">“{status === 'CANCELLED' ? survey.cancelReason : survey.rejectionReason}”</span>
                    : <span className="italic text-subtext">{t('siteSurvey.noReason')}</span>}
                </p>
              </div>
            </Notice>
          ) : (
            <p className="text-sm font-medium text-ink">{t(`siteSurvey.statusText.${survey.status}.${audience}`)}</p>
          )}

          <DetailList items={[
            {
              label: t('siteSurvey.visit'),
              value: survey.scheduledSlot ? <span className="font-medium">{slotLabel(survey.scheduledSlot)}</span> : <span className="text-slate-500">{t('siteSurvey.notScheduled')}</span>,
            },
            ...(!survey.scheduledSlot || status === 'REQUESTED' ? [{
              label: t('siteSurvey.proposedTimes'),
              value: <ul className="space-y-0.5">{survey.proposedSlots.map((s, i) => <li key={i} className={isPast(s) ? 'text-subtext line-through' : ''}>{slotLabel(s)}</li>)}</ul>,
            }] : []),
            { label: t('siteSurvey.home'), value: <>{[survey.buildingName, survey.tower, survey.unitNo].filter(Boolean).join(', ')}<span className="block text-xs text-slate-500">{survey.address}</span></> },
            ...(survey.floorNo != null ? [{ label: t('siteSurvey.floorNo'), value: String(survey.floorNo) }] : []),
            ...(survey.customerNote ? [{ label: t('siteSurvey.customerNote'), value: <span className="whitespace-pre-line">{survey.customerNote}</span> }] : []),
            ...(survey.confirmedAt ? [{ label: t('status.siteSurvey.CONFIRMED'), value: formatDateTime(survey.confirmedAt) }] : []),
          ]} />

          <div className="flex flex-wrap gap-2">{actions}</div>
          {lead && status && isMeasurable(status) && submitBlockers.length > 0 && (
            <p id="survey-submit-blockers" className="-mt-2 text-xs text-slate-500">
              {t('siteSurvey.submitBlocked.lead')} {submitBlockers.join(' · ')}
            </p>
          )}

          {resultShown && (
            <div className="border-t border-line pt-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-ink">{t('siteSurvey.result')}</h3>
                {status === 'CONFIRMED' && survey.floors.length > 0 && (
                  <Button size="sm" variant="ghost" aria-expanded={resultOpen} onClick={() => setShowResult((v) => !v)}>{t(resultOpen ? 'siteSurvey.hideResult' : 'siteSurvey.showResult')}</Button>
                )}
              </div>
              {resultOpen && <SurveyResult survey={survey} photosEditable={photosEditable} onFloorPhotos={setFloorPhotos} onStale={refresh} onMessage={say} />}
            </div>
          )}

          {canBook && (project.designer
            ? <Button variant="primary" onClick={() => setDialog('book')}>{t('siteSurvey.bookAgain')}</Button>
            : <Banner tone="amber">{t('siteSurvey.waitingLead')}</Banner>)}
        </div>
      )}

      {dialog === 'book' && <BookingModal projectId={project.id} onClose={() => setDialog('')} onSaved={(s) => done(s, 'booked')} />}
      {dialog === 'edit' && survey && <BookingModal projectId={project.id} survey={survey} onClose={() => setDialog('')} onSaved={(s) => done(s, 'updated')} />}
      {dialog === 'schedule' && survey && <ScheduleModal survey={survey} onClose={() => setDialog('')} onSaved={(s) => done(s, 'scheduled')} />}
      {dialog === 'measure' && survey && canMeasure && <MeasurementModal survey={survey} onClose={() => setDialog('')} onSaved={(s) => done(s, 'saved')} />}
      {dialog === 'cancel' && survey && (
        <ReasonModal danger title={t('siteSurvey.reason.cancelTitle')} placeholder={t('siteSurvey.reason.cancelPlaceholder')}
          confirmLabel={t('siteSurvey.reason.cancelConfirm')} cancelLabel={t('siteSurvey.reason.keep')} onClose={() => setDialog('')}
          onSubmit={async (reason) => done(await siteSurveyApi.cancel(survey.id, reason), 'cancelled')} />
      )}
      {dialog === 'reject' && survey && (
        <ReasonModal title={t('siteSurvey.reason.rejectTitle')} placeholder={t('siteSurvey.reason.rejectPlaceholder')}
          confirmLabel={t('siteSurvey.reason.rejectConfirm')} onClose={() => setDialog('')}
          onSubmit={async (reason) => done(await siteSurveyApi.reject(survey.id, reason), 'rejected')} />
      )}
      {dialog === 'confirm' && survey && (
        <Modal title={t('siteSurvey.confirmTitle')} onClose={() => setDialog('')}
          footer={<>
            <Button onClick={() => setDialog('')}>{t('common.cancel')}</Button>
            <Button variant="primary" loading={busy === 'confirm'} onClick={() => void run('confirm', () => siteSurveyApi.confirm(survey.id), 'confirmed')}>{t('siteSurvey.confirm')}</Button>
          </>}>
          <p className="text-sm text-slate-700">{t('siteSurvey.confirmBody')}</p>
        </Modal>
      )}
    </Card>
  );
}
