import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell, Banner, Button, Card, DetailList, ErrorState, Field, PageHeader, Select, Skeleton, StatusChip, Stepper } from '@/components/ui';
import { errorText, formatDate, formatMoney, formatNumber, t, tList } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { canOpenWorkspace, isPreparing, projectApi, stepIndex } from './projectApi';
import type { Project } from './projectApi';
import { TeamCard } from '@/features/design-workspace/TeamCard';
import { can, resolveProjectRole } from '@/features/design-workspace/logic';
import { HomeownerProjectView } from './HomeownerProjectView';
import { conceptStep, nextFor, useLatestVersions } from './projectView';

/** Project overview for Staff (/staff/projects/:id), Designer (/designer/projects/:id) and Homeowner (/homeowner/projects/:id). */
export function ProjectDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const role = getCurrentUser()?.role ?? 'homeowner';
  const userId = getCurrentUser()?.id ?? '';
  const staff = role === 'staff' || role === 'admin';
  const designer = role === 'designer';
  const [project, setProject] = useState<Project | null>(null);
  const [designers, setDesigners] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [designerId, setDesignerId] = useState('');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState<'' | 'assign' | 'kickoff'>('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, d, rooms] = await Promise.all([projectApi.get(id), staff ? projectApi.listDesigners() : Promise.resolve(null), designer ? projectApi.listRoomAssignments(id) : Promise.resolve([])]);
      // same fields as a row of the project list, so the next step reads the same on both
      setProject({ ...p, myRooms: rooms.filter((a) => a.designerId === userId).map((a) => ({ id: a.roomId, name: a.roomName, floorId: a.floorId })) });
      if (d) setDesigners(d.items);
    } catch (e) { setError(errorText(e)); }
  }, [id, staff, designer, userId]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const forVersions = useMemo(() => (designer && project ? [project] : null), [designer, project]);
  const { latest, ready } = useLatestVersions(forVersions, 'designer');

  const act = async (kind: 'assign' | 'kickoff', fn: () => Promise<Project>) => {
    setBusy(kind); setActionError('');
    try { await fn(); await load(); } catch (e) { setActionError(errorText(e)); } finally { setBusy(''); }
  };
  const back = { to: staff ? '/staff/projects' : designer ? '/designer/projects' : '/homeowner/projects', label: t('projectDetail.back') };

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
  const preparing = isPreparing(project.status);
  const workspace = canOpenWorkspace(project.status);
  const open = () => navigate(`/projects/${project.id}/workspace`);
  const projectRole = resolveProjectRole(project, userId);
  const canManageTeam = designer && can('manageTeam', { role: 'designer', version: null, project, projectRole }).ok;
  // one sentence for this page and the project's card; a designer waits for the version check
  const next = designer && !ready ? '' : nextFor(role, project, designer ? latest(project.id) : undefined);

  // exactly one primary action, following the next step
  const primary = workspace
    ? <Button variant="primary" onClick={open}>{t(staff ? 'projectDetail.openViewOnly' : 'projectDetail.openWorkspace')}</Button>
    : staff && preparing
      ? <Button variant="primary" loading={busy === 'kickoff'} disabled={!project.designer} title={project.designer ? undefined : t('projectDetail.startDesignHint')}
          onClick={() => act('kickoff', () => projectApi.kickoff(project.id))}>{t('projectDetail.startDesign')}</Button>
      : null;

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={project.title}
        chip={<StatusChip kind="project" value={project.status} />}
        description={<>{project.code}<span className="mx-2 text-slate-300">|</span>{t('projectDetail.created', { date: formatDate(project.createdAt) })}</>}
        primary={primary}
      />
      {staff && preparing && !project.designer && <p className="-mt-4 mb-5 text-right text-xs text-amber-700">{t('projectDetail.startDesignHint')}</p>}

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

          {project.designer && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <TeamCard bare project={project} canManage={canManageTeam} onChanged={load} />
            </div>
          )}

          {staff && preparing && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="mb-2 text-[13px] font-medium text-slate-700">{t('projectDetail.assignTitle')}</h3>
              <div className="flex flex-wrap items-end gap-2">
                <Field label={t('projectDetail.chooseDesigner')} className="min-w-0 flex-1 basis-56">
                  {(f) => (
                    <Select {...f} value={designerId} onChange={(e) => setDesignerId(e.target.value)}>
                      <option value="">{designers.length ? t('projectDetail.chooseDesigner') : t('projectDetail.noDesigners')}</option>
                      {designers.map((d) => <option key={d.id} value={d.id}>{d.fullName} ({d.email})</option>)}
                    </Select>
                  )}
                </Field>
                <Button disabled={!designerId} loading={busy === 'assign'} onClick={() => act('assign', () => projectApi.assignDesigner(project.id, designerId))}>
                  {t('projectDetail.assign')}
                </Button>
              </div>
              <p className="mt-3 text-xs text-slate-500">{t('projectDetail.kickoffNote')}</p>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
