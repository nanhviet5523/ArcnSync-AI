import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell, Banner, Button, Card, DetailList, ErrorState, PageHeader, Skeleton, StatusChip } from '@/components/ui';
import { Sparkles } from 'lucide-react';
import { errorText, formatDate, formatMoney, formatNumber, t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { canOpenWorkspace, kickoffErrorText, kickoffProjectDesign, projectApi } from './projectApi';
import type { DesignerOption, Project } from './projectApi';
import { TeamCard } from '@/features/design-workspace/TeamCard';
import { isOffTeam, resolveProjectRole } from '@/features/design-workspace/logic';
import { SiteSurveyCard } from '@/features/site-surveys/SiteSurveyCard';
import type { Role } from '@/features/design-workspace/types';
import { DesignTeamCard } from './DesignTeamCard';
import { NotOnTeam } from './NotOnTeam';
import { HomeownerProjectView } from './HomeownerProjectView';
import { RoomAssignmentsTab } from './RoomAssignmentsTab';
import { ReviewCard } from '@/features/reviews/ReviewCard';
import { HandoverCard } from '@/features/quotations/HandoverCard';
import { nextFor, useLatestVersions } from './projectView';
import { ConceptCard } from '@/features/concepts/ConceptCard';
import { useProjectConcepts } from '@/features/concepts/useProjectConcepts';
import { conceptSummary } from '@/features/concepts/conceptApi';
import { CreateContractModal } from './CreateContractModal';
import { ProjectStepper } from './ProjectStepper';
import { EditProjectModal } from './EditProjectModal';
import type { ContractToast } from './CreateContractModal';
import { getProjectContract } from './services/contractsApi';
import { isUuid } from './services/contractsApi';
import type { ContractResponse } from './services/contractsApi';

/** Project overview for Staff (/staff/projects/:id), Designer (/designer/projects/:id) and Homeowner (/homeowner/projects/:id). */
export function ProjectDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const role = getCurrentUser()?.role ?? 'homeowner';
  const userId = getCurrentUser()?.id ?? '';
  const staff = role === 'staff' || role === 'admin';
  const designer = role === 'designer';
  // the workspace's roles: a supplier never reaches a project page
  const viewerRole: Role = role === 'staff' || role === 'admin' || role === 'designer' ? role : 'homeowner';
  const [project, setProject] = useState<Project | null>(null);
  const [designers, setDesigners] = useState<DesignerOption[] | null>(null);
  const [error, setError] = useState('');
  const [offTeam, setOffTeam] = useState(false);
  const [busy, setBusy] = useState<'' | 'kickoff'>('');
  /** Staff only. undefined = not checked yet (or the check failed), null = the project has no contract. */
  const [contract, setContract] = useState<ContractResponse | null | undefined>(undefined);
  const [contractOpen, setContractOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  /** Bumped after the Lead changes, so the room assignments are fetched again. */
  const [roomsKey, setRoomsKey] = useState(0);
  const [contractCheckFailed, setContractCheckFailed] = useState(false);
  /** Toasts stack: saving the team may report the save and the rooms handed to the Lead at once. */
  const [toasts, setToasts] = useState<(ContractToast & { id: number })[]>([]);
  const toastSeq = useRef(0);
  const setToast = useCallback((next: ContractToast) => {
    const toastId = ++toastSeq.current;
    setToasts((list) => [...list, { ...next, id: toastId }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== toastId)), 3500);
  }, []);

  // A toast handed over by the page we came back from (the contract page after the PDF upload), shown once.
  const location = useLocation();
  useEffect(() => {
    const handed = (location.state as { toast?: ContractToast } | null)?.toast;
    if (!handed) return;
    setToast(handed);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, setToast]);

  const load = useCallback(async () => {
    setError('');
    // A malformed id would only come back as 400 BAD_REQUEST: show "not found" without calling the API.
    if (!isUuid(id)) { setError(t('errors.notFound')); return; }
    try {
      const [p, d, rooms] = await Promise.all([projectApi.get(id), staff ? projectApi.listDesigners() : Promise.resolve(null), designer ? projectApi.listRoomAssignments(id) : Promise.resolve([])]);
      // same fields as a row of the project list, so the next step reads the same on both
      setProject({ ...p, myRooms: rooms.filter((a) => a.designerId === userId).map((a) => ({ id: a.roomId, name: a.roomName, floorId: a.floorId })) });
      if (d) setDesigners(d.items);
    } catch (e) {
      if (isOffTeam(e, viewerRole)) setOffTeam(true);
      else setError(errorText(e));
    }
  }, [id, staff, designer, userId, viewerRole]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const loadContract = useCallback(async () => {
    if (!staff || !id) return;
    try {
      setContract(await getProjectContract(id));
      setContractCheckFailed(false);
    } catch {
      // Not "no contract": offer a retry instead of the Create contract button.
      setContract(undefined);
      setContractCheckFailed(true);
    }
  }, [id, staff]);
  useEffect(() => { Promise.resolve().then(loadContract); }, [loadContract]);

  const forVersions = useMemo(() => (designer && project ? [project] : null), [designer, project]);
  const { latest, ready } = useLatestVersions(forVersions, 'designer');
  // the homeowner's view loads its own concepts
  const conceptData = useProjectConcepts(staff || designer ? project : null);

  // The kickoff is not idempotent: the ref blocks a second click before the loading state renders.
  const kickoffRunning = useRef(false);
  const startDesign = async (projectId: string) => {
    if (kickoffRunning.current) return;
    kickoffRunning.current = true;
    setBusy('kickoff');
    try {
      await kickoffProjectDesign(projectId);
      setToast({ tone: 'success', message: t('kickoff.success') });
      await load();
    } catch (e) {
      setToast({ tone: 'error', message: kickoffErrorText(e) });
      // the project may have moved on server-side: sync the page
      void load();
    } finally {
      kickoffRunning.current = false;
      setBusy('');
    }
  };
  const contractPage = `/project-contract?projectId=${encodeURIComponent(id)}`;
  const back = { to: staff ? '/staff/projects' : designer ? '/designer/projects' : '/homeowner/projects', label: t('projectDetail.back') };

  if (offTeam) return <AppShell><NotOnTeam /></AppShell>;
  if (error) return <AppShell><PageHeader back={back} title={t('projectDetail.back')} /><ErrorState message={error} onRetry={load} /></AppShell>;
  if (!project) {
    return (
      <AppShell>
        <Skeleton className="mb-3 h-4 w-24" /><Skeleton className="mb-6 h-8 w-80 max-w-full" /><Skeleton className="mb-6 h-12 w-full" />
        <div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
      </AppShell>
    );
  }

  if (!staff && !designer) return <HomeownerProjectView project={project} onProjectChanged={() => void load()} />;

  const a = project.apartment;
  const floors = [...(a?.floors ?? [])].sort((x, y) => x.level - y.level);
  // The kickoff API only accepts REQUIREMENT_ANALYSIS (it answers 422 INVALID_PROJECT_STATUS_TRANSITION before the deposit is paid).
  const kickoffReady = project.status === 'REQUIREMENT_ANALYSIS';
  // The contract is signed (ACTIVE) but the deposit is not paid: the project is still CONTRACT_PENDING until it is.
  const waitingDeposit = project.status === 'CONTRACT_PENDING' && contract?.status === 'ACTIVE';
  const workspace = canOpenWorkspace(project.status);
  // "Start design": REQUIREMENT_ANALYSIS, a Lead assigned, and Admin or the Staff member in charge
  const canKickoff = kickoffReady && !!project.designer && (role === 'admin' || (role === 'staff' && project.staff.id === userId));
  // PATCH /projects/:id: a DRAFT project, by Admin or the Staff member in charge
  const canEditProject = project.status === 'DRAFT' && (role === 'admin' || (role === 'staff' && project.staff.id === userId));
  // Site survey: the Lead is per project (projectRole), not an account role; Staff in charge or Admin may cancel it
  const surveyViewer = staff ? 'staff' : resolveProjectRole(project, userId) === 'LEAD' ? 'lead' : 'member';
  const canCancelSurvey = surveyViewer === 'lead' || role === 'admin' || (role === 'staff' && project.staff.id === userId);
  // DRAFT: the survey card stays until the contract stage, so a confirmed survey still says the home was created
  const showSurvey = !a || project.status === 'DRAFT';
  const surveyCard = (className = '') => (
    <SiteSurveyCard project={project} viewer={surveyViewer} canCancel={canCancelSurvey} apartmentsRole={staff ? role : undefined}
      onProjectChanged={() => void load()} className={className} />
  );
  const open = () => navigate(`/projects/${project.id}/workspace`);
  const projectRole = designer ? resolveProjectRole(project, userId) : null;
  // In design before a concept is chosen, the Lead's next step is the concept, not the layout.
  const conceptNext = projectRole === 'LEAD' && conceptData.conceptDone === false && conceptData.concepts
    ? t(conceptSummary(conceptData.concepts).submittedCount ? 'concepts.nextLeadWaiting' : 'concepts.nextLead')
    : '';
  // one sentence for this page and the project's card; a designer waits for the version check
  const next = waitingDeposit
    ? t('nextStep.staffWaitingDeposit')
    : conceptNext || (designer && !ready ? '' : nextFor(role, project, designer ? latest(project.id) : undefined));

  // quotation stage: staff's next step is the quotation, the workspace stays one click away
  const quoting = project.status === 'QUOTING' || project.status === 'COMPLETED';
  const quotationFirst = staff && project.status === 'QUOTING';
  const openQuotation = () => navigate(`/projects/${project.id}/quotation`);
  const workspaceLabel = t(role === 'admin' ? 'projectDetail.openViewOnly' : 'projectDetail.openWorkspace');
  // In design before a concept is chosen the Lead's main action is the concept card on this page; the workspace stays one click away.
  const conceptFirst = projectRole === 'LEAD' && project.status === 'IN_DESIGN' && conceptData.conceptDone === false;
  const toConcepts = () => document.getElementById('concept')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const secondary = quotationFirst || conceptFirst
    ? (workspace ? <Button onClick={open}>{workspaceLabel}</Button> : undefined)
    : quoting ? <Button onClick={openQuotation}>{t('projectDetail.openQuotation')}</Button> : undefined;

  // exactly one primary action, following the next step
  const primary = quotationFirst
    ? <Button variant="primary" onClick={openQuotation}>{t('projectDetail.openQuotation')}</Button>
    : conceptFirst
    ? <Button variant="primary" onClick={toConcepts}>{t('projectDetail.workOnConcepts')}</Button>
    : workspace
    ? <Button variant="primary" onClick={open}>{workspaceLabel}</Button>
    : canKickoff
      ? <Button variant="primary" loading={busy === 'kickoff'} disabled={busy === 'kickoff'}
          onClick={() => void startDesign(project.id)}>{t('projectDetail.startDesign')}</Button>
      : null;

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={project.title}
        chip={waitingDeposit ? <StatusChip label={t('projectDetail.waitingDeposit')} tone="yellow" /> : <StatusChip kind="project" value={project.status} />}
        description={<>{project.code}<span className="mx-2 text-slate-300">|</span>{t('projectDetail.created', { date: formatDate(project.createdAt) })}</>}
        primary={primary}
        secondary={<>
          <Button onClick={() => navigate(`/projects/${encodeURIComponent(project.id)}/ai`)}><Sparkles aria-hidden className="h-4 w-4" />AI assistant</Button>
          {secondary}
          {canEditProject && <Button onClick={() => setEditOpen(true)}>{t('editProject.open')}</Button>}
          {/* POST /projects/:id/contract answers 422 SITE_SURVEY_NOT_CONFIRMED until the homeowner confirms the survey (which attaches the home) */}
          {staff && project.status === 'DRAFT' && contract === null && (
            <Button disabled={project.apartment === null} title={project.apartment === null ? t('projectDetail.createContractLocked') : undefined}
              onClick={() => setContractOpen(true)}>{t('projectDetail.createContract')}</Button>
          )}
          {staff && contractCheckFailed && <Button title={t('contractPage.contractStatusFailed')} onClick={() => void loadContract()}>{t('contractPage.retryCheck')}</Button>}
          {/* A staff member with no contract yet creates it with the button above; "Contract" has nothing to show until then. */}
          {!(staff && contract === null) && <Button onClick={() => navigate(contractPage)}>{t('projectDetail.contract')}</Button>}
        </>}
      />
      {staff && kickoffReady && !project.designer && <p className="-mt-4 mb-5 text-right text-xs text-amber-700">{t('projectDetail.startDesignHint')}</p>}
      {staff && project.status === 'DRAFT' && project.apartment === null && contract === null && <p className="-mt-4 mb-5 text-right text-xs text-slate-500">{t('projectDetail.createContractLocked')}</p>}

      <Card className="mb-5" bodyClassName="px-4 py-4 sm:px-6">
        <ProjectStepper status={project.status} />
      </Card>

      {next && (
        <div className="mb-5">
          <Banner tone="blue">
            <p className="text-[13px] font-medium text-brand-text">{t('nextStep.title')}</p>
            <p className="mt-0.5 text-[15px] font-semibold text-ink">{next}</p>
          </Banner>
        </div>
      )}

      {/* after the homeowner accepts the quotation: Lead prepares the package, staff and members follow it */}
      {quoting && <HandoverCard className="mb-5" project={project} role={role} projectRole={projectRole} onChanged={() => void load()} />}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* a new project has no home until the site survey is confirmed: the survey takes the Home card's place */}
        {!a ? surveyCard() : <Card title={t('projectDetail.home')}>
          <>
          <DetailList items={[
            { label: t('projectDetail.type'), value: a.propertyType ? t(`projectDetail.propertyType.${a.propertyType}`) : t('common.none') },
            { label: t('projectDetail.address'), value: a.address },
            { label: t('projectDetail.unit'), value: [a.buildingName, a.tower, a.unitNo].filter(Boolean).join(', ') },
            ...(a.netArea ? [
              { label: t('projectDetail.area'), value: t('projectDetail.areaValue', { area: formatNumber(a.netArea) }) },
              { label: t('projectDetail.rooms'), value: t('projectDetail.roomsValue', { bed: a.bedroomCount ?? 0, bath: a.bathroomCount ?? 0 }) },
            ] : []),
          ]} />
          <div className="mt-5">
            <h3 className="mb-2 text-[13px] font-medium text-slate-700">{t('projectDetail.floors')}</h3>
            {floors.length ? (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr className="border-b border-line"><th className="py-1.5 font-medium">{t('projectDetail.floorName')}</th><th className="py-1.5 text-right font-medium">{t('projectDetail.floorHeight')}</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {floors.map((f) => (
                    <tr key={f.id}><td className="py-2 text-ink">{f.name}</td><td className="py-2 text-right tabular-nums text-slate-600">{t('projectDetail.heightValue', { mm: formatNumber(f.floorHeightMm) })}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-slate-500">{t('projectDetail.noFloors')}</p>}
          </div>
          </>
        </Card>}

        <Card title={t('projectDetail.people')}>
          <DetailList items={[
            { label: t('projectDetail.homeowner'), value: <>{project.customer.fullName}{staff && project.customer.email && <span className="block text-xs text-slate-500">{project.customer.email}</span>}</> },
            { label: t('projectDetail.staff'), value: project.staff.fullName },
            { label: t('projectDetail.designer'), value: project.designer ? project.designer.fullName : <span className="text-slate-500">{t('projectDetail.notAssigned')}</span> },
            ...(staff ? [{ label: t('projectDetail.budget'), value: <span className="tabular-nums">{t('projectDetail.budgetValue', { min: formatMoney(project.budgetMin), max: formatMoney(project.budgetMax) })}</span> }] : []),
          ]} />

          {(designer || staff) && project.designer && (
            <div className="mt-5 border-t border-line pt-4">
              {/* read-only: Staff edit the team below (DesignTeamCard) */}
              <TeamCard bare project={project} role={viewerRole} reloadKey={roomsKey} />
            </div>
          )}

          {staff && (
            <div className="mt-5 border-t border-line pt-4">
              <DesignTeamCard project={project} role={viewerRole} designers={designers} onToast={setToast} onSaved={() => { void load(); setRoomsKey((k) => k + 1); }} />
              {kickoffReady && <p className="mt-3 text-xs text-slate-500">{t('projectDetail.kickoffNote')}</p>}
            </div>
          )}
        </Card>
      </div>
      {a && showSurvey && surveyCard('mt-5')}
      <ConceptCard className="mt-5" projectId={project.id} projectStatus={project.status} role={role} projectRole={projectRole}
        data={conceptData} />
      <div className="mt-5">
        <RoomAssignmentsTab projectId={project.id} leadDesignerId={project.designer?.id ?? null} apartmentRooms={project.apartment?.rooms} floors={project.apartment?.floors} leadName={project.designer?.fullName} members={project.members} closed={project.status === 'COMPLETED' || project.status === 'CANCELLED'} reloadKey={roomsKey} />
      </div>

      {editOpen && (
        <EditProjectModal
          project={project}
          onClose={() => setEditOpen(false)}
          onToast={setToast}
          onSaved={() => { setEditOpen(false); void load(); }}
        />
      )}
      {contractOpen && (
        <CreateContractModal
          projectId={project.id}
          onClose={() => setContractOpen(false)}
          onToast={setToast}
          // next step is the contract PDF: the contract page takes the upload, then brings the Staff back here
          onCreated={() => { setContractOpen(false); navigate(`${contractPage}&next=upload`); }}
          onAlreadyExists={() => { setContractOpen(false); void load(); void loadContract(); setTimeout(() => navigate(contractPage), 1200); }}
        />
      )}
      {toasts.length > 0 && (
        <div className="fixed right-4 top-4 z-[80] flex max-w-sm flex-col gap-2">
          {toasts.map((toast) => (
            <div key={toast.id} role={toast.tone === 'success' ? 'status' : 'alert'}
              className={`max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
                toast.tone === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                  : toast.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-red-100 bg-red-50 text-red-700'}`}>
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {project.status === 'COMPLETED' && (
        <div className="mt-5 lg:w-1/2 lg:pr-2.5">
          <ReviewCard projectId={project.id} completed homeowner={false} />
        </div>
      )}
    </AppShell>
  );
}
