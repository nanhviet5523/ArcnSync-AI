import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell, Button, Card, DetailList, ErrorState, PageHeader, Skeleton, StatusChip, avatarTone, initials, toast } from '@/components/ui';
import { CalendarDays, Copy, Signpost, Sparkles, Wallet } from 'lucide-react';
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
  /** Child cards and dialogs report through the app toasts (they stack: saving the team may report two at once). */
  const setToast = (next: ContractToast) => { toast.show(next); };

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
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(project.code);
      toast.success(t('projectDetail.codeCopied', { code: project.code }));
    } catch { toast.error(t('errors.unknownNoCode')); }
  };
  // People card rows: initials in a colour from the person's id; an unassigned designer is a dashed circle.
  const people = [
    { role: t('projectDetail.homeowner'), person: project.customer, sub: staff ? project.customer.email : undefined },
    { role: t('projectDetail.staff'), person: project.staff },
    { role: t('projectDetail.designer'), person: project.designer },
  ];
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
        description={(
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button type="button" onClick={() => void copyCode()} title={t('projectDetail.copyCode')} aria-label={`${t('projectDetail.copyCode')}: ${project.code}`}
              className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-xs text-slate-700 transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">
              {project.code}
              <Copy aria-hidden className="h-3 w-3 text-slate-400 transition-colors group-hover:text-brand" />
            </button>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden className="h-3.5 w-3.5 text-slate-400" />
              {t('projectDetail.created', { date: formatDate(project.createdAt) })}
            </span>
          </span>
        )}
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
        // The one thing to do now: brand wash, a signpost that pings twice when the page opens, then rests.
        <div className="step-in mb-5 flex items-center gap-4 overflow-hidden rounded-card border border-brand/20 bg-linear-to-r from-brand-soft via-brand-soft/50 to-surface px-4 py-4 shadow-card sm:px-5">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-card">
            <span aria-hidden className="absolute inset-0 animate-ping rounded-xl bg-brand/35 [animation-iteration-count:2] motion-reduce:hidden" />
            <Signpost aria-hidden className="relative h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand">{t('nextStep.title')}</p>
            <p className="mt-0.5 text-[15px] font-semibold leading-snug text-ink">{next}</p>
          </div>
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
              ...(a.bedroomCount != null || a.bathroomCount != null ? [{ label: t('projectDetail.rooms'), value: t('projectDetail.roomsValue', { bed: a.bedroomCount ?? '—', bath: a.bathroomCount ?? '—' }) }] : []),
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
          <ul className="space-y-3">
            {people.map(({ role: label, person, sub }) => (
              <li key={label} className="flex items-center gap-3">
                {person ? (
                  <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarTone(person.id)}`}>{initials(person.fullName)}</span>
                ) : <span aria-hidden className="h-9 w-9 shrink-0 rounded-full border-2 border-dashed border-slate-300" />}
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${person ? 'font-medium text-slate-900' : 'text-slate-500'}`}>{person ? person.fullName : t('projectDetail.notAssigned')}</p>
                  {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-canvas px-2.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-line">{label}</span>
              </li>
            ))}
          </ul>
          {staff && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-canvas px-3.5 py-3">
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Wallet className="h-[18px] w-[18px]" /></span>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{t('projectDetail.budget')}</p>
                <p className="font-semibold tabular-nums text-slate-900">{t('projectDetail.budgetValue', { min: formatMoney(project.budgetMin), max: formatMoney(project.budgetMax) })}</p>
              </div>
            </div>
          )}

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

      {project.status === 'COMPLETED' && (
        <div className="mt-5 lg:w-1/2 lg:pr-2.5">
          <ReviewCard projectId={project.id} completed homeowner={false} />
        </div>
      )}
    </AppShell>
  );
}
