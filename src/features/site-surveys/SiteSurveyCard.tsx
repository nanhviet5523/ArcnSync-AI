import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banner, Button, Card, DetailList, ErrorState, Modal, Skeleton, StatusChip } from '@/components/ui';
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
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [showResult, setShowResult] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try { setSurveys(await siteSurveyApi.listByProject(project.id)); }
    catch (e) { setLoadError(surveyErrorText(e)); }
    finally { setLoading(false); }
  }, [project.id]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  // newest first: the first one is the current survey (possibly cancelled)
  const survey = surveys?.[0] ?? null;
  const status = survey?.status;
  const audience = viewer === 'homeowner' ? 'homeowner' : viewer === 'lead' ? 'lead' : 'other';
  const say = (tone: 'success' | 'error', text: string) => setMessage({ tone, text });
  const replace = (next: SiteSurvey) => setSurveys((list) => (list?.some((s) => s.id === next.id) ? list.map((s) => (s.id === next.id ? next : s)) : [next, ...(list ?? [])]));
  const done = (next: SiteSurvey, key: string) => { replace(next); setDialog(''); say('success', t(`siteSurvey.done.${key}`)); };
  const setFloorPhotos = (floorId: string, photos: SurveyPhoto[]) => {
    if (!survey) return;
    replace({ ...survey, floors: survey.floors.map((f) => (f.id === floorId ? { ...f, photos } : f)) });
  };

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
  const photosEditable = lead && !!status && isMeasurable(status);
  const homeLink = status === 'CONFIRMED' && apartmentsRole ? APARTMENTS_PAGE[apartmentsRole] : undefined;
  // a confirmed result stays folded once the home exists; the Home card shows it
  const resultOpen = status === 'SUBMITTED' || status === 'REJECTED' || photosEditable || showResult;
  // the Lead works on the result from the visit on; everyone else sees it once it has been submitted
  const resultShown = !!survey && (lead
    ? status !== 'REQUESTED' && status !== 'CANCELLED'
    : (status === 'SUBMITTED' || status === 'CONFIRMED' || status === 'REJECTED') && survey.floors.length > 0);

  const actions = survey && <>
    {viewer === 'homeowner' && status && isBooked(status) && <Button size="sm" onClick={() => setDialog('edit')}>{t('siteSurvey.changeBooking')}</Button>}
    {lead && status === 'REQUESTED' && <Button size="sm" variant="primary" onClick={() => setDialog('schedule')}>{t('siteSurvey.pickTime')}</Button>}
    {lead && status === 'SCHEDULED' && <Button size="sm" onClick={() => setDialog('schedule')}>{t('siteSurvey.reschedule')}</Button>}
    {lead && status && isMeasurable(status) && (
      <Button size="sm" variant={survey.floors.length ? 'secondary' : 'primary'} onClick={() => setDialog('measure')}>
        {t(survey.floors.length ? 'siteSurvey.editResults' : 'siteSurvey.record')}
      </Button>
    )}
    {lead && status && isMeasurable(status) && survey.floors.length > 0 && (
      <Button size="sm" variant="primary" loading={busy === 'submit'} onClick={() => void run('submit', () => siteSurveyApi.submit(survey.id), 'submitted')}>{t('siteSurvey.submit')}</Button>
    )}
    {viewer === 'homeowner' && status === 'SUBMITTED' && <>
      <Button size="sm" onClick={() => setDialog('reject')}>{t('siteSurvey.reject')}</Button>
      <Button size="sm" variant="primary" onClick={() => setDialog('confirm')}>{t('siteSurvey.confirm')}</Button>
    </>}
    {status && isBooked(status) && canCancel && viewer !== 'member' && (
      <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => setDialog('cancel')}>{t('siteSurvey.cancel')}</Button>
    )}
    {homeLink && <Link to={homeLink} className="inline-flex h-8 items-center rounded-lg border border-line-strong px-2.5 text-[13px] font-medium text-slate-800 hover:bg-slate-50">{t('siteSurvey.viewHome')}</Link>}
  </>;

  return (
    <Card className={className}
      title={<span className="flex items-center gap-2">{t('siteSurvey.title')}{status && <StatusChip kind="siteSurvey" value={status} size="sm" />}</span>}
      description={t(viewer === 'homeowner' ? 'siteSurvey.introHomeowner' : 'siteSurvey.introTeam')}
      actions={<Button size="sm" variant="ghost" loading={loading && surveys !== null} onClick={() => void load()}>{t('siteSurvey.refresh')}</Button>}>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'}
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${message.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-800'}`}>
          {message.text}
        </p>
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
          <p className="text-sm font-medium text-slate-800">{t(`siteSurvey.statusText.${survey.status}.${audience}`)}</p>

          {status === 'REJECTED' && survey.rejectionReason && (
            <Banner tone="amber"><span className="font-semibold">{t('siteSurvey.rejectionReason')}:</span> <span className="whitespace-pre-line">{survey.rejectionReason}</span></Banner>
          )}
          {status === 'CANCELLED' && survey.cancelReason && (
            <p className="text-sm text-slate-600"><span className="text-slate-500">{t('siteSurvey.cancelReason')}:</span> {survey.cancelReason}</p>
          )}

          <DetailList items={[
            {
              label: t('siteSurvey.visit'),
              value: survey.scheduledSlot ? <span className="font-medium">{slotLabel(survey.scheduledSlot)}</span> : <span className="text-slate-500">{t('siteSurvey.notScheduled')}</span>,
            },
            ...(!survey.scheduledSlot || status === 'REQUESTED' ? [{
              label: t('siteSurvey.proposedTimes'),
              value: <ul className="space-y-0.5">{survey.proposedSlots.map((s, i) => <li key={i} className={isPast(s) ? 'text-slate-400 line-through' : ''}>{slotLabel(s)}</li>)}</ul>,
            }] : []),
            { label: t('siteSurvey.home'), value: <>{[survey.buildingName, survey.tower, survey.unitNo].filter(Boolean).join(', ')}<span className="block text-xs text-slate-500">{survey.address}</span></> },
            ...(survey.floorNo != null ? [{ label: t('siteSurvey.floorNo'), value: String(survey.floorNo) }] : []),
            ...(survey.customerNote ? [{ label: t('siteSurvey.customerNote'), value: <span className="whitespace-pre-line">{survey.customerNote}</span> }] : []),
            ...(survey.confirmedAt ? [{ label: t('status.siteSurvey.CONFIRMED'), value: formatDateTime(survey.confirmedAt) }] : []),
          ]} />

          <div className="flex flex-wrap gap-2">{actions}</div>

          {resultShown && (
            <div className="border-t border-line pt-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-slate-800">{t('siteSurvey.result')}</h3>
                {status === 'CONFIRMED' && survey.floors.length > 0 && (
                  <Button size="sm" variant="ghost" aria-expanded={resultOpen} onClick={() => setShowResult((v) => !v)}>{t(resultOpen ? 'siteSurvey.hideResult' : 'siteSurvey.showResult')}</Button>
                )}
              </div>
              {resultOpen && <SurveyResult survey={survey} photosEditable={photosEditable} onFloorPhotos={setFloorPhotos} onMessage={say} />}
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
      {dialog === 'measure' && survey && <MeasurementModal survey={survey} onClose={() => setDialog('')} onSaved={(s) => done(s, 'saved')} />}
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
