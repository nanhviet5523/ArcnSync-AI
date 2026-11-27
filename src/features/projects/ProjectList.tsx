import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FolderKanban, PencilRuler, Plus, Receipt, Sofa, Search, UserX, X } from 'lucide-react';
import { AppShell, Button, CountUp, DataTable, EmptyState, FilterBar, Input, PageHeader, Select, StatCard, StatusChip, avatarTone, initials } from '@/components/ui';
import type { Column } from '@/components/ui';
import { errorText, formatDate, t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { canOpenWorkspace, getProjects, isPreparing, projectApi } from './projectApi';
import type { Project, ProjectStatus } from './projectApi';
import { GreetingLine, ProjectCards } from './ProjectCards';
import { awaitingCount, draftNote, isClosed, knownVersion, needsAction, useConceptGates, useFloorCounts, useLatestVersions, versionUnknown } from './projectView';
import { MiniSteps } from './ProjectStepper';

type ListRole = 'staff' | 'admin' | 'designer' | 'homeowner';
const STATUSES: ProjectStatus[] = ['DRAFT', 'CONTRACT_PENDING', 'IN_DESIGN', 'PRODUCT_SELECTION', 'QUOTING', 'COMPLETED', 'CANCELLED'];
const inDesign = (p: Project) => p.status === 'IN_DESIGN' || p.status === 'PRODUCT_SELECTION';

/** Staff stat tiles double as quick filters on the table (combined with search and the status select). */
const QUICK = {
  inDesign,
  quoteHandover: (p: Project) => p.status === 'QUOTING' || p.status === 'COMPLETED',
  noDesigner: (p: Project) => !p.designer && isPreparing(p.status),
} as const;
type Quick = keyof typeof QUICK;

/** Homeowner initials in a colour picked from their id, next to the name. */
function PersonName({ id, name }: { id: string; name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${avatarTone(id)}`}>{initials(name)}</span>
      <span className="truncate text-slate-700">{name}</span>
    </span>
  );
}

/** Project list for Staff, Designer and Homeowner (same page, different columns and actions). */
export function ProjectList() {
  const role = (getCurrentUser()?.role ?? 'homeowner') as ListRole;
  const navigate = useNavigate();
  const [items, setItems] = useState<Project[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [quick, setQuick] = useState<Quick | null>(null);
  /** Total from GET /projects without filters; search and the status filter run on the client, so it never shrinks with them. */
  const [overallTotal, setOverallTotal] = useState<number | null>(null);
  /** floor count per project id; the list endpoint doesn't return it (see docs: floorCount) */
  const [floors, setFloors] = useState<Record<string, number | null>>({});

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await getProjects({ limit: 100 });
      setItems(res.items);
      setOverallTotal(res.total);
    } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const requested = useRef(new Set<string>());
  const loadFloors = useCallback((rows: Project[]) => {
    for (const p of rows) {
      if (requested.current.has(p.id)) continue;
      requested.current.add(p.id);
      projectApi.get(p.id).then(
        (d) => setFloors((x) => ({ ...x, [p.id]: d.apartment?.floors?.length ?? 0 })),
        () => setFloors((x) => ({ ...x, [p.id]: null })),
      );
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter((p) => (!status || p.status === status) && (!quick || QUICK[quick](p))
      && (!q || [p.title, p.code, p.customer.fullName, p.apartment?.buildingName].some((v) => v?.toLowerCase().includes(q))));
  }, [items, search, status, quick]);
  const clearFilters = () => { setSearch(''); setStatus(''); setQuick(null); };

  // Designer and Homeowner see cards; Staff and Admin keep the table below.
  const cards = role === 'designer' || role === 'homeowner';
  const cardItems = cards ? items : null;
  // versions first: they decide the groups, floor counts only fill a badge
  const { latest, ready, retry, retryAll } = useLatestVersions(cardItems, role === 'designer' ? 'designer' : 'homeowner');
  const cardFloors = useFloorCounts(cardItems);
  // in design with no layout: has a concept been chosen? (only those projects ask)
  const gate = useConceptGates(cardItems, latest);

  const open = (p: Project) => {
    if (role === 'designer') {
      // no concept chosen yet: the Lead works on the concepts first (a Member keeps the workspace)
      if (p.myProjectRole === 'LEAD' && gate(p.id)) navigate(`/designer/projects/${p.id}#concept`);
      else if (canOpenWorkspace(p.status)) navigate(`/projects/${p.id}/workspace`);
      return;
    }
    navigate(role === 'homeowner' ? `/homeowner/projects/${p.id}` : `/staff/projects/${p.id}`);
  };

  const all = items ?? [];
  const count = (f: (p: Project) => boolean) => all.filter(f).length;
  const tileIcon = 'h-5 w-5';
  const noDesignerCount = count(QUICK.noDesigner);
  // Staff and Admin only (Designer and Homeowner get the cards view below). Clicking a tile filters the table to
  // its projects, clicking it again (or Total) shows them all.
  const stats: { label: string; value: number; hint?: string; icon: ReactNode; tone: 'brand' | 'blue' | 'orange' | 'amber'; quick: Quick | null; attention?: boolean }[] = [
    { label: t('projects.stat.total'), value: overallTotal ?? all.length, icon: <FolderKanban className={tileIcon} />, tone: 'brand', quick: null },
    { label: t('projects.stat.inDesign'), value: count(QUICK.inDesign), hint: t('projects.statHint.inDesign'), icon: <PencilRuler className={tileIcon} />, tone: 'blue', quick: 'inDesign' },
    { label: t('projects.stat.quoteHandover'), value: count(QUICK.quoteHandover), icon: <Receipt className={tileIcon} />, tone: 'orange', quick: 'quoteHandover' },
    { label: t('projects.stat.noDesigner'), value: noDesignerCount, hint: t('projects.statHint.noDesigner'), icon: <UserX className={tileIcon} />, tone: 'amber', quick: 'noDesigner', attention: noDesignerCount > 0 },
  ];
  const quickLabel = quick && stats.find((s) => s.quick === quick)?.label;

  const columns: Column<Project>[] = [
    {
      key: 'project', header: t('projects.col.project'), sort: (p) => p.title.toLowerCase(),
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink transition-colors group-hover:text-brand">{p.title}</p>
          <p className="mt-0.5 font-mono text-[11px] tracking-tight text-slate-500">{p.code}</p>
        </div>
      ),
    },
    {
      key: 'home', header: t('projects.col.home'), sort: (p) => (p.apartment?.buildingName ?? "").toLowerCase(),
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate text-ink">{p.apartment ? `${p.apartment.buildingName}${p.apartment.unitNo ? `, ${p.apartment.unitNo}` : ''}` : t('projectDetail.pendingSurvey')}</p>
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
      cell: (p: Project) => <PersonName id={p.customer.id} name={p.customer.fullName} />,
    }] : []),
    ...(role !== 'designer' ? [{
      key: 'designer', header: t('projects.col.designer'), sort: (p: Project) => p.designer?.fullName.toLowerCase() ?? '~',
      cell: (p: Project) => (p.designer ? <PersonName id={p.designer.id} name={p.designer.fullName} /> : (
        <span className="flex items-center gap-2 text-subtext">
          <span aria-hidden className="h-6 w-6 shrink-0 rounded-full border border-dashed border-slate-300" />
          {t('projects.notAssigned')}
        </span>
      )),
    }] : []),
    {
      key: 'status', header: t('projects.col.status'), sort: (p) => STATUSES.indexOf(p.status),
      cell: (p) => <div><StatusChip kind="project" value={p.status} /><MiniSteps status={p.status} /></div>,
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
          <Button size="sm" variant={role === 'designer' ? 'primary' : 'secondary'} onClick={(e) => { e.stopPropagation(); open(p); }}
            className="group-hover:border-brand/40 group-hover:text-brand">
            {role === 'designer' ? t('projects.openWorkspace') : t('projects.view')}
            <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Button>
        );
      },
    },
  ];

  const filteredOut = !!items?.length && !filtered.length;

  if (cards) {
    const loading = !items && !error;
    const needs = (all: Project[]) => all.filter((p) => needsAction(role, p, latest(p.id), gate(p.id))).length;
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
        <ProjectCards role={role} projects={items && filtered} latest={latest} gate={gate} floors={cardFloors} error={error} onRetry={load}
          filteredOut={filteredOut} onClearFilters={clearFilters}
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
        primary={(role === 'staff' || role === 'admin') && (
          <Button variant="primary" onClick={() => navigate('/staff/projects/new')}>
            <Plus aria-hidden className="h-4 w-4" />
            {t('projects.newProject')}
          </Button>
        )}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={<CountUp value={s.value} />}
            hint={s.hint}
            icon={s.icon}
            iconTone={s.tone}
            loading={!items && !error}
            attention={s.attention}
            active={s.quick !== null && quick === s.quick}
            title={s.quick ? t('projects.quickFilterHint') : undefined}
            onClick={items ? () => setQuick(s.quick === quick ? null : s.quick) : undefined}
          />
        ))}
      </div>

      <div className="mb-3">
        <FilterBar search={search} onSearch={setSearch} placeholder={t('projects.searchPlaceholder')}>
          <Select aria-label={t('projects.col.status')} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | '')} className="w-full sm:w-52">
            <option value="">{t('projects.allStatuses')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`status.project.${s}`)}</option>)}
          </Select>
        </FilterBar>
        {quickLabel && (
          <div className="step-in mt-2.5 flex items-center gap-2 text-[13px] text-slate-600">
            {t('projects.quickFilterShowing')}
            <button type="button" onClick={() => setQuick(null)} aria-label={`${t('projects.clearFilters')}: ${quickLabel}`}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-brand-soft py-0.5 pl-2.5 pr-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/15 focus-visible:outline-2 focus-visible:outline-brand">
              {quickLabel}
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
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
          ? <EmptyState title={t('projects.empty.filtered')} action={<Button size="sm" onClick={clearFilters}>{t('projects.clearFilters')}</Button>} />
          : <EmptyState title={t(`projects.empty.${role}`)} action={(role === 'staff' || role === 'admin') && <Button variant="primary" size="sm" onClick={() => navigate('/staff/projects/new')}>{t('projects.newProject')}</Button>} />}
      />
    </AppShell>
  );
}
