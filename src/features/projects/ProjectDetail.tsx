import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell, Banner, Button, Card, DetailList, ErrorState, PageHeader, Skeleton, StatusChip, Stepper } from '@/components/ui';
import { errorText, formatDate, formatMoney, formatNumber, t, tList } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { canOpenWorkspace, projectApi, stepIndex } from './projectApi';
import type { DesignerOption, Project } from './projectApi';
import { TeamCard } from '@/features/design-workspace/TeamCard';
import { isOffTeam } from '@/features/design-workspace/logic';
import type { Role } from '@/features/design-workspace/types';
import { DesignTeamCard } from './DesignTeamCard';
import { NotOnTeam } from './NotOnTeam';
import { HomeownerProjectView } from './HomeownerProjectView';
import { RoomAssignmentsTab } from './RoomAssignmentsTab';
import { ReviewCard } from '@/features/reviews/ReviewCard';
import { conceptStep, nextFor, useLatestVersions } from './projectView';
import { CreateContractModal } from './CreateContractModal';
import type { ContractToast } from './CreateContractModal';
import { getProjectContract } from './services/contractsApi';
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
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState<'' | 'kickoff'>('');
  /** Staff only. undefined = not checked yet (or the check failed), null = the project has no contract. */
  const [contract, setContract] = useState<ContractResponse | null | undefined>(undefined);
  const [contractOpen, setContractOpen] = useState(false);
  const [contractCheckFailed, setContractCheckFailed] = useState(false);
  const [toast, setToast] = useState<ContractToast | null>(null);

  const load = useCallback(async () => {
    setError('');
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

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const forVersions = useMemo(() => (designer && project ? [project] : null), [designer, project]);
  const { latest, ready } = useLatestVersions(forVersions, 'designer');

  const act = async (kind: 'kickoff', fn: () => Promise<Project>) => {
    setBusy(kind); setActionError('');
    try { await fn(); await load(); } catch (e) { setActionError(errorText(e)); } finally { setBusy(''); }
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

  if (!staff && !designer) return <HomeownerProjectView project={project} />;

  const a = project.apartment;
  const floors = [...(a.floors ?? [])].sort((x, y) => x.level - y.level);
  // The kickoff API only accepts REQUIREMENT_ANALYSIS (it answers 422 INVALID_PROJECT_STATUS_TRANSITION before the deposit is paid).
  const kickoffReady = project.status === 'REQUIREMENT_ANALYSIS';
  // The contract is signed (ACTIVE) but the deposit is not paid: the project is still CONTRACT_PENDING until it is.
  const waitingDeposit = project.status === 'CONTRACT_PENDING' && contract?.status === 'ACTIVE';
  const workspace = canOpenWorkspace(project.status);
  const open = () => navigate(`/projects/${project.id}/workspace`);
  // one sentence for this page and the project's card; a designer waits for the version check
  const next = designer && !ready ? '' : nextFor(role, project, designer ? latest(project.id) : undefined);

  // quotation stage: staff's next step is the quotation, the workspace stays one click away
  const quoting = project.status === 'QUOTING' || project.status === 'COMPLETED';
  const quotationFirst = staff && project.status === 'QUOTING';
  const openQuotation = () => navigate(`/projects/${project.id}/quotation`);
  const workspaceLabel = t(role === 'admin' ? 'projectDetail.openViewOnly' : 'projectDetail.openWorkspace');
  const secondary = quotationFirst
    ? (workspace ? <Button onClick={open}>{workspaceLabel}</Button> : undefined)
    : quoting ? <Button onClick={openQuotation}>{t('projectDetail.openQuotation')}</Button> : undefined;

  // exactly one primary action, following the next step
  const primary = quotationFirst
    ? <Button variant="primary" onClick={openQuotation}>{t('projectDetail.openQuotation')}</Button>
    : workspace
    ? <Button variant="primary" onClick={open}>{workspaceLabel}</Button>
    : staff && kickoffReady
      ? <Button variant="primary" loading={busy === 'kickoff'} disabled={!project.designer} title={project.designer ? undefined : t('projectDetail.startDesignHint')}
          onClick={() => act('kickoff', () => projectApi.kickoff(project.id))}>{t('projectDetail.startDesign')}</Button>
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
          {secondary}
          {staff && project.status === 'DRAFT' && contract === null && <Button onClick={() => setContractOpen(true)}>{t('projectDetail.createContract')}</Button>}
          {staff && contractCheckFailed && <Button title={t('contractPage.contractStatusFailed')} onClick={() => void loadContract()}>{t('contractPage.retryCheck')}</Button>}
          {/* A staff member with no contract yet creates it with the button above; "Contract" has nothing to show until then. */}
          {!(staff && contract === null) && <Button onClick={() => navigate(contractPage)}>{t('projectDetail.contract')}</Button>}
        </>}
      />
      {staff && kickoffReady && !project.designer && <p className="-mt-4 mb-5 text-right text-xs text-amber-700">{t('projectDetail.startDesignHint')}</p>}

      {project.status !== 'CANCELLED' && (
        <Card className="mb-5" bodyClassName="px-4 py-4 sm:px-6">
          <Stepper steps={tList('steps.project')} current={stepIndex(project.status)} optional={conceptStep(2)} />
        </Card>
      )}

      {next && (
        <div className="mb-5">
          <Banner tone="blue">
            <p className="text-[13px] font-medium text-blue-700">{t('nextStep.title')}</p>
            <p className="mt-0.5 text-[15px] font-semibold text-slate-900">{next}</p>
          </Banner>
        </div>
      )}

      {actionError && <div className="mb-5"><ErrorState message={actionError} /></div>}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card title={t('projectDetail.home')}>
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
                  <tr className="border-b border-slate-100"><th className="py-1.5 font-medium">{t('projectDetail.floorName')}</th><th className="py-1.5 text-right font-medium">{t('projectDetail.floorHeight')}</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {floors.map((f) => (
                    <tr key={f.id}><td className="py-2 text-slate-800">{f.name}</td><td className="py-2 text-right tabular-nums text-slate-600">{t('projectDetail.heightValue', { mm: formatNumber(f.floorHeightMm) })}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-slate-500">{t('projectDetail.noFloors')}</p>}
            {staff && floors.length <= 1 && <p className="mt-2 text-xs text-slate-500">{t('projectDetail.floorsNote')}</p>}
          </div>
        </Card>

        <Card title={t('projectDetail.people')}>
          <DetailList items={[
            { label: t('projectDetail.homeowner'), value: <>{project.customer.fullName}{staff && project.customer.email && <span className="block text-xs text-slate-500">{project.customer.email}</span>}</> },
            { label: t('projectDetail.staff'), value: project.staff.fullName },
            { label: t('projectDetail.designer'), value: project.designer ? project.designer.fullName : <span className="text-slate-500">{t('projectDetail.notAssigned')}</span> },
            ...(staff ? [{ label: t('projectDetail.budget'), value: <span className="tabular-nums">{t('projectDetail.budgetValue', { min: formatMoney(project.budgetMin), max: formatMoney(project.budgetMax) })}</span> }] : []),
          ]} />

          {designer && project.designer && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <TeamCard bare project={project} role={viewerRole} />
            </div>
          )}

          {staff && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <DesignTeamCard project={project} role={viewerRole} designers={designers} onSaved={load} />
              {kickoffReady && <p className="mt-3 text-xs text-slate-500">{t('projectDetail.kickoffNote')}</p>}
            </div>
          )}
        </Card>
      </div>
      <div className="mt-5">
        <RoomAssignmentsTab projectId={project.id} leadDesignerId={project.designer?.id ?? null} />
      </div>

      {contractOpen && (
        <CreateContractModal
          projectId={project.id}
          onClose={() => setContractOpen(false)}
          onToast={setToast}
          onCreated={() => { setContractOpen(false); void load(); void loadContract(); }}
          onAlreadyExists={() => { setContractOpen(false); void loadContract(); setTimeout(() => navigate(contractPage), 1200); }}
        />
      )}
      {toast && (
        <div role={toast.tone === 'success' ? 'status' : 'alert'}
          className={`fixed right-4 top-4 z-[80] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.tone === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
              : toast.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-red-100 bg-red-50 text-red-700'}`}>
          {toast.message}
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
