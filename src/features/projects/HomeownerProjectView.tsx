import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Ban, CircleCheck, Clock } from 'lucide-react';
import { AppShell, Button, Card, PageHeader, Skeleton, StatusChip, Stepper } from '@/components/ui';
import { formatDate, formatDateTime, t, tList } from '@/i18n';
import { canOpenWorkspace, stepIndex } from './projectApi';
import type { Project } from './projectApi';
import { BudgetCard, HomeCard, PeopleCard } from './ProjectInfoSections';
import { PlanThumb } from './PlanThumb';
import { getCurrentUser } from '@/services/authService';
import { conceptStep, designLabel, isClosed, knownVersion, needsAction, needsCheck, nextFor, useLatestVersions } from './projectView';

/** Homeowner overview of one project (/homeowner/projects/:id). Staff keeps its own layout in ProjectDetail.
 * The only "Open design" button is inside the Next step card; the latest drawing sits beside it. */
export function HomeownerProjectView({ project }: { project: Project }) {
  const navigate = useNavigate();
  const workspace = canOpenWorkspace(project.status);
  const list = useMemo(() => [project], [project]);
  const { latest, retry } = useLatestVersions(list, 'homeowner');
  const raw = latest(project.id);
  // Until the first check answers, show placeholders rather than a "nothing to do" card that may flip to "review now".
  const loading = needsCheck(project) && raw === undefined;
  // a failed check keeps its card while retrying, so focus stays on Retry and the live region announces the change
  // a completed project shows its final design when it loads, and a quiet done card when it doesn't
  const failed = (raw === 'error' || raw === 'checking') && !isClosed(project.status);
  const retrying = raw === 'checking';
  const v = knownVersion(raw);
  const next = nextFor('homeowner', project, raw);
  // Blue card only when the homeowner really has to act (a version was sent to them).
  const act = needsAction('homeowner', project, raw);
  const open = () => navigate(`/projects/${project.id}/workspace`);
  // watermark on the drawing, as everywhere a plan is shown at readable size
  const [stamp] = useState(() => `${getCurrentUser()?.email ?? ''} ${formatDateTime(new Date().toISOString())}`);

  return (
    <AppShell>
      <PageHeader
        back={{ to: '/homeowner/projects', label: t('projectDetail.back') }}
        title={project.title}
        chip={<StatusChip kind="project" value={project.status} />}
        description={t('homeownerDetail.meta', {
          designer: project.designer?.fullName ?? t('projectDetail.notAssigned'), staff: project.staff.fullName,
        })}
      />

      {project.status !== 'CANCELLED' && (
        <Card className="mb-5" bodyClassName="px-4 py-5 sm:px-6">
          <Stepper steps={tList('steps.project')} current={stepIndex(project.status)} emphasis optional={conceptStep(2)} />
        </Card>
      )}

      {/* the drawing comes first: latest version beside the next step */}
      {loading ? (
        <div aria-busy="true" className="mb-5 grid gap-5 lg:grid-cols-5">
          <Skeleton className="h-[19rem] w-full rounded-card sm:h-[23rem] lg:col-span-3" />
          <Skeleton className="h-40 w-full rounded-card lg:col-span-2 lg:h-auto" />
        </div>
      ) : (
      <div className={`mb-5 grid gap-5 ${v ? 'lg:grid-cols-5' : ''}`}>
        {v && (
          <section aria-labelledby="latest-design" className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card lg:col-span-3">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <h2 id="latest-design" className="text-[15px] font-semibold text-slate-900">{t('homeownerDetail.latestDesign', { v: designLabel(v.label) })}</h2>
              <StatusChip kind="version" value={v.status} size="sm" />
            </div>
            <div className="relative h-64 bg-stage sm:h-80">
              <PlanThumb versionId={v.id} className="h-full w-full" fallback={null} />
              <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-wrap content-around justify-around overflow-hidden opacity-[0.07]">
                {[0, 1, 2].map((i) => <span key={i} className="-rotate-12 text-xs font-semibold">{stamp}</span>)}
              </div>
            </div>
          </section>
        )}

        {act ? (
          <section aria-labelledby="next-step" className={`flex flex-col justify-center gap-4 rounded-card border border-blue-100 bg-brand-soft p-5 sm:p-6 ${v ? 'lg:col-span-2' : 'sm:flex-row sm:items-center sm:justify-between'}`}>
            <div className="min-w-0">
              <h2 id="next-step" className="text-[13px] font-medium text-brand">{t('nextStep.title')}</h2>
              <p className="mt-1 text-[15px] font-semibold leading-snug text-slate-900 sm:text-2xl sm:leading-tight">{next}</p>
            </div>
            <Button variant="primary" onClick={open} className="self-start">
              {t('homeownerDetail.openDesign')}<ArrowRight aria-hidden className="h-4 w-4" />
            </Button>
          </section>
        ) : (
          <section aria-labelledby="next-step" className={`flex flex-col gap-4 rounded-card border border-line bg-slate-50 p-5 sm:p-6 ${v ? 'justify-center lg:col-span-2' : 'sm:flex-row sm:items-center'}`}>
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-card">
              {/* a waiting clock only while something is still to come */}
              {project.status === 'CANCELLED' ? <Ban className="h-5 w-5" /> : project.status === 'COMPLETED' ? <CircleCheck className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="next-step" className="text-[13px] font-medium text-slate-500">{t('nextStep.title')}</h2>
              {failed ? (
                <p aria-live="polite" className="mt-1 text-[15px] font-semibold leading-snug text-amber-800">
                  {t(retrying ? 'cards.checking.homeowner' : 'cards.checkFailed.homeowner')}
                </p>
              ) : (
                <>
                  <p className="mt-1 text-[15px] font-semibold leading-snug text-slate-900">{next}</p>
                  {project.status !== 'CANCELLED' && (
                    <p className="mt-1 text-sm text-slate-600">{t(workspace ? 'homeownerDetail.browseNote' : 'homeownerDetail.waitingNote')}</p>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2 self-start">
              {failed && (
                <Button aria-disabled={retrying} onClick={() => !retrying && retry(project.id)} className="aria-disabled:cursor-wait">
                  {retrying && <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}
                  {t('common.retry')}
                </Button>
              )}
              {workspace && <Button onClick={open}>{t('homeownerDetail.openDesign')}</Button>}
            </div>
          </section>
        )}
      </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <HomeCard project={project} className="lg:col-span-2" />
        <div className="space-y-5">
          <PeopleCard project={project} />
          <BudgetCard project={project} />
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-500">{t('projectDetail.created', { date: formatDate(project.createdAt) })}</p>
    </AppShell>
  );
}
