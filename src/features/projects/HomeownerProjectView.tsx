import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Ban, CircleCheck, Clock, CreditCard } from 'lucide-react';

import { AppShell, Button, Card, PageHeader, Skeleton, StatusChip, Stepper } from '@/components/ui';
import { formatDate, formatDateTime, t, tList } from '@/i18n';
import { canOpenWorkspace, stepIndex } from './projectApi';
import { getProjectContract } from './services/contractsApi';
import type { ContractResponse } from './services/contractsApi';
import type { Project } from './projectApi';
import { BudgetCard, HomeCard, PeopleCard } from './ProjectInfoSections';
import { PlanThumb } from './PlanThumb';
import { getCurrentUser } from '@/services/authService';
import { QuotationSummaryCard } from '@/features/quotations/QuotationSummaryCard';
import { ReviewCard } from '@/features/reviews/ReviewCard';
import { SiteSurveyCard } from '@/features/site-surveys/SiteSurveyCard';
import { conceptStep, designLabel, isClosed, knownVersion, needsAction, needsCheck, nextFor, useLatestVersions } from './projectView';

/** Homeowner overview of one project (/homeowner/projects/:id). Staff keeps its own layout in ProjectDetail.
 * The only "Open design" button is inside the Next step card; the latest drawing sits beside it. */
export function HomeownerProjectView({ project, onProjectChanged }: { project: Project; onProjectChanged: () => void }) {
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
  // While the project waits on its contract: the backend hides the contract from the homeowner until the staff send it
  // for signing (404 CONTRACT_NOT_FOUND) and has no push notifications, so ask again when the tab is shown and every 45 s.
  const waitingOnContract = project.status === 'CONTRACT_PENDING';
  const [contract, setContract] = useState<ContractResponse | null | undefined>(undefined);
  const [contractFailed, setContractFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkContract = useCallback(async () => {
    setChecking(true);
    try { setContract(await getProjectContract(project.id)); setContractFailed(false); }
    catch { setContractFailed(true); }
    finally { setChecking(false); }
  }, [project.id]);
  useEffect(() => {
    if (!waitingOnContract) return;
    const refresh = () => { if (document.visibilityState === 'visible') void checkContract(); };
    Promise.resolve().then(refresh);
    const timer = window.setInterval(refresh, 45_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [waitingOnContract, checkContract]);

  // Signing happens while the project is still CONTRACT_PENDING, so read the contract, not just the project.
  const signing = waitingOnContract && contract?.status === 'DRAFT' && contract.esignStatus === 'AWAITING_CUSTOMER';
  const contractPage = `/project-contract?projectId=${encodeURIComponent(project.id)}`;
  const next = signing ? t('homeownerDetail.signContractNext') : nextFor('homeowner', project, raw);
  // Blue card only when the homeowner really has to act (a version was sent to them, or a contract needs signing).
  const act = signing || needsAction('homeowner', project, raw);
  const open = () => navigate(`/projects/${project.id}/workspace`);
  // watermark on the drawing, as everywhere a plan is shown at readable size
  const [stamp] = useState(() => `${getCurrentUser()?.email ?? ''} ${formatDateTime(new Date().toISOString())}`);

  return (
    <AppShell>
      <PageHeader
        back={{ to: '/homeowner/projects', label: t('projectDetail.back') }}
        title={project.title}
        chip={project.status === 'CONTRACT_PENDING' && contract?.status === 'ACTIVE'
          ? <StatusChip label={t('projectDetail.waitingDeposit')} tone="yellow" />
          : <StatusChip kind="project" value={project.status} />}
        description={t('homeownerDetail.meta', {
          designer: project.designer?.fullName ?? t('projectDetail.notAssigned'), staff: project.staff.fullName,
        })}
        secondary={<Button onClick={() => navigate(`/project-contract?projectId=${encodeURIComponent(project.id)}`)}>{t('projectDetail.contract')}</Button>}
      />

      {project.status !== 'CANCELLED' && (
        <Card className="mb-5" bodyClassName="px-4 py-5 sm:px-6">
          <Stepper steps={tList('steps.project')} current={stepIndex(project.status)} emphasis optional={conceptStep(2)} />
        </Card>
      )}


      {(project.status === 'QUOTING' || project.status === 'COMPLETED') && <QuotationSummaryCard projectId={project.id} homeowner />}
      {/* back in product selection after asking for changes: say Lead is updating the products */}
      {project.status === 'PRODUCT_SELECTION' && <QuotationSummaryCard projectId={project.id} homeowner onlyAfterChangeRequest />}

      <section className="mb-5 flex flex-col gap-4 rounded-card border border-blue-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><CreditCard className="h-5 w-5" /></span>
          <div><h2 className="text-[15px] font-semibold text-slate-900">Contract payment</h2><p className="mt-1 text-sm text-slate-600">Review the real contract payment schedule and pay an issued installment.</p></div>
        </div>
        <Button variant="primary" onClick={() => navigate(`/homeowner/payments?projectId=${encodeURIComponent(project.id)}`)} className="self-start sm:self-auto">View payment schedule <ArrowRight aria-hidden className="h-4 w-4" /></Button>
      </section>

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
            <Button variant="primary" onClick={signing ? () => navigate(contractPage) : open} className="self-start">
              {signing ? t('homeownerDetail.signContract') : t('homeownerDetail.openDesign')}<ArrowRight aria-hidden className="h-4 w-4" />
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
                  {waitingOnContract && contractFailed && <p role="alert" className="mt-1 text-sm font-semibold text-amber-800">{t('homeownerDetail.checkContractFailed')}</p>}
                  {project.status !== 'CANCELLED' && (
                    // in the site survey the homeowner has things to do, so no "nothing to do yet"
                    <p className="mt-1 text-sm text-slate-600">{t(workspace ? 'homeownerDetail.browseNote'
                      : project.status === 'DRAFT' && project.apartment === null && project.designer ? 'nextStep.surveyHomeownerNote'
                        : 'homeownerDetail.waitingNote')}</p>
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
              {waitingOnContract && (
                <Button loading={checking} onClick={() => void checkContract()}>{t(contractFailed ? 'common.retry' : 'homeownerDetail.checkAgain')}</Button>
              )}
            </div>
          </section>
        )}
      </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {/* no home until the site survey is confirmed: the survey takes its place; a confirmed survey stays beside it while DRAFT */}
        <div className="space-y-5 lg:col-span-2">
          {project.apartment && <HomeCard project={project} />}
          {(!project.apartment || project.status === 'DRAFT') && (
            <SiteSurveyCard project={project} viewer="homeowner" apartmentsRole="homeowner" onProjectChanged={onProjectChanged} />
          )}
        </div>
        <div className="space-y-5">
          <ReviewCard projectId={project.id} completed={project.status === 'COMPLETED'} homeowner />
          <PeopleCard project={project} />
          <BudgetCard project={project} />
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-500">{t('projectDetail.created', { date: formatDate(project.createdAt) })}</p>
    </AppShell>
  );
}
