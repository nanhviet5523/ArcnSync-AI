import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, PencilRuler, Sofa, Search } from 'lucide-react';
import { AppShell, Button, DataTable, EmptyState, FilterBar, Input, PageHeader, Select, StatCard, StatusChip } from '@/components/ui';
import type { Column } from '@/components/ui';
import { errorText, formatDate, t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { canOpenWorkspace, isPreparing, projectApi } from './projectApi';
import type { Project, ProjectStatus } from './projectApi';
import { GreetingLine, ProjectCards } from './ProjectCards';
import { awaitingCount, draftNote, isClosed, knownVersion, needsAction, useFloorCounts, useLatestVersions, versionUnknown } from './projectView';

type ListRole = 'staff' | 'admin' | 'designer' | 'homeowner';
const STATUSES: ProjectStatus[] = ['DRAFT', 'CONTRACT_PENDING', 'REQUIREMENT_ANALYSIS', 'IN_DESIGN', 'PRODUCT_SELECTION', 'QUOTING', 'COMPLETED', 'CANCELLED'];
const inDesign = (p: Project) => p.status === 'IN_DESIGN' || p.status === 'PRODUCT_SELECTION';

/** Project list for Staff, Designer and Homeowner (same page, different columns and actions). */
export function ProjectList() {
  const role = (getCurrentUser()?.role ?? 'homeowner') as ListRole;
  const navigate = useNavigate();
  const [items, setItems] = useState<Project[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  /** floor count per project id; the list endpoint doesn't return it (see docs: floorCount) */
  const [floors, setFloors] = useState<Record<string, number | null>>({});

  const load = useCallback(async () => {
    setError('');
    try { setItems((await projectApi.list()).items); } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const requested = useRef(new Set<string>());
  const loadFloors = useCallback((rows: Project[]) => {
    for (const p of rows) {
      if (requested.current.has(p.id)) continue;
      requested.current.add(p.id);
      projectApi.get(p.id).then(
        (d) => setFloors((x) => ({ ...x, [p.id]: d.apartment.floors?.length ?? 0 })),
        () => setFloors((x) => ({ ...x, [p.id]: null })),
      );
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter((p) => (!status || p.status === status)
      && (!q || [p.title, p.code, p.customer.fullName, p.apartment.buildingName].some((v) => v?.toLowerCase().includes(q))));
  }, [items, search, status]);

  // Designer and Homeowner see cards; Staff and Admin keep the table below.
  const cards = role === 'designer' || role === 'homeowner';
  const cardItems = cards ? items : null;
  // versions first: they decide the groups, floor counts only fill a badge
  const { latest, ready, retry, retryAll } = useLatestVersions(cardItems, role === 'designer' ? 'designer' : 'homeowner');
  const cardFloors = useFloorCounts(cardItems);

  const open = (p: Project) => {
    if (role === 'designer') { if (canOpenWorkspace(p.status)) navigate(`/projects/${p.id}/workspace`); return; }
    navigate(role === 'homeowner' ? `/homeowner/projects/${p.id}` : `/staff/projects/${p.id}`);
  };

  const all = items ?? [];
  const count = (f: (p: Project) => boolean) => all.filter(f).length;
  const stats = {
    staff: [
      { label: t('projects.stat.total'), value: all.length },
      { label: t('projects.stat.inDesign'), value: count(inDesign), hint: t('projects.statHint.inDesign') },
      { label: t('projects.stat.quoteHandover'), value: count((p) => p.status === 'QUOTING' || p.status === 'COMPLETED') },
      { label: t('projects.stat.noDesigner'), value: count((p) => !p.designer && isPreparing(p.status)), hint: t('projects.statHint.noDesigner') },
    ],
    designer: [
      { label: t('projects.stat.assigned'), value: all.length },
      { label: t('projects.stat.layout'), value: count((p) => p.status === 'IN_DESIGN') },
      { label: t('projects.stat.products'), value: count((p) => p.status === 'PRODUCT_SELECTION') },
      { label: t('projects.stat.completed'), value: count((p) => p.status === 'COMPLETED') },
    ],
    homeowner: [
      { label: t('projects.stat.mine'), value: all.length },
      { label: t('projects.stat.inDesign'), value: count(inDesign) },
      { label: t('projects.stat.completed'), value: count((p) => p.status === 'COMPLETED') },
    ],
  }[role === 'admin' ? 'staff' : role];

  const columns: Column<Project>[] = [
    {
      key: 'project', header: t('projects.col.project'), sort: (p) => p.title.toLowerCase(),
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{p.title}</p>
          <p className="text-xs text-slate-500">{p.code}</p>
        </div>
      ),
    },
    {
      key: 'home', header: t('projects.col.home'), sort: (p) => p.apartment.buildingName.toLowerCase(),
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate text-slate-800">{p.apartment.buildingName}{p.apartment.unitNo ? `, ${p.apartment.unitNo}` : ''}</p>
          <p className="text-xs text-slate-500">
            {floors[p.id] === undefined
              ? <span className="inline-block h-3 w-14 animate-pulse rounded bg-slate-100 align-middle" />
              : floors[p.id] === null ? t('common.none') : t('projects.floors', { n: floors[p.id]! })}
          </p>
        </div>
      ),
    },
    ...(role !== 'homeowner' ? [{
      key: 'homeowner', header: t('projects.col.homeowner'), sort: (p: Project) => p.customer.fullName.toLowerCase(),
      cell: (p: Project) => <span className="text-slate-700">{p.customer.fullName}</span>,
    }] : []),
    ...(role !== 'designer' ? [{
      key: 'designer', header: t('projects.col.designer'), sort: (p: Project) => p.designer?.fullName.toLowerCase() ?? '~',
      cell: (p: Project) => (p.designer ? <span className="text-slate-700">{p.designer.fullName}</span> : <span className="text-slate-400">{t('projects.notAssigned')}</span>),
    }] : []),
    {
      key: 'status', header: t('projects.col.status'), sort: (p) => STATUSES.indexOf(p.status),
      cell: (p) => <StatusChip kind="project" value={p.status} />,
    },
    {
      key: 'updated', header: t('projects.col.updated'), sort: (p) => p.updatedAt ?? p.createdAt, className: 'whitespace-nowrap tabular-nums',
      cell: (p) => <span className="text-slate-600">{formatDate(p.updatedAt ?? p.createdAt)}</span>,
    },
    {
      key: 'action', header: '', className: 'w-px text-right',
      cell: (p) => {
        if (role === 'designer' && !canOpenWorkspace(p.status)) return null;
        return (
          <Button size="sm" variant={role === 'designer' ? 'primary' : 'secondary'} onClick={(e) => { e.stopPropagation(); open(p); }}>
            {role === 'designer' ? t('projects.openWorkspace') : t('projects.view')}
          </Button>
        );
      },
    },
  ];

  const filteredOut = !!items?.length && !filtered.length;

  if (cards) {
    const loading = !items && !error;
    const needs = (all: Project[]) => all.filter((p) => needsAction(role, p, latest(p.id))).length;
    const icon = 'h-5 w-5';
    // The needs-action count lives in the header line and the group heading; tiles only add workload by stage (designer).
    const cardStats = role === 'designer' ? [
      <StatCard key="a" label={t('projects.stat.assigned')} value={all.length} loading={loading} icon={<FolderKanban className={icon} />} />,
      <StatCard key="l" label={t('projects.stat.layout')} value={count((p) => p.status === 'IN_DESIGN')} loading={loading} icon={<PencilRuler className={icon} />} />,
      <StatCard key="p" label={t('projects.stat.products')} value={count((p) => p.status === 'PRODUCT_SELECTION')} loading={loading} icon={<Sofa className={icon} />} iconTone="violet" />,
    ] : [];
    const filters = (
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
          <span className="sr-only">{t('cards.search')}</span>
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('cards.search')} className="pl-8" />
        </label>
        <Select aria-label={t('projects.col.status')} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | '')} className="w-full sm:w-48">
          <option value="">{t('projects.allStatuses')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.project.${s}`)}</option>)}
        </Select>
      </div>
    );
    return (
      <AppShell>
        {/* on a failed load, show only the error: no greeting count and no stat tiles reading 0 */}
        <PageHeader title={t(`projects.title.${role}`)} secondary={!error && filters}
          description={error ? t(`projects.description.${role}`) : <GreetingLine name={getCurrentUser()?.name} count={needs(all)} replies={all.reduce((n, p) => n + awaitingCount(p, latest(p.id)), 0)}
            draftNote={draftNote(all.flatMap((p) => knownVersion(latest(p.id))?.draftRooms ?? []))} unknown={all.filter((p) => !isClosed(p.status) && versionUnknown(latest(p.id))).length} onRetryAll={() => retryAll(all.filter((p) => !isClosed(p.status)).map((p) => p.id))} loading={loading || !ready} />} />
        {!error && !loading && all.length > 3 && cardStats.length > 0 && <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">{cardStats}</div>}
        <ProjectCards role={role} projects={items && filtered} latest={latest} floors={cardFloors} error={error} onRetry={load}
          filteredOut={filteredOut} onClearFilters={() => { setSearch(''); setStatus(''); }}
          onWorkspace={(p) => navigate(`/projects/${p.id}/workspace`)} onDetails={(p) => navigate(`/${role === 'designer' ? 'designer' : 'homeowner'}/projects/${p.id}`)} onRetryVersion={retry} filtering={!!search.trim() || !!status}
          large={role === 'homeowner' && items?.length === 1} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title={t(`projects.title.${role}`)}
        description={t(`projects.description.${role}`)}
        primary={(role === 'staff' || role === 'admin') && <Button variant="primary" onClick={() => navigate('/staff/projects/new')}>{t('projects.newProject')}</Button>}
      />

      <div className={`mb-5 grid gap-3 ${stats.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {stats.map((s) => <StatCard key={s.label} label={s.label} value={s.value} hint={'hint' in s ? s.hint : undefined} loading={!items && !error} />)}
      </div>

      <div className="mb-3">
        <FilterBar search={search} onSearch={setSearch} placeholder={t('projects.searchPlaceholder')}>
          <Select aria-label={t('projects.col.status')} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | '')} className="w-full sm:w-52">
            <option value="">{t('projects.allStatuses')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`status.project.${s}`)}</option>)}
          </Select>
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={items && filtered}
        rowKey={(p) => p.id}
        error={error}
        onRetry={load}
        onRowClick={open}
        onPageRows={loadFloors}
        initialSort={{ key: 'updated', dir: 'desc' }}
        empty={filteredOut
          ? <EmptyState title={t('projects.empty.filtered')} action={<Button size="sm" onClick={() => { setSearch(''); setStatus(''); }}>{t('projects.clearFilters')}</Button>} />
          : <EmptyState title={t(`projects.empty.${role}`)} action={(role === 'staff' || role === 'admin') && <Button variant="primary" size="sm" onClick={() => navigate('/staff/projects/new')}>{t('projects.newProject')}</Button>} />}
      />
    </AppShell>
  );
}
